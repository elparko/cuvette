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
    }
  | { key: string; t: "line"; sym: string; color?: string; text: string; dim?: boolean }
  | { key: string; t: "block"; title?: string; text: string };

const MAX_SETTINGS = 5;

function show(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export function settingsLine(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  const parts = Object.entries(args as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null && typeof v !== "object")
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
        return [this.stepItem(key, d)];
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
        return line("?", `Question ${d.qid ?? ""}: ${d.title ?? ""}`, "magenta");
      case "answer":
        return line("✓", `Answer to ${d.qid}: ${show(d.value)}`, "green");
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

  private stepItem(key: string, d: Record<string, unknown>): Item {
    const tool = String(d.tool ?? "");
    const numbered = Boolean(d.adapter);
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
    return {
      key,
      t: "step",
      n: numbered ? ++this.step : undefined,
      ok: d.ok !== false,
      tool,
      summary: String(d.summary || d.text || tool).split("\n")[0]!,
      error: d.error ? String(d.error) : undefined,
      route: d.manualRoute ? String(d.manualRoute) : undefined,
      settings: settingsLine(d.effectiveArgs),
      fidelity: d.fidelity as Fidelity | undefined,
      outputs,
    };
  }
}
