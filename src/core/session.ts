import { createHash, randomBytes } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { findAdapter, gaHome, type LoadedAdapter } from "../adapters/manifest.ts";
import type { AdapterRuntime } from "../adapters/runtime.ts";
import { makeProvider } from "../providers/index.ts";
import { coreTools, searchTools } from "../tools/core.ts";
import { taskTool } from "../tools/task.ts";
import { Bus } from "./bus.ts";
import { annotate, checkAnswer } from "./claims.ts";
import { compact, needsCompaction, summaryMessage } from "./compaction.ts";
import { loadSettings, type Settings } from "./config.ts";
import { decisionHook, DecisionRecord } from "./decisions.ts";
import { HookRunner } from "./hooks.ts";
import { applyOverlay, labText, propose } from "./labmemory.ts";
import { compareNote, instruction, teachReview, type TeachSummary } from "./modes.ts";
import { modeHook, Permissions } from "./permissions.ts";
import { systemPrompt } from "./prompt.ts";
import { QuestionQueue } from "./questions.ts";
import { AnalysisRecord } from "./record.ts";
import { Findings, referee, runChecks } from "./review.ts";
import { runSensitivity } from "./sensitivity.ts";
import {
  ProviderError,
  type Args,
  type Entry,
  type Finding,
  type FindingIn,
  type Message,
  type Mode,
  type ModelInfo,
  type Owner,
  type Part,
  type Provider,
  type Question,
  type Tool,
  type ToolOutput,
} from "./types.ts";

export type ExportFormat = "html" | "md" | "jsonl" | "pdf" | "protocol" | "script" | "notebook" | "flow";

export interface SessionOptions {
  adapters: string[];
  model?: string;
  referee?: string;
  mode?: Mode;
  cwd?: string;
  id?: string;
  settings?: Partial<Settings>;
  provider?: Provider;
  refereeProvider?: Provider;
  generic?: boolean;
}

interface Pending<T> {
  resolve: (v: T) => void;
}

const MODE_NOTE: Record<Mode, string> = {
  watch: "Mode is now watch: you run the steps.",
  follow: "Mode is now follow: the scientist does each program step by hand; the harness shows the manual route, waits, and checks the result. Call one program step at a time.",
  teach: "Mode is now teach: the scientist works in the program. Run only read-only tools. When the scientist says a step is finished, call review_my_steps. It reads the steps that the scientist did and compares them with the decision record. Then explain each difference and why it matters.",
  plan: "Mode is now plan: write a plan with the plan tool. Run only read-only tools.",
};

