import { createHash } from "node:crypto";
import { extractNumbers } from "./claims.ts";
import { liveEntries, type AnalysisRecord } from "./record.ts";
import type { AnalysisPlan } from "./plan.ts";
import type { Entry } from "./types.ts";

export const NO_REASON = "No reason given";
export const AFTER_RESULT = "Changed after the result was seen";
export const NO_DEVIATIONS = "None. The analysis followed the frozen plan.";

export type DeviationKind = "step" | "method" | "setting" | "exclusion" | "definition" | "program";

export interface PlanChange {
  kind: DeviationKind;
  what: string;
  from?: string;
  to?: string;
}

export interface PlanDeviation extends PlanChange {
  id: number;
  ts: string;
  reason: string;
  afterResult: boolean;
  source: string;
}

export interface Freeze {
  entry: number;
  ts: string;
  hash: string;
  version: number;
  plan: AnalysisPlan;
}

const GENERIC_REASONS = /^(changed by the scientist|changed with \/change|changed answer to q\d+|answer to q\d+|setup edited)$/i;

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
        .map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

export function planHash(plan: AnalysisPlan): string {
  return createHash("sha256").update(JSON.stringify(canonical(plan))).digest("hex");
}

export function freezePlan(record: AnalysisRecord, plan: AnalysisPlan, version: number, approved: number): Entry {
  return record.append("plan_frozen", { hash: planHash(plan), version, approved, plan: structuredClone(plan) }, { refs: [approved] });
}

export function frozenPlan(record: AnalysisRecord): Freeze | undefined {
  const e = liveEntries(record, ["plan_frozen"])[0];
  if (!e) return undefined;
  return { entry: e.id, ts: e.ts, hash: String(e.data.hash), version: Number(e.data.version), plan: e.data.plan as unknown as AnalysisPlan };
}

export function sawResult(record: AnalysisRecord, after: number): boolean {
  return liveEntries(record, ["node", "assistant"]).some((e) => {
    if (e.id <= after) return false;
    if (e.kind === "node") return true;
    return e.data.final === true && extractNumbers(String(e.data.text ?? "")).length > 0;
  });
}

export function recordDeviation(record: AnalysisRecord, change: PlanChange, source: string, reason = ""): Entry | undefined {
  const frozen = frozenPlan(record);
  if (!frozen) return undefined;
  const given = reason.trim();
  return record.append("plan_deviation", {
    ...change,
    reason: GENERIC_REASONS.test(given) ? "" : given,
    afterResult: sawResult(record, frozen.entry),
    source,
    hash: frozen.hash,
  });
}

export function deviations(record: AnalysisRecord): PlanDeviation[] {
  const frozen = frozenPlan(record);
  if (!frozen) return [];
  const later = liveEntries(record, ["correction"]).filter((c) => typeof c.data.deviationReason === "string");
  return liveEntries(record, ["plan_deviation"])
    .filter((e) => e.id > frozen.entry)
    .map((e) => {
      const fixed = later.filter((c) => c.refs?.[0] === e.id).at(-1)?.data.deviationReason as string | undefined;
      const d = e.data;
      return {
        id: e.id,
        ts: e.ts,
        kind: d.kind as DeviationKind,
        what: String(d.what ?? ""),
        from: d.from === undefined ? undefined : String(d.from),
        to: d.to === undefined ? undefined : String(d.to),
        reason: (fixed ?? String(d.reason ?? "")).trim() || NO_REASON,
        afterResult: d.afterResult === true,
        source: String(d.source ?? ""),
      };
    });
}

