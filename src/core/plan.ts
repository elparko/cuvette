import type { AnalysisRecord } from "./record.ts";
import type { FindingIn } from "./types.ts";

export interface PlanDecision {
  key?: string;
  label: string;
  value?: unknown;
  options?: string[];
  recommendation?: string;
  by?: string;
}

export interface PlanStep {
  step: string;
  method?: string;
  tool?: string;
  decisions?: PlanDecision[];
  status: string;
  reason?: string;
}

export interface PlanProgram {
  part: string;
  adapter: string;
  why?: string;
  alternatives?: string[];
}

export interface AnalysisPlan {
  question?: string;
  data?: { files?: string[]; row?: string; replicate?: string; n?: string };
  programs?: PlanProgram[];
  steps: PlanStep[];
  outputs?: string[];
  checks?: { check: string; if_fails?: string }[];
  out_of_scope?: string[];
}

const str = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "string" ? v.trim() : JSON.stringify(v));
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : typeof v === "string" && v.trim() ? [v.trim()] : []);
const objs = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : { step: x, check: x, part: x })) : []);
const has = (v: unknown) => v !== undefined && v !== null && v !== "";

function decisionOf(o: Record<string, unknown>): PlanDecision {
  const d: PlanDecision = { label: str(o.label ?? o.question ?? o.key) };
  if (o.key) d.key = str(o.key);
  if (has(o.value)) d.value = o.value;
  const opts = list(o.options);
  if (opts.length) d.options = opts;
  if (o.recommendation) d.recommendation = str(o.recommendation);
  return d;
}

export function readPlan(a: Record<string, unknown>, statusDefault = true): Partial<AnalysisPlan> {
  const p: Partial<AnalysisPlan> = {};
  if (a.question) p.question = str(a.question);
  if (a.data && typeof a.data === "object") {
    const d = a.data as Record<string, unknown>;
    p.data = { files: list(d.files), row: str(d.row), replicate: str(d.replicate), n: str(d.n) };
  }
  if (a.programs) p.programs = objs(a.programs).map((o) => ({ part: str(o.part), adapter: str(o.adapter), why: str(o.why), alternatives: list(o.alternatives) }));
  if (a.steps)
    p.steps = objs(a.steps).map((o) => ({
      step: str(o.step),
      method: str(o.method) || undefined,
      tool: str(o.tool) || undefined,
      decisions: objs(o.decisions).map(decisionOf).filter((d) => d.label),
      status: str(o.status) || (statusDefault ? "todo" : (undefined as unknown as string)),
      reason: str(o.reason) || undefined,
    }));
  if (a.outputs) p.outputs = list(a.outputs);
  if (a.checks) p.checks = objs(a.checks).map((o) => ({ check: str(o.check), if_fails: str(o.if_fails) || undefined }));
  if (a.out_of_scope) p.out_of_scope = list(a.out_of_scope);
  return p;
}

const sameStep = (a: PlanStep, b: PlanStep) => a.step.toLowerCase() === b.step.toLowerCase();

export function mergePlan(prev: AnalysisPlan, next: Partial<AnalysisPlan>): AnalysisPlan {
  const out: AnalysisPlan = { ...prev, ...next, steps: prev.steps.map((s) => ({ ...s })) };
  for (const s of next.steps ?? []) {
    const i = out.steps.findIndex((x) => sameStep(x, s));
    if (i < 0) out.steps.push({ ...s, status: s.status ?? "todo" });
    else out.steps[i] = { ...out.steps[i]!, ...Object.fromEntries(Object.entries(s).filter(([k, v]) => k !== "step" && v !== undefined && !(Array.isArray(v) && !v.length))) } as PlanStep;
  }
  return out;
}

export function addedSteps(prev: AnalysisPlan, next: AnalysisPlan): PlanStep[] {
  return next.steps.filter((s) => !prev.steps.some((p) => sameStep(p, s)));
}

function decisionLine(d: PlanDecision): string {
  if (has(d.value)) return `Set: ${d.label} = ${str(d.value)}${d.by ? ` (${d.by})` : ""}`;
  const opts = d.options?.length ? ` Options: ${d.options.join(", ")}.` : "";
  const rec = d.recommendation ? ` The agent recommends ${d.recommendation}.` : "";
  return `You decide: ${d.label}.${opts}${rec}`;
}

export function planText(p: Partial<AnalysisPlan>): string {
  const out: string[] = [];
  if (p.question) out.push(`Question: ${p.question}`);
  const d = p.data;
  if (d && (d.files?.length || d.row || d.replicate || d.n)) {
    out.push("", "Data");
    if (d.files?.length) out.push(`- Files: ${d.files.join(", ")}`);
    if (d.row) out.push(`- One row: ${d.row}`);
    if (d.replicate) out.push(`- Unit of replication: ${d.replicate}`);
    if (d.n) out.push(`- Sample size: ${d.n}`);
  }
  if (p.programs?.length) {
    out.push("", "Programs");
    for (const g of p.programs) out.push(`- ${g.part}: ${g.adapter}.${g.why ? ` ${g.why}` : ""}${g.alternatives?.length ? ` Other choices: ${g.alternatives.join(", ")}.` : ""}`);
  }
  if (p.steps?.length) {
    out.push("", "Steps");
    p.steps.forEach((s, i) => {
      const mark = s.status === "done" ? " [done]" : s.status === "skipped" ? " [skipped]" : "";
      out.push(`${i + 1}. ${s.step}${mark}`);
      if (s.method) out.push(`   Method: ${s.method}`);
      if (s.tool) out.push(`   Tool: ${s.tool}`);
      for (const x of s.decisions ?? []) out.push(`   - ${decisionLine(x)}`);
      if (s.reason) out.push(`   Reason: ${s.reason}`);
    });
  }
  if (p.outputs?.length) out.push("", "Outputs", ...p.outputs.map((x) => `- ${x}`));
  if (p.checks?.length) out.push("", "Checks", ...p.checks.map((c) => `- ${c.check}${c.if_fails ? ` If it fails: ${c.if_fails}` : ""}`));
  if (p.out_of_scope?.length) out.push("", "Out of scope", ...p.out_of_scope.map((x) => `- ${x}`));
  return out.join("\n").trim();
}

