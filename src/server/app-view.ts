import type { ServerResponse } from "node:http";
import type { BusEvent, Entry, Mode, PlanResponse } from "../core/types.ts";
import type { SettingSession } from "../core/settings.ts";
import { checkClaudeKey } from "../providers/claude.ts";
import {
  applyRewind, applySetup, setupRequest, canGoBack, respondQuestion, SEQ_START, seqAnswered, seqBack, seqNext, seqPending, seqProgress, seqView, type QuestionSeq, cardFromEvent, CLARIFY_SKIP_ANSWER, sheetRows, choiceValue, closesCard, fieldKind, keyProblem, needsSetup, numberProblem, planInit, planIntro, planReduce, planResolve, pushCard, refreshesStatus,
  respondPermission, respondPhi, saveEln, saveKey, startCards, type Card, type PlanAction, type Say,
} from "../ui/cards.ts";
import { commands, openPanels, openSetup, type CommandCtx } from "../ui/commands.ts";
import { Collapser, Mapper, mainView, type Item, type Logged } from "../ui/items.ts";
import { activityText, inputPlaceholder, nextQueued, routeMessage, stopTurn } from "../ui/messages.ts";
import type { SessionLike } from "../ui/types.ts";
import { cardHtml, itemHtml, runHtml, splitRuns, type Ctx, type Slot } from "./app-html.ts";
import { usageFields } from "../ui/messages.ts";

export interface ViewHost {
  token: string;
  env: Record<string, string | undefined>;
  url(path: string): string;
  quit(): Promise<void>;
}

type Fields = Record<string, unknown>;
const LONG_STEP_MS = 30_000;
const THINK_KEEP = 4000;

export class WebView {
  readonly session: SessionLike;
  private mapper: Mapper;
  private log: Logged[] = [];
  private collapser = new Collapser();
  private byEntry = new Map<number, Item[]>();
  private settled: Item[] = [];
  private pending: Item[] = [];
  private run: Item[] = [];
  slots: Slot[] = [];
  private seq: QuestionSeq = SEQ_START;
  private nextId = 1;
  private counter = 0;
  status: { state: string; tool?: string; purpose?: string; since?: number } = { state: "idle" };
  private live = "";
  private thinking = "";
  queue: string[] = [];
  details = false;
  private clients = new Set<ServerResponse>();
  private off: () => void;
  private changed?: ReturnType<typeof setTimeout>;
  readonly ctx: CommandCtx;

  constructor(session: SessionLike, private host: ViewHost) {
    this.session = session;
    this.mapper = new Mapper(session);
    for (const e of session.record.entries()) this.addEntry(e, false);
    const st = (session as unknown as { lastStatus?: { state: string; tool?: string; purpose?: string; since?: number } }).lastStatus;
    if (st) this.status = { state: st.state, tool: st.tool, purpose: st.purpose, since: st.since };
    if (this.status.state === "idle") this.settled.push(...this.collapser.flush());
    this.pending = this.status.state === "idle" ? [] : this.collapser.preview();
    this.line("▸", planIntro(session), undefined, true, false);
    this.ctx = this.makeCtx();
    for (const c of startCards(session, host.env)) this.openCard(c, false);
    if (needsSetup(session)) void openSetup(this.ctx);
    this.off = session.bus.on((e) => this.onEvent(e));
  }

  close(): void {
    this.off();
    clearTimeout(this.changed);
    this.send({ t: "switch" });
    for (const c of this.clients) c.end();
    this.clients.clear();
  }

  private c(): Ctx {
    const s = this.session;
    return { token: this.host.token, session: s, busy: this.busy, settings: { cwd: s.cwd ?? process.cwd(), env: this.host.env, session: s as unknown as SettingSession, ui: { details: () => this.details, toggleDetails: () => this.toggleDetails() } } };
  }

  get busy(): boolean {
    return this.status.state !== "idle";
  }

