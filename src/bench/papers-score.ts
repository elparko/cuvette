import { checkAnswer, extractNumbers } from "../core/claims.ts";
import type { AnalysisRecord } from "../core/record.ts";
import type { Claim, Entry } from "../core/types.ts";
import type { PaperItem } from "./papers-spec.ts";

export interface ComputedMatch {
  pass: boolean;
  via?: "main" | "comparison";
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
  via: "tolerance" | "rounding" | "code" | null;
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

export function computedFault(i: Pick<ItemScore, "expected" | "tolerance" | "abs" | "computed">): string | undefined {
  const c = i.computed;
  if (c.value === null) return c.diff !== null || c.pass ? "no value, but a difference or a pass" : undefined;
  if (c.diff === null) return "a value without a difference";
  const d = Math.abs((i.abs ? Math.abs(c.value) : c.value) - i.expected);
  if (Math.abs(d - c.diff) > 1e-9 * Math.max(1, d)) return `value ${c.value} is ${d} from ${i.expected}, but diff is ${c.diff}`;
  const limit = i.tolerance === "exact" ? 0 : i.tolerance;
  if (c.pass !== d <= limit + EPS * Math.max(1, Math.abs(i.expected))) return `pass is ${c.pass} for diff ${c.diff} and tolerance ${i.tolerance}`;
  return undefined;
}

export function checkComputed(items: ItemScore[]): ItemScore[] {
  const faults = items.flatMap((i) => {
    const f = computedFault(i);
    return f ? [`${i.key}: ${f}`] : [];
  });
  if (faults.length) throw new Error(`computed score does not match its own value:\n${faults.join("\n")}`);
  return items;
}

export function scoreComputed(item: PaperItem, record: Pick<AnalysisRecord, "numbers" | "nodes" | "node">): ComputedMatch {
  const nodes = record.nodes();
  const comparison = new Set(nodes.filter((n) => n.sensitivityOf).map((n) => n.id));
  const wrongTool = new Set(nodes.filter((n) => item.tool && n.tool !== item.tool).map((n) => n.id));
  let main: { n: { node: string; path: string; value: number }; d: number } | undefined;
  let comp: typeof main;
  for (const n of record.numbers()) {
    if (wrongTool.has(n.node)) continue;
    const d = gap(item, n.value);
    if (comparison.has(n.node)) {
      if (!comp || d < comp.d) comp = { n, d };
    } else if (!main || d < main.d) main = { n, d };
  }
  const useComp = comp && within(item, comp.d) && !(main && within(item, main.d));
  const best = useComp ? comp : main ?? comp;
  if (!best) return Object.freeze({ pass: false, value: null, diff: null, node: null, path: null, entry: null });
  return Object.freeze({
    pass: within(item, best.d),
    via: within(item, best.d) ? (useComp || best === comp ? "comparison" : "main") : undefined,
    value: best.n.value,
    diff: best.d,
    node: best.n.node,
    path: best.n.path,
    entry: record.node(best.n.node)?.entry ?? null,
  });
}

function reportedSteps(c: Claim): { value: number; step: number }[] {
  const found = extractNumbers(c.text).filter((f) => f.value === c.value);
  if (!found.length) return [{ value: c.value as number, step: 0 }];
  return found.flatMap((f) => [{ value: f.value, step: f.step }, ...(f.percent ? [{ value: f.value / 100, step: f.step / 100 }] : [])]);
}

function roundedTo(x: number, step: number): number {
  return Math.round(x / step) * step;
}

function statesCode(code: string, answer: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9])${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`).test(answer);
}

export function scoreReported(item: PaperItem, found: { entry: Entry; claims: Claim[] } | undefined, answer = ""): ReportedMatch {
  const none: ReportedMatch = { pass: false, value: null, diff: null, via: null, node: null, claimEntry: found?.entry.id ?? null, text: null };
  if (!item.in_answer) return { ...none, pass: null };
  if (item.code && statesCode(item.code, answer)) return { ...none, pass: true, value: item.value, diff: 0, via: "code" };
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
  const answer = modelAnswer(String(finalAnswer(record)?.data.text ?? ""));
  return checkComputed(items.filter((item) => !item.trap && !item.optional).map((item) => ({
    key: item.key,
    description: item.description,
    expected: item.value,
    tolerance: tolerance(item),
    abs: item.abs,
    inAnswer: item.in_answer,
    reference: item.reference,
    computed: scoreComputed(item, record),
    reported: scoreReported(item, claims, answer),
  })));
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

const HARNESS_TAILS = ["\n\nStep results that the answer does not mention", "\n\nSettings used, from the decision record"];

export function modelAnswer(text: string): string {
  const cut = HARNESS_TAILS.map((t) => text.indexOf(t)).filter((i) => i >= 0);
  return cut.length ? text.slice(0, Math.min(...cut)) : text;
}

export function rescoreItems(items: PaperItem[], record: AnalysisRecord): ItemScore[] {
  const final = finalAnswer(record);
  const found = final ? { entry: final, claims: checkAnswer(modelAnswer(String(final.data.text ?? "")), { numbers: () => record.numbers(), nodes: () => record.nodes(), stale: () => record.stale(), entries: () => [], append: () => final } as never) } : undefined;
  return checkComputed(items.filter((item) => !item.trap && !item.optional).map((item) => ({
    key: item.key,
    description: item.description,
    expected: item.value,
    tolerance: tolerance(item),
    abs: item.abs,
    inAnswer: item.in_answer,
    reference: item.reference,
    computed: scoreComputed(item, record),
    reported: scoreReported(item, found, modelAnswer(String(final?.data.text ?? ""))),
  })));
}