export function openDecisions(p: AnalysisPlan): { step: number; decision: PlanDecision }[] {
  return p.steps.flatMap((s, i) => (s.decisions ?? []).filter((d) => !has(d.value)).map((decision) => ({ step: i + 1, decision })));
}

function toolWords(tool: string): string[] {
  return tool.toLowerCase().split(/[\s,;/()]+/).filter(Boolean);
}

export function matchStep(p: AnalysisPlan, tool: string): number {
  const t = tool.toLowerCase();
  const spaced = t.replace(/_/g, " ");
  const hit = (s: PlanStep) =>
    (s.tool ? toolWords(s.tool).some((w) => w === t || t.endsWith(`_${w}`) || w.endsWith(`_${t}`)) : false) ||
    [s.step, s.method].some((x) => x && (x.toLowerCase().includes(t) || (spaced.includes(" ") && x.toLowerCase().includes(spaced))));
  const open = p.steps.findIndex((s) => s.status !== "done" && s.status !== "skipped" && hit(s));
  return open >= 0 ? open : p.steps.findIndex(hit);
}

export function plannedAdapters(p: AnalysisPlan | undefined): string[] {
  return [...new Set((p?.programs ?? []).map((g) => g.adapter).filter(Boolean))];
}

export interface ApprovedPlan {
  version: number;
  text: string;
  plan: AnalysisPlan;
  ts: string;
  entry: number;
  updates: { version: number; reason: string; text: string; ts: string }[];
}

export function approvedPlan(record: AnalysisRecord): ApprovedPlan | undefined {
  const a = record.entries(["plan_approved"]).at(-1);
  if (!a) return undefined;
  const updates = record
    .entries(["plan"])
    .filter((e) => e.id > a.id && e.data.action === "updated")
    .map((e) => ({ version: Number(e.data.version), reason: str(e.data.reason), text: str(e.data.text), ts: e.ts }));
  return { version: Number(a.data.version), text: str(a.data.text), plan: a.data.plan as unknown as AnalysisPlan, ts: a.ts, entry: a.id, updates };
}

export function currentPlan(record: AnalysisRecord): AnalysisPlan | undefined {
  const a = approvedPlan(record);
  if (!a) return undefined;
  const last = record.entries(["plan"]).filter((e) => e.id > a.entry && (e.data.action === "updated" || e.data.action === "status") && e.data.plan).at(-1);
  return (last?.data.plan as unknown as AnalysisPlan | undefined) ?? a.plan;
}

export function planMarkdown(record: AnalysisRecord): string[] {
  const a = approvedPlan(record);
  if (!a) return [];
  const out = [`## Analysis plan (version ${a.version}, approved ${a.ts.slice(0, 16).replace("T", " ")})`, "", a.text, ""];
  if (a.updates.length) {
    out.push("### Changes after approval", "");
    for (const u of a.updates) out.push(`- Version ${u.version}: ${u.reason || "no reason given"}`);
    out.push("");
  }
  return out;
}

export function planFindings(record: AnalysisRecord): FindingIn[] {
  const a = approvedPlan(record);
  if (!a) return [];
  const plan = currentPlan(record) ?? a.plan;
  const ran = record.nodes().filter((n) => !n.sensitivityOf && n.tool !== "calculate");
  const out: FindingIn[] = [];
  plan.steps.forEach((s, i) => {
    if (!s.tool || s.status === "done" || (s.status === "skipped" && s.reason)) return;
    if (ran.some((n) => matchStep({ steps: [s] }, n.tool) === 0)) return;
    out.push({ check: "plan_step_missing", severity: "warning", message: `The approved plan has step ${i + 1} (${s.step}), but it did not run and the plan gives no reason.` });
  });
  for (const tool of new Set(ran.filter((n) => n.entry > a.entry).map((n) => n.tool))) {
    if (matchStep(plan, tool) >= 0) continue;
    out.push({ check: "plan_step_extra", severity: "warning", message: `The step ${tool} is not in the approved plan, and the plan was not updated with a reason.`, nodes: ran.filter((n) => n.tool === tool).map((n) => n.id) });
  }
  return out;
}

export function planView(record: AnalysisRecord): { approved: boolean; version: number; text: string; updates: { version: number; reason: string }[] } | undefined {
  const a = approvedPlan(record);
  const proposed = record.entries(["plan"]).filter((e) => e.data.action === "proposed" || e.data.action === "update_proposed").at(-1);
  const cancelled = proposed && record.entries(["plan"]).some((e) => e.id > proposed.id && e.data.action === "cancelled");
  if (proposed && !cancelled && (!a || proposed.id > a.entry)) return { approved: false, version: Number(proposed.data.version), text: str(proposed.data.full ?? proposed.data.text), updates: [] };
  if (!a) return undefined;
  const now = currentPlan(record);
  return {
    approved: true,
    version: Math.max(a.version, ...a.updates.map((u) => u.version)),
    text: a.updates.length && now ? planText(now) : a.text,
    updates: a.updates.map((u) => ({ version: u.version, reason: u.reason })),
  };
}