  // ------------------------------------------------------------ stream

  attach(res: ServerResponse): void {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    res.write(`data: ${JSON.stringify(this.snapshot())}\n\n`);
    this.clients.add(res);
    res.on("close", () => this.clients.delete(res));
  }

  beat(): void {
    for (const c of this.clients) c.write(": keep-alive\n\n");
  }

  private send(msg: Record<string, unknown>): void {
    const data = `data: ${JSON.stringify(msg)}\n\n`;
    for (const c of this.clients) c.write(data);
  }

  private sub = (ids: number[]) => ids.flatMap((id) => this.byEntry.get(id) ?? []);
  private html = (items: Item[]) => items.map((it) => itemHtml(this.c(), it, { sub: this.sub })).join("");
  private chunks = (list: (Item | Item[])[]) => list.map((x) => (Array.isArray(x) ? runHtml(this.c(), x, false, { sub: this.sub }) : itemHtml(this.c(), x, { sub: this.sub }))).join("");
  private pendingHtml = () => runHtml(this.c(), this.run, this.busy, { sub: this.sub }) + this.html(this.pending);

  // Adds items to the open run of steps and returns the HTML of what is done.
  private take(items: Item[], close = false): string {
    const { done, open } = splitRuns(items, this.run);
    this.run = close ? [] : open;
    return this.chunks(close && open.length ? [...done, open] : done);
  }

  snapshot(): Record<string, unknown> {
    this.run = [];
    const items = this.take(this.settled, !this.busy);
    return { t: "reset", items, pending: this.pendingHtml(), cards: this.cardsHtml(), cardCount: this.slots.length, live: this.live, think: this.thinking.slice(-THINK_KEEP), status: this.statusMsg(), session: this.header() };
  }

  header(): Record<string, unknown> {
    const s = this.session;
    return { id: s.id, folder: s.cwd ?? "", folderLine: s.folderLine ?? "", model: s.model.model, programs: s.adapterInfo.map((a) => a.title || a.name), details: this.details };
  }

  statusMsg(): Record<string, unknown> {
    const s = this.session;
    return {
      t: "status",
      state: this.status.state,
      text: this.busy ? activityText(this.status.state, this.status.purpose, this.status.tool) : "",
      since: this.status.since ?? null,
      mode: s.mode,
      bypass: s.permissionMode === "bypass",
      openQuestions: s.questions.open().length,
      queue: this.queue,
      placeholder: inputPlaceholder(s, this.busy),
      queueMode: s.settings?.messages === "queue" || !s.steer,
      details: this.details,
      where: `${s.folderLine || s.cwd || ""} · ${s.model.model}`,
      model: s.model.model,
      ...usageFields(s),
    };
  }

  cardsHtml(): string {
    const pending = seqPending(this.slots.map((sl) => sl.card));
    if (this.seq.done.length && !pending.length) this.seq = SEQ_START;
    const qs = this.slots.filter((sl) => sl.card.t === "question");
    const rest = qs.length - 1;
    return this.slots
      .map((sl) => {
        if (sl.card.t !== "question") return cardHtml(this.c(), sl);
        if (sl !== qs[0]) return "";
        let shown = sl;
        let waiting = rest;
        if (!sl.card.act) {
          const v = seqView(this.seq, pending)!;
          shown = { ...sl, card: { t: "question", q: v.q }, seq: { progress: v.total > 1 ? seqProgress(v) : undefined, back: canGoBack(this.seq), next: this.seq.back >= 0, current: v.current } };
          if (v.changing) waiting = qs.length;
        }
        return cardHtml(this.c(), shown) + (waiting > 0 ? `<p class="dim small queued">${waiting} more ${waiting === 1 ? "question waits" : "questions wait"}. The next one opens after you answer this one.</p>` : "");
      })
      .join("");
  }

  private sendCards(): void {
    this.send({ t: "cards", html: this.cardsHtml(), cardCount: this.slots.length });
  }

