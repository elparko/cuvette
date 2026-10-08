import { costUsd } from "../core/spend.ts";
import { DEFAULT_CLAUDE_MODEL } from "../providers/claude.ts";
import type { ItemScore, ProcessMetrics } from "./papers-score.ts";
import type { PapersResult, PaperRun } from "./papers.ts";

export interface Cell {
  computed: number;
  computedOf: number;
  reported: number;
  reportedOf: number;
  runs: number;
  statuses: Record<string, number>;
}

const emptyCell = (): Cell => ({ computed: 0, computedOf: 0, reported: 0, reportedOf: 0, runs: 0, statuses: {} });

function add(cell: Cell, r: PaperRun): void {
  cell.runs++;
  cell.statuses[r.status] = (cell.statuses[r.status] ?? 0) + 1;
  const scored = r.items.filter((i) => !i.reference);
  cell.computed += scored.filter((i) => i.computed.pass).length;
  cell.computedOf += scored.length;
  cell.reported += scored.filter((i) => i.reported.pass).length;
  cell.reportedOf += scored.filter((i) => i.inAnswer).length;
}

export function summarize(result: PapersResult) {
  const cells: Record<string, Record<string, Cell>> = {};
  const totals: Record<string, Cell> = {};
  const metrics: Record<string, Record<string, number>> = {};
  for (const r of result.runs) {
    if (r.status === "skipped") continue;
    add((cells[r.paper] ??= {})[r.model] ??= emptyCell(), r);
    add((totals[r.model] ??= emptyCell()), r);
    const m = (metrics[r.model] ??= { runs: 0, durationS: 0 });
    m.runs++;
    m.durationS += r.durationS;
    for (const [k, v] of Object.entries(r.metrics ?? {})) {
      if (typeof v === "number") m[k] = (m[k] ?? 0) + v;
      else for (const [kk, vv] of Object.entries(v as Record<string, number>)) m[`${k}_${kk}`] = (m[`${k}_${kk}`] ?? 0) + vv;
    }
  }
  return { cells, totals, metrics, skipped: result.runs.filter((r) => r.status === "skipped").map((r) => ({ paper: r.paper, reason: r.error })) };
}

const frac = (a: number, b: number) => `${a}/${b}`;

function cellText(c: Cell | undefined): string {
  if (!c) return "-";
  const bad = Object.entries(c.statuses).filter(([k]) => k !== "answer").map(([k, v]) => `${v} ${k}`);
  return `${frac(c.computed, c.computedOf)} / ${frac(c.reported, c.reportedOf)}${bad.length ? ` (${bad.join(", ")})` : ""}`;
}

const fixed = (x: number, d = 1) => (Number.isInteger(x) ? String(x) : x.toFixed(d));

function itemRows(items: ItemScore[]): string[] {
  const num = (x: number | null) => (x === null ? "-" : String(Number(x.toPrecision(7))));
  return items.map((i) => {
    const tol = i.tolerance === "exact" ? "exact" : `±${i.tolerance}`;
    const c = i.computed;
    const rp = i.reported;
    const label = (ok: boolean) => (i.reference ? (ok ? "match" : "differs") : ok ? "pass" : "FAIL");
    const computed = `${label(c.pass)} ${num(c.value)}${c.node ? ` (${c.node} ${c.path || "result"}, entry ${c.entry})` : ""}`;
    const reported = rp.pass === null ? "not asked" : `${label(rp.pass)} ${num(rp.value)}${rp.via ? ` via ${rp.via}` : ""}${rp.node ? ` (${rp.node}, claim check ${rp.claimEntry})` : ""}`;
    return `| ${i.key}${i.reference ? " (reference)" : ""} | ${i.abs ? "abs " : ""}${i.expected} ${tol} | ${computed} | ${reported} |`;
  });
}

const METRIC_COLUMNS: [string, string][] = [
  ["runs", "runs"],
  ["durationS", "seconds"],
  ["requests", "requests"],
  ["inputTokens", "input tokens"],
  ["outputTokens", "output tokens"],
  ["cacheRead", "cache read"],
  ["toolCalls", "tool calls"],
  ["failedToolCalls", "failed calls"],
  ["nudges", "nudges"],
  ["planReminders", "plan reminders"],
  ["revisions", "revisions"],
  ["findings_info", "info"],
  ["findings_warning", "warning"],
  ["findings_error", "error"],
  ["unsourced", "unsourced"],
  ["deviations", "deviations"],
  ["overwritten", "overwritten"],
];

