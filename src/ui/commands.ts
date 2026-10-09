import { spawn } from "node:child_process";
import type { Mode, Owner, Question } from "../core/types.ts";
import { pilotText } from "../core/pilot.ts";
import { planView } from "../core/plan.ts";
import { claudeKey, claudeWorkspace, credentialsPath, elabftwConfig, maskKey, removeClaudeKey, removeElabftw, saveClaudeWorkspace } from "../core/credentials.ts";
import { stepNumbers } from "../core/housekeeping.ts";
import { find, recordSetting, type SettingSession } from "../core/settings.ts";
import { listSessions, sessionLine } from "../core/sessions.ts";
import { show, type Card } from "./cards.ts";
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
  outputs(): OutputRef[];
  toggleDetails(): boolean;
  startWindow(): Promise<string>;
  startPanel(): Promise<{ url: string; opened: string[]; failed: string[] }>;
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

async function lazy<T = any>(spec: string): Promise<T | undefined> {
  try {
    return (await import(spec)) as T;
  } catch {
    return undefined;
  }
}

const unavailable = (ctx: CommandCtx) => ctx.notice("Not available yet.");

export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const fmt = (r: string[]) => r.map((c, i) => c.padEnd(widths[i]!)).join("  ").trimEnd();
  return [fmt(headers), fmt(widths.map((w) => "-".repeat(w))), ...rows.map(fmt)].join("\n");
}

function clip(s: string, n = 48): string {
  const one = s.replace(/\s+/g, " ");
  return one.length > n ? one.slice(0, n - 1) + "…" : one;
}

