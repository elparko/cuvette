import { basename } from "node:path";
import type { AnalysisRecord } from "./record.ts";
import type { Node } from "./types.ts";

export interface TestEntry {
  node: string;
  step: number;
  test: string;
  tool: string;
  source: string;
  p: number;
  family: string;
}

export interface TestRow extends TestEntry {
  size: number;
  holm: number;
  bh: number;
}

export const FAMILY_MODES = ["same_data", "one_family", "separate"];
export const CORRECTIONS = ["holm", "benjamini_hochberg", "not_part_of_analysis"];

const EXACT = /^(p|pvalue|p_value|pval|p_val)$/i;
const SUFFIX = /(^|_)(p|pvalue|p_value)$/i;
const NOT_A_TEST = /^(levene|ph_|shapiro|normality|bartlett|mauchly|min_)|_(levene|shapiro|bartlett|mauchly)|adjust/i;
const TERM = /^p_(.+)$/i;
const PATHISH = /\.(csv|tsv|txt|xlsx?|parquet|h5ad|fcs|json)$/i;

const SAME_TEST = /^p_(reported|uncorrected|gg|interaction_gg)$/i;

function mainKey(metrics: Record<string, unknown> | undefined): string | undefined {
  if (!metrics) return undefined;
  const ok = (k: string) => typeof metrics[k] === "number" && (metrics[k] as number) >= 0 && (metrics[k] as number) <= 1;
  const keys = Object.keys(metrics).filter((k) => ok(k) && !NOT_A_TEST.test(k));
  return keys.find((k) => EXACT.test(k)) ?? keys.find((k) => SUFFIX.test(k)) ?? keys.find((k) => k === "p_reported");
}

export function pValueOf(metrics: Record<string, unknown> | undefined): number | undefined {
  const key = mainKey(metrics);
  return key === undefined ? undefined : (metrics![key] as number);
}

export function termPValuesOf(metrics: Record<string, unknown> | undefined): { term: string; p: number }[] {
  if (!metrics) return [];
  const key = mainKey(metrics);
  if (key !== undefined && key !== "p_reported") return [];
  return Object.entries(metrics).flatMap(([k, v]) => {
    const term = TERM.exec(k)?.[1];
    const skip = key === "p_reported" && SAME_TEST.test(k);
    return term && !skip && typeof v === "number" && v >= 0 && v <= 1 && !NOT_A_TEST.test(k) ? [{ term: term.replace(/_x_/g, " x ").replace(/_/g, " "), p: v }] : [];
  });
}

function sourceOf(n: Node): string {
  const files = n.inputFiles?.map((f) => f.path).filter(Boolean) ?? [];
  if (files.length) return files[0];
  const args = Object.entries(n.args ?? {});
  const named = args.find(([k, v]) => /^(dataset|dataset_id|data_id)$/i.test(k) && typeof v === "string" && v);
  if (named) return String(named[1]);
  const path = args.find(([, v]) => typeof v === "string" && PATHISH.test(v));
  return path ? String(path[1]) : (n.inputHashes?.[0] ?? "");
}

export function latestValue(record: AnalysisRecord, key: string): unknown {
  let value: unknown;
  for (const e of record.entries(["setup", "decision"])) {
    const d = e.data as { values?: Record<string, unknown>; key?: string; new?: unknown; unset?: boolean };
    if (e.kind === "setup") {
      if (d.values && Object.hasOwn(d.values, key)) value = d.values[key];
    } else if (d.key === key) value = d.unset ? undefined : d.new;
  }
  return value;
}