  private sendStatus(): void {
    this.send(this.statusMsg());
  }

  private touch(): void {
    clearTimeout(this.changed);
    this.changed = setTimeout(() => this.send({ t: "changed" }), 600);
    this.changed.unref?.();
  }

  // ------------------------------------------------------------ conversation

  private addEntry(e: Entry, live = true): void {
    const items = this.mapper.map(e);
    this.byEntry.set(e.id, items);
    this.record({ e, items }, live);
  }

  private record(l: Logged, live = true): void {
    this.log.push(l);
    const add = this.details ? l.items : this.collapser.add(l);
    this.settled.push(...add);
    if (!this.details) this.pending = this.collapser.preview();
    if (!live) return;
    const html = this.take(add);
    if (html) this.send({ t: "append", html });
    this.send({ t: "pending", html: this.pendingHtml() });
  }

  push(...items: Item[]): void {
    this.record({ items });
  }

  line(sym: string, text: string, color?: string, dim?: boolean, live = true): void {
    this.record({ items: [{ key: `l${++this.counter}`, t: "line", sym, color, text, dim }] }, live);
  }

  toggleDetails(): boolean {
    this.details = !this.details;
    this.rebuild();
    return this.details;
  }

  private rebuild(): void {
    if (this.details) {
      this.settled = this.log.flatMap((l) => l.items);
      this.pending = [];
    } else {
      const v = mainView(this.log, !this.busy);
      this.collapser = v.collapser;
      this.settled = v.settled;
      this.pending = v.pending;
    }
    this.send(this.snapshot());
  }

  recordHtml(): string {
    return this.log.flatMap((l) => l.items).map((it) => itemHtml(this.c(), it, { code: true })).join("") || `<p class="empty">The record is empty.</p>`;
  }

  // ------------------------------------------------------------ bus

  private onEvent(e: BusEvent): void {
    switch (e.type) {
      case "entry": {
        const en = e.entry;
        this.addEntry(en);
        if (en.kind === "assistant" && this.live) {
          this.live = "";
          this.send({ t: "live", reset: true });
        }
        if ((en.kind === "assistant" || en.kind === "tool_call") && this.thinking) {
          this.thinking = "";
          this.send({ t: "think", reset: true });
        }
        const before = this.slots.length;
        this.slots = this.slots.filter((sl) => !closesCard(en, sl.card));
        if (this.slots.length !== before || en.kind === "answer") this.sendCards();
        if (refreshesStatus(en) || en.kind === "usage" || en.kind === "setting") this.sendStatus();
        this.touch();
        break;
      }
      case "delta":
        if (e.kind === "text") {
          this.live += e.text;
          this.send({ t: "live", text: e.text });
        } else {
          this.thinking = (this.thinking + e.text).slice(-THINK_KEEP * 2);
          this.send({ t: "think", text: e.text });
        }
        break;
      case "delta_reset":
        this.live = "";
        this.thinking = "";
        this.send({ t: "live", reset: true });
        this.send({ t: "think", reset: true });
        break;
      case "status": {
        const was = this.status;
        this.status = { state: e.state, tool: e.tool, purpose: e.purpose, since: e.state === "running" ? e.since : undefined };
        if (was.state === "running" && was.since && Date.now() - was.since > LONG_STEP_MS && e.state !== "running") this.send({ t: "notify", title: "A long step ended", body: activityText("running", was.purpose, was.tool) });
        if (e.state === "idle") {
          const flushed = this.details ? [] : this.collapser.flush();
          this.settled.push(...flushed);
          const html = this.take(flushed, true);
          if (html) this.send({ t: "append", html });
          this.pending = [];
          this.live = "";
          this.thinking = "";
          this.send({ t: "pending", html: "" });
          this.send({ t: "live", reset: true });
          this.send({ t: "think", reset: true });
          const { next, rest } = nextQueued(this.session, this.queue);
          this.queue = rest;
          if (next !== undefined) this.session.send(next).catch((err: Error) => this.line("✗", `The agent stopped: ${err.message}`, "red"));
          if (was.state !== "idle") this.send({ t: "notify", title: "The agent is done", body: "The agent waits for you." , quiet: true });
        }
        this.sendStatus();
        break;
      }
      default: {
        const c = cardFromEvent(e);
        if (c) this.openCard(c);
        if (e.type === "question") this.sendStatus();
        if (e.type === "permission" || e.type === "question" || e.type === "plan" || e.type === "instruction" || e.type === "phi") this.send({ t: "notify", title: "The agent needs you", body: e.type === "phi" ? "Possible patient identifiers. Choose what goes to the model." : e.type === "permission" ? `Permission needed: ${e.tool}` : e.type === "question" ? e.question.title : e.type === "plan" ? "Check the proposed analysis." : `Your turn: step ${e.step}`, quiet: true });
      }
    }
  }