export function decisionRows(session: SessionLike): string[][] {
  const by: Record<string, string> = {};
  for (const e of session.record.entries(["setup", "decision"])) {
    if (e.kind === "setup") {
      const defaults = new Set((e.data.defaultsAccepted as string[] | undefined) ?? []);
      for (const k of Object.keys((e.data.values as object) ?? {})) by[k] = defaults.has(k) ? "default" : "you (setup)";
    } else by[String(e.data.key)] = String(e.data.by ?? "human");
  }
  return session.decisions
    .fields()
    .map((f) => [f.key, clip(show(f.value)), session.decisions.owner(f.key), f.set ? (by[f.key] ?? "setup") : "not set"]);
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

export function renderTrail(lines: any[], level: number): string {
  const out: string[] = [];
  for (const l of lines) {
    out.push(`${String(l.n).padStart(2)}. ${TRAIL_ICON[l.icon] ?? "▸"} ${l.line}${l.stale ? "  [out of date]" : ""}`);
    if (level >= 2 && l.details) for (const [k, v] of Object.entries(l.details)) out.push(`      ${k}: ${clip(show(v), 100)}`);
    if (level >= 3 && l.technical) for (const [k, v] of Object.entries(l.technical)) out.push(`      · ${k}: ${clip(show(v), 100)}`);
  }
  return out.join("\n") || "The trail is empty.";
}

export function renderGraph(session: SessionLike): string {
  const nodes = session.record.nodes();
  if (!nodes.length) return "No steps yet.";
  const stale = session.record.stale();
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
    return `${name(id)} ${clip(n.summary || n.tool, 60)}${extra}${stale.has(id) ? "  [out of date]" : ""}`;
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

export function openWithOs(path: string): void {
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

async function loadProfiles(): Promise<{ name: string; version: number }[]> {
  const mod = await lazy("../core/decisions.ts");
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
  for (const f of ["../core/questions.ts", "../core/decisions.ts"]) {
    const mod = await lazy(f);
    if (mod?.allOpenQuestions) return mod.allOpenQuestions();
  }
  return undefined;
}

export const commands: Command[] = [
  {
    name: "help",
    help: "Show this list.",
    run(_, ctx) {
      const rows = commands.map((c) => [`/${c.name}${c.args ? " " + c.args : ""}`, c.help]);
      const keys = "Keys: Esc stops the agent. Shift+Tab changes the mode. Ctrl+C twice quits. Up and Down show past input.";
      ctx.print(table(["Command", "What it does"], rows) + "\n\n" + keys, "Commands");
    },
  },
  { name: "setup", help: "Open the setup card for your choices.", run: (_, ctx) => openSetup(ctx) },
  { name: "config", help: "Show and change the settings.", run: (_, ctx) => ctx.openCard({ t: "config" }) },
  {
    name: "decisions",
    args: "[agent|me]",
    help: "Show every decision, its owner and who set it. agent gives all your decisions to the agent; me takes them back.",
    run([who], ctx) {
      if (who === "agent" || who === "me") {
        const [from, to]: Owner[] = who === "agent" ? ["human", "agent"] : ["agent", "human"];
        const keys = ctx.session.decisions.fields().filter((f) => ctx.session.decisions.owner(f.key) === from).map((f) => f.key);
        for (const k of keys) ctx.session.setOwner(k, to);
        ctx.notice(keys.length ? `${who === "agent" ? "The agent now owns" : "You now own"} ${keys.length} ${keys.length === 1 ? "decision" : "decisions"}: ${keys.join(", ")}. Fixed decisions do not change.` : "No decision changed owner.");
      } else if (who) return ctx.error("Use: /decisions, /decisions agent or /decisions me");
      ctx.print(table(["Key", "Value", "Owner", "Set by"], decisionRows(ctx.session)), "Decisions");
    },
  },
  {
    name: "owner",
    args: "<key> <human|agent|fixed>",
    help: "Change who owns a decision.",
    run([key, owner], ctx) {
      if (!key || !OWNERS.includes(owner as Owner)) return ctx.error("Use: /owner <key> <human|agent|fixed>");
      if (!ctx.session.decisions.fields().some((f) => f.key === key)) return ctx.error(`No decision named ${key}. See /decisions.`);
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
              "These do not change: method decisions stay with you (/decisions agent gives them to the agent); plan and teach mode still block steps; blind benchmark rules and the macOS sandbox still apply; a push to eLabFTW still asks; deny rules in settings still deny.\n" +
              "Type /permissions ask to show the permission cards again."
          : "Ask (the default). A tool call that needs permission shows a card, and you allow or deny it. Type /permissions bypass to allow them without a card.",
        "Permissions",
      );
    },
  },
  {
    name: "mode",
    args: "<watch|follow|teach|plan>",
    help: "Change the mode.",
    run([m], ctx) {
      if (!MODES.includes(m as Mode)) return ctx.error("Use: /mode <watch|follow|teach|plan>");
      ctx.session.setMode(m as Mode);
      ctx.refresh();
    },
  },
  {
    name: "plan",
    args: "[on|off|<request>]",
    help: "Show the proposed analysis, or propose one for a request before any step runs. /plan off skips it for later requests. Also /proposal.",
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
        if (v) return ctx.print(v.text, v.approved ? `Confirmed analysis, version ${v.version}` : `Proposed analysis, version ${v.version}`);
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
        if (v) return ctx.print(v.text, v.approved ? `Confirmed analysis, version ${v.version}` : `Proposed analysis, version ${v.version}`);
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
      const run = s.record.entries(["pilot_run"]).at(-1);
      if (!run) return ctx.notice("No pilot yet.");
      const done = s.record.entries(["pilot_approved"]).some((e) => e.data.run === run.id);
      ctx.print(pilotText(run.data as never), `Pilot on ${String(run.data.sample)}${done ? ", confirmed" : ""}`);
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
    name: "answer",
    args: "<qid> <value>",
    help: "Answer an open question by its id.",
    async run([qid, ...rest], ctx) {
      const raw = rest.join(" ").trim();
      if (!qid || !raw) return ctx.error("Use: /answer <qid> <value>");
      const q = ctx.session.questions.open().find((x) => x.qid === qid);
      if (!q) {
        const other = (await allOpen())?.find((x) => x.qid === qid);
        return ctx.error(other ? `${qid} belongs to session ${other.session}. Run: ga --resume ${other.session}` : `No open question ${qid}.`);
      }
      const hit = matchOption(q, raw);
      await ctx.session.answer(qid, hit.ok ? hit.value : raw);
      ctx.notice(`Answered ${qid}.`);
    },
  },
  {
    name: "trail",
    args: "[1|2|3]",
    help: "Show the audit trail. 1 is short, 3 is the technical record.",
    async run([lv], ctx) {
      const level = lv === "2" ? 2 : lv === "3" ? 3 : 1;
      const mod = await lazy("../core/trail.ts");
      if (!mod?.trail) return unavailable(ctx);
      ctx.print(renderTrail(mod.trail(ctx.session.record, level), level), `Audit trail, level ${level}`);
    },
  },
  {
    name: "graph",
    help: "Show the steps as a tree. Out-of-date steps are marked.",
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
    name: "findings",
    help: "Accept, reject or mark fixed each open finding.",
    run(_, ctx) {
      const list = ctx.session.findings.list("open");
      if (!list.length) return ctx.notice("No open findings.");
      ctx.openCard({ t: "findings", list });
    },
  },
  {
    name: "export",
    args: `<${FORMATS.join("|")}>`,
    help: "Write the record in a file format.",
    async run([fmt], ctx) {
      if (!FORMATS.includes(fmt ?? "")) return ctx.error(`Use: /export <${FORMATS.join("|")}>`);
      try {
        ctx.notice(`Exported: ${await ctx.session.exportAs(fmt)}`);
      } catch (e) {
        ctx.error(`Export failed: ${(e as Error).message}`);
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
        return ctx.notice(`Data book author saved in user settings: ${name}`);
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
        ctx.error(`Data book failed: ${(e as Error).message}`);
      }
    },
  },
  {
    name: "open",
    args: "<n>",
    help: "Open output number n with the system viewer.",
    run([n], ctx) {
      const outs = ctx.outputs();
      const ref = outs[Number(n) - 1];
      if (!ref) return ctx.error(outs.length ? `Use a number from 1 to ${outs.length}.` : "No outputs yet.");
      openWithOs(ref.path);
      ctx.notice(`Opening ${ref.path}`);
    },
  },
  {
    name: "model",
    help: "Show the model.",
    run(_, ctx) {
      const m = ctx.session.model;
      ctx.print(`${m.provider}:${m.model}\ncontext window ${m.contextWindow} tokens · vision ${m.vision ? "yes" : "no"} · ${m.small ? "small model" : "full model"}`, "Model");
    },
  },
  {
    name: "key",
    args: "[status|remove|workspace <id>]",
    help: "Add, check or remove your Claude API key.",
    run(args, ctx) {
      const sub = args[0] ?? "";
      if (sub === "status") {
        const k = claudeKey();
        const ws = claudeWorkspace() ? ` Workspace ID: ${claudeWorkspace()}.` : "";
        if (k.from === "env") return ctx.notice(`The key ${maskKey(k.key!)} comes from ANTHROPIC_API_KEY in this shell.${ws}`);
        if (k.from === "file") return ctx.notice(`The key ${maskKey(k.key!)} comes from ${credentialsPath()}.${ws}`);
        return ctx.notice("No Claude API key is set. Type /key to add one.");
      }
      if (sub === "remove") {
        if (!removeClaudeKey()) return ctx.notice("No key was saved.");
        recordSetting(ctx.session as unknown as SettingSession, find("claude_key")!, undefined, undefined, "user");
        return ctx.notice(`Removed the saved key from ${credentialsPath()}.`);
      }
      if (sub === "workspace") {
        saveClaudeWorkspace(args[1] ?? "");
        return ctx.notice(args[1] ? `Saved the workspace ID ${args[1]}. Each request now sends it.` : "Removed the workspace ID.");
      }
      if (sub) return ctx.error("Use /key, /key status, /key remove or /key workspace <id>.");
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
        return ctx.notice(c ? `eLabFTW: ${c.url}, key ${maskKey(c.key)}, saved in ${credentialsPath()}.` : "eLabFTW is not set up. Type /eln setup.");
      }
      if (sub === "remove") {
        if (!removeElabftw()) return ctx.notice("No eLabFTW key was saved.");
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
        if (!/^\d+$/.test(id ?? "")) return ctx.error("Use: /eln link <experiment id>");
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
      const rows = ctx.session.adapterInfo.map((a) => [a.name, a.title, a.version, a.programVersion]);
      ctx.print(rows.length ? table(["Adapter", "Program", "Adapter version", "Program version"], rows) : "No adapters.", "Adapters");
    },
  },
  {
    name: "skills",
    help: "List the skills the adapters offer.",
    async run(_, ctx) {
      const mod = await lazy("../adapters/manifest.ts");
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
      const mod = await lazy("../core/labmemory.ts");
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
      await ctx.session.compact();
      ctx.notice("Older messages are summarized.");
    },
  },
  {
    name: "resume",
    help: "List the last 10 sessions, newest first.",
    run(_, ctx) {
      const list = listSessions().slice(0, 10);
      const text = list.length ? list.map((s) => sessionLine(s)).join("\n") : "No past sessions.";
      ctx.print(`${text}\n\nTo continue one, quit and run: ga resume`, "Sessions");
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
      ctx.notice(ctx.toggleDetails() ? "All steps are shown, with the housekeeping steps." : "Only the analysis steps are shown. Housekeeping steps are in one dim line.");
    },
  },
  { name: "clear", help: "Clear the screen. The record stays.", run: (_, ctx) => ctx.clear() },
  { name: "quit", help: "Leave the program.", run: (_, ctx) => ctx.quit() },
];

export function suggestions(input: string): Command[] {
  if (!input.startsWith("/") || input.includes(" ")) return [];
  const q = input.slice(1).toLowerCase();
  return commands.filter((c) => c.name.startsWith(q));
}
