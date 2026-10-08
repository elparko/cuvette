import { extractNumbers } from "../core/claims.ts";
import type { AnalysisRecord } from "../core/record.ts";
import type { Claim, Entry } from "../core/types.ts";
import type { PaperItem } from "./papers-spec.ts";

export interface ComputedMatch {
  pass: boolean;
  value: number | null;
  diff: number | null;
  node: string | null;
  path: string | null;
  entry: number | null;
}

export interface ReportedMatch {
  pass: boolean | null;
  value: number | null;
  diff: number | null;
  via: "tolerance" | "rounding" | null;
  node: string | null;
  claimEntry: number | null;
  text: string | null;
}

export interface ItemScore {
  key: string;
  description: string;
  expected: number;
  tolerance: number | "exact";
  abs: boolean;
  inAnswer: boolean;
  reference: boolean;
  computed: ComputedMatch;
  reported: ReportedMatch;
}

export interface ProcessMetrics {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  toolCalls: number;
  failedToolCalls: number;
  nudges: number;
  planReminders: number;
  revisions: number;
  findings: { info: number; warning: number; error: number };
  unsourced: number;
  deviations: number;
  overwritten: number;
  nodes: number;
}

const EPS = 1e-9;
const NOTES = "[Notes from the harness]";

const limit = (item: PaperItem) => (item.exact ? 0 : (item.tolerance ?? 0));
const tolerance = (item: PaperItem): number | "exact" => (item.exact ? "exact" : (item.tolerance ?? 0));
const gap = (item: PaperItem, v: number) => Math.abs((item.abs ? Math.abs(v) : v) - item.value);
const within = (item: PaperItem, d: number) => d <= limit(item) + EPS * Math.max(1, Math.abs(item.value));

export function finalAnswer(record: Pick<AnalysisRecord, "entries">): Entry | undefined {
  return record.entries(["assistant"]).filter((e) => e.data.final === true).at(-1);
}

export function finalClaims(record: Pick<AnalysisRecord, "entries">): { entry: Entry; claims: Claim[] } | undefined {
  const final = finalAnswer(record);
  const checks = record.entries(["claim_check"]).filter((e) => !final || e.id < final.id);
  const entry = checks.at(-1);
  return entry ? { entry, claims: (entry.data.claims ?? []) as Claim[] } : undefined;
}

export function scoreComputed(item: PaperItem, record: Pick<AnalysisRecord, "numbers" | "nodes" | "node">): ComputedMatch {
  const nodes = record.nodes();
  const skip = new Set(nodes.filter((n) => (n.sensitivityOf && !item.from_comparison) || (item.tool && n.tool !== item.tool)).map((n) => n.id));
  let best: { n: { node: string; path: string; value: number }; d: number } | undefined;
  for (const n of record.numbers()) {
    if (skip.has(n.node)) continue;
    const d = gap(item, n.value);
    if (!best || d < best.d) best = { n, d };
  }
  if (!best) return { pass: false, value: null, diff: null, node: null, path: null, entry: null };
  return {
    pass: within(item, best.d),
    value: best.n.value,
    diff: best.d,
    node: best.n.node,
    path: best.n.path,
    entry: record.node(best.n.node)?.entry ?? null,
  };
}

function reportedSteps(c: Claim): { value: number; step: number }[] {
  const found = extractNumbers(c.text).filter((f) => f.value === c.value);
  if (!found.length) return [{ value: c.value as number, step: 0 }];
  return found.flatMap((f) => [{ value: f.value, step: f.step }, ...(f.percent ? [{ value: f.value / 100, step: f.step / 100 }] : [])]);
}

function roundedTo(x: number, step: number): number {
  return Math.round(x / step) * step;
}

export function scoreReported(item: PaperItem, found: { entry: Entry; claims: Claim[] } | undefined): ReportedMatch {
  const none: ReportedMatch = { pass: false, value: null, diff: null, via: null, node: null, claimEntry: found?.entry.id ?? null, text: null };
  if (!item.in_answer) return { ...none, pass: null };
  if (!found) return none;
  let best: ReportedMatch | undefined;
  for (const c of found.claims) {
    if (c.label !== "measured" || c.value === null) continue;
    for (const r of reportedSteps(c)) {
      if (Number.isInteger(r.value) && Math.abs(r.value) <= 10 && !Number.isInteger(item.value)) continue;
      const d = gap(item, r.value);
      let via: ReportedMatch["via"] = within(item, d) ? "tolerance" : null;
      if (!via && !item.exact && r.step > 0 && r.value !== 0 && r.step <= Math.abs(item.value) / 10) {
        const target = roundedTo(item.value, r.step);
        const shown = item.abs ? Math.abs(r.value) : r.value;
        if (Math.abs(target - shown) <= r.step * 1e-6) via = "rounding";
      }
      const cand: ReportedMatch = { pass: via !== null, value: r.value, diff: d, via, node: c.node ?? null, claimEntry: found.entry.id, text: c.text };
      if (!best || (cand.pass && !best.pass) || (cand.pass === best.pass && d < (best.diff ?? Infinity))) best = cand;
    }
  }
  return best ?? none;
}

export function scoreItems(items: PaperItem[], record: Pick<AnalysisRecord, "numbers" | "nodes" | "node" | "entries">): ItemScore[] {
  const claims = finalClaims(record);
  return items.map((item) => ({
    key: item.key,
    description: item.description,
    expected: item.value,
    tolerance: tolerance(item),
    abs: item.abs,
    inAnswer: item.in_answer,
    reference: item.reference,
    computed: scoreComputed(item, record),
    reported: scoreReported(item, claims),
  }));
}

export function processMetrics(record: Pick<AnalysisRecord, "entries" | "nodes">): ProcessMetrics {
  const entries = record.entries();
  const count = (kind: Entry["kind"]) => entries.filter((e) => e.kind === kind);
  const usage = count("usage");
  const sum = (k: string) => usage.reduce((a, e) => a + (Number(e.data[k]) || 0), 0);
  const results = count("tool_result");
  const messages = count("message").map((e) => e.data.message as { role: string; parts: { type: string; text?: string }[] });
  const firstUser = messages.findIndex((m) => m.role === "user");
  const harness = messages.filter((m, i) => i !== firstUser && m.role === "user" && m.parts[0]?.type === "text" && m.parts[0].text?.startsWith(NOTES));
  const planReminders = harness.filter((m) => m.parts[0].text?.includes("Your plan still has steps")).length;
  const findings = { info: 0, warning: 0, error: 0 };
  for (const f of count("finding")) findings[f.data.severity as keyof typeof findings]++;
  const devs = count("deviation").flatMap((e) => (e.data.deviations ?? []) as { overwritten?: boolean }[]);
  const claims = finalClaims(record);
  return {
    requests: usage.length,
    inputTokens: sum("inputTokens"),
    outputTokens: sum("outputTokens"),
    cacheRead: sum("cacheRead"),
    cacheWrite: sum("cacheWrite"),
    toolCalls: count("tool_call").length,
    failedToolCalls: results.filter((e) => e.data.ok === false).length,
    nudges: harness.length - planReminders,
    planReminders,
    revisions: messages.filter((m) => m.role === "user" && m.parts[0]?.text?.startsWith("[Review before the answer")).length,
    findings,
    unsourced: Number(claims?.entry.data.unsourced ?? 0),
    deviations: devs.length,
    overwritten: devs.filter((d) => d.overwritten).length,
    nodes: record.nodes().filter((n) => !n.sensitivityOf).length,
  };
}