function newId(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${randomBytes(2).toString("hex")}`;
}

async function fileSha(path: string): Promise<string> {
  const st = statSync(path);
  if (st.size > 2_000_000_000) return createHash("sha256").update(`${path}:${st.size}:${st.mtimeMs}`).digest("hex");
  const h = createHash("sha256");
  for await (const chunk of createReadStream(path)) h.update(chunk as Buffer);
  return h.digest("hex");
}

function extOf(p: string): string {
  const m = /\.[A-Za-z0-9]{1,6}$/.exec(p);
  return m ? m[0].toLowerCase() : "";
}

function stringsIn(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => stringsIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => stringsIn(x, out));
  return out;
}

function abortable<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) return reject(new Error("interrupted"));
    const onAbort = () => reject(new Error("interrupted"));
    signal.addEventListener("abort", onAbort, { once: true });
    p.then(
      (v) => (signal.removeEventListener("abort", onAbort), resolve(v)),
      (e) => (signal.removeEventListener("abort", onAbort), reject(e)),
    );
  });
}

export class Session {
  id: string;
  dir: string;
  workDir: string;
  cwd: string;
  mode: Mode;
  busy = false;
  settings: Settings;
  bus = new Bus();
  record: AnalysisRecord;
  decisions!: DecisionRecord;
  questions!: QuestionQueue;
  findings!: Findings;
  provider!: Provider;
  refereeProvider?: Provider;
  adapters: LoadedAdapter[] = [];
  runtimes: AdapterRuntime[] = [];
  adapterInfo: { name: string; title: string; version: string; programVersion: string }[] = [];
  history: Message[] = [];
  private tools = new Map<string, Tool>();
  private active = new Set<string>();
  private hooks!: HookRunner;
  private permissions!: Permissions;
  private sessionAllow = new Set<string>();
  private system = "";
  private notes: string[] = [];
  private abort?: AbortController;
  private permissionWaits = new Map<string, Pending<{ ok: boolean; note: string; always: boolean }>>();
  private followWaits = new Map<number, Pending<{ note: string; agentDoes: boolean }>>();
  private followCount = 0;
  private permCount = 0;
  private callCount = 0;
  private lastAnswer = "";
  private waitedQids = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;

  private constructor(id: string, cwd: string, settings: Settings) {
    this.id = id;
    this.cwd = cwd;
    this.settings = settings;
    this.mode = settings.mode;
    this.dir = join(gaHome(), "sessions", id);
    mkdirSync(this.dir, { recursive: true });
    this.record = new AnalysisRecord(this.dir, id);
    this.workDir = this.record.workDir;
    this.record.onAppend = (entry: Entry) => this.bus.emit({ type: "entry", entry });
  }

  get model(): ModelInfo {
    return this.provider.info;
  }

  static async create(opts: SessionOptions): Promise<Session> {
    const cwd = opts.cwd ?? process.cwd();
    const settings = loadSettings(cwd, { ...(opts.settings ?? {}), mode: opts.mode, model: opts.model, referee: opts.referee });
    const s = new Session(opts.id ?? newId(), cwd, settings);
    await s.init(opts);
    return s;
  }

  static async resume(id: string, opts: Partial<SessionOptions> = {}): Promise<Session> {
    const log = join(gaHome(), "sessions", id, "log.jsonl");
    if (!existsSync(log)) throw new Error(`no session ${id}`);
    const first = readFileSync(log, "utf8").split("\n").map((l) => (l ? JSON.parse(l) : null)).find((e) => e?.kind === "session");
    const adapters = opts.adapters ?? ((first?.data.adapters ?? []) as { name: string; path?: string }[]).map((a) => (a.path && existsSync(a.path) ? a.path : a.name));
    return Session.create({ ...opts, adapters, id, model: opts.model ?? first?.data.modelSpec, mode: opts.mode ?? first?.data.mode });
  }

  private async init(opts: SessionOptions) {
    const resumed = this.record.entries(["session"]).length > 0;
    this.adapters = opts.adapters.map((a) => applyOverlay(findAdapter(a, this.cwd)));
    this.provider = opts.provider ?? (await makeProvider(this.settings.model, { effort: this.settings.effort, numCtx: this.settings.numCtx, think: this.settings.think }));
    if (opts.refereeProvider) this.refereeProvider = opts.refereeProvider;
    else if (this.settings.referee === "same") this.refereeProvider = this.provider;
    else if (this.settings.referee && this.settings.referee !== "none") this.refereeProvider = await makeProvider(this.settings.referee, { effort: this.settings.effort });

    const { startAdapter } = await import("../adapters/runtime.ts");
    const runtimeInfo: { adapter: LoadedAdapter; programVersion: string; instructions: string }[] = [];
    for (const a of this.adapters) {
      const rt = await startAdapter(a, { workDir: this.workDir, sessionDir: this.dir });
      this.runtimes.push(rt);
      runtimeInfo.push({ adapter: a, programVersion: rt.programVersion, instructions: rt.instructions });
      this.adapterInfo.push({ name: a.name, title: a.manifest.adapter.title || a.manifest.program.name, version: a.manifest.adapter.version, programVersion: rt.programVersion });
      const mod = await a.module();
      for (const t of [...(await rt.tools()), ...(mod.tools ?? []).map((t) => ({ ...t, adapter: t.adapter ?? a.name, source: "adapter" as const }))]) {
        const name = this.tools.has(t.name) ? `${a.name.replace(/-/g, "_")}_${t.name}` : t.name;
        this.tools.set(name, { ...t, name, remoteName: t.remoteName ?? t.name });
      }
    }

    this.decisions = new DecisionRecord(this.adapters, this.record);
    let notify: ((q: Question) => Promise<void>) | undefined;
    if (this.settings.notify.ntfy) {
      try {
        const { ntfyNotifier } = await import("../server/notify.ts");
        notify = ntfyNotifier(this.settings.notify.ntfy);
      } catch {}
    }
    this.questions = new QuestionQueue(this.record, { notify });
    this.findings = new Findings(this.record);
    this.permissions = new Permissions(this.settings.permissions);

    const extra: Tool[] = [];
    try {
      const { genericTools } = await import("../tools/generic.ts");
      const generic = genericTools({ workDir: this.workDir, sessionDir: this.dir });
      const always = new Set(["read_file", "list_dir"]);
      extra.push(...generic.filter((t) => opts.generic || this.adapters.length === 0 || always.has(t.name)));
    } catch {}
    try {
      const { runScriptTool } = await import("../tools/run_script.ts");
      extra.push(runScriptTool({ workDir: this.workDir, sessionDir: this.dir }, { network: this.settings.networkForScripts }));
    } catch {}
    extra.push((await import("../tools/calculate.ts")).calculateTool());
    extra.push(
      ...coreTools({
        adapters: this.adapters,
        allTools: () => [...this.tools.values()],
        activate: (names) => names.forEach((n) => this.active.add(n)),
        ask: (spec) => this.askTool(spec),
        proposeChange: (spec) => this.proposeChange(spec),
        compare: (spec) => this.compareOptions(spec),
        proposeLab: (adapter, kind, payload, reason) => {
          const c = propose(adapter, kind as "default", payload, reason, this.record);
          return { ok: true, summary: `Proposed lab rule ${c.pid}. The scientist approves it with /lab.` };
        },
        log: (kind, data) => this.record.append(kind, data),
      }),
    );
    if (this.adapters.some((a) => a.manifest.connection.history_tool)) extra.push(this.reviewTool());
    if (!this.provider.info.small) extra.push(taskTool({ provider: () => this.provider, tools: () => [...this.tools.values()], run: (t, a, id, sig) => this.pipeline(t, a, id, sig) }));
    for (const t of extra) if (!this.tools.has(t.name)) this.tools.set(t.name, t);
    this.chooseActiveTools();

    const moduleHooks = (await Promise.all(this.adapters.map(async (a) => (await a.module()).hooks ?? []))).flat();
    this.hooks = new HookRunner(
      [...(this.settings.guidance ? [decisionHook(this.decisions)] : []), modeHook(() => this.mode, (n) => this.findTool(n)?.readOnly ?? false), ...moduleHooks],
      this.settings.hooks,
      this.cwd,
    );

    this.system = systemPrompt({ adapters: runtimeInfo, model: this.provider.info, mode: this.mode, lab: labText(this.cwd), guidance: this.settings.guidance });
    if (resumed) {
      this.history = this.record.messages();
      this.notes.push("The session was resumed after a restart. Program state may have reset; outputs from earlier steps are still on disk.");
    } else {
      this.record.append("session", {
        adapters: this.adapterInfo.map((a) => ({ name: a.name, version: a.version, programVersion: a.programVersion, path: this.adapters.find((x) => x.name === a.name)?.root })),
        model: this.provider.info.model,
        modelSpec: this.settings.model,
        provider: this.provider.info.provider,
        referee: this.settings.referee,
        mode: this.mode,
        cwd: this.cwd,
        guidance: this.settings.guidance,
      });
    }
    await this.hooks.event("SessionStart", { session: this.id });
    this.timer = setInterval(() => this.expireQuestions(), 30_000);
    this.timer.unref?.();
  }

  expireQuestions(now = Date.now()) {
    for (const q of this.questions.expire(now)) {
      if (q.status === "defaulted" && q.decisionKey) this.decisions.change(q.decisionKey, q.answer, { by: "human", reason: `default after the time limit of ${q.qid}` });
      this.notes.push(q.status === "defaulted" ? `Question ${q.qid} reached its time limit. The default ${String(q.answer)} applies.` : `Question ${q.qid} reached its time limit with no answer. That branch stays stopped.`);
    }
  }

  private chooseActiveTools(request = "") {
    const all = [...this.tools.values()];
    const adapterTools = all.filter((t) => t.source === "adapter");
    const deferred = this.settings.toolExposure === "search" || (this.settings.toolExposure === "auto" && this.provider.info.small && adapterTools.length > 24);
    if (!this.active.size) this.active = new Set(all.filter((t) => t.source !== "adapter" || !deferred).map((t) => t.name));
    if (!deferred) {
      this.active.delete("find_tools");
      return;
    }
    const states = new Set(this.adapters.map((a) => a.manifest.connection.state_tool).filter(Boolean));
    const keep = [
      ...adapterTools.filter((t) => states.has(t.remoteName ?? t.name)),
      ...(request ? searchTools(adapterTools, request, 10) : []),
      ...adapterTools.filter((t) => !t.deferred),
    ];
    for (const t of keep) {
      if ([...this.active].filter((n) => this.tools.get(n)?.source === "adapter").length >= 16) break;
      this.active.add(t.name);
    }
  }

  private findTool(name: string): Tool | undefined {
    return this.tools.get(name) ?? [...this.tools.values()].find((t) => t.remoteName === name);
  }

  private adapterOf(t: Tool): LoadedAdapter | undefined {
    return this.adapters.find((a) => a.name === t.adapter);
  }

  allTools(): Tool[] {
    return [...this.tools.values()];
  }

  setupNeeded(): boolean {
    return this.settings.guidance && this.record.entries(["setup"]).length === 0;
  }

  // ------------------------------------------------------------- turn

  async send(text: string): Promise<string> {
    if (this.busy) throw new Error("the agent is busy; wait or press Esc to stop it");
    this.busy = true;
    this.abort = new AbortController();
    const signal = this.abort.signal;
    let revised = false;
    let nudges = 0;
    let lastSig = "";
    let repeats = 0;
    let forceAnswer = false;
    try {
      await this.hooks.event("UserPromptSubmit", { session: this.id, text });
      if (this.setupNeeded()) this.decisions.applySetup({}, { how: "defaults accepted without review (the setup card was skipped)" });
      if (this.history.length === 0 && this.settings.guidance) this.notes.unshift(this.decisions.brief(), MODE_NOTE[this.mode]);
      this.chooseActiveTools(text);
      this.record.append("user", { text });
      const notes = this.drainNotes();
      this.push({ role: "user", parts: [{ type: "text", text: notes ? `${notes}\n\n${text}` : text }] });
      for (let step = 0; step < this.settings.maxSteps; step++) {
        await this.maybeCompact(signal);
        this.bus.emit({ type: "status", state: "thinking" });
        const res = await this.provider.step({
          system: this.system,
          messages: this.history,
          tools: forceAnswer ? [] : this.activeSchemas(),
          signal,
          onDelta: (d) => this.bus.emit({ type: "delta", kind: d.type, text: d.text }),
        });
        this.push(res.message);
        this.record.append("usage", { ...res.usage, model: this.provider.info.model });
        if (res.note) this.record.append("notice", { text: res.note });
        const thinking = res.message.parts.flatMap((p) => (p.type === "thinking" && p.text ? [p.text] : [])).join("\n");
        if (thinking) this.record.append("thinking", { text: thinking });
        const said = res.message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n").trim();
        const calls = res.message.parts.filter((p): p is Extract<Part, { type: "tool_call" }> => p.type === "tool_call");
        if (!calls.length && !said && nudges < 2) {
          nudges++;
          const names = this.activeSchemas().map((t) => t.name).join(", ");
          const why = res.usage.outputTokens > 20
            ? `Your last reply was lost. It was probably a call to a tool that does not exist, so nothing ran. Use only these tools: ${names}. Skills are procedures, not tools: read one with load_skill.${this.active.has("find_tools") ? " To find more tools, call find_tools." : ""}`
            : "Your last reply was empty. Do the next step with a tool, or give your answer to the scientist.";
          this.push({ role: "user", parts: [{ type: "text", text: `[Notes from the harness]\n- ${why}` }] });
          continue;
        }
        if (!calls.length && nudges < 2) {
          const tail = said.slice(-400);
          const promise = /\b(I will|I'll|Let me|Let's|Next,? I|Now,? I|I am going to|I'm going to)\b[^.?!]*(\.|:|$)\s*$/i.test(tail) || /\b(I will|I'll) (now )?(use|call|run|compute|count|measure|perform|fit|check)\b/i.test(tail) || /\b(I need to|I have to|I must|the next step is to|next, I need to)\s+(use|call|run|compute|count|measure|perform|fit|check|merge|filter|align|infer)\b/i.test(tail);
          const asksLeave = this.settings.headless && /\b(would you like me to|shall I|should I|do you want me to)\b[^?]*\?\s*$/i.test(tail);
          const turnStart = this.record.entries(["user"]).at(-1)?.id ?? 0;
          const ranStep = this.record.nodes().some((n) => n.entry > turnStart && !n.sensitivityOf && n.tool !== "calculate");
          const noWork = this.settings.headless && this.adapters.length > 0 && !ranStep;
          if (promise || asksLeave || noWork) {
            nudges++;
            this.record.append("assistant", { text: said, final: false });
            const why = asksLeave
              ? "The scientist is not here to answer. Go on with your recommendation."
              : promise
                ? "You said what you will do next, but you did not call a tool. Do it now with a tool call, or give your final answer."
                : "No program step has run in this turn, so the request is not answered yet. Run the next step now with a tool. If a tool failed, fix the input and try again.";
            this.push({ role: "user", parts: [{ type: "text", text: `[Notes from the harness]\n- ${why}` }] });
            continue;
          }
        }
        if (!calls.length) {
          const out = await this.finishAnswer(said, revised, signal);
          if (out.revise) {
            revised = true;
            this.push({ role: "user", parts: [{ type: "text", text: out.revise }] });
            continue;
          }
          return out.text;
        }
        if (said) this.record.append("assistant", { text: said, final: false });
        const results: Part[] = [];
        for (const call of calls) {
          if (signal.aborted) {
            results.push({ type: "tool_result", callId: call.id, name: call.name, text: "ERROR: not run. The scientist stopped the turn.", isError: true });
            continue;
          }
          const sig = `${call.name}:${JSON.stringify(call.args)}`;
          repeats = sig === lastSig ? repeats + 1 : 0;
          lastSig = sig;
          if (repeats >= 2) {
            forceAnswer = true;
            this.record.append("notice", { text: `The agent called ${call.name} with the same input three times. The harness asks for the final answer.` });
            results.push({ type: "tool_result", callId: call.id, name: call.name, text: `ERROR: you called ${call.name} with the same input three times in a row. Stop. Give your final answer now, from the results you have.`, isError: true });
            continue;
          }
          results.push(await this.runCall(call, signal));
        }
        const pending = this.drainNotes();
        if (pending) results.push({ type: "text", text: pending } as Part);
        this.push({ role: "user", parts: results });
        if (signal.aborted) {
          this.record.append("notice", { text: "Stopped. The results so far are kept." });
          return "";
        }
      }
      this.record.append("notice", { text: `Paused after ${this.settings.maxSteps} steps. Type "continue" to go on.` });
      return "";
    } catch (e) {
      const msg = e instanceof ProviderError ? e.message : signal.aborted ? "Stopped." : `${(e as Error).name}: ${(e as Error).message}`;
      this.record.append(signal.aborted ? "notice" : "error", signal.aborted ? { text: msg } : { message: msg });
      this.closeOpenCalls();
      return "";
    } finally {
      this.busy = false;
      this.bus.emit({ type: "status", state: "idle" });
      await this.hooks.event("Stop", { session: this.id }).catch(() => {});
    }
  }

  private closeOpenCalls() {
    const last = this.history[this.history.length - 1];
    if (last?.role !== "assistant") return;
    const calls = last.parts.filter((p): p is Extract<Part, { type: "tool_call" }> => p.type === "tool_call");
    if (calls.length)
      this.push({ role: "user", parts: calls.map((c) => ({ type: "tool_result", callId: c.id, name: c.name, text: "ERROR: not run. The turn stopped.", isError: true })) });
  }

  private push(m: Message) {
    this.history.push(m);
    this.record.append("message", { message: m as unknown as Record<string, unknown> });
  }

  private drainNotes(): string {
    if (!this.notes.length) return "";
    const text = "[Notes from the harness]\n" + this.notes.map((n) => `- ${n}`).join("\n");
    this.notes = [];
    return text;
  }

  private activeSchemas() {
    return [...this.tools.values()].filter((t) => this.active.has(t.name)).map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
  }

  private async maybeCompact(signal: AbortSignal, force = false) {
    if (!force && !needsCompaction(this.history, this.system, this.provider.info.contextWindow)) return;
    const res = await compact(this.history, this.provider, signal);
    if (!res) return;
    const upTo = this.record.entries(["message"]).at(-1)?.id ?? 0;
    this.record.append("compaction", { summary: res.summary, upTo });
    this.history = [summaryMessage(res.summary), ...res.kept];
    for (const m of res.kept) this.record.append("message", { message: m as unknown as Record<string, unknown> });
  }

  private async finishAnswer(text: string, revised: boolean, signal: AbortSignal): Promise<{ text: string; revise?: string }> {
    if (!this.settings.guidance) {
      this.record.append("assistant", { text, final: true });
      this.lastAnswer = text;
      return { text };
    }
    const pre = await this.hooks.preAnswer({ event: "PreAnswer", session: this.id, answer: text });
    const answer = pre.answer ?? text;
    const claims = checkAnswer(answer, this.record);
    const ctx = { record: this.record, decisions: this.decisions, adapters: this.adapters, answer, claims };
    const found: { f: FindingIn; source: Finding["source"] }[] = [...(pre.findings ?? []).map((f) => ({ f, source: "hook" as const }))];
    for (const f of await runChecks(ctx)) found.push({ f, source: "rule" });
    if (this.refereeProvider && !signal.aborted) {
      try {
        for (const f of await referee(this.refereeProvider, ctx)) found.push({ f, source: "referee" });
      } catch (e) {
        this.record.append("notice", { text: `The referee did not run: ${(e as Error).message}` });
      }
    }
    const errors = found.filter((x) => x.f.severity === "error");
    if (errors.length && !revised && this.settings.reviseOnFindings) {
      this.record.append("notice", { text: `Review found ${errors.length} problem(s). The agent revises the answer before you see it.` });
      return {
        text: "",
        revise: "[Review before the answer reaches the scientist]\n" + errors.map((x) => `- ${x.f.message}`).join("\n") + "\nFix these problems. Then give the answer again.",
      };
    }
    const fids = found.map(({ f, source }) => this.findings.add(f, source).fid);
    const settings = this.settingsUsed();
    const shown = settings ? `${answer}\n\n${settings}` : answer;
    const annotated = annotate(answer, claims) + (settings ? `\n\n${settings}` : "");
    this.record.append("assistant", { text: shown, annotated, final: true, findings: fids, settings });
    this.lastAnswer = answer;
    return { text: annotated };
  }

  private settingsUsed(): string {
    const stale = this.record.stale();
    const keys = new Set<string>();
    for (const n of this.record.nodes()) if (!n.sensitivityOf && !stale.has(n.id)) for (const k of Object.keys(n.decisions ?? {})) keys.add(k);
    const fields = this.decisions.fields().filter((f) => keys.has(f.key) && f.set);
    if (!fields.length) return "";
    const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
    const items = fields.map((f) => `${f.label}: ${show(f.value)}${f.owner === "agent" ? " (agent's choice)" : ""}`);
    return `Settings used, from the decision record: ${items.join(" · ")}.`;
  }

  // ------------------------------------------------------------- tool calls

  private fail(callId: string, name: string, message: string, adapter?: string): Part {
    this.record.append("tool_result", { callId, tool: name, adapter, ok: false, error: message, text: message });
    return { type: "tool_result", callId, name, text: `ERROR: ${message}`, isError: true };
  }

  private async runCall(call: Extract<Part, { type: "tool_call" }>, signal: AbortSignal): Promise<Part> {
    const tool = this.findTool(call.name);
    this.record.append("tool_call", { callId: call.id, tool: call.name, adapter: tool?.adapter, args: call.args as Record<string, unknown> });
    this.bus.emit({ type: "status", state: "running", tool: call.name });
    if (call.parseError) return this.fail(call.id, call.name, `the arguments are not valid JSON: ${call.parseError}`);
    if (!tool) return this.fail(call.id, call.name, `no tool named ${call.name}. Use find_tools to search.`);
    if (!this.active.has(tool.name)) this.active.add(tool.name);
    const args = dropNulls((call.args && typeof call.args === "object" ? call.args : {}) as Args, tool.inputSchema);
    const r = await this.pipeline(tool, absolutePaths(args, this.cwd) as Args, call.id, signal);
    return { type: "tool_result", callId: call.id, name: call.name, text: r.text, images: r.images, isError: r.isError };
  }

  async pipeline(tool: Tool, args: Args, callId: string, signal: AbortSignal, depth = 0): Promise<{ text: string; images?: string[]; isError: boolean; output?: ToolOutput }> {
    const error = (message: string) => {
      this.record.append("tool_result", { callId, tool: tool.name, adapter: tool.adapter, ok: false, error: message, text: message });
      return { text: `ERROR: ${message}`, isError: true };
    };
    if (tool.source === "generic" && !this.pathAllowed(args)) return error("This path is outside the folders of this analysis. Ask the scientist where the data is, or use a path from the request.");
    if ((this.mode === "plan" || this.mode === "teach") && !tool.readOnly)
      return error(this.mode === "plan" ? "Plan mode: the agent plans and runs only read-only tools. Switch to watch mode to run steps." : "Teach mode: the scientist runs the steps and the agent runs only read-only tools.");
    const pre = await this.hooks.pre({ event: "PreToolUse", session: this.id, mode: this.mode, tool: tool.remoteName ?? tool.name, adapter: tool.adapter, args, readOnly: tool.readOnly } as never);
    let eff = (pre.updatedArgs ?? args) as Args;
    if (pre.deviations?.length) this.record.append("deviation", { callId, tool: tool.name, deviations: pre.deviations });
    if (pre.decision === "deny") return error(pre.reason ?? "a hook denied this call");
    const missing = ((tool.inputSchema.required as string[]) ?? []).filter((k) => eff[k] === undefined && !(pre.waitingOn ?? []).some((w) => this.adapterOf(tool)?.linksFor(tool.remoteName ?? tool.name)[k] === w));
    if (missing.length) return error(`missing required arguments: ${missing.join(", ")}`);
    if (pre.decision === "block") {
      const answered = await this.blockOn(pre.waitingOn ?? [], tool, eff, callId, signal);
      if (!answered) {
        return {
          text: `BLOCKED: ${pre.reason ?? "a decision belongs to the scientist"} A question is waiting for the scientist. Do not guess the value. Continue with steps that do not need it, or end your turn with a short summary of what waits.`,
          isError: true,
        };
      }
      if (depth > 3) return error("the decision is still open after the answer");
      const adapter = this.adapterOf(tool);
      const links = adapter?.linksFor(tool.remoteName ?? tool.name) ?? {};
      const next = structuredClone(args);
      for (const [arg, key] of Object.entries(links)) if ((pre.waitingOn ?? []).includes(key)) setArg(next, arg, this.decisions.value(key));
      return this.pipeline(tool, next, callId, signal, depth + 1);
    }
    let perm = this.sessionAllow.has(tool.name) ? "allow" : this.permissions.check(tool, eff);
    if (pre.decision === "ask" && perm === "allow") perm = "ask";
    if (perm === "deny") return error("the permission rules deny this tool");
    if (perm === "ask") {
      const res = await this.requestPermission(tool, eff, signal);
      if (!res.ok) return error(`the scientist did not allow this${res.note ? `: ${res.note}` : ""}. Ask what they want instead.`);
    }
    if (pre.decision === "instruct") return this.followStep(tool, eff, callId, signal, pre.applied ?? {});
    const kept = (pre.deviations ?? []).filter((d) => d.overwritten);
    const keptNote = kept.length
      ? `The harness used the recorded decision${kept.length > 1 ? "s" : ""}: ${kept.map((d) => `${d.arg} = ${JSON.stringify(d.setup)} (you gave ${JSON.stringify(d.requested)})`).join("; ")}. The scientist owns ${kept.length > 1 ? "these values" : "this value"}. To change it, call propose_change. To check other values without a change, call compare_options.`
      : "";
    const out = await this.execute(tool, eff, callId, signal, { applied: pre.applied ?? {} });
    const post = await this.hooks.post({ event: "PostToolUse", session: this.id, tool: tool.remoteName ?? tool.name, adapter: tool.adapter, args: eff, output: out.output, node: out.node });
    for (const f of post.findings ?? []) this.findings.add(f, "hook");
    const r = this.render(tool, out.output);
    const extra = [keptNote, post.additionalContext].filter(Boolean).join("\n");
    return { text: extra ? `${r.text}\n\nNote: ${extra}` : r.text, images: r.images, isError: !out.output.ok, output: out.output };
  }

  async execute(tool: Tool, args: Args, callId: string, signal: AbortSignal, meta: { applied?: Record<string, unknown>; sensitivityOf?: string }): Promise<{ output: ToolOutput; node?: string }> {
    const t0 = performance.now();
    let output: ToolOutput;
    try {
      output = await tool.execute(args, {
        session: this.id,
        callId,
        workDir: this.workDir,
        sessionDir: this.dir,
        signal,
        log: (kind, data) => this.record.append(kind, data),
        callTool: async (name, a) => {
          const t = this.findTool(name);
          if (!t) return { ok: false, error: `no tool named ${name}` };
          const id = `${callId}.${++this.callCount}`;
          this.record.append("tool_call", { callId: id, tool: name, adapter: t.adapter, args: a, from: tool.name });
          const r = await this.pipeline(t, a, id, signal);
          return r.output ?? { ok: false, error: r.text };
        },
      });
    } catch (e) {
      output = { ok: false, error: signal.aborted ? "interrupted: the scientist stopped this tool" : `${(e as Error).name}: ${(e as Error).message}` };
    }
    const durationS = (performance.now() - t0) / 1000;
    const adapter = this.adapterOf(tool);
    const remote = tool.remoteName ?? tool.name;
    const entry = adapter?.mapEntry(remote, args);
    const mod = adapter ? await adapter.module() : {};
    const manualRoute = output.manualRoute ?? mod.manualRoute?.(remote, args) ?? entry?.route ?? "";
    const fidelity = output.fidelity ?? entry?.fidelity ?? (tool.source === "adapter" ? (manualRoute ? "close" : "none") : "none");
    const fileList = [...(output.outputs ?? [])];
    for (const img of output.images ?? []) if (!fileList.some((o) => o.path === img)) fileList.push({ path: img, kind: "image" });
    const outputs = fileList
      .filter((o) => existsSync(o.path) && statSync(o.path).isFile())
      .map((o) => ({ ...o, sha: this.record.putBlob(o.path, extOf(o.path)) }));
    const images = outputs.filter((o) => o.kind === "image" && /\.(png|jpe?g)$/i.test(o.path));
    const summary = output.summary ?? (output.ok ? `Ran ${remote}.` : `Failed: ${output.error ?? "unknown error"}`);
    let node: string | undefined;
    const argStrings = stringsIn(args);
    const sensitivityOf = meta.sensitivityOf || this.record.nodes().find((n) => n.sensitivityOf && n.outputs.some((o) => argStrings.includes(o.path)))?.sensitivityOf || undefined;
    const makesNode = output.ok && (tool.source === "adapter" || tool.name === "run_script" || tool.name === "calculate");
    const nodeId = makesNode ? `n${this.record.nodes().length + 1}` : undefined;
    this.record.append(
      "tool_result",
      {
        callId,
        tool: tool.name,
        adapter: tool.adapter,
        ok: output.ok,
        error: output.error,
        summary,
        text: (output.text ?? "").slice(0, 4000),
        metrics: output.metrics,
        table: output.table,
        images: images.map((o) => o.sha),
        files: outputs.filter((o) => !images.includes(o)).map((o) => o.sha),
        durationS,
        effectiveArgs: args,
        manualRoute,
        fidelity,
        sensitivityOf,
      },
      { node: nodeId },
    );
    if (makesNode) {
      const strings = stringsIn(args);
      const inputs = strings.filter((s) => s.length < 1024 && (s.startsWith("/") || /^[A-Za-z]:\\/.test(s)) && existsSync(s) && statSync(s).isFile());
      const parents = this.record.nodes().filter((n) => n.outputs.some((o) => strings.includes(o.path) || (o.sha && strings.some((s) => s.includes(o.sha!))))).map((n) => n.id);
      const n = this.record.addNode({
        entry: this.record.entries(["tool_result"]).at(-1)!.id,
        adapter: tool.adapter ?? "",
        adapterVersion: adapter?.manifest.adapter.version ?? "",
        programVersion: this.adapterInfo.find((a) => a.name === tool.adapter)?.programVersion ?? "",
        tool: remote,
        args,
        decisions: meta.applied ?? {},
        codeHash: createHash("sha256").update(`${adapter?.name}@${adapter?.manifest.adapter.version}:${remote}:${JSON.stringify(entry ?? {})}`).digest("hex"),
        inputHashes: await Promise.all(inputs.filter((p) => !this.record.nodes().some((x) => x.outputs.some((o) => o.path === p))).map(fileSha)),
        outputs,
        result: { ok: output.ok, summary, metrics: output.metrics ?? {}, table: output.table, data: output.data },
        parents,
        summary,
        model: this.provider.info.model,
        manualRoute,
        fidelity,
        sensitivityOf: sensitivityOf ?? "",
      });
      node = n.id;
    }
    return { output: { ...output, summary, manualRoute, fidelity, outputs }, node };
  }

  private render(tool: Tool, o: ToolOutput): { text: string; images?: string[] } {
    const adapter = this.adapterOf(tool);
    const cloud = this.provider.info.provider === "claude";
    const vis = cloud ? (adapter?.manifest.data_rules.cloud_visibility ?? "all") : "all";
    const small = this.provider.info.small;
    const limit = small ? Math.min(this.settings.maxResultChars, 6000) : this.settings.maxResultChars;
    if (o.text && !o.metrics && !o.table && !o.outputs?.length && vis === "all") return { text: o.text.slice(0, limit) };
    const obj: Record<string, unknown> = { ok: o.ok };
    if (o.error) obj.error = o.error;
    if (o.summary) obj.summary = o.summary;
    if (vis !== "none") {
      if (o.metrics && Object.keys(o.metrics).length) obj.metrics = o.metrics;
      if (o.outputs?.length) obj.outputs = o.outputs.map((f) => ({ name: f.name, kind: f.kind, path: f.path }));
      if (o.table) obj.table = vis === "summaries" ? { columns: o.table.columns, n_rows: o.table.n_rows, path: o.table.path } : { ...o.table, rows: o.table.rows.slice(0, small ? 5 : 12) };
      if (vis === "all" && o.data !== undefined) obj.data = o.data;
      if (vis === "all" && o.text) obj.text = o.text;
    }
    if (o.manualRoute && !small) obj.manual_route = o.manualRoute;
    let text = JSON.stringify(obj, null, small ? 0 : 1);
    if (text.length > limit) text = text.slice(0, limit) + `\n[cut ${text.length - limit} characters; read the files for the rest]`;
    const images = vis === "all" && this.provider.info.vision ? (o.outputs ?? []).filter((f) => f.kind === "image" && /\.(png|jpe?g)$/i.test(f.path)).map((f) => f.path).slice(0, 4) : [];
    return { text, images };
  }

  // ------------------------------------------------------------- decisions owned by the scientist

  private pathAllowed(args: Args): boolean {
    const paths = ["path", "folder", "cwd"].map((k) => args[k]).filter((v): v is string => typeof v === "string" && v.length > 0).map((v) => resolve(this.cwd, v));
    if (!paths.length) return true;
    const named = this.record.entries(["user", "setup"]).flatMap((e) => stringsIn(e.data)).flatMap((t) => t.match(/(?:~|\/|[A-Za-z]:\\)[^\s"'`,;]+/g) ?? []).map((t) => resolve(this.cwd, t.replace(/^~(?=\/)/, process.env.HOME ?? "~").replace(/[.)\]]+$/, "")));
    const roots = [this.cwd, this.dir, gaHome(), ...this.adapters.map((a) => a.root), ...named, ...named.map((n) => join(n, ".."))];
    const nodeFiles = this.record.nodes().flatMap((n) => n.outputs.map((o) => join(o.path, "..")));
    roots.push(...nodeFiles);
    return paths.every((p) => roots.some((r) => {
      const rel = relative(r, p);
      return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
    }));
  }

  private decisionOf(key: string) {
    for (const a of this.adapters) {
      const d = a.manifest.decisions.find((x) => x.key === key);
      if (d) return { adapter: a, decision: d };
    }
    return undefined;
  }

  private async blockOn(keys: string[], tool: Tool, args: Args, callId: string, signal: AbortSignal): Promise<boolean> {
    const qids: string[] = [];
    for (const key of keys) {
      const open = this.questions.open().find((q) => q.decisionKey === key);
      if (open) {
        qids.push(open.qid);
        continue;
      }
      const found = this.decisionOf(key);
      let evidence = "";
      if (found?.decision.sensitivity) {
        const d = found.decision;
        const sensTool = d.sensitivity!.tool || (tool.remoteName ?? tool.name);
        const link = d.links.find((l) => l.tool === sensTool);
        const target = this.findTool(sensTool);
        const canCompare = sensTool === (tool.remoteName ?? tool.name) || this.record.nodes().some((n) => n.tool === sensTool && !n.sensitivityOf);
        if (link && target && !canCompare) evidence = `No comparison yet: ${sensTool} has not run in this session, so the options cannot be compared before you choose.`;
        if (link && target && canCompare) {
          this.record.append("notice", { text: `Comparing the options for "${d.label}" before asking you.` });
          const same = sensTool === (tool.remoteName ?? tool.name);
          const lastRun = same ? undefined : this.record.nodes().filter((n) => n.tool === sensTool && !n.sensitivityOf).at(-1);
          const base: Args = same ? structuredClone(args) : lastRun ? structuredClone(lastRun.args) : {};
          const links = this.adapterOf(target)?.linksFor(sensTool) ?? {};
          for (const [arg, k] of Object.entries(links)) {
            if (k === key || !keys.includes(k)) continue;
            const other = this.decisionOf(k)?.decision;
            if (other?.default !== undefined) setArg(base, arg, other.default);
            else deleteArg(base, arg);
          }
          try {
            const res = await runSensitivity(d, sensTool, base, link.arg, async (_t, a, meta) => this.execute(target, a, `${callId}.s${++this.callCount}`, signal, { sensitivityOf: meta.sensitivityOf }), this.record);
            evidence = [res.table, ...res.holds, ...res.depends].join("\n");
          } catch (e) {
            evidence = `The comparison did not run: ${(e as Error).message}`;
          }
        }
      }
      const d = found?.decision;
      const proposed = d?.links.map((l) => getArg(args, l.arg)).find((v) => v !== undefined && v !== null && v !== "");
      const q = await this.questions.ask({
        decisionKey: key,
        title: d?.label ?? key,
        text: `${d?.help || `The agent needs a value for "${d?.label ?? key}".`} The agent wants to run ${tool.remoteName ?? tool.name}.`,
        options: (d?.choices ?? []).map((c) => ({ value: c, label: String(c) })),
        recommendation: proposed !== undefined ? { value: proposed, reason: "The agent proposed this value in its tool call." } : d?.default !== undefined ? { value: d.default, reason: "This is the adapter default." } : undefined,
        evidence,
        default: d?.default,
      });
      this.bus.emit({ type: "question", question: q });
      qids.push(q.qid);
    }
    this.record.append("blocked", { callId, tool: tool.name, reason: `waiting for the scientist: ${keys.join(", ")}`, qid: qids.join(",") });
    if (!this.settings.askWaits) return false;
    this.bus.emit({ type: "status", state: "waiting", tool: tool.name });
    try {
      qids.forEach((q) => this.waitedQids.add(q));
      for (const qid of qids) await abortable(this.questions.wait(qid), signal);
      return keys.every((k) => this.decisions.isSet(k));
    } catch {
      return false;
    }
  }

  private async askTool(spec: { question: string; options: string[]; recommendation?: string; reason?: string; wait: boolean }): Promise<ToolOutput> {
    const q = await this.questions.ask({
      decisionKey: "",
      title: spec.question.length > 80 ? spec.question.slice(0, 77) + "..." : spec.question,
      text: spec.question,
      options: spec.options.map((o) => ({ value: o, label: o })),
      recommendation: spec.recommendation ? { value: spec.recommendation, reason: spec.reason ?? "" } : undefined,
      evidence: "",
    });
    this.bus.emit({ type: "question", question: q });
    if ((!spec.wait && !this.settings.headless) || !this.settings.askWaits) return { ok: true, summary: `Question ${q.qid} is waiting for the scientist. Continue with other work.` };
    this.bus.emit({ type: "status", state: "waiting" });
    this.waitedQids.add(q.qid);
    try {
      const done = await abortable(this.questions.wait(q.qid), this.abort?.signal);
      const note = this.record.entries(["answer"]).filter((e) => e.data.qid === q.qid).at(-1)?.data.note;
      return { ok: true, summary: `The scientist answered: ${String(done.answer)}${note ? ` (${note})` : ""}`, data: { answer: done.answer, note } };
    } catch {
      return { ok: false, error: "the question is still open" };
    }
  }

  private async proposeChange(spec: { key: string; value: unknown; reason: string; wait: boolean }): Promise<ToolOutput> {
    const fields = this.decisions.fields();
    const f = fields.find((x) => x.key === spec.key);
    if (!f) return { ok: false, error: `No decision ${spec.key}. Decisions: ${fields.map((x) => x.key).join(", ")}.` };
    if (f.owner === "fixed") return { ok: false, error: `${f.label} is fixed for this analysis. Nobody can change it in this session.` };
    const value = (f.kind === "int" || f.kind === "float") && typeof spec.value === "string" && spec.value.trim() !== "" && Number.isFinite(Number(spec.value)) ? Number(spec.value) : spec.value;
    if (f.choices.length && !f.choices.some((c) => String(c) === String(value))) return { ok: false, error: `${f.label} must be one of: ${f.choices.map(String).join(", ")}.` };
    if (f.owner === "agent") {
      this.decisions.change(f.key, value, { by: "agent", reason: spec.reason });
      return { ok: true, summary: `You own ${f.label}. The record now says ${JSON.stringify(this.decisions.value(f.key))}.` };
    }
    const current = f.set ? f.value : f.default;
    if (current !== undefined && String(current) === String(value)) return { ok: true, summary: `The record already says ${JSON.stringify(current)} for ${f.label}.` };
    const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
    let q = this.questions.open().find((x) => x.decisionKey === f.key);
    if (!q) {
      q = await this.questions.ask({
        decisionKey: f.key,
        title: `Change ${f.label}?`,
        text: `The agent asks to change "${f.label}" from ${current === undefined ? "not set" : show(current)} to ${show(value)}. Reason: ${spec.reason}`,
        options: [{ value, label: `Change to ${show(value)}` }, ...(current === undefined ? [] : [{ value: current, label: `Keep ${show(current)}` }])],
        recommendation: { value, reason: spec.reason },
        evidence: "",
      });
      this.bus.emit({ type: "question", question: q });
    }
    if ((!spec.wait && !this.settings.headless) || !this.settings.askWaits) return { ok: true, summary: `Question ${q.qid} is waiting for the scientist. The record changes only if the scientist agrees.` };
    this.bus.emit({ type: "status", state: "waiting" });
    this.waitedQids.add(q.qid);
    try {
      await abortable(this.questions.wait(q.qid), this.abort?.signal);
      const now = this.decisions.value(f.key);
      return { ok: true, summary: `The scientist answered. The record now says ${JSON.stringify(now)} for ${f.label}.`, data: { key: f.key, value: now } };
    } catch {
      return { ok: false, error: "the question is still open" };
    }
  }

  private async compareOptions(spec: { key: string; values: unknown[] }): Promise<ToolOutput> {
    const found = this.decisionOf(spec.key);
    if (!found) return { ok: false, error: `No decision ${spec.key}.` };
    const d = found.decision;
    const tools = new Set(d.links.map((l) => l.tool));
    const last = this.record.nodes().filter((n) => tools.has(n.tool) && !n.sensitivityOf).at(-1);
    if (!last) return { ok: false, error: `No step that uses ${d.label} has run yet. Run one first, then compare.` };
    const link = d.links.find((l) => l.tool === last.tool)!;
    const target = this.findTool(last.tool);
    if (!target) return { ok: false, error: `The tool ${last.tool} is not available.` };
    const values = (spec.values.length ? spec.values : d.sensitivity?.options.length ? d.sensitivity.options : d.choices).slice(0, 5);
    if (!values.length) return { ok: false, error: `Give the values to compare for ${d.label}.` };
    const signal = this.abort?.signal ?? new AbortController().signal;
    const perm = this.sessionAllow.has(target.name) ? "allow" : this.permissions.check(target, last.args);
    if (perm === "deny") return { ok: false, error: "the permission rules deny this tool" };
    if (perm === "ask") {
      const res = await this.requestPermission(target, { ...last.args, [link.arg]: values }, signal);
      if (!res.ok) return { ok: false, error: `the scientist did not allow the comparison runs${res.note ? `: ${res.note}` : ""}` };
    }
    const plan = { ...d, sensitivity: { options: values, tool: last.tool, args: {}, compare: d.sensitivity?.compare ?? [], max_runs: values.length } };
    const res = await runSensitivity(plan, last.tool, structuredClone(last.args), link.arg, async (_t, a, meta) => this.execute(target, a, `cmp${++this.callCount}`, signal, { sensitivityOf: meta.sensitivityOf }), this.record);
    const summary = `Compared ${values.length} values of ${d.label} as comparison runs. The record still says ${JSON.stringify(this.decisions.value(d.key))}.`;
    return {
      ok: true,
      summary,
      text: [summary, res.table, ...res.holds, ...res.depends].join("\n"),
      data: { table: res.table, holds: res.holds, depends: res.depends },
    };
  }

  // ------------------------------------------------------------- permissions and follow mode

  private async requestPermission(tool: Tool, args: Args, signal: AbortSignal): Promise<{ ok: boolean; note: string; always: boolean }> {
    const rid = `r${++this.permCount}`;
    const code = typeof args.code === "string" ? args.code : undefined;
    let touches = tool.adapter ? `Runs ${tool.remoteName ?? tool.name} in ${this.adapterInfo.find((a) => a.name === tool.adapter)?.title}. It writes only to the session folder.` : "Runs on this computer with your user permissions.";
    if (tool.name === "run_script") {
      try {
        const { describeLimits } = await import("../tools/run_script.ts");
        touches = describeLimits(this.settings.networkForScripts);
      } catch {}
    }
    const sha256 = code ? createHash("sha256").update(code).digest("hex") : undefined;
    const p = new Promise<{ ok: boolean; note: string; always: boolean }>((resolve) => this.permissionWaits.set(rid, { resolve }));
    this.bus.emit({ type: "permission", rid, tool: tool.name, args, code, touches });
    this.bus.emit({ type: "status", state: "waiting", tool: tool.name });
    let res: { ok: boolean; note: string; always: boolean };
    try {
      res = await abortable(p, signal);
    } catch {
      res = { ok: false, note: "the turn stopped", always: false };
    }
    this.permissionWaits.delete(rid);
    if (res.ok && res.always) this.sessionAllow.add(tool.name);
    this.record.append("permission", { rid, tool: tool.name, decision: res.ok ? "allowed" : "denied", by: "scientist", note: res.note, always: res.always, sha256 });
    return res;
  }

  respondPermission(rid: string, ok: boolean, note = "", always = false): void {
    this.permissionWaits.get(rid)?.resolve({ ok, note, always });
  }

  pendingPermissions(): string[] {
    return [...this.permissionWaits.keys()];
  }

  private async followStep(tool: Tool, args: Args, callId: string, signal: AbortSignal, applied: Record<string, unknown>) {
    const step = ++this.followCount;
    const adapter = this.adapterOf(tool);
    const remote = tool.remoteName ?? tool.name;
    const mod = adapter ? await adapter.module() : {};
    const text = instruction(adapter, remote, args, mod.manualRoute?.(remote, args));
    this.record.append("follow_step", { step, tool: remote, instruction: text, status: "waiting" });
    const p = new Promise<{ note: string; agentDoes: boolean }>((resolve) => this.followWaits.set(step, { resolve }));
    this.bus.emit({ type: "instruction", step, tool: remote, text });
    this.bus.emit({ type: "status", state: "waiting", tool: remote });
    let done: { note: string; agentDoes: boolean };
    try {
      done = await abortable(p, signal);
    } catch {
      return { text: "ERROR: the scientist stopped before doing this step.", isError: true };
    } finally {
      this.followWaits.delete(step);
    }
    const out = await this.execute(tool, args, callId, signal, { applied });
    const r = this.render(tool, out.output);
    if (done.agentDoes) {
      this.record.append("follow_step", { step, tool: remote, instruction: text, status: "agent did it" });
      return { text: r.text, images: r.images, isError: !out.output.ok, output: out.output };
    }
    let state: unknown;
    const stateTool = adapter?.manifest.connection.state_tool ? this.findTool(adapter.manifest.connection.state_tool) : undefined;
    if (stateTool && stateTool.name !== tool.name) {
      try {
        state = (await stateTool.execute({}, { session: this.id, callId: `${callId}.state`, workDir: this.workDir, sessionDir: this.dir, signal, log: (k, d) => this.record.append(k, d), callTool: async () => ({ ok: false }) })).data;
      } catch {}
    }
    const cmp = compareNote(done.note, out.output.metrics ?? {});
    this.record.append("follow_step", { step, tool: remote, instruction: text, expected: out.output.metrics ?? {}, observed: { note: done.note, state }, match: cmp.match, checked: cmp.checked, differences: cmp.differences, status: "done" });
    const verdict = cmp.checked === 0 ? "The scientist gave no numbers to compare." : cmp.match ? "The scientist's numbers match the reference run." : `The numbers differ: ${cmp.differences.join("; ")}.`;
    return { text: `The scientist did step ${step} by hand. Their note: "${done.note}". ${verdict}\nReference run:\n${r.text}`, images: r.images, isError: !out.output.ok, output: out.output };
  }

  async followDone(step: number, note = "", agentDoes = false): Promise<void> {
    this.followWaits.get(step)?.resolve({ note, agentDoes });
  }

  pendingFollowSteps(): number[] {
    return [...this.followWaits.keys()];
  }

  private reviewTool(): Tool {
    return {
      name: "review_my_steps",
      description: "Teach mode. Read the steps that the scientist did in the program, and compare each step with the decision record. Gives the differences, the decisions that the record does not cover yet, and the steps that the adapter map does not know. Call it when the scientist says that a step is finished. Give args only if the history tool needs them, such as the path of a saved recording.",
      inputSchema: {
        type: "object",
        properties: { adapter: { type: "string", description: "Adapter name. Optional if one adapter has a history tool." }, args: { type: "object", description: "Arguments for the history tool of the adapter, such as {\"path\": \"/data/recording.ijm\"}." } },
        required: [],
      },
      source: "harness",
      readOnly: true,
      permission: "allow",
      execute: async (a) => {
        const r = await this.teachReview(typeof a.adapter === "string" ? a.adapter : undefined, (a.args && typeof a.args === "object" ? a.args : {}) as Args);
        return { ok: r.ok, error: r.error, text: r.text, summary: r.ok ? `${r.n_match} of ${r.n_steps} steps match the record.` : r.error, data: r };
      },
    };
  }

  async teachReview(adapterName?: string, args: Args = {}): Promise<TeachSummary> {
    return teachReview(
      {
        adapters: this.adapters,
        decisions: this.decisions,
        record: this.record,
        runHistory: async (adapter, name, a) => {
          const tool = [...this.tools.values()].find((t) => t.adapter === adapter.name && (t.remoteName ?? t.name) === name);
          if (!tool) return { ok: false, error: `${adapter.name} has no tool named ${name}.` };
          if (!tool.readOnly) return { ok: false, error: `${name} is not read-only, so teach mode does not run it.` };
          const callId = `teach${++this.callCount}`;
          this.record.append("tool_call", { callId, tool: tool.name, adapter: tool.adapter, args: a });
          const r = await this.pipeline(tool, absolutePaths(a, this.cwd) as Args, callId, this.abort?.signal ?? new AbortController().signal);
          return r.output ?? { ok: false, error: r.text };
        },
      },
      adapterName,
      args,
    );
  }

  // ------------------------------------------------------------- scientist actions

  interrupt(): void {
    this.abort?.abort();
    for (const rt of this.runtimes) rt.cancel().catch(() => {});
  }

  async answer(qid: string, value: unknown, note = ""): Promise<void> {
    const waited = this.waitedQids.has(qid);
    const q = this.questions.answer(qid, value, note);
    if (q.decisionKey) this.decisions.change(q.decisionKey, q.answer, { by: "human", reason: `answer to ${qid}` });
    if (waited) return;
    this.notes.push(`The scientist answered ${qid} (${q.title}): ${String(q.answer)}${note ? ` - ${note}` : ""}.`);
    if (!this.busy && this.settings.autoResume && this.history.length) void this.send("Continue the analysis with this answer.").catch(() => {});
  }

  setDecision(key: string, value: unknown, reason = ""): string[] {
    const stale = this.decisions.change(key, value, { by: "human", reason });
    this.notes.push(`The scientist changed "${key}" to ${JSON.stringify(value)}.${stale.length ? ` Results that used the old value are out of date: ${stale.join(", ")}. Run those steps again if they matter.` : ""}`);
    return stale;
  }

  setOwner(key: string, owner: Owner): void {
    this.decisions.setOwner(key, owner, "human");
    this.notes.push(`The scientist set the owner of "${key}" to ${owner}.`);
  }

  setMode(mode: Mode): void {
    if (mode === this.mode) return;
    this.record.append("mode", { old: this.mode, new: mode });
    this.mode = mode;
    this.notes.push(MODE_NOTE[mode]);
  }

  async review(): Promise<Finding[]> {
    const answer = this.lastAnswer || (this.record.entries(["assistant"]).filter((e) => e.data.final).at(-1)?.data.text as string) || "";
    const claims = checkAnswer(answer, this.record);
    const ctx = { record: this.record, decisions: this.decisions, adapters: this.adapters, answer, claims };
    const out: Finding[] = [];
    for (const f of await runChecks(ctx)) out.push(this.findings.add(f, "rule"));
    if (this.refereeProvider) for (const f of await referee(this.refereeProvider, ctx)) out.push(this.findings.add(f, "referee"));
    return out;
  }

  async compact(): Promise<void> {
    await this.maybeCompact(new AbortController().signal, true);
  }

  async exportAs(fmt: ExportFormat): Promise<string> {
    const out = join(this.dir, "exports");
    mkdirSync(out, { recursive: true });
    const trail = await import("./trail.ts");
    const ex = await import("./exports.ts");
    const a = this.adapters;
    switch (fmt) {
      case "html": return trail.exportHtml(this.record, a, join(out, "trail.html"));
      case "md": return trail.exportMarkdown(this.record, a, join(out, "trail.md"));
      case "jsonl": return trail.exportJsonl(this.record, join(out, "log.jsonl"));
      case "pdf": return trail.exportPdf(this.record, a, join(out, "trail.pdf"));
      case "protocol": return ex.exportProtocol(this.record, a, join(out, "protocol.md"));
      case "script": return ex.exportScript(this.record, a, join(out, "replay.ts"));
      case "notebook": return ex.exportNotebook(this.record, a, join(out, "analysis.ipynb"));
      case "flow": return ex.exportFlow(this.record, a, join(out, "flow.json"));
    }
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.interrupt();
    await Promise.all(this.runtimes.map((r) => r.close().catch(() => {})));
  }
}