export function setDeviationReason(record: AnalysisRecord, id: number, reason: string): void {
  record.correct(id, { deviationReason: reason.trim() });
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const text = (v: unknown) => (v === undefined || v === null || v === "" ? "none" : typeof v === "string" ? v : JSON.stringify(v));

export function planChanges(from: AnalysisPlan, to: AnalysisPlan, opts: { settings?: boolean } = {}): PlanChange[] {
  const out: PlanChange[] = [];
  for (const s of to.steps) {
    const old = from.steps.find((x) => same(x.step, s.step));
    if (!old) {
      out.push({ kind: "step", what: `Added step: ${s.step}`, to: s.method ?? s.tool });
      continue;
    }
    if (s.status === "skipped" && old.status !== "skipped") out.push({ kind: "step", what: `Skipped step: ${s.step}`, from: old.status });
    for (const k of ["method", "tool"] as const) {
      if ((old[k] ?? "") !== (s[k] ?? "")) out.push({ kind: "method", what: `${k === "method" ? "Method" : "Tool"} of step ${s.step}`, from: text(old[k]), to: text(s[k]) });
    }
    if (opts.settings === false) continue;
    for (const d of s.decisions ?? []) {
      const was = old.decisions?.find((x) => (d.key ? x.key === d.key : same(x.label, d.label)));
      if (was && d.value !== undefined && JSON.stringify(was.value) !== JSON.stringify(d.value)) out.push({ kind: "setting", what: `${d.label} in step ${s.step}`, from: text(was.value), to: text(d.value) });
    }
  }
  for (const s of from.steps) if (!to.steps.some((x) => same(x.step, s.step))) out.push({ kind: "step", what: `Removed step: ${s.step}`, from: s.method ?? s.tool });
  const ex = (p: AnalysisPlan) => (p.exclusions ?? []).map((x) => x.what);
  for (const w of ex(to)) if (!ex(from).some((x) => same(x, w))) out.push({ kind: "exclusion", what: `Added exclusion: ${w}` });
  for (const w of ex(from)) if (!ex(to).some((x) => same(x, w))) out.push({ kind: "exclusion", what: `Removed exclusion: ${w}` });
  for (const d of to.definitions ?? []) {
    const old = from.definitions?.find((x) => same(x.measure, d.measure));
    if (old?.definition !== d.definition) out.push({ kind: "definition", what: `Definition of ${d.measure}`, from: text(old?.definition), to: d.definition });
  }
  for (const d of from.definitions ?? []) if (!to.definitions?.some((x) => same(x.measure, d.measure))) out.push({ kind: "definition", what: `Definition of ${d.measure}`, from: d.definition, to: "none" });
  for (const g of to.programs ?? []) {
    const old = from.programs?.find((x) => same(x.part, g.part));
    if (old && old.adapter !== g.adapter) out.push({ kind: "program", what: `Program for ${g.part || "the analysis"}`, from: old.adapter, to: g.adapter });
  }
  return out;
}

export function deviationLine(d: PlanDeviation): string {
  const move = d.from !== undefined || d.to !== undefined ? `: ${d.from ?? "none"} to ${d.to ?? "none"}` : "";
  return `${d.what}${move}. Reason: ${d.reason}`;
}

const stamp = (ts: string) => ts.slice(0, 16).replace("T", " ");

export function deviationMarkdown(record: AnalysisRecord): string[] {
  const f = frozenPlan(record);
  if (!f) return [];
  const list = deviations(record);
  const out = ["## Deviations from the plan", "", `Plan frozen ${stamp(f.ts)}. SHA-256 of the plan: ${f.hash}.`, ""];
  if (!list.length) out.push(NO_DEVIATIONS, "");
  else out.push(...list.map((d) => `- ${stamp(d.ts)} ${deviationLine(d)}${d.afterResult ? ` **${AFTER_RESULT}.**` : ""}`), "");
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function deviationHtml(record: AnalysisRecord, heading = "h2"): string {
  const f = frozenPlan(record);
  if (!f) return "";
  const list = deviations(record);
  const head = `<p>Plan frozen ${esc(stamp(f.ts))}. SHA-256 of the plan: <code>${f.hash}</code>.</p>`;
  const body = list.length
    ? `<ul>${list.map((d) => `<li>${esc(stamp(d.ts))} ${esc(deviationLine(d))}${d.afterResult ? ` <strong>${AFTER_RESULT}.</strong>` : ""}</li>`).join("")}</ul>`
    : `<p>${NO_DEVIATIONS}</p>`;
  return `<${heading}>Deviations from the plan</${heading}>${head}${body}`;
}
