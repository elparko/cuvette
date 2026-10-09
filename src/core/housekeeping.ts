import type { Entry, Node } from "./types.ts";

export type Role = "analysis" | "housekeeping" | "failed" | "main";

const NODE_TOOLS = new Set(["run_script", "calculate"]);
const HARNESS_NOTICE = /^converted a tool call|same input three times|repeated the same text|^Comparing the options/i;
const QUIET = new Set(["session", "message", "thinking", "tool_call", "node", "usage", "compaction", "claim_check", "correction"]);

export function canMakeNode(d: Record<string, unknown>): boolean {
  return Boolean(d.adapter) || NODE_TOOLS.has(String(d.tool));
}

export function retried(e: Entry, later: Entry[]): boolean {
  for (const x of later) {
    if (x.kind === "user") return false;
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
