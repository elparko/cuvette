import type { Decision } from "../adapters/manifest.ts";
import { getPath, setPath } from "./decisions.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Args, SensitivityResult, ToolOutput } from "./types.ts";
import { fmtSig } from "./plain.ts";

type Call = (tool: string, args: Args, meta: { sensitivityOf: string }) => Promise<{ output: ToolOutput; node?: string }>;

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : fmtSig(n, 4);
}

function pad(cells: string[][]): string {
  const widths = cells[0].map((_, i) => Math.max(...cells.map((r) => r[i].length)));
  return cells.map((r) => r.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd()).join("\n");
}

function readMetrics(output: ToolOutput, compare: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (compare.length === 0) {
    for (const [k, v] of Object.entries(output.metrics ?? {})) if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    return out;
  }
  for (const path of compare) {
    const v = Number(getPath(output, path));
    if (getPath(output, path) !== undefined && getPath(output, path) !== null && Number.isFinite(v)) {
      out[path.replace(/^metrics\./, "")] = v;
    }
  }
  return out;
}

export async function runSensitivity(
  decision: Decision,
  tool: string,
  baseArgs: Args,
  linkedArg: string,
  call: Call,
  record: AnalysisRecord,
): Promise<SensitivityResult> {
  const s = decision.sensitivity;
  const all = s?.options.length ? s.options : decision.choices;
  const options = all.slice(0, s?.max_runs ?? 3);
  const runTool = s?.tool || tool;
  const compare = s?.compare ?? [];

  const rows: SensitivityResult["options"] = [];
  for (const value of options) {
    const args: Args = structuredClone({ ...baseArgs, ...(s?.args ?? {}) });
    setPath(args, linkedArg, value);
    try {
      const { output, node } = await call(runTool, args, { sensitivityOf: decision.key });
      rows.push({
        value,
        ok: output.ok,
        metrics: output.ok ? readMetrics(output, compare) : {},
        summary: output.ok ? (output.summary ?? "") : (output.error ?? "The step failed."),
        node,
      });
    } catch (err) {
      rows.push({ value, ok: false, metrics: {}, summary: (err as Error).message });
    }
  }

  const names = [...new Set(rows.flatMap((r) => Object.keys(r.metrics)))];
  const table = pad([
    [decision.label, ...names, "Result"],
    ...rows.map((r) => [
      String(r.value),
      ...names.map((n) => (n in r.metrics ? fmt(r.metrics[n]) : "-")),
      r.ok ? "ok" : `failed: ${r.summary}`,
    ]),
  ]);

  const holds: string[] = [];
  const depends: string[] = [];
  for (const n of names) {
    const have = rows.filter((r) => r.ok && n in r.metrics);
    if (have.length < 2) continue;
    const vals = have.map((r) => r.metrics[n]);
    const hi = Math.max(...vals);
    const lo = Math.min(...vals);
    const scale = Math.max(Math.abs(hi), Math.abs(lo));
    if (scale === 0 || hi - lo <= 0.1 * scale) holds.push(`${n} is about ${fmt(vals[0])} with every option`);
    else depends.push(`${n} depends on the choice: ${have.map((r) => `${fmt(r.metrics[n])} with ${String(r.value)}`).join(", ")}`);
  }

  const result: SensitivityResult = { decisionKey: decision.key, options: rows, table, holds, depends };
  record.append("sensitivity", { ...result });
  return result;
}