  openCard(c: Card, live = true): void {
    const next = pushCard(this.slots.map((s) => s.card), c);
    const kept = new Map(this.slots.map((s) => [s.card, s]));
    this.slots = next.map((card) => kept.get(card) ?? { id: this.nextId++, card, plan: card.t === "plan" ? planInit(card) : undefined });
    if (live) this.sendCards();
  }

  private drop(slot: Slot): void {
    this.slots = this.slots.filter((s) => s !== slot);
  }

  // ------------------------------------------------------------ input

  async submit(raw: string, now = false): Promise<void> {
    const text = raw.trim();
    if (!text) return;
    if (text.startsWith("/")) return this.runCommand(text);
    const r = routeMessage(this.session, text, this.busy, now);
    if (r.t === "none") return;
    if (r.t === "queue") {
      this.queue = [...this.queue, r.text];
      return this.sendStatus();
    }
    if (r.t === "steer") {
      this.push({ key: `u${++this.counter}`, t: "user", text: r.text });
      return this.line("▸", r.note, undefined, true);
    }
    this.session.send(r.text).catch((e: Error) => this.line("✗", `The agent stopped: ${e.message}`, "red"));
  }

  async runCommand(text: string): Promise<void> {
    const [head, ...args] = text.slice(1).trim().split(/\s+/);
    this.push({ key: `u${++this.counter}`, t: "user", text });
    const cmd = commands.find((c) => c.name === head);
    if (!cmd) return this.line("✗", `Unknown command /${head}. Type /help.`, "red");
    try {
      await cmd.run(args, this.ctx);
    } catch (e) {
      this.line("✗", `/${cmd.name} failed: ${(e as Error).message}`, "red");
    }
  }

  stop(): void {
    this.queue = [];
    stopTurn(this.session);
    this.sendStatus();
  }

  private makeCtx(): CommandCtx {
    return {
      session: this.session,
      print: (text, title) => this.push({ key: `b${++this.counter}`, t: "block", title, text }),
      notice: (text) => this.line("▸", text),
      error: (text) => this.line("✗", text, "red"),
      openCard: (c) => this.openCard(c),
      hasQuestionCard: (qid) => this.slots.some((s) => s.card.t === "question" && s.card.q.qid === qid),
      refresh: () => this.sendStatus(),
      clear: () => {
        this.log = [];
        this.settled = [];
        this.pending = [];
        this.run = [];
        this.collapser = new Collapser();
        this.send(this.snapshot());
      },
      quit: () => void this.host.quit(),
      outputs: () => this.mapper.outputs,
      toggleDetails: () => this.toggleDetails(),
      startWindow: async () => this.host.url("graph/"),
      startPanel: async () => {
        const url = this.host.url("graph/panel");
        return { url, ...(await openPanels(this.session, url)) };
      },
      startApp: async () => this.host.url(""),
    };
  }