export function renderPapersReport(result: PapersResult): string {
  const sum = summarize(result);
  const papers = [...new Set(result.runs.map((r) => r.paper))];
  const L: string[] = [];
  L.push(`# Paper benchmark ${result.date}`, "");
  L.push(`Models: ${result.models.join(", ")}. Runs per paper and model: ${result.runsPerCell}.`);
  L.push("Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.", "");
  L.push("| Model | Computed | Reported | Runs | Not answered |", "| --- | --- | --- | --- | --- |");
  for (const m of result.models) {
    const t = sum.totals[m];
    if (!t) continue;
    const bad = Object.entries(t.statuses).filter(([k]) => k !== "answer").map(([k, v]) => `${v} ${k}`).join(", ") || "0";
    L.push(`| ${m} | ${frac(t.computed, t.computedOf)} | ${frac(t.reported, t.reportedOf)} | ${t.runs} | ${bad} |`);
  }
  L.push("", "## Matrix", "", `| Paper | ${result.models.join(" | ")} |`, `| --- | ${result.models.map(() => "---").join(" | ")} |`);
  for (const p of papers) {
    const skip = sum.skipped.find((s) => s.paper === p);
    L.push(`| ${p} | ${result.models.map((m) => (skip ? "skipped" : cellText(sum.cells[p]?.[m]))).join(" | ")} |`);
  }
  if (sum.skipped.length) {
    L.push("", "Skipped papers:");
    for (const p of [...new Set(sum.skipped.map((s) => s.paper))]) L.push(`- ${p}: ${sum.skipped.find((s) => s.paper === p)!.reason}`);
  }
  L.push("", "## Process metrics", "", "Sums over all runs of a model.", "", `| Model | ${METRIC_COLUMNS.map(([, h]) => h).join(" | ")} |`, `| --- | ${METRIC_COLUMNS.map(() => "---").join(" | ")} |`);
  for (const m of result.models) {
    const x = sum.metrics[m];
    if (x) L.push(`| ${m} | ${METRIC_COLUMNS.map(([k]) => fixed(x[k] ?? 0, 0)).join(" | ")} |`);
  }
  const paid = result.models.filter((m) => m.startsWith("claude"));
  if (paid.length) {
    L.push("", "Estimated Claude cost from the token counts (list prices, before any discount):", "");
    for (const m of paid) {
      const x = sum.metrics[m];
      if (!x) continue;
      const model = m.includes(":") ? m.slice(m.indexOf(":") + 1) : DEFAULT_CLAUDE_MODEL;
      const usd = costUsd(model, { inputTokens: x.inputTokens ?? 0, outputTokens: x.outputTokens ?? 0, cacheRead: x.cacheRead ?? 0, cacheWrite: x.cacheWrite ?? 0 });
      L.push(`- ${m}: $${usd.toFixed(2)} for ${x.runs ?? 0} runs`);
    }
  }
  L.push("", "## Details", "");
  for (const r of result.runs) {
    if (r.status === "skipped") continue;
    const mt: ProcessMetrics | undefined = r.metrics;
    L.push(`### ${r.paper} | ${r.model} | run ${r.run}`, "");
    L.push(`Status: ${r.status}${r.error ? ` (${r.error.slice(0, 200)})` : ""}. ${fixed(r.durationS, 0)} s.${mt ? ` ${mt.requests} requests, ${mt.toolCalls} tool calls (${mt.failedToolCalls} failed), ${mt.nudges} nudges, ${mt.planReminders} plan reminders, ${mt.unsourced} unsourced.` : ""}`);
    if (r.dir) L.push(`Session: ${r.session}. Record: ${r.dir}/log.jsonl`);
    L.push("", "| Item | Expected | Computed | Reported |", "| --- | --- | --- | --- |", ...itemRows(r.items), "");
  }
  return L.join("\n") + "\n";
}
