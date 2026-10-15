import type { Entry, Node } from "./types.ts";

export type Role = "analysis" | "housekeeping" | "failed" | "main";

const NODE_TOOLS = new Set(["run_script", "calculate"]);
const HARNESS_NOTICE = /^converted a tool call|same input three times|repeated the same text|^Comparing the options/i;
const QUIET = new Set(["session", "message", "thinking", "tool_call", "node", "usage", "compaction", "claim_check", "correction", "answer_ready"]);

export function canMakeNode(d: Record<string, unknown>): boolean {
  return Boolean(d.adapter) || NODE_TOOLS.has(String(d.tool));
}

const LOOKS_AT = /\b(folders?|director(y|ies)|files?|file names?|columns?|headers?|names?|paths?|sheets?|format|shape|types?|sizes?|rows?)\b/i;
const MEASURES = /\b(measur|mean|median|average|test|fit|model|regress|correlat|comput|calculat|estimat|segment|threshold|normali|statistic|p-value|effect|ratio|area|intensit|cells?|nuclei|differen|plot|figure|summar)/i;

export function scriptLooksOnly(args: Record<string, unknown>, out: { outputs?: unknown[]; images?: unknown[]; text?: string; metrics?: unknown; table?: unknown }): boolean {
  if (out.outputs?.length || out.images?.length || out.table) return false;
  if (out.metrics && Object.keys(out.metrics as object).length) return false;
  if (!/\d/.test(String(out.text ?? ""))) return true;
  const does = `${String(args.does ?? "")} ${String(args.purpose ?? "")}`;
  return LOOKS_AT.test(does) && !MEASURES.test(does);
}

export function makesNode(tool: { name: string; source?: string }, args: Record<string, unknown>, out: { ok: boolean; outputs?: unknown[]; images?: unknown[]; text?: string; metrics?: unknown; table?: unknown }): boolean {
  if (!out.ok) return false;
  if (tool.name === "run_script") return !scriptLooksOnly(args, out);
  return tool.source === "adapter" || NODE_TOOLS.has(tool.name);
}

export function retried(e: Entry, later: Entry[]): boolean {
  for (const x of later) {
    if (x.kind === "user" && !x.data.during) return false;
    if (x.kind !== "tool_result" || x.data.ok === false) continue;
    if (x.data.tool === e.data.tool || !canMakeNode(e.data)) return true;
  }
  return false;
}

export function role(e: Entry, later: Entry[] = []): Role {
  const d = e.data;
  switch (e.kind) {
    case "tool_result":
      if (d.sensitivityOf) return "housekeeping";
      if (e.node) return "analysis";
      if (d.ok !== false) return "housekeeping";
      return retried(e, later) ? "housekeeping" : "failed";
    case "notice":
      return HARNESS_NOTICE.test(String(d.text ?? "")) ? "housekeeping" : "main";
    case "permission":
      return d.decision === "denied" ? "main" : "housekeeping";
    case "assistant":
      return d.final || String(d.text ?? "").trim() ? "main" : "housekeeping";
    default:
      return QUIET.has(e.kind) ? "housekeeping" : "main";
  }
}

export function roleInRecord(all: Entry[], e: Entry): Role {
  return role(e, e.kind === "tool_result" && e.data.ok === false ? all.filter((x) => x.id > e.id) : []);
}

export function stepNumbers(nodes: Node[]): Map<string, number> {
  return new Map(nodes.filter((n) => !n.sensitivityOf).map((n, i) => [n.id, i + 1]));
}

export function stepNumberOf(numbers: Map<string, number>, id: string, index: number): number {
  return numbers.get(id) ?? index + 1;
}

export const PURPOSE = { type: "string", description: "Optional. In plain words, what this call does and why, for the scientist. No code." };

function base(p: unknown): string {
  const s = String(p ?? "").replace(/[\\/]+$/, "");
  return s.split(/[\\/]/).pop() || s;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function purposeOf(args: Record<string, unknown> | undefined): string {
  const v = args?.purpose ?? args?.description;
  return typeof v === "string" ? v.trim().replace(/\.$/, "") : "";
}

export function activity(tool: string, args: Record<string, unknown> = {}, title?: string): string {
  const why = purposeOf(args);
  const argv0 = Array.isArray(args.argv) ? base(args.argv[0]) : "";
  if (tool === "run_script") return why ? `Running a script: ${why}` : "Running a script";
  if (tool === "run_command") return why ? `Running ${argv0 || "a command"}: ${why}` : `Running the command ${argv0}`.trim();
  if (why) return cap(why);
  switch (tool) {
    case "list_dir": return `Looking at the folder ${base(args.path)}`;
    case "read_file": return `Reading ${base(args.path)}`;
    case "write_file": return `Writing ${base(args.path)}`;
    case "calculate": return "Calculating the numbers for the answer";
    case "load_skill": return `Reading the skill ${String(args.name ?? "")}`.trim();
    case "find_tools": return `Searching the tool list for "${String(args.query ?? "")}"`;
    case "list_adapters": return "Checking the adapter list";
    case "use_adapter": return `Loading the adapter ${String(args.name ?? "")}`.trim();
    case "ask_scientist": return "Asking you a question";
    case "propose_change": return `Proposing a change to ${String(args.key ?? "a decision")}`;
    case "compare_options": return `Comparing the options for ${String(args.key ?? "a decision")}`;
    case "plan": return "Writing the plan";
    case "note": return "Writing a note in the trail";
  }
  const main = Object.values(args).find((v) => typeof v === "string" && v.length < 300 && !v.includes("\n"));
  const name = title || cap(tool.replace(/_/g, " "));
  return main ? `${name}: ${/[\\/]/.test(String(main)) ? base(main) : main}` : name;
}