  private say(slot?: Slot): Say {
    return {
      ok: (t) => this.line("✓", t, "green"),
      bad: (t) => (slot ? (slot.msg = t) : this.line("✗", t, "red")),
      dim: (t) => this.line("·", t, undefined, true),
      warn: (t) => this.line("!", t, "yellow"),
    };
  }

  async act(id: number, body: { act?: string; value?: string; plan?: PlanAction; qid?: string; fid?: string; fields?: Fields }): Promise<{ ok: boolean; error?: string }> {
    const slot = this.slots.find((s) => s.id === id);
    if (!slot) return { ok: false, error: "This card is closed." };
    slot.msg = undefined;
    const f = body.fields ?? {};
    const s = this.session;
    const str = (k: string) => (typeof f[k] === "string" ? (f[k] as string).trim() : "");
    const card = slot.card;
    const a = body.act;
    switch (card.t) {
      case "setup": {
        if (a === "cancel") break;
        const values: Record<string, unknown> = {};
        for (const fd of s.decisions.fields()) {
          const k = `f:${fd.key}`;
          if (!(k in f) || fd.owner === "fixed") continue;
          const kind = fieldKind(fd);
          const raw = f[k];
          if (kind === "choice") values[fd.key] = choiceValue(fd.choices![Number(raw)]);
          else if (kind === "bool") values[fd.key] = raw === true;
          else if (kind === "number") {
            const problem = numberProblem(fd, String(raw ?? ""));
            if (problem) return this.keep(slot, `${fd.label}: ${problem}`);
            values[fd.key] = Number(raw);
          } else values[fd.key] = String(raw ?? "");
        }
        const problem = applySetup(s, values, str("profile") || undefined);
        if (problem) this.line("✗", problem, "red");
        const request = problem ? undefined : setupRequest(s, values);
        if (request) void this.submit(request);
        break;
      }
      case "permission":
        if (a === "allow") respondPermission(s, card, { ok: true });
        else if (a === "always") respondPermission(s, card, { ok: true, always: true });
        else if (a === "deny") respondPermission(s, card, { ok: false, note: str("note") || undefined });
        else if (a === "stop") respondPermission(s, card, { stop: true });
        else return { ok: false, error: "unknown action" };
        break;
      case "phi":
        if (a !== "send" && a !== "mask" && a !== "local" && a !== "stop") return { ok: false, error: "unknown action" };
        respondPhi(s, card, a);
        break;
      case "question": {
        if (a === "back" || a === "next") {
          this.seq = (a === "back" ? seqBack : seqNext)(this.seq);
          return this.keep(slot);
        }
        const act = card.act;
        const v = act ? undefined : seqView(this.seq, seqPending(this.slots.map((x) => x.card)));
        const q = v?.q ?? card.q;
        if (a === "later") {
          if (v?.changing) {
            this.seq = SEQ_START;
            return this.keep(slot);
          }
          break;
        }
        const value = a === "sheet" ? { rows: sheetRows(f, q) } : a === "answer" ? q.options[Number(body.value)]?.value : a === "recommend" ? q.recommendation?.value : str("other");
        if (value === undefined || value === "") return this.keep(slot, "Choose an answer or type one.");
        const before = this.seq;
        if (v?.changing) {
          this.seq = seqAnswered(this.seq, q, value);
          await s.changeAnswer?.(q.qid, value).catch((e: Error) => this.line("✗", e.message, "red"));
          this.sendCards();
          return { ok: true };
        }
        if (!act) this.seq = seqAnswered(this.seq, q, value);
        this.drop(slot);
        this.sendCards();
        await respondQuestion(s, { t: "question", q, act }, value)
          .then((r) => {
            if (r.line) this.line("✓", r.line, "green");
            if (r.next) this.openCard(r.next);
          })
          .catch((e: Error) => {
            this.seq = before;
            this.line("✗", `${e.message} Try again.`, "red");
            if (!this.slots.some((x) => x.card.t === "question" && x.card.q.qid === q.qid)) {
              this.slots = [{ ...slot, msg: `${e.message} Try again.` }, ...this.slots];
              this.sendCards();
            }
          });
        return { ok: true };
      }
      case "instruction":
        if (a === "done") void s.followDone(card.step, str("note"));
        else if (a === "agent") void s.followDone(card.step, "", true);
        else if (a === "stop") s.interrupt();
        break;
      case "findings": {
        if (a === "resolve" && body.fid) {
          const action = body.value as "accept" | "reject" | "fix";
          s.findings.resolve(body.fid, action, str(`reason:${body.fid}`) || undefined);
          card.list = card.list.filter((x) => x.fid !== body.fid);
          if (card.list.length) return this.keep(slot);
        }
        break;
      }
      case "key": {
        if (a === "cancel") break;
        const key = str("key");
        const problem = keyProblem(key);
        if (problem) return this.keep(slot, problem);
        this.drop(slot);
        this.sendCards();
        const r = await saveKey(s, key, this.host.env, this.say(), checkClaudeKey);
        if (!r.ok) this.openCard({ t: "key", reason: r.text });
        return { ok: true };
      }
      case "eln":
        if (a !== "cancel" && !saveEln(s, str("url"), str("key"), this.say(slot))) return this.keep(slot);
        break;
      case "config":
        this.sendStatus();
        break;
      case "rewind": {
        if (a !== "rewind") break;
        const r = applyRewind(s, Number(body.value));
        this.line(r.ok ? "↶" : "✗", r.text, r.ok ? "cyan" : "red");
        this.sendStatus();
        break;
      }
      case "clarify": {
        const q = s.questions.open().find((x) => x.qid === body.qid);
        if (!q) return this.keep(slot);
        const value = a === "sheet" ? { rows: sheetRows(f, q) } : a === "answer" ? q.options[Number(body.value)]?.value : a === "recommend" ? q.recommendation?.value : a === "skip" ? CLARIFY_SKIP_ANSWER : str("other");
        if (value === undefined || value === "") return this.keep(slot, "Choose an answer or type one.");
        await s.answer(q.qid, value).catch((e: Error) => this.line("✗", e.message, "red"));
        return this.keep(slot);
      }
      case "plan": {
        if (a === "decide" && body.qid) {
          const q = s.questions.open().find((x) => x.qid === body.qid);
          const value = body.value === "rec" ? q?.recommendation?.value : body.value !== undefined ? q?.options[Number(body.value)]?.value : str("other");
          if (!q || value === undefined || value === "") return this.keep(slot, "Choose an answer or type one.");
          await s.answer(q.qid, value).catch((e: Error) => this.line("✗", e.message, "red"));
          return this.keep(slot);
        }
        if (a !== "plan" || !body.plan) return { ok: false, error: "unknown action" };
        const p = { ...body.plan } as PlanAction & { text?: string; value?: unknown; n?: number };
        if ("text" in p && !p.text) p.text = str("text");
        if ("value" in p && (p.value === "" || p.value === undefined)) p.value = p.a === "setValue" ? str("other") || str("text") : str("other");
        if (p.a === "item" && !p.n) p.n = Number(str("text"));
        const st = planResolve(card, slot.plan!, s.questions.open());
        const r = planReduce(card, st, p);
        if (!r.respond) {
          slot.plan = r.state;
          return this.keep(slot);
        }
        this.drop(slot);
        this.sendCards();
        s.respondPlan?.(r.respond as PlanResponse);
        return { ok: true };
      }
    }
    this.drop(slot);
    this.sendCards();
    return { ok: true };
  }

  private keep(slot: Slot, msg?: string): { ok: boolean; error?: string } {
    if (msg) slot.msg = msg;
    this.sendCards();
    return { ok: true };
  }

  setMode(m: Mode): void {
    this.session.setMode(m);
    this.sendStatus();
  }
}
