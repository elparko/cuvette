import { canMakeNode, role } from "../core/housekeeping.ts";
import type { Entry, Fidelity } from "../core/types.ts";
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
    }
  | { key: string; t: "line"; sym: string; color?: string; text: string; dim?: boolean }
  | { key: string; t: "block"; title?: string; text: string };

const MAX_SETTINGS = 5;

function show(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

const NOT_SETTINGS = new Set(["purpose", "does", "code", "argv"]);

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
    .filter(([k, v]) => !NOT_SETTINGS.has(k) && v !== undefined && v !== null && typeof v !== "object")
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
  constructor(private session: SessionLike) {}

  map(e: Entry): Item[] {
    const key = `e${e.id}`;
    const d = e.data;
    const line = (sym: string, text: string, color?: string, dim?: boolean): Item[] => [
      { key, t: "line", sym, color, text, dim },
    ];
    switch (e.kind) {
      case "user":
        return [{ key, t: "user", text: String(d.text ?? "") }];
      case "assistant":
        return d.text ? [{ key, t: "assistant", text: String(d.text) }] : [];
      case "tool_result":
        return [this.stepItem(key, d, role(e) === "analysis")];
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
        return line("✎", `Decision: ${d.key} ${show(d.old)} → ${show(d.new)} (${d.by ?? "human"})`, "cyan");
      case "owner_change":
        return line("✎", `Owner of ${d.key}: ${d.old} → ${d.new}`, "cyan");
      case "setup": {
        const n = Object.keys((d.values as object) ?? {}).length;
        return line("✓", `Setup saved: ${n} settings`, "green");
      }
      case "question":
        this.titles.set(String(d.qid), String(d.title ?? ""));
        return line("?", `Question ${d.qid ?? ""}: ${d.title ?? ""}`, "magenta");
      case "answer": {
        const title = this.titles.get(String(d.qid));
        return line("✓", title ? `${title}${title.endsWith("?") ? "" : ":"} ${show(d.value)}` : `Answer to ${d.qid}: ${show(d.value)}`, "green");
      }
      case "sensitivity":
        return [{ key, t: "block", title: `Sensitivity check: ${d.decisionKey}`, text: String(d.table ?? "") }];
      case "finding":
        return line("⚠", `Review ${d.severity}: ${d.message}`, d.severity === "error" ? "red" : "yellow");
      case "finding_resolution":
        return line("✓", `Finding ${d.fid}: ${d.action}`, "green");
      case "mode":
        return line("▸", `Mode: ${d.old} → ${d.new}`, "cyan");
      case "follow_step": {
        const diffs = Array.isArray(d.differences) ? (d.differences as unknown[]).map(show) : [];
        if (d.status === "waiting") return [];
        if (d.status === "agent did it") return line("▸", `Step ${d.step}: the agent did it.`, undefined, true);
        if (diffs.length) return line("⚠", `Step ${d.step} differs: ${diffs.join(" ")}`, "yellow");
        if (d.match === true) return line("✓", `Step ${d.step} matches.`, "green");
        return [];
      }
      case "permission":
        return line("▸", `Permission for ${d.tool}: ${d.decision}`, undefined, true);
      case "compaction":
        return line("▸", "Older messages were summarized to save space.", undefined, true);
      case "stale":
        return line("⚠", `Out of date: ${((d.nodes as string[]) ?? []).join(", ")} (${d.reason ?? d.key})`, "yellow");
      case "note":
        return line("▸", String(d.text ?? ""), undefined, true);
      case "notice":
        return line("▸", String(d.text ?? d.message ?? ""));
      case "adapter":
        return line("+", `Loaded the adapter ${d.name} ${d.version ?? ""}${d.programVersion ? ` (program ${d.programVersion})` : ""}${d.reason ? `: ${d.reason}` : ""}`, "cyan");
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
    if (e.kind === "answer") {
      const qid = String(e.data.qid);
      this.held = this.held.filter((h) => !(h.e && HELD.has(h.e.kind) && String(h.e.data.qid ?? "").split(",").includes(qid)));
    }
    const r = role(e);
    if (r === "housekeeping" && !l.items.length && e.kind !== "tool_result") return [];
    const waitText = e.kind === "assistant" && !e.data.final && this.held.some((h) => h.e && role(h.e) === "failed");
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
      if (text) out.push({ key: `h${group[0]!.id}`, t: "line", sym: "·", text, dim: true });
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
