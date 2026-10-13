import { activity, canMakeNode, purposeOf, role } from "../core/housekeeping.ts";
import type { Entry, Fidelity, Question } from "../core/types.ts";
import { answerLine, optionLabel } from "./cards.ts";
import { scopeLabel, type Scope } from "../core/settings.ts";
import { pilotText } from "../core/pilot.ts";
import { rerunBody, rerunTitle, type RerunData } from "../core/status.ts";
import type { SessionLike } from "./types.ts";

export interface OutputRef {
  n: number;
  path: string;
  kind: "image" | "file";
}

export type Item =
  | { key: string; t: "user"; text: string }
  | { key: string; t: "assistant"; text: string }
  | {
      key: string;
      t: "step";
      n?: number;
      ok: boolean;
      tool: string;
      summary: string;
      error?: string;
      route?: string;
      settings: string;
      fidelity?: Fidelity;
      outputs: OutputRef[];
      purpose?: string;
      code?: string;
      why?: string;
    }
  | { key: string; t: "line"; sym: string; color?: string; text: string; dim?: boolean; group?: number[]; change?: string }
  | { key: string; t: "block"; title?: string; text: string };

const MAX_SETTINGS = 5;

function show(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

const NOT_SETTINGS = new Set(["purpose", "does", "code", "argv", "script", "macro", "description"]);

export function codeOf(args: Record<string, unknown>): string | undefined {
  if (typeof args.code === "string") return args.code;
  if (Array.isArray(args.argv)) return args.argv.map(String).join(" ");
  return undefined;
}

export function plainOf(args: Record<string, unknown>): { purpose?: string; does?: string } {
  return {
    purpose: typeof args.purpose === "string" && args.purpose.trim() ? args.purpose.trim() : undefined,
    does: typeof args.does === "string" && args.does.trim() ? args.does.trim() : undefined,
  };
}

export function settingsLine(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  const parts = Object.entries(args as Record<string, unknown>)
    .filter(([k, v]) => !NOT_SETTINGS.has(k) && v !== undefined && v !== null && typeof v !== "object" && !(typeof v === "string" && (v.includes("\n") || v.length > 80)))
    .slice(0, MAX_SETTINGS)
    .map(([k, v]) => `${k.replace(/_/g, " ")} ${show(v)}`);
  return parts.join(" · ");
}

export function fidelityLabel(f: Fidelity | undefined): string | undefined {
  if (!f || f === "exact") return undefined;
  if (f === "close") return "close match: same method, small known difference";
  if (f === "code_only") return "code only: no manual route";
  return "no manual route";
}

export class Mapper {
  step = 0;
  outputs: OutputRef[] = [];
  tokens = { input: 0, output: 0 };
  private titles = new Map<string, string>();
  private options = new Map<string, Question["options"]>();
  private calls = new Map<string, Record<string, unknown>>();
  private said = false;
  constructor(private session: SessionLike) {}

  map(e: Entry): Item[] {
    const key = `e${e.id}`;
    const d = e.data;
    const line = (sym: string, text: string, color?: string, dim?: boolean): Item[] => [
      { key, t: "line", sym, color, text, dim },
    ];
    switch (e.kind) {
      case "user":
        if (d.during) return line("▸", "The agent read your message.", undefined, true);
        return [{ key, t: "user", text: String(d.text ?? "") }];
      case "assistant":
        if (String(d.text ?? "").trim()) this.said = true;
        return d.text ? [{ key, t: "assistant", text: String(d.text) }] : [];
      case "tool_call":
        this.calls.set(String(d.callId), (d.args ?? {}) as Record<string, unknown>);
        return [];
      case "tool_result": {
        const analysis = role(e) === "analysis";
        const it = this.stepItem(key, d, analysis);
        if (analysis && it.t === "step") {
          if (!this.said) {
            const args = this.calls.get(String(d.callId)) ?? {};
            it.why = purposeOf(args) || activity(String(d.tool), args);
          }
          this.said = false;
        }
        return [it];
      }
      case "deviation": {
        const devs = (d.deviations as { arg: string; key?: string; setup: unknown; used: unknown; requested?: unknown; overwritten?: boolean }[] | undefined) ?? [];
        return devs.map((v, i) => ({
          key: `${key}.${i}`,
          t: "line" as const,
          sym: "⚠",
          color: "yellow",
          text: v.overwritten
            ? `Kept the record: ${(v.key ?? v.arg).replace(/_/g, " ")} ${show(v.setup)} (the agent asked for ${show(v.requested ?? v.used)})`
            : `Deviation: ${(v.key ?? v.arg).replace(/_/g, " ")} ${show(v.used)} (setup says ${show(v.setup)})`,
        }));
      }
      case "blocked":
        return line("⏸", `Waiting for your decision: ${String(d.reason ?? "")}`, "yellow");
      case "decision":
        if (/^(data_check|design):/.test(String(d.key))) return [];
        return line("✎", `Decision: ${d.key} ${show(d.old)} → ${show(d.new)} (${d.by ?? "human"})`, "cyan");
      case "owner_change":
        return line("✎", `Owner of ${d.key}: ${d.old} → ${d.new}`, "cyan");
      case "setup": {
        const n = Object.keys((d.values as object) ?? {}).length;
        return line("✓", `Setup saved: ${n} settings`, "green");
      }
      case "question":
        this.titles.set(String(d.qid), String(d.title ?? ""));
        this.options.set(String(d.qid), (d.options as Question["options"]) ?? []);
        return line("?", `Question ${d.qid ?? ""}: ${d.title ?? ""}`, "magenta");
      case "answer": {
        const qid = String(d.qid);
        const q = { qid, title: this.titles.get(qid) ?? `Answer to ${qid}`, options: this.options.get(qid) ?? [] };
        if (d.withdrawn) return line("▸", `Closed with no answer: ${q.title}. ${d.note ?? ""}`.trim(), "cyan");
        if (d.changed) return line("✎", `Changed ${q.title.replace(/[?:]$/, "")}: ${optionLabel(q, d.old)} → ${optionLabel(q, d.value)} · /change ${qid}`, "cyan");
        return [{ key, t: "line", sym: "✓", color: "green", text: answerLine(q, d.value), change: qid }];
      }
      case "sensitivity":
        return [{ key, t: "block", title: `Sensitivity check: ${d.decisionKey}`, text: String(d.table ?? "") }];
      case "finding":
        return line("⚠", `Review ${d.severity}: ${d.message}`, d.severity === "error" ? "red" : "yellow");
      case "finding_resolution":
        return line("✓", `Finding ${d.fid}: ${d.action}`, "green");
      case "mode":
        return d.reason ? [] : line("▸", `Mode: ${d.old} → ${d.new}`, "cyan");
      case "setting":
        return line("⚙", d.change ? `Setting ${d.name} ${d.change} (${scopeLabel(d.scope as Scope)})` : `Setting ${d.name}: ${show(d.old)} → ${show(d.new)} (${scopeLabel(d.scope as Scope)})`, "cyan");
      case "plan_frozen":
        return line("▸", `Plan frozen. SHA-256 ${String(d.hash).slice(0, 12)}.`, "cyan");
      case "plan_deviation":
        return line("⚠", `Plan deviation: ${d.what}${d.to !== undefined ? ` (${d.from ?? "none"} → ${d.to})` : ""}. Reason: ${d.reason || "not given yet"}${d.afterResult ? ". Changed after the result was seen." : ""}`, "yellow");
      case "plan_approved":
        return [{ key, t: "block", title: `Confirmed, version ${d.version}. Mode: ${d.mode}.`, text: String(d.text ?? "") }];
      case "clarify":
        return d.action === "answered" ? [{ key, t: "block", title: "Questions", text: [String(d.found ?? ""), ...((d.answers as string[]) ?? []).map((x) => `- ${x}`), ...((d.skipped as string[]) ?? []).map((x) => `- Not asked: ${x}`), ...((d.notes as string[]) ?? []).map((x) => `- Design note: ${x}`)].filter(Boolean).join("\n") }] : [];
      case "data_check":
        return [{ key, t: "block", title: "Data check", text: String(d.text ?? "") }];
      case "samples":
        if (d.action === "drafted") return line("▸", `Sample sheet: ${((d.rows as unknown[]) ?? []).length} rows from ${d.from}. Saved as ${d.path}.`, "cyan");
        if (d.action === "edited" || d.action === "reloaded") return line("✎", `Sample sheet: ${d.said || "changed"} Saved as ${d.path}.`, "cyan");
        if (d.action === "accepted") return line("✓", `You confirmed the sample sheet (${d.rows} rows).`, "green");
        return [];
      case "pilot_run":
        return [{ key, t: "block", title: `Demonstration on a sample: ${d.sample}`, text: pilotText(d as never) }];
      case "pilot_approved":
        return line("✓", `You confirmed the demonstration on ${d.sample}.`, "green");
      case "pilot_rejected":
        return line("✎", `Demonstration on ${d.sample} not confirmed: ${d.reason}`, "cyan");
      case "reference":
        return d.mode === "none" ? [] : line("▸", d.revealed ? `The reference ${d.path} is now visible to the agent.` : `Reference: ${d.path} (${d.mode === "blind" ? "held back for a blind test" : "compared in the demonstration"})`, "cyan");
      case "validation":
        return [{ key, t: "block", title: "Validation against the reference", text: ((d.summary as string[]) ?? []).join("\n") + (d.plot ? `\nBland-Altman plot: ${d.plot}` : "") }];
      case "plan":
        if (d.action === "change_requested") return line("✎", `You asked to change the plan: ${d.text}`, "cyan");
        if (d.action === "cancelled") return line("✗", "You cancelled the plan. No step ran.", "yellow");
        if (d.action === "updated") return line("✎", `Plan changed to version ${d.version}. Reason: ${d.reason || "none given"}`, "cyan");
        if (d.action === "pilot_changed") return line("✎", `The proposed analysis changed to version ${d.version} before the pilot confirmation. Reason: ${d.reason || "none given"}`, "cyan");
        return [];
      case "follow_step": {
        const diffs = Array.isArray(d.differences) ? (d.differences as unknown[]).map(show) : [];
        if (d.status === "waiting") return [];
        if (d.status === "agent did it") return line("▸", `Step ${d.step}: the agent did it.`, undefined, true);
        if (diffs.length) return line("⚠", `Step ${d.step} differs: ${diffs.join(" ")}`, "yellow");
        if (d.match === true) return line("✓", `Step ${d.step} matches.`, "green");
        return [];
      }
      case "permission":
        return line("▸", `Permission for ${d.tool}: ${d.decision}${d.reason ? ` (${d.reason})` : ""}`, undefined, true);
      case "permission_mode":
        return d.new === "bypass"
          ? line("⚠", "Bypass permissions is on. The agent runs commands and writes files without asking.", "yellow")
          : line("▸", "Bypass permissions is off. Tool calls that need permission show a card again.", "cyan");
      case "compaction":
        return line("▸", "Cuvette summarized the older messages to save space.", undefined, true);
      case "rerun":
        return [{ key, t: "block", title: rerunTitle(d as unknown as RerunData), text: rerunBody(d as unknown as RerunData) }];
      case "environment": {
        const n = ((d.packages as unknown[]) ?? []).length;
        return d.kind === "program" ? [] : line("▸", `Recorded the package versions of the ${d.name} environment: ${d.language}, ${n} ${n === 1 ? "package" : "packages"}.`, undefined, true);
      }
      case "rewind":
        return line("↶", `Returned to: ${String(d.point ?? "")}. ${((d.nodes as string[]) ?? []).length} results marked rewound.`, "cyan");
      case "fork":
        return line("⑂", `This session is the branch "${String(d.name ?? "")}" of ${String((d.parent as { title?: string })?.title || (d.parent as { id?: string })?.id || "another session")}.`, "cyan");
      case "branch":
        return line("⑂", `New branch "${String((d.child as { name?: string })?.name ?? "")}": ${String((d.child as { folder?: string })?.folder ?? "")}`, "cyan");
      case "method":
        return line("▸", d.action === "saved" ? `Saved the method ${String(d.name)}: ${String(d.path ?? "")}` : `Started from the method ${String(d.name)}. The questions come with the saved answers.`, "cyan");
      case "stale":
        return line("⚠", `Out of date: ${((d.nodes as string[]) ?? []).join(", ")} (${d.reason ?? d.key})`, "yellow");
      case "note":
        return line("▸", String(d.text ?? ""), undefined, true);
      case "phi": {
        const n = Number(d.count ?? 0);
        const what = `${n} possible patient ${n === 1 ? "identifier" : "identifiers"}`;
        if (d.action === "local model") return [];
        const done = d.action === "send" ? "sent as they are" : d.action === "mask" ? "masked before they went to the model" : d.action === "local" ? "sent to the local model" : "not sent";
        return line(d.action === "send" ? "⚠" : "▸", `Patient data check: ${what}, ${done} (${d.by}).`, d.action === "send" ? "yellow" : "cyan");
      }
      case "notice":
        return d.plan || d.warn ? line("⚠", String(d.text ?? ""), "yellow") : d.saved ? line("✓", String(d.text ?? ""), "green") : line("▸", String(d.text ?? d.message ?? ""));
      case "adapter":
        if (d.by === "agent") return line("+", `Using ${d.program ?? d.name} through ${d.name}${d.reason ? `: ${String(d.reason).replace(/[.\s]+$/, "")}` : ""}. Change with /program.`, "cyan");
        return line("+", `Loaded the adapter ${d.name} ${d.version ?? ""}${d.programVersion ? ` (program ${d.programVersion})` : ""}${d.reason ? `: ${d.reason}` : ""}`, "cyan");
      case "program":
        return line("⚙", `Programs: ${String(d.text ?? d.action)}`, d.ok === false ? "red" : "cyan");
      case "error":
        return line("✗", String(d.message ?? d.text ?? "Error"), "red");
      case "usage":
        this.tokens.input += Number(d.inputTokens ?? 0);
        this.tokens.output += Number(d.outputTokens ?? 0);
        return [];
      default:
        return [];
    }
  }

  private stepItem(key: string, d: Record<string, unknown>, numbered: boolean): Item {
    const tool = String(d.tool ?? "");
    const outputs: OutputRef[] = [];
    for (const [list, kind] of [
      [d.images, "image"],
      [d.files, "file"],
    ] as const) {
      for (const sha of (list as string[] | undefined) ?? []) {
        const path = this.session.record.blobPath(sha) ?? sha;
        const ref: OutputRef = { n: this.outputs.length + 1, path, kind };
        this.outputs.push(ref);
        outputs.push(ref);
      }
    }
    const args = (d.effectiveArgs && typeof d.effectiveArgs === "object" ? d.effectiveArgs : {}) as Record<string, unknown>;
    const { purpose, does } = plainOf(args);
    return {
      key,
      t: "step",
      n: numbered ? ++this.step : undefined,
      ok: d.ok !== false,
      tool,
      purpose,
      code: codeOf(args),
      summary: does ?? String(d.summary || d.text || tool).split("\n")[0]!,
      error: d.error ? String(d.error) : undefined,
      route: d.manualRoute ? String(d.manualRoute) : undefined,
      settings: settingsLine(d.effectiveArgs),
      fidelity: d.fidelity as Fidelity | undefined,
      outputs,
    };
  }
}

const SILENT = new Set(["ask_scientist", "propose_change", "compare_options", "plan", "note", "propose_lab_rule", "use_adapter", "mode", "review_my_steps"]);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function base(p: unknown): string {
  const s = String(p ?? "").replace(/[\\/]+$/, "");
  return s.split(/[\\/]/).pop() || s;
}

function names(list: string[]): string {
  const u = [...new Set(list.filter(Boolean))];
  return u.length ? ` (${u.slice(0, 3).join(", ")}${u.length > 3 ? ", ..." : ""})` : "";
}

export function housekeepingText(entries: Entry[], argsOf: (e: Entry) => Record<string, unknown> = () => ({})): string {
  const by = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = e.kind === "tool_result" ? (e.data.sensitivityOf ? "#compare" : String(e.data.tool)) : e.kind === "notice" ? "#notice" : e.kind === "compaction" ? "#compaction" : "";
    if (!k || SILENT.has(k)) continue;
    by.set(k, [...(by.get(k) ?? []), e]);
  }
  const parts = [...by].map(([k, list]) => {
    const n = list.length;
    const a = list.map(argsOf);
    const failed = list.filter((e) => e.data.ok === false).length;
    if (k !== "#compare" && failed === n && canMakeNode(list[0]!.data)) return `Tried ${k} again after ${plural(n, "error", "errors")}`;
    const tail = failed ? `, ${failed} failed` : "";
    switch (k) {
      case "run_script": {
        const folders = a.some((x) => /folder|director/i.test(`${x.does ?? ""} ${x.purpose ?? ""}`));
        return `${folders ? "Listed folders" : "Looked at files"} with ${n === 1 ? "a script" : `${n} scripts`}${tail}`;
      }
      case "list_dir": return `Looked at ${plural(n, "folder", "folders")}${names(a.map((x) => base(x.path)))}${tail}`;
      case "read_file": return `Read ${plural(n, "file", "files")}${names(a.map((x) => base(x.path)))}${tail}`;
      case "write_file": return `Wrote ${plural(n, "file", "files")}${names(a.map((x) => base(x.path)))}${tail}`;
      case "run_command": return `Ran ${plural(n, "command", "commands")}${names(a.map((x) => base(Array.isArray(x.argv) ? x.argv[0] : "")))}${tail}`;
      case "load_skill": return `Read ${plural(n, "skill", "skills")}${names(a.map((x) => String(x.name ?? "")))}${tail}`;
      case "find_tools": return `Searched the tool list${n > 1 ? ` ${n} times` : ""}${tail}`;
      case "list_adapters": return `Checked the adapter list${tail}`;
      case "decisions": return `Checked the decision record${tail}`;
      case "#compare": return plural(n, "comparison run", "comparison runs");
      case "#notice": return plural(n, "note from the harness", "notes from the harness");
      case "#compaction": return "Summarized older messages";
      default: return `Ran ${k}${n > 1 ? ` ${n} times` : ""}${tail}`;
    }
  });
  return parts.join("; ");
}

