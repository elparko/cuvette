import { spawn } from "node:child_process";
import type { Mode, Owner, Question } from "../core/types.ts";
import { pilotText } from "../core/pilot.ts";
import { planView } from "../core/plan.ts";
import { claudeKey, claudeWorkspace, credentialsPath, elabftwConfig, maskKey, removeClaudeKey, removeElabftw, saveClaudeWorkspace } from "../core/credentials.ts";
import { KEYS_URL, keyGuideText } from "../core/keyhelp.ts";
import { stepNumbers } from "../core/housekeeping.ts";
import { statusText, stepStatus, type StepState } from "../core/status.ts";
import { find, recordSetting, type SettingSession } from "../core/settings.ts";
import { listSessions, sessionLine } from "../core/sessions.ts";
import { groupSummary, sheetTable } from "../core/samples.ts";
import { dollars, kTokens, percentText, priceLine, usageLong, type UsageSummary } from "../core/spend.ts";
import { applyRewind, changeCard, changePicker, changeRows, choiceLabel, choiceValue, findChange, show, type Card } from "./cards.ts";
import { testsText } from "../core/testcount.ts";
import { powerNotes, powerText } from "../core/power.ts";
import { rewindPoints } from "../core/rewind.ts";
import { branchesText } from "../core/branch.ts";
import { listMethods, methodText } from "../core/methods.ts";
import type { OutputRef } from "./items.ts";
import type { SessionLike } from "./types.ts";

export interface CommandCtx {
  session: SessionLike;
  print(text: string, title?: string): void;
  notice(text: string): void;
  error(text: string): void;
  openCard(card: Card): void;
  hasQuestionCard(qid: string): boolean;
  refresh(): void;
  clear(): void;
  quit(): void;
  keys?(): string;
  outputs(): OutputRef[];
  toggleDetails(): boolean;
  startWindow(): Promise<string>;
  startPanel(): Promise<{ url: string; opened: string[]; failed: string[] }>;
  startApp(): Promise<string>;
}

export interface Command {
  name: string;
  args?: string;
  help: string;
  run(args: string[], ctx: CommandCtx): Promise<void> | void;
}

const MODES: Mode[] = ["watch", "follow", "teach", "plan"];
const OWNERS: Owner[] = ["human", "agent", "fixed"];
const FORMATS = ["html", "md", "jsonl", "pdf", "protocol", "script", "notebook", "flow", "eln", "xlsx"];

async function lazy<T>(load: () => Promise<T>): Promise<T | undefined> {
  try {
    return await load();
  } catch {
    return undefined;
  }
}

const unavailable = (ctx: CommandCtx) => ctx.notice("Not available yet.");

export function parseCommand(text: string): { head: string; args: string[] } {
  const [head = "", ...args] = text.replace(/^\//, "").trim().split(/\s+/);
  return { head: head.toLowerCase(), args };
}

export const unknownCommand = (head: string) => (head ? `Unknown command /${clip(head, 30)}. Type /help.` : "Type a command name after the slash. Type /help to see the list.");

export function failureText(name: string, e: unknown, session?: SessionLike): string {
  if (e instanceof TypeError || e instanceof RangeError || e instanceof ReferenceError || e instanceof SyntaxError) {
    const short = `${e.name}: ${e.message.slice(0, 200)}`;
    try {
      session?.record.append("error", { command: name, name: e.name, message: e.message, stack: e.stack ?? "" });
    } catch {}
    return `/${name} failed. Cuvette hit a program error: ${short}. The full error is in the session record. Type /export jsonl to save a copy of the record, then report the problem.`;
  }
  return `/${name} failed: ${problemOf(e)}`;
}

export function problemOf(e: unknown): string {
  const err = e as NodeJS.ErrnoException;
  if (err?.code === "EACCES" || err?.code === "EPERM" || err?.code === "EROFS") return `Cuvette cannot write in ${err.path ?? "that folder"}. The folder has read-only access, or you have no permission. Choose another folder, or fix the permission, then type the command again.`;
  if (err?.code === "ENOSPC") return "The disk is full. Free some space, then type the command again.";
  return err?.message ?? String(e);
}

export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const fmt = (r: string[]) => r.map((c, i) => c.padEnd(widths[i]!)).join("  ").trimEnd();
  return [fmt(headers), fmt(widths.map((w) => "-".repeat(w))), ...rows.map(fmt)].join("\n");
}

function clip(s: string, n = 48): string {
  const one = s.replace(/\s+/g, " ");
  return one.length > n ? one.slice(0, n - 1) + "…" : one;
}

export function parseDecision(f: { kind: string; choices?: any[] }, raw: string): unknown {
  if (f.choices?.length) {
    const n = Number(raw);
    const hit = f.choices.find((c) => String(choiceValue(c)) === raw || choiceLabel(c).toLowerCase() === raw.toLowerCase());
    if (hit !== undefined) return choiceValue(hit);
    if (Number.isInteger(n) && n >= 1 && n <= f.choices.length) return choiceValue(f.choices[n - 1]);
    throw new Error(`Use one of: ${f.choices.map(choiceLabel).join(", ")}`);
  }
  if (/bool/.test(f.kind)) return /^(true|yes|on|1)$/i.test(raw);
  if (/int|float|num|real/.test(f.kind)) {
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) throw new Error("Type a number.");
    return n;
  }
  return raw;
}

export async function citeCommand(args: string[], session: SessionLike): Promise<string> {
  const c = await import("../core/citations.ts");
  const sub = (args[0] ?? "").toLowerCase();
  const style = c.CITATION_STYLES.includes(sub as never) ? (sub as "apa" | "vancouver") : c.citationStyle(args[1] ?? session.citationStyle?.() ?? "apa");
  if (sub === "programs" || sub === "program") {
    const { adapterDirs, loadAdapter } = await import("../adapters/manifest.ts");
    const want = args[1];
    const out: string[] = [];
    for (const [name, dir] of Object.entries(adapterDirs(session.cwd))) {
      if (want && name !== want) continue;
      try {
        const a = loadAdapter(dir);
        const how = c.howToCite(a, style);
        out.push(`${a.manifest.program.name} (${name})`, ...(how.length ? how.map((h) => `  ${h}`) : ["  No citation. Cite the program by name and version."]), "");
      } catch {}
    }
    if (!out.length) throw new Error(want ? `No adapter named ${want}.` : "No adapters found.");
    return out.join("\n").trim();
  }
  const cites = c.sessionCitations(session.record, session.adapters ?? [], stepNumbers(session.record.nodes()));
  if (["bibtex", "bib", "ris", "text", "txt"].includes(sub)) {
    const all = c.allRefs(cites);
    if (!all.some((r) => r.adapter)) throw new Error("No program step ran yet. Nothing to cite except Cuvette.");
    const dir = session.outputDir ?? session.workDir;
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    mkdirSync(dir, { recursive: true });
    const [file, text] = sub.startsWith("bib") ? ["references.bib", c.toBibtex(all)] : sub === "ris" ? ["references.ris", c.toRis(all)] : ["references.txt", c.citeList(cites, style)];
    const path = join(dir, file);
    writeFileSync(path, text);
    return `Saved ${all.length} references: ${path}`;
  }
  if (sub && !c.CITATION_STYLES.includes(sub as never)) throw new Error("Use: /cite, /cite apa, /cite vancouver, /cite bibtex, /cite ris, /cite text [apa|vancouver] or /cite programs [adapter].");
  return c.citeText(cites, style);
}