function dropNulls(args: Args, schema: Record<string, unknown>): Args {
  const props = (schema.properties ?? {}) as Record<string, { type?: unknown }>;
  const out: Args = {};
  for (const [k, v] of Object.entries(args)) {
    const t = props[k]?.type;
    const nullable = t === "null" || (Array.isArray(t) && t.includes("null"));
    if ((v === null || v === "") && !nullable && !((schema.required as string[] | undefined) ?? []).includes(k)) continue;
    out[k] = v;
  }
  return out;
}

function absolutePaths(v: unknown, cwd: string): unknown {
  if (typeof v === "string") {
    if (!v || v.length > 1024 || isAbsolute(v) || /^[a-z]+:\/\//i.test(v) || !/[\\/.]/.test(v)) return v;
    const p = resolve(cwd, v.replace(/^~(?=\/)/, process.env.HOME ?? "~"));
    return existsSync(p) ? p : v;
  }
  if (Array.isArray(v)) return v.map((x) => absolutePaths(x, cwd));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, absolutePaths(x, cwd)]));
  return v;
}

function deleteArg(args: Args, path: string) {
  const keys = path.split(".");
  let cur: unknown = args;
  for (const k of keys.slice(0, -1)) {
    if (!cur || typeof cur !== "object") return;
    cur = (cur as Record<string, unknown>)[k];
  }
  if (cur && typeof cur === "object") delete (cur as Record<string, unknown>)[keys.at(-1)!];
}

function setArg(args: Args, path: string, value: unknown) {
  const keys = path.split(".");
  let cur: Record<string, unknown> = args;
  for (const k of keys.slice(0, -1)) cur = (cur[k] && typeof cur[k] === "object" ? cur[k] : (cur[k] = {})) as Record<string, unknown>;
  cur[keys.at(-1)!] = value;
}

function getArg(args: Args, path: string): unknown {
  let cur: unknown = args;
  for (const k of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}