export interface Logged {
  e?: Entry;
  items: Item[];
}

const HELD = new Set(["question", "blocked"]);

export class Collapser {
  private held: Logged[] = [];
  private args = new Map<string, Record<string, unknown>>();
  private planShown = false;
  private answered = new Set<string>();

  add(l: Logged): Item[] {
    const e = l.e;
    if (!e) return [...this.flush(), ...l.items];
    if (e.kind === "user") this.planShown = false;
    if (e.kind === "note" && Array.isArray(e.data.plan)) {
      const plan = e.data.plan as { status?: string }[];
      if (this.planShown) {
        const done = plan.filter((p) => p.status === "done" || p.status === "skipped").length;
        l = { e, items: [{ key: `e${e.id}`, t: "line", sym: "▸", text: `Plan updated: ${done} of ${plan.length} steps done.`, dim: true }] };
      }
      this.planShown = true;
    }
    if (e.kind === "tool_call") this.args.set(String(e.data.callId), (e.data.args ?? {}) as Record<string, unknown>);
    if (e.kind === "decision" && /^(changed )?answer to /.test(String(e.data.reason ?? ""))) return [];
    if (e.kind === "answer") {
      this.answered.add(String(e.data.qid));
      const open = (h: Logged) => String(h.e!.data.qid ?? "").split(",").some((q) => !this.answered.has(q));
      const waiting = this.held.filter((h) => h.e && HELD.has(h.e.kind) && open(h));
      this.held = this.held.filter((h) => !(h.e && HELD.has(h.e.kind)));
      const out = [...this.flush(e), ...l.items];
      this.held = waiting;
      return out;
    }
    const r = role(e);
    if (r === "housekeeping" && !l.items.length && e.kind !== "tool_result") return [];
    const waitText = e.kind === "assistant" && !e.data.final && !e.data.stopped && this.held.some((h) => h.e && role(h.e) === "failed");
    if (r === "housekeeping" || r === "failed" || HELD.has(e.kind) || waitText) {
      this.held.push(l);
      return [];
    }
    return [...this.flush(e), ...l.items];
  }