export function statusOf(session: SessionLike): StepState[] {
  return stepStatus(session.record, { labels: session.labels?.() });
}

export async function freshStatus(session: SessionLike): Promise<StepState[]> {
  return session.checkStatus ? session.checkStatus() : statusOf(session);
}

export function rerunText(session: SessionLike, states = statusOf(session)): string | undefined {
  const out = states.filter((s) => !s.current);
  if (!out.length) return undefined;
  const lines = out.map((s) => `- Step ${s.step} (${s.tool}): ${s.reasons.map((r) => r.text).join(" ")}`);
  return `These steps are out of date. Run each step again in order. Use the current decision values and the same input files:\n${lines.join("\n")}\nThen update the answer.`;
}

export function decisionRows(session: SessionLike): string[][] {
  const by: Record<string, string> = {};
  for (const e of session.record.entries(["setup", "decision"])) {
    if (e.kind === "setup") {
      const defaults = new Set((e.data.defaultsAccepted as string[] | undefined) ?? []);
      for (const k of Object.keys((e.data.values as object) ?? {})) by[k] = defaults.has(k) ? "default" : e.data.adapter ? "setup" : "you (setup)";
    } else by[String(e.data.key)] = String(e.data.by ?? "human");
  }
  return session.decisions
    .fields()
    .map((f) => [f.key, clip(show(f.value)), session.decisions.owner(f.key), f.set && f.value !== "" && f.value !== null && f.value !== undefined ? (by[f.key] ?? "setup") : "not set"]);
}

function questionLine(q: Question): string {
  const opts = q.options.map((o, i) => `${i + 1}=${o.label}`).join("  ");
  return `${q.qid}  ${q.title}${opts ? `\n    ${opts}` : ""}`;
}

export function matchOption(q: Question, raw: string): { ok: true; value: unknown } | { ok: false } {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= q.options.length) return { ok: true, value: q.options[n - 1]!.value };
  const hit = q.options.find((o) => String(o.value) === raw || o.label.toLowerCase() === raw.toLowerCase());
  if (hit) return { ok: true, value: hit.value };
  return { ok: false };
}

const TRAIL_ICON: Record<string, string> = {
  setup: "⚙",
  step: "●",
  decision: "✎",
  question: "?",
  deviation: "⚠",
  finding: "⚠",
  note: "▸",
};

export function usageText(u: UsageSummary): string {
  const row = (t: UsageSummary["total"], label: string) => [label, clip(t.request, 36), String(t.steps), kTokens(t.input), kTokens(t.output), kTokens(t.cacheRead), kTokens(t.cacheWrite), u.local && t.usd === 0 ? "$0" : dollars(t.usd)];
  const rows = u.turns.map((t) => row(t, String(t.turn)));
  rows.push(row({ ...u.total, request: "" }, "Total"));
  return [
    table(["Turn", "Request", "Model steps", "Input", "Output", "Cache read", "Cache write", "Cost"], rows),
    "",
    `Now: ${usageLong(u)}. Model: ${u.model}${u.local ? ", on this computer" : ""}.`,
    u.local ? "A local model has no cost." : priceLine(u.model) || "Cuvette has no price for this model.",
    `Before each step, the harness shortens old tool output above 50% of the window. It summarizes the older messages above 70%. The context is at ${percentText(u.percent)} now.`,
    "This table counts the steps of the analysis model. The referee, the titles and the summaries are not in it. /config shows the Claude spend of this month.",
  ].filter(Boolean).join("\n");
}

export function renderTrail(lines: any[], level: number): string {
  const out: string[] = [];
  for (const l of lines) {
    out.push(`${String(l.n).padStart(2)}. ${TRAIL_ICON[l.icon] ?? "▸"} ${l.line}${l.stale ? "  [out of date]" : ""}${l.badges?.includes("rewound") ? "  [rewound]" : ""}`);
    if (level >= 2 && l.details) for (const [k, v] of Object.entries(l.details)) out.push(`      ${k}: ${clip(show(v), 100)}`);
    if (level >= 3 && l.technical) for (const [k, v] of Object.entries(l.technical)) out.push(`      · ${k}: ${clip(show(v), 100)}`);
  }
  return out.join("\n") || "The trail is empty.";
}

export function renderGraph(session: SessionLike): string {
  const nodes = session.record.nodes();
  if (!nodes.length) return "No steps yet.";
  const stale = session.record.stale();
  const rewound = session.record.rewound();
  const steps = stepNumbers(nodes);
  const name = (id: string) => (steps.has(id) ? `Step ${steps.get(id)}` : `Comparison ${id}`);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kids = new Map<string, string[]>();
  const placed = new Set<string>();
  const roots: string[] = [];
  for (const n of nodes) {
    const parents = n.parents.filter((p) => byId.has(p));
    if (!parents.length) roots.push(n.id);
    else kids.set(parents[0]!, [...(kids.get(parents[0]!) ?? []), n.id]);
  }
  const out: string[] = [];
  const label = (id: string) => {
    const n = byId.get(id)!;
    const extra = n.parents.length > 1 ? ` (also from ${n.parents.slice(1).map(name).join(", ")})` : "";
    return `${name(id)} ${clip(n.summary || n.tool, 60)}${extra}${stale.has(id) ? "  [out of date]" : ""}${rewound.has(id) ? "  [rewound]" : ""}`;
  };
  const walk = (id: string, prefix: string, last: boolean, top: boolean) => {
    if (placed.has(id)) return;
    placed.add(id);
    out.push(top ? label(id) : `${prefix}${last ? "└─ " : "├─ "}${label(id)}`);
    const next = top ? "" : prefix + (last ? "   " : "│  ");
    const c = kids.get(id) ?? [];
    c.forEach((k, i) => walk(k, next, i === c.length - 1, false));
  };
  roots.forEach((r) => walk(r, "", true, true));
  return out.join("\n");
}