export function collectTests(record: AnalysisRecord): TestEntry[] {
  const mode = String(latestValue(record, "test_family") ?? "same_data");
  const steps = new Map(record.nodes().filter((n) => !n.sensitivityOf).map((n, i) => [n.id, i + 1]));
  const out: TestEntry[] = [];
  for (const n of record.nodes()) {
    const step = steps.get(n.id);
    if (!step || record.replacedBy?.(n.id) || n.tool === "adjust_pvalues") continue;
    const result = n.result as { metrics?: Record<string, unknown>; data?: { test?: unknown } } | undefined;
    const single = pValueOf(result?.metrics);
    const found = [...(single !== undefined ? [{ term: "", p: single }] : []), ...termPValuesOf(result?.metrics)];
    if (!found.length) continue;
    const source = sourceOf(n);
    const name = typeof result?.data?.test === "string" && result.data.test ? result.data.test : n.tool.replace(/_/g, " ");
    const family = mode === "one_family" ? "all tests" : mode === "separate" ? `step ${step}` : source ? basename(source) : "no data file";
    for (const f of found) out.push({ node: n.id, step, test: f.term ? `${name}: ${f.term}` : name, tool: n.tool, source, p: f.p, family });
  }
  return out;
}

export function holm(ps: number[]): number[] {
  const m = ps.length;
  const order = ps.map((p, i) => i).sort((a, b) => ps[a] - ps[b]);
  const out = new Array<number>(m);
  let top = 0;
  order.forEach((i, rank) => {
    top = Math.max(top, Math.min(1, (m - rank) * ps[i]));
    out[i] = top;
  });
  return out;
}

export function benjaminiHochberg(ps: number[]): number[] {
  const m = ps.length;
  const order = ps.map((p, i) => i).sort((a, b) => ps[b] - ps[a]);
  const out = new Array<number>(m);
  let low = 1;
  order.forEach((i, k) => {
    low = Math.min(low, (ps[i] * m) / (m - k));
    out[i] = low;
  });
  return out;
}

export function testRows(record: AnalysisRecord): TestRow[] {
  const tests = collectTests(record);
  const rows = new Map<TestEntry, TestRow>();
  for (const family of new Set(tests.map((t) => t.family))) {
    const group = tests.filter((t) => t.family === family);
    const ps = group.map((t) => t.p);
    const h = holm(ps);
    const b = benjaminiHochberg(ps);
    group.forEach((t, i) => rows.set(t, { ...t, size: group.length, holm: h[i], bh: b[i] }));
  }
  return tests.map((t) => rows.get(t)!);
}

const shortP = (p: number) => (p < 0.0001 ? p.toExponential(1) : String(Number(p.toPrecision(3))));

export function testsTable(record: AnalysisRecord): { columns: string[]; rows: (string | number)[][] } | undefined {
  const rows = testRows(record);
  if (!rows.length) return undefined;
  return {
    columns: ["Step", "Test", "Raw p", "Holm p", "Benjamini-Hochberg p", "Family", "Tests in family"],
    rows: rows.map((r) => [r.step, r.test, shortP(r.p), shortP(r.holm), shortP(r.bh), r.family, r.size]),
  };
}

export function testsText(record: AnalysisRecord): string {
  const t = testsTable(record);
  if (!t) return "No test with a p value ran in this session.";
  const widths = t.columns.map((c, i) => Math.max(c.length, ...t.rows.map((r) => String(r[i]).length)));
  const line = (r: (string | number)[]) => r.map((c, i) => String(c).padEnd(widths[i])).join("  ").trimEnd();
  const chosen = latestValue(record, "test_correction");
  const tail = chosen ? `Correction chosen: ${String(chosen).replace(/_/g, " ")}.` : "No correction is chosen. Set the decision test_correction.";
  return [line(t.columns), line(widths.map((w) => "-".repeat(w))), ...t.rows.map(line), "", tail].join("\n");
}

export function testsMarkdown(record: AnalysisRecord): string[] {
  const t = testsTable(record);
  if (!t) return [];
  return ["## Tests in this session", "", `| ${t.columns.join(" | ")} |`, `| ${t.columns.map(() => "---").join(" | ")} |`, ...t.rows.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`), ""];
}