  flush(next?: Entry): Item[] {
    const out = this.render(next);
    this.held = [];
    return out;
  }

  preview(): Item[] {
    return this.render();
  }

  private render(next?: Entry): Item[] {
    const out: Item[] = [];
    let group: Entry[] = [];
    const close = () => {
      const text = group.length ? housekeepingText(group, (e) => (e.data.effectiveArgs as Record<string, unknown>) ?? this.args.get(String(e.data.callId)) ?? {}) : "";
      if (text) out.push({ key: `h${group[0]!.id}`, t: "line", sym: "·", text, dim: true, group: group.map((e) => e.id) });
      group = [];
    };
    this.held.forEach((h, i) => {
      const later = [...this.held.slice(i + 1).flatMap((x) => (x.e ? [x.e] : [])), ...(next ? [next] : [])];
      if (h.e && role(h.e, later) === "housekeeping") return void group.push(h.e);
      close();
      out.push(...h.items);
    });
    close();
    return out;
  }
}

export function mainView(log: Logged[], idle: boolean): { settled: Item[]; pending: Item[]; collapser: Collapser } {
  const c = new Collapser();
  const settled = log.flatMap((l) => c.add(l));
  if (idle) settled.push(...c.flush());
  return { settled, pending: c.preview(), collapser: c };
}