export const noOpen = () => !!(process.env.VITEST || process.env.CUVETTE_NO_OPEN);

export function openWithOs(path: string): void {
  if (noOpen()) return;
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [path]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", path]]
        : ["xdg-open", [path]];
  const child = spawn(cmd!, args as string[], { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}

export async function openPanels(session: SessionLike, url: string): Promise<{ opened: string[]; failed: string[] }> {
  const opened: string[] = [];
  const failed: string[] = [];
  for (const a of (session as unknown as { adapters?: { name: string; module(): Promise<{ openPanel?: (url: string, o: { sessionDir: string }) => Promise<unknown> }> }[] }).adapters ?? []) {
    try {
      const mod = await a.module();
      if (!mod.openPanel) continue;
      await mod.openPanel(url, { sessionDir: session.dir });
      opened.push(a.name);
    } catch (e) {
      failed.push(`${a.name}: ${(e as Error).message}`);
    }
  }
  return { opened, failed };
}

async function loadProfiles(): Promise<{ name: string; version: number }[]> {
  const mod = await lazy(() => import("../core/decisions.ts"));
  try {
    return mod?.DecisionRecord?.listProfiles?.() ?? [];
  } catch {
    return [];
  }
}

export async function openSetup(ctx: CommandCtx, proposed?: Record<string, unknown>, proposedFrom?: string): Promise<void> {
  ctx.openCard({ t: "setup", profiles: await loadProfiles(), proposed, proposedFrom });
}

async function allOpen(): Promise<Question[] | undefined> {
  return (await lazy(() => import("../core/questions.ts")))?.allOpenQuestions();
}

const base: Command[] = [
  {
    name: "help",
    help: "Show this list.",
    run(_, ctx) {
      const rows = commands.map((c) => [`/${c.name}${c.args ? " " + c.args : ""}`, c.help]);
      const keys = ctx.keys?.() ?? "Keys: Esc stops the agent. Shift+Tab changes the mode. Ctrl+C twice quits. Up and Down show past input.";
      ctx.print(table(["Command", "What it does"], rows) + "\n\n" + keys, "Commands");
    },
  },
  { name: "setup", help: "Open the setup card for your choices.", run: (_, ctx) => openSetup(ctx) },
  { name: "config", help: "Show and change the settings.", run: (_, ctx) => ctx.openCard({ t: "config" }) },
  {
    name: "programs",
    args: "[adapter]",
    help: "Show the programs that the adapters use. Install, update, remove, set a path, turn an adapter on or off, or check again.",
    run: ([name], ctx) => ctx.openCard({ t: "programs", name }),
  },
  {
    name: "decisions",
    args: "[agent|me]",
    help: "Show each decision, its owner and who set it. Type agent to give your decisions to the agent. Type me to take all agent decisions back.",
    run([who], ctx) {
      if (who === "agent" || who === "me") {
        const [from, to]: Owner[] = who === "agent" ? ["human", "agent"] : ["agent", "human"];
        const keys = ctx.session.decisions.fields().filter((f) => ctx.session.decisions.owner(f.key) === from).map((f) => f.key);
        for (const k of keys) ctx.session.setOwner(k, to);
        ctx.notice(keys.length ? `${who === "agent" ? "The agent now owns" : "You now own"} ${keys.length} ${keys.length === 1 ? "decision" : "decisions"}: ${keys.join(", ")}. Fixed decisions do not change.` : "No decision changed owner.");
      } else if (who) return ctx.error("Use: /decisions, /decisions agent or /decisions me.");
      ctx.print(table(["Key", "Value", "Owner", "Set by"], decisionRows(ctx.session)), "Decisions");
    },
  },
  {
    name: "change",
    args: "[question or decision] [value]",
    help: "Change an answer or a decision. /change lists them; /change <id> opens one; /change <key> <value> sets it. Steps that used the old value become out of date.",
    run([key, ...rest], ctx) {
      const raw = rest.join(" ").trim();
      if (!key || !raw) {
        const rows = changeRows(ctx.session);
        if (!rows.length) return ctx.notice("No answer or decision to change yet.");
        if (!key) return ctx.openCard(changePicker(rows));
        const row = findChange(rows, key);
        return row ? ctx.openCard(changeCard(row)) : ctx.error(`No answer or decision named ${clip(key, 40)}. Type /change to see the list.`);
      }
      const f = ctx.session.decisions.fields().find((x) => x.key === key);
      if (!f) return ctx.error(`No decision named ${clip(key, 40)}. See /decisions.`);
      if (f.owner === "fixed") return ctx.error(`${f.label} has the owner fixed. A lab profile or /owner set it. /change does not change a fixed decision.`);
      let value: unknown;
      try {
        value = parseDecision(f, raw);
      } catch (e) {
        return ctx.error((e as Error).message);
      }
      let stale: string[];
      try {
        stale = ctx.session.setDecision(key, value, "changed by the scientist");
      } catch (e) {
        return ctx.error(`${(e as Error).message} The value did not change.`);
      }
      ctx.notice(`${f.label} is now ${show(value)}.${stale.length ? ` ${stale.length} ${stale.length === 1 ? "step is" : "steps are"} out of date. Type /rerun to run them again.` : ""}`);
      ctx.refresh();
    },
  },
  {
    name: "status",
    help: "List each step as up to date or out of date, with the reason.",
    async run(_, ctx) {
      ctx.print(statusText(await freshStatus(ctx.session)), "Status");
    },
  },
  {
    name: "rerun",
    help: "Run the out-of-date steps again. /status shows them and the reasons.",
    async run(_, ctx) {
      const text = rerunText(ctx.session, await freshStatus(ctx.session));
      if (!text) return ctx.notice("No step is out of date.");
      if (ctx.session.busy) return ctx.error("The agent is busy. Wait, then type /rerun again.");
      void ctx.session.send(text).catch((e: Error) => ctx.error(`The agent stopped: ${e.message}`));
    },
  },
  {
    name: "owner",
    args: "<key> <human|agent|fixed>",
    help: "Change who owns a decision.",
    run([key, owner], ctx) {
      if (!key || !OWNERS.includes(owner as Owner)) return ctx.error("Use: /owner <key> <human|agent|fixed>");
      if (!ctx.session.decisions.fields().some((f) => f.key === key)) return ctx.error(`No decision named ${clip(key, 40)}. See /decisions.`);
      ctx.session.setOwner(key, owner as Owner);
      ctx.notice(`Owner of ${key} is now ${owner}.`);
    },
  },
  {
    name: "permissions",
    args: "[bypass|ask]",
    help: "Show or change the permission mode. bypass allows tool calls without a card.",
    run([m], ctx) {
      if (m === "bypass" || m === "ask") {
        ctx.session.setPermissionMode(m);
        ctx.refresh();
      } else if (m) return ctx.error("Use: /permissions bypass or /permissions ask");
      const now = ctx.session.permissionMode;
      ctx.print(
        now === "bypass"
          ? "Bypass permissions is on. The harness allows each tool call that has a permission card, without a card, and logs it with the reason \"bypass permissions\".\n" +
              "These do not change. Method decisions stay with you (/decisions agent gives them to the agent). Plan and teach mode still block steps. The blind benchmark rules and the macOS sandbox still apply. A push to eLabFTW still asks. Deny rules in settings still deny.\n" +
              "Type /permissions ask to show the permission cards again."
          : "Ask (the default). A tool call that needs permission shows a card, and you allow or deny it. Type /permissions bypass to allow them without a card.",
        "Permissions",
      );
    },
  },
  {
    name: "trust",
    args: "[on|once|off]",
    help: "Show the trust state of this folder and the contents of its .ga or .cuvette folder. Options: on trusts the folder, once trusts it for this session, off removes the trust.",
    async run([m], ctx) {
      const choice = { on: "trust", once: "once", off: "no" }[m ?? ""] as "trust" | "once" | "no" | undefined;
      if (m && !choice) return ctx.error("Use: /trust, /trust on, /trust once or /trust off");
      const cwd = ctx.session.cwd ?? process.cwd();
      const tr = await import("../core/trust.ts");
      if (choice) {
        if (!ctx.session.setTrust) return unavailable(ctx);
        ctx.notice(await ctx.session.setTrust(choice));
        ctx.refresh();
        return;
      }
      const t = tr.trustStatus(cwd);
      const lines = [`Folder: ${t.scan.folder}`, `Trust: ${tr.stateLabel(t)}`, ...(t.state === "none" ? ["This folder has no settings, hooks or adapters that need trust."] : tr.folderLines(t.scan)), ...(t.changes.length ? ["Changes since you trusted the folder:", ...t.changes.map((c) => `  ${c}`)] : [])];
      ctx.print(lines.join("\n"), "Folder trust");
      if ((t.state === "new" || t.state === "changed") && ctx.session.askTrust) {
        const q = await ctx.session.askTrust();
        if (q && !ctx.hasQuestionCard(q.qid)) ctx.openCard({ t: "question", q });
      }
    },
  },
  {
    name: "mode",
    args: "<watch|follow|teach|plan>",
    help: "Change the mode.",
    run([m], ctx) {
      if (!MODES.includes(m as Mode)) return ctx.error("Use: /mode <watch|follow|teach|plan>");
      if (ctx.session.mode === m) return ctx.notice(`The mode is already ${m}.`);
      ctx.session.setMode(m as Mode);
      ctx.refresh();
    },
  },
  {
    name: "plan",
    args: "[on|off|<request>]",
    help: "Show the proposed analysis: Questions, Proposed metrics, Demonstration on a sample, Confirmed. Type /plan <request> to start it for one request. Type /plan off to skip it for later requests. /proposal does the same.",
    run(args, ctx) {
      const s = ctx.session;
      const sub = args.join(" ").trim();
      if (sub === "on" || sub === "off") {
        if (!s.setPlanFirst) return unavailable(ctx);
        s.setPlanFirst(sub === "on");
        return ctx.refresh();
      }
      if (!sub) {
        const v = planView(s.record);
        if (v) return ctx.print(v.text, v.approved ? `Confirmed, version ${v.version}` : `Proposed metrics, version ${v.version}`);
        return ctx.notice(s.planFirst ? "No proposed analysis yet. Type your request. The agent proposes the analysis first." : "No proposed analysis yet. Type /plan <request>.");
      }
      if (s.busy) return ctx.error("The agent is busy. Wait, then type /plan again.");
      void s.send(sub, { plan: true }).catch((e: Error) => ctx.error(`The agent stopped: ${e.message}`));
    },
  },
  {
    name: "proposal",
    args: "[on|off|<request>]",
    help: "The same as /plan.",
    run(args, ctx) {
      const s = ctx.session;
      const sub = args.join(" ").trim();
      if (sub === "on" || sub === "off") {
        if (!s.setPlanFirst) return unavailable(ctx);
        s.setPlanFirst(sub === "on");
        return ctx.refresh();
      }
      if (!sub) {
        const v = planView(s.record);
        if (v) return ctx.print(v.text, v.approved ? `Confirmed, version ${v.version}` : `Proposed metrics, version ${v.version}`);
        return ctx.notice(s.planFirst ? "No proposed analysis yet. Type your request. The agent proposes the analysis first." : "No proposed analysis yet. Type /plan <request>.");
      }
      if (s.busy) return ctx.error("The agent is busy. Wait, then type /plan again.");
      void s.send(sub, { plan: true }).catch((e: Error) => ctx.error(`The agent stopped: ${e.message}`));
    },
  },
  {
    name: "pilot",
    args: "[on|off]",
    help: "Show the last pilot, or turn the pilot gate on or off. With the gate on, a step that processes many files waits for a pilot on one sample.",
    run([sub], ctx) {
      const s = ctx.session;
      if (sub === "on" || sub === "off") {
        if (!s.setPilot) return unavailable(ctx);
        s.setPilot(sub === "on");
        return ctx.refresh();
      }
      if (sub) return ctx.error("Use: /pilot, /pilot on or /pilot off.");
      const run = s.record.entries(["pilot_run"]).at(-1);
      if (!run) return ctx.notice("No pilot yet.");
      const done = s.record.entries(["pilot_approved"]).some((e) => e.data.run === run.id);
      ctx.print(pilotText(run.data as never), `Demonstration on ${String(run.data.sample)}${done ? ", confirmed" : ""}`);
    },
  },
  {
    name: "questions",
    help: "List open questions in this session and in all sessions.",
    async run(_, ctx) {
      const mine = ctx.session.questions.open();
      const all = await allOpen();
      const others = (all ?? []).filter((q) => q.session !== ctx.session.id);
      const parts = [`This session (${mine.length}):`, ...(mine.length ? mine.map(questionLine) : ["  none"])];
      if (all) parts.push("", `Other sessions (${others.length}):`, ...(others.length ? others.map((q) => `${questionLine(q)}\n    session ${q.session}`) : ["  none"]));
      if (mine.length) parts.push("", "Answer with /answer <id> <value>, or use the cards below.");
      ctx.print(parts.join("\n"), "Open questions");
      for (const q of mine) if (!ctx.hasQuestionCard(q.qid)) ctx.openCard({ t: "question", q });
    },
  },
  {
    name: "samples",
    args: "[check | open | reload | <row> <column> <value> | <column> <old> = <new>]",
    help: "Show the sample sheet (samples.csv) and change it. check shows the data check.",
    async run(args, ctx) {
      const text = args.join(" ").trim();
      if (text === "check") {
        const checks = ctx.session.record.entries(["data_check"]).map((e) => String(e.data.text ?? ""));
        return ctx.print(checks.length ? checks.join("\n\n") : "No data check yet. The harness checks the data when the agent first reads a table or a folder.", "Data check");
      }
      const sheet = ctx.session.sampleSheet?.();
      if (!sheet) return ctx.notice("There is no sample sheet yet. The agent makes one when it reads the data.");
      if (text === "open") {
        openWithOs(sheet.path);
        return ctx.notice(`Opening ${sheet.path}. After you save it, type /samples reload.`);
      }
      if (text) {
        const said = await ctx.session.editSamples!(text);
        return ctx.notice(said);
      }
      ctx.print([`From ${sheet.from}. Saved as ${sheet.path}.`, "", sheetTable(sheet.rows, 60), "", `${groupSummary(sheet.rows)}.`, "", "Change a cell: /samples 3 group Ceramide. Change a value in all rows: /samples batch Day1 = 2024-03-01. Edit the file: /samples open, then /samples reload."].join("\n"), "Sample sheet");
    },
  },
  {
    name: "answer",
    args: "<qid> <value>",
    help: "Answer an open question by its id.",
    async run([qid, ...rest], ctx) {
      const raw = rest.join(" ").trim();
      if (!qid || !raw) return ctx.error("Use: /answer <qid> <value>");
      const q = ctx.session.questions.open().find((x) => x.qid === qid);
      if (!q) {
        const other = (await allOpen())?.find((x) => x.qid === qid);
        return ctx.error(other ? `${qid} belongs to session ${other.session}. Run: cuvette --resume ${other.session}` : `No open question ${clip(qid, 40)}. Type /questions to see the open questions.`);
      }
      const hit = matchOption(q, raw);
      await ctx.session.answer(qid, hit.ok ? hit.value : raw);
      if (hit.ok) ctx.notice(`Answered ${qid}: ${clip(q.options.find((o) => o.value === hit.value)?.label ?? show(hit.value), 60)}.`);
      else ctx.notice(q.options.length ? `Answered ${qid} with your own value: ${clip(raw, 60)}. It is not one of the options.` : `Answered ${qid}.`);
    },
  },
  {
    name: "trail",
    args: "[1|2|3]",
    help: "Show the audit trail. 1 is short, 3 is the technical record.",
    async run([lv], ctx) {
      if (lv !== undefined && !["1", "2", "3"].includes(lv)) return ctx.error("Use: /trail, /trail 2 or /trail 3.");
      const level = lv === "2" ? 2 : lv === "3" ? 3 : 1;
      const mod = await lazy(() => import("../core/trail.ts"));
      if (!mod?.trail) return unavailable(ctx);
      ctx.print(renderTrail(mod.trail(ctx.session.record, level), level), `Audit trail, level ${level}`);
    },
  },
  {
    name: "graph",
    help: "Show the steps as a tree, with a mark on each out-of-date step.",
    run(_, ctx) {
      ctx.print(renderGraph(ctx.session), "Analysis graph");
    },
  },
  {
    name: "review",
    help: "Check the analysis now and list what the checks found.",
    async run(_, ctx) {
      ctx.notice("Reviewing the analysis.");
      const list = await ctx.session.review();
      if (!list.length) return ctx.notice("The review found nothing.");
      ctx.openCard({ t: "findings", list });
    },
  },
  {
    name: "tests",
    help: "Show each test with a p value in this session, with the Holm and Benjamini-Hochberg p values for its family.",
    run(_, ctx) {
      ctx.print(testsText(ctx.session.record), "Tests in this session");
    },
  },
  {
    name: "power",
    help: "Show the size of effect that each t-test and correlation can find at 80% power.",
    run(_, ctx) {
      const notes = powerNotes(ctx.session.record);
      if (!notes.length) return ctx.notice("No t-test or correlation with a sample size has run yet, so there is no power note.");
      ctx.print(notes.map((p) => powerText(p, false)).join("\n"), "Power in this session");
    },
  },
  {
    name: "findings",
    help: "Accept, reject or mark fixed each open finding.",
    run(_, ctx) {
      const list = ctx.session.findings.list("open");
      if (!list.length) return ctx.notice("No open findings.");
      ctx.openCard({ t: "findings", list });
    },
  },
  {
    name: "checklist",
    args: "[arrive|consort|strobe|miqe]",
    help: "Fill the reporting checklist from the record. Cards ask for each item that is not in the record.",
    async run([which], ctx) {
      if (!ctx.session.checklist) return unavailable(ctx);
      try {
        const r = await ctx.session.checklist(which ?? "");
        ctx.print(r.text, "Reporting checklist");
      } catch (e) {
        ctx.error((e as Error).message);
      }
    },
  },
  {
    name: "rewind",
    args: "[n]",
    help: "Return the conversation to an earlier message or confirmed stage. Later results stay in the folder, marked rewound.",
    run([n], ctx) {
      const s = ctx.session;
      if (!s.rewind) return unavailable(ctx);
      if (n !== undefined) {
        if (!/^\d+$/.test(n)) return ctx.error("Use: /rewind or /rewind <n>");
        const r = applyRewind(s, Number(n));
        if (!r.ok) return ctx.error(r.text);
        ctx.notice(r.text);
        return ctx.refresh();
      }
      if (s.busy) return ctx.error("The agent is busy. Press Esc to stop it, then rewind.");
      const points = rewindPoints(s.record);
      if (!points.length) return ctx.notice("No point to return to yet.");
      ctx.openCard({ t: "rewind", points });
    },
  },
  {
    name: "branch",
    args: "<name> [at <n>]",
    help: "Copy this session into a new folder next to it, to try another method. Add at <n> to copy up to point n of /rewind.",
    run(args, ctx) {
      const s = ctx.session;
      if (!s.branch) return unavailable(ctx);
      const at = args.length >= 3 && args.at(-2) === "at" && /^\d+$/.test(args.at(-1)!) ? Number(args.at(-1)) : undefined;
      const name = (at === undefined ? args : args.slice(0, -2)).join(" ").trim();
      if (!name) return ctx.error("Use: /branch <name> or /branch <name> at <n>");
      if (at === undefined && args.length >= 3 && args.at(-2) === "at" && /^-?\d/.test(args.at(-1)!)) return ctx.error("After at, type the number of a point from /rewind. Use: /branch <name> at <n>");
      try {
        const r = s.branch(name, at);
        ctx.print(`The branch ${clip(name, 60)} is in ${r.folder}.\nThis session does not change. Both records link to each other.\nTo work in the branch, open it: cuvette open "${r.folder}"`, "Branch");
      } catch (e) {
        ctx.error(problemOf(e));
      }
    },
  },
  {
    name: "branches",
    help: "List this session, its parent and its branches, each with a one-line result.",
    run(_, ctx) {
      const s = ctx.session;
      if (!s.branches) return unavailable(ctx);
      const list = s.branches();
      const tail = list.length > 1 ? "\n\nCompare two: /compare <n> <n>" : "\n\nNo branches yet. Make one: /branch <name>";
      ctx.print(branchesText(list) + tail, "Branches");
    },
  },
  {
    name: "compare",
    args: "[a] <b>",
    help: "Show the key numbers and decisions of two branches side by side. Use the numbers or names from /branches.",
    run(args, ctx) {
      const s = ctx.session;
      if (!s.compareBranches) return unavailable(ctx);
      if (!args.length || args.length > 2) return ctx.error("Use: /compare <b> or /compare <a> <b>");
      const [a, b] = args.length === 1 ? ["this", args[0]!] : [args[0]!, args[1]!];
      try {
        const r = s.compareBranches(a, b);
        const body = r.rows.length ? table(["Number", r.a.name, r.b.name, "Change"], r.rows) : "No numbers to compare yet.";
        ctx.print(`${body}\n\n${r.differ} of ${r.rows.length} ${r.rows.length === 1 ? "row differs" : "rows differ"}.`, `Compare: ${r.a.name} and ${r.b.name}`);
      } catch (e) {
        ctx.error((e as Error).message);
      }
    },
  },
  {
    name: "save-method",
    args: "<name> [project]",
    help: "Save the confirmed analysis as a method. A method keeps the questions and answers, the metrics and settings, the programs and the demonstration rule. The project option saves it in .cuvette/methods of the project folder.",
    run(args, ctx) {
      const s = ctx.session;
      if (!s.saveMethod) return unavailable(ctx);
      const project = args.length === 2 && args[1] === "project";
      const name = (project ? args.slice(0, 1) : args).join(" ").trim();
      if (!name) return ctx.error("Use: /save-method <name> or /save-method <name> project");
      try {
        const r = s.saveMethod(name, project ? "project" : "home");
        ctx.print(`${methodText(r.method)}\n\nSaved in ${r.path}.\nUse it on new data: cuvette --method ${r.method.name} <folder>, or /method ${r.method.name} in a new session.`, `Method ${r.method.name}`);
      } catch (e) {
        ctx.error(problemOf(e));
      }
    },
  },
  {
    name: "method",
    args: "[name]",
    help: "List the saved methods, or start this new session from one. The questions come pre-answered and the demonstration still runs.",
    run(args, ctx) {
      const s = ctx.session;
      const name = args.join(" ").trim();
      if (!name) {
        const list = listMethods(s.cwd);
        return ctx.print(list.length ? `${table(["Method", "Saved", "Where", "Question"], list.map((m) => [m.name, m.saved.slice(0, 10), m.where === "home" ? "home" : m.trusted ? "project" : "project, not trusted", clip(m.question, 60)]))}\n\nStart from one: /method <name>` : "No saved methods. Save one with /save-method <name> after you confirm an analysis.", "Methods");
      }
      if (!s.startMethod) return unavailable(ctx);
      try {
        const m = s.startMethod(name);
        ctx.print(`${methodText(m)}\n\nType your request for the new data. The questions come with the saved answers for you to confirm. The demonstration on one sample runs before the batch.`, `Method ${m.name}`);
        ctx.refresh();
      } catch (e) {
        ctx.error((e as Error).message);
      }
    },
  },
  {
    name: "export",
    args: `<${FORMATS.join("|")}> | images [pptx|pdf|both] [figures|qc|pilot|all|<glob>] [step|group|name] [1|2|4|6|9] [16:9|a4|letter]`,
    help: "Write the record in a file format. The images option puts the session images in images.pptx or images.pdf. It puts one image on each slide, or 2, 4, 6 or 9 on each page.",
    async run([fmt, ...rest], ctx) {
      if (fmt === "images") {
        if (!ctx.session.exportImages) return unavailable(ctx);
        const deck = await import("../core/imagedeck.ts");
        const o = deck.parseDeckArgs(rest);
        if (typeof o === "string") return ctx.error(o);
        ctx.notice("Making the image deck...");
        try {
          ctx.notice(deck.deckLine(await ctx.session.exportImages(o)));
        } catch (e) {
          ctx.error(`Image deck failed: ${problemOf(e)}`);
        }
        return;
      }
      if (!FORMATS.includes(fmt ?? "")) return ctx.error(`Use: /export <${FORMATS.join("|")}>, or /export images`);
      try {
        ctx.notice(`Exported: ${await ctx.session.exportAs(fmt)}`);
      } catch (e) {
        ctx.error(`Export failed: ${problemOf(e)}`);
      }
    },
  },
  {
    name: "cite",
    args: "[apa|vancouver|bibtex|ris|text|programs]",
    help: "List the programs and methods to cite for this session. The bibtex, ris and text options save the list in the output folder. The programs option shows how to cite each program.",
    async run(args, ctx) {
      try {
        const r = await citeCommand(args, ctx.session);
        ctx.print(r, "Cite");
      } catch (e) {
        ctx.error(problemOf(e));
      }
    },
  },
  {
    name: "databook",
    args: "[pdf|docx|html] [project] | author <name>",
    help: "Write a data book: the question, data, methods, results, figures and checks of this session. Add project for all sessions of this project folder.",
    async run(args, ctx) {
      const cwd = ctx.session.cwd ?? process.cwd();
      const { changeSetting } = await import("../core/settings.ts");
      if (args[0] === "author") {
        const name = args.slice(1).join(" ").trim();
        if (!name) return ctx.error("Use: /databook author <name>");
        await changeSetting({ cwd }, "databook_author", name, "user");
        return ctx.notice(`Data book author saved in user settings: ${clip(name, 60)}`);
      }
      const formats = args.filter((a) => ["pdf", "docx", "html"].includes(a)) as ("pdf" | "docx" | "html")[];
      const project = args.includes("project");
      const rest = args.filter((a) => !["pdf", "docx", "html", "project"].includes(a));
      if (rest.length) return ctx.error("Use: /databook [pdf|docx|html] [project], or /databook author <name>");
      const db = await import("../core/databook.ts");
      const s = db.bookSettings(cwd);
      ctx.notice("Writing the data book...");
      try {
        const w = await db.writeDatabook({ target: project ? cwd : ctx.session.dir, cwd, formats: formats.length ? formats : ["pdf"] });
        const ask = s.author ? "" : "\nNo author is set. Type /databook author <name> to save it once.";
        ctx.print(db.writtenLines(w).join("\n") + ask, "Data book");
      } catch (e) {
        ctx.error(`Data book failed: ${problemOf(e)}`);
      }
    },
  },
  {
    name: "open",
    args: "<n>",
    help: "Open output number n with the system viewer.",
    run([n], ctx) {
      const outs = ctx.outputs();
      const ref = /^\d+$/.test(n ?? "") ? outs[Number(n) - 1] : undefined;
      if (!ref) return ctx.error(outs.length ? `Use a number from 1 to ${outs.length}.` : "No outputs yet.");
      openWithOs(ref.path);
      ctx.notice(`Opening ${ref.path}`);
    },
  },
  {
    name: "model",
    help: "Show the model. Change it in /config.",
    run(args, ctx) {
      if (args.length) return ctx.error("/model only shows the model. Type /config to change it.");
      const m = ctx.session.model;
      ctx.print(`${m.provider}:${m.model}\ncontext window ${m.contextWindow} tokens · vision ${m.vision ? "yes" : "no"} · ${m.small ? "small model" : "full model"}`, "Model");
    },
  },
  {
    name: "key",
    args: "[status|remove|workspace <id>|help|open]",
    help: "Add, check or remove your Claude API key.",
    run(args, ctx) {
      const sub = args[0] ?? "";
      if (sub === "status") {
        const k = claudeKey();
        const ws = claudeWorkspace() ? ` Workspace ID: ${claudeWorkspace()}.` : "";
        if (k.from === "env") return ctx.notice(`The key ${maskKey(k.key!)} comes from ANTHROPIC_API_KEY in this shell.${ws}`);
        if (k.from === "file") return ctx.notice(`The key ${maskKey(k.key!)} comes from ${credentialsPath()}.${ws}`);
        return ctx.notice("There is no Claude API key. Type /key to add one.");
      }
      if (sub === "remove") {
        if (!removeClaudeKey()) return ctx.notice("There is no saved key.");
        recordSetting(ctx.session as unknown as SettingSession, find("claude_key")!, undefined, undefined, "user");
        return ctx.notice(`Removed the saved key from ${credentialsPath()}.`);
      }
      if (sub === "workspace") {
        saveClaudeWorkspace(args[1] ?? "");
        return ctx.notice(args[1] ? `Saved the workspace ID ${clip(args[1], 60)}. Each request now sends it.` : "Removed the workspace ID.");
      }
      if (sub === "help") return ctx.print(keyGuideText(), "How do I get a key?");
      if (sub === "open") {
        openWithOs(KEYS_URL);
        return ctx.notice(`Opening ${KEYS_URL}`);
      }
      if (sub) return ctx.error("Use /key, /key status, /key remove, /key workspace <id>, /key help or /key open.");
      ctx.openCard({ t: "key" });
    },
  },
  {
    name: "eln",
    args: "<setup|status|remove|push|link <id>>",
    help: "Use the eLabFTW notebook: save the key, push this session, or read an experiment.",
    async run([sub, id], ctx) {
      const s = ctx.session;
      if (sub === "setup") return ctx.openCard({ t: "eln" });
      if (sub === "status") {
        const c = elabftwConfig();
        return ctx.notice(c ? `eLabFTW: ${c.url}, key ${maskKey(c.key)}, saved in ${credentialsPath()}.` : "eLabFTW has no saved address or key. Type /eln setup.");
      }
      if (sub === "remove") {
        if (!removeElabftw()) return ctx.notice("There is no saved eLabFTW key.");
        recordSetting(ctx.session as unknown as SettingSession, find("elabftw_key")!, undefined, undefined, "user");
        return ctx.notice("Removed the eLabFTW address and key.");
      }
      if (sub === "push") {
        if (!s.elnPush) return unavailable(ctx);
        try {
          const r = await s.elnPush();
          ctx.notice(`${r.created ? "Created" : "Updated"} experiment ${r.experiment} (version ${r.version}): ${r.url}`);
        } catch (e) {
          ctx.error((e as Error).message);
        }
        return;
      }
      if (sub === "link") {
        if (!s.elnLink) return unavailable(ctx);
        if (!/^\d+$/.test(id ?? "") || !Number.isSafeInteger(Number(id))) return ctx.error("Use: /eln link <experiment id>");
        try {
          const r = await s.elnLink(Number(id));
          ctx.print(r.text, "eLabFTW experiment");
          if (r.proposals.length) await openSetup(ctx, Object.fromEntries(r.proposals.map((p) => [p.key, p.value])), `experiment ${id}`);
        } catch (e) {
          ctx.error((e as Error).message);
        }
        return;
      }
      ctx.error("Use: /eln setup, /eln status, /eln remove, /eln push or /eln link <id>");
    },
  },
  {
    name: "adapters",
    help: "List the programs this session controls.",
    run(_, ctx) {
      const rows = ctx.session.adapterInfo.map((a) => [a.name, a.title, a.version, a.programVersion, a.trust ?? ""]);
      ctx.print(rows.length ? table(["Adapter", "Program", "Adapter version", "Program version", "Trust"], rows) : "No adapters.", "Adapters");
    },
  },
  {
    name: "program",
    args: "[adapter]",
    help: "Show the program the agent uses, or change it to another adapter.",
    async run([name], ctx) {
      if (!name) {
        const rows = ctx.session.adapterInfo.map((a) => [a.name, a.title, a.programVersion, a.trust ?? ""]);
        return ctx.print(`${rows.length ? table(["Adapter", "Program", "Program version", "Trust"], rows) : "No program is loaded yet. The agent chooses one when the analysis needs it."}\n\nChange it: /program <adapter name>.`, "Program");
      }
      if (!ctx.session.changeProgram) return unavailable(ctx);
      const r = await ctx.session.changeProgram(name);
      if (r.ok) ctx.notice(r.text);
      else ctx.error(r.text);
      ctx.refresh();
    },
  },
  {
    name: "skills",
    help: "List the skills the adapters offer.",
    async run(_, ctx) {
      const mod = await lazy(() => import("../adapters/manifest.ts"));
      if (!mod?.findAdapter) return unavailable(ctx);
      const rows: string[][] = [];
      for (const a of ctx.session.adapterInfo) {
        try {
          for (const s of mod.findAdapter(a.name).skills()) rows.push([a.name, s.name, clip(s.description, 70)]);
        } catch {}
      }
      ctx.print(rows.length ? table(["Adapter", "Skill", "Use"], rows) : "No skills.", "Skills");
    },
  },
  {
    name: "lab",
    help: "List lab memory changes that wait for approval.",
    async run(_, ctx) {
      const mod = await lazy(() => import("../core/labmemory.ts"));
      if (!mod?.pending) return unavailable(ctx);
      const list = mod.pending() as { pid: string; adapter: string; changeKind: string; reason?: string }[];
      ctx.print(
        list.length ? list.map((p) => `${p.pid}  ${p.adapter}  ${p.changeKind}  ${p.reason ?? ""}`).join("\n") : "Nothing waits for approval.",
        "Lab memory",
      );
    },
  },
  {
    name: "compact",
    help: "Summarize old messages to free space.",
    async run(_, ctx) {
      if (ctx.session.busy) return ctx.notice("The agent is busy. Type /compact again after it stops.");
      ctx.notice((await ctx.session.compact()) ? "The harness summarized the older messages." : "The harness did not summarize. The context has too few older messages, or the summary failed.");
    },
  },
  {
    name: "usage",
    help: "Show the cost and the tokens of each turn, and how full the context is.",
    run(_, ctx) {
      const u = ctx.session.usage?.();
      if (!u) return unavailable(ctx);
      if (!u.steps) return ctx.notice("No model step yet. The cost is $0.");
      ctx.print(usageText(u), "Usage");
    },
  },
  {
    name: "resume",
    help: "List the last 10 sessions, newest first.",
    run(_, ctx) {
      const list = listSessions().slice(0, 10);
      const text = list.length ? list.map((s) => sessionLine(s)).join("\n") : "No past sessions.";
      ctx.print(`${text}\n\nTo continue one, quit and run: cuvette resume`, "Sessions");
    },
  },
  {
    name: "window",
    help: "Open the graph window in your browser.",
    async run(_, ctx) {
      try {
        ctx.notice(`Window: ${await ctx.startWindow()}`);
      } catch (e) {
        ctx.error(`The window did not start: ${(e as Error).message}`);
      }
    },
  },
  {
    name: "app",
    help: "Open this session in the browser app. Both views show the same session.",
    async run(_, ctx) {
      try {
        ctx.notice(`App: ${await ctx.startApp()}`);
      } catch (e) {
        ctx.error(`The app did not start: ${(e as Error).message}`);
      }
    },
  },
  {
    name: "panel",
    help: "Open the agent panel inside the connected program.",
    async run(_, ctx) {
      try {
        const { url, opened, failed } = await ctx.startPanel();
        for (const f of failed) ctx.error(f);
        if (opened.length) ctx.notice(`Panel opened in ${opened.join(", ")}.`);
        else ctx.notice(`No connected program has a panel. Open this page in a browser or a web view: ${url}`);
      } catch (e) {
        ctx.error(`The panel did not start: ${(e as Error).message}`);
      }
    },
  },
  {
    name: "details",
    help: "Show or hide the housekeeping steps, such as file reads. Ctrl+O does the same.",
    run(_, ctx) {
      ctx.notice(ctx.toggleDetails() ? "All steps show, with the housekeeping steps." : "Only the analysis steps show. One dim line holds the housekeeping steps.");
    },
  },
  { name: "clear", help: "Clear the screen. The record stays.", run: (_, ctx) => ctx.clear() },
  { name: "quit", help: "Leave the program.", run: (_, ctx) => ctx.quit() },
];

const MOST_WORDS: Record<string, number> = { mode: 1, permissions: 1, trust: 1, owner: 2, rewind: 1, decisions: 1, pilot: 1, trail: 1, open: 1, checklist: 1, program: 1, programs: 1, compare: 2, eln: 2 };

const mostWords = (name: string, args: string[]) => (name === "key" ? (args[0] === "workspace" ? 2 : 1) : MOST_WORDS[name]);

export const commands: Command[] = base.map((c) => ({
  ...c,
  run(args, ctx) {
    const most = mostWords(c.name, args);
    if (most !== undefined && args.length > most) return ctx.error(`Too many words. Use: /${c.name}${c.args ? ` ${c.args}` : ""}`);
    return c.run(args, ctx);
  },
}));

export function suggestions(input: string, session?: SessionLike): Command[] {
  const arg = /^\/change (\S*)$/.exec(input);
  if (arg && session) {
    const t = arg[1]!.toLowerCase();
    return changeRows(session)
      .filter((r) => [r.id, r.key ?? "", r.label].some((x) => x.toLowerCase().startsWith(t)) || r.label.toLowerCase().includes(t))
      .map((r) => ({ name: `change ${r.id}`, help: `${r.label}: ${r.value}`, run: () => {} }));
  }
  if (!input.startsWith("/") || input.includes(" ")) return [];
  const q = input.slice(1).toLowerCase();
  return commands.filter((c) => c.name.startsWith(q));
}
