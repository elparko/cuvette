import { pilotText, validationRows, type PilotRun } from "./pilot.ts";
import { liveEntries, type AnalysisRecord } from "./record.ts";
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
  program?: string;
  why?: string;
  alternatives?: string[];
}

export interface PlanDefinition {
  measure: string;
  definition: string;
}

export interface AnalysisPlan {
  restatement?: string;
  question?: string;
  definitions?: PlanDefinition[];
  exclusions?: { what: string; effect?: string }[];
  pilot?: { sample: string; shows?: string[] };
  reference?: { path?: string; sheet?: string; sample_column?: string; columns?: string[]; question?: string };
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
  if (o.by && has(d.value)) d.by = str(o.by);
  return d;
}

const SETUP_SENTENCE = /\b(is ready|are ready|installed|where (the )?(results?|files?|outputs?) (go|are saved|will be saved)|which folder|save the results)\b/i;

export function goalOnly(restatement: string): { text: string; dropped: string[] } {
  const parts = restatement.split(/(?<=[.!?])\s+/);
  const dropped = parts.filter((x) => SETUP_SENTENCE.test(x));
  return { text: parts.filter((x) => !SETUP_SENTENCE.test(x)).join(" ").trim(), dropped };
}

export function readPlan(a: Record<string, unknown>, statusDefault = true): Partial<AnalysisPlan> {
  const p: Partial<AnalysisPlan> = {};
  if (a.restatement) p.restatement = str(a.restatement);
  if (a.question) p.question = str(a.question);
  if (a.definitions) p.definitions = objs(a.definitions).map((o) => ({ measure: str(o.measure), definition: str(o.definition) })).filter((d) => d.measure && d.definition);
  if (a.exclusions) p.exclusions = objs(a.exclusions).map((o) => ({ what: str(o.what ?? o.step), effect: str(o.effect) || undefined })).filter((x) => x.what);
  if (a.pilot && typeof a.pilot === "object" && str((a.pilot as Record<string, unknown>).sample)) {
    const o = a.pilot as Record<string, unknown>;
    p.pilot = { sample: str(o.sample), shows: list(o.shows) };
  }
  if (a.reference && typeof a.reference === "object") {
    const o = a.reference as Record<string, unknown>;
    p.reference = { path: str(o.path) || undefined, sheet: str(o.sheet) || undefined, sample_column: str(o.sample_column) || undefined, columns: list(o.columns), question: str(o.question) || undefined };
  }
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
      decisions: [...objs(o.settings), ...objs(o.decisions)].map(decisionOf).filter((d) => d.label),
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

const valueText = (d: PlanDecision) => `${str(d.value)}${d.by ? ` (${d.by})` : ""}`;

function settingLine(d: PlanDecision): string {
  if (has(d.value)) return `${d.label}: ${valueText(d)}`;
  const opts = d.options?.length ? ` Options: ${d.options.join(", ")}.` : "";
  const rec = d.recommendation ? ` The agent suggests ${d.recommendation}.` : "";
  return `${d.label}: open, you decide.${opts}${rec}`;
}

export function programLine(g: PlanProgram): string {
  return `${g.part ? `${g.part}: ` : ""}${g.program && g.program !== g.adapter ? `${g.program} through ${g.adapter}` : g.adapter} (agent)${g.why ? `. ${g.why.replace(/[.\s]+$/, "")}.` : ""}`;
}

export function settingsOf(p: Partial<AnalysisPlan>): { step: number; setting: PlanDecision }[] {
  return (p.steps ?? []).flatMap((s, i) => (s.decisions ?? []).map((setting) => ({ step: i + 1, setting })));
}

export interface PlanTextOptions {
  view?: "full" | "compact" | "details";
  numbered?: boolean;
}

export function planText(p: Partial<AnalysisPlan>, o: PlanTextOptions = {}): string {
  const view = o.view ?? "full";
  const out: string[] = [];
  const n = (i: number) => (o.numbered ? `[${i}] ` : "");
  const defs = p.definitions ?? [];
  if (view !== "details") {
    if (p.restatement) out.push(`You want: ${p.restatement.replace(/^you want:?\s*/i, "")}`, "");
    if (view === "full" && p.question) out.push(`Question: ${p.question}`);
    if (defs.length) {
      out.push(...(out.length && out.at(-1) !== "" ? [""] : []), "Metrics");
      defs.forEach((d, i) => out.push(`${o.numbered ? n(i + 1) : "- "}${d.measure}: ${d.definition}`));
    }
    let item = defs.length;
    if (p.steps?.length) {
      out.push("", "Steps");
      p.steps.forEach((s, i) => {
        const mark = s.status === "done" ? " [done]" : s.status === "skipped" ? " [skipped]" : "";
        out.push(`${i + 1}. ${s.step}${mark}`);
        if (view === "full" && s.method) out.push(`   Method: ${s.method}`);
        if (view === "full" && s.tool) out.push(`   Tool: ${s.tool}`);
        const set = (s.decisions ?? []).map((x) => `${n(++item)}${settingLine(x)}`);
        if (view === "compact" && set.length) out.push(`   ${set.join(" · ")}`);
        else for (const x of set) out.push(`   - ${x}`);
        if (s.reason) out.push(`   Reason: ${s.reason}`);
      });
    }
    if (view === "compact" && p.programs?.length) {
      out.push("", "Programs");
      for (const g of p.programs) out.push(`${n(++item)}${programLine(g)}`);
    }
    if (p.pilot) out.push("", view === "compact" ? `Demonstration: the metrics run on ${p.pilot.sample} first. You check the result before the other samples run.` : `Demonstration on a sample\n- First sample: ${p.pilot.sample}. The metrics run on this sample only. You check the result before the other samples run.${(p.pilot.shows ?? []).map((x) => `\n- You will see: ${x}`).join("")}`);
    if (view === "compact") return out.join("\n").trim();
  } else if (p.question) out.push(`Question: ${p.question}`);
  if (p.exclusions?.length) {
    out.push("", "What I will leave out, and what it does");
    for (const x of p.exclusions) out.push(`- ${x.what}${x.effect ? ` Effect: ${x.effect}` : ""}`);
  }
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
  if (p.reference?.path || p.reference?.question) {
    out.push("", "Reference");
    if (p.reference.path) out.push(`- ${p.reference.path}${p.reference.sheet ? `, sheet ${p.reference.sheet}` : ""}${p.reference.columns?.length ? `, columns ${p.reference.columns.join(", ")}` : ""}`);
    if (p.reference.question) out.push(`- ${p.reference.question}`);
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

export function matchStep(p: AnalysisPlan, tool: string, adapter?: string): number {
  const t = tool.toLowerCase();
  const a = adapter?.toLowerCase();
  const spaced = t.replace(/_/g, " ");
  const hit = (s: PlanStep) =>
    (s.tool ? toolWords(s.tool).some((w) => w === t || t.endsWith(`_${w}`) || w.endsWith(`_${t}`) || (!!a && w === a)) : false) ||
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
  pilot?: PilotRun;
  updates: { version: number; reason: string; text: string; ts: string }[];
}

export function approvedPlan(record: AnalysisRecord): ApprovedPlan | undefined {
  const a = liveEntries(record, ["plan_approved"]).at(-1);
  if (!a) return undefined;
  const updates = liveEntries(record, ["plan"])
    .filter((e) => e.id > a.id && e.data.action === "updated")
    .map((e) => ({ version: Number(e.data.version), reason: str(e.data.reason), text: str(e.data.text), ts: e.ts }));
  return { version: Number(a.data.version), text: str(a.data.text), plan: a.data.plan as unknown as AnalysisPlan, ts: a.ts, entry: a.id, updates, pilot: (a.data.pilot as PilotRun | undefined) ?? undefined };
}

export function currentPlan(record: AnalysisRecord): AnalysisPlan | undefined {
  const a = approvedPlan(record);
  if (!a) return undefined;
  const last = liveEntries(record, ["plan"]).filter((e) => e.id > a.entry && (e.data.action === "updated" || e.data.action === "status") && e.data.plan).at(-1);
  return (last?.data.plan as unknown as AnalysisPlan | undefined) ?? a.plan;
}

export function questionsOf(record: AnalysisRecord, before = Infinity): string[] {
  const e = liveEntries(record, ["clarify"]).filter((x) => x.id < before && x.data.action === "answered").at(-1);
  if (!e) return [];
  return [String(e.data.found ?? ""), ...((e.data.answers as string[]) ?? []).map((x) => `- ${x}`), ...((e.data.skipped as string[]) ?? []).map((x) => `- Not asked: ${x}`)].filter(Boolean);
}

export function planMarkdown(record: AnalysisRecord): string[] {
  const a = approvedPlan(record);
  if (!a) return [];
  const out = [`## Proposed analysis (version ${a.version}, confirmed ${a.ts.slice(0, 16).replace("T", " ")})`, ""];
  const q = questionsOf(record, a.entry);
  if (q.length) out.push("### Questions", "", ...q, "");
  out.push("### Proposed metrics", "", a.text, "");
  if (a.pilot) out.push("### Demonstration on a sample", "", pilotText(a.pilot), "");
  out.push("### Confirmed", "", `The scientist confirmed version ${a.version} on ${a.ts.slice(0, 16).replace("T", " ")}.`, "");
  if (a.updates.length) {
    out.push("### Changes after confirmation", "");
    for (const u of a.updates) out.push(`- Version ${u.version}: ${u.reason || "no reason given"}`);
    out.push("");
  }
  const v = validationRows(record);
  if (v) {
    out.push("### Validation against the reference", "", ...v.summary.map((x) => `- ${x}`), "", `| ${v.columns.join(" | ")} |`, `| ${v.columns.map(() => "---").join(" | ")} |`, ...v.rows.map((r) => `| ${r.join(" | ")} |`), "");
    if (v.plot) out.push(`Bland-Altman plot: ${v.plot}. Each dot is one sample: the mean of the two values (across) against the agent minus the reference (up). The dark line is the mean difference; the dashed lines are the mean plus and minus 1.96 SD. The gray dot is the pilot sample.`, "");
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
    if (ran.some((n) => matchStep({ steps: [s] }, n.tool, n.adapter) === 0)) return;
    out.push({ check: "plan_step_missing", severity: "warning", message: `The approved plan has step ${i + 1} (${s.step}), but it did not run and the plan gives no reason.` });
  });
  for (const tool of new Set(ran.filter((n) => n.entry > a.entry).map((n) => n.tool))) {
    if (matchStep(plan, tool, ran.find((n) => n.tool === tool)?.adapter) >= 0) continue;
    out.push({ check: "plan_step_extra", severity: "warning", message: `The step ${tool} is not in the approved plan, and the plan was not updated with a reason.`, nodes: ran.filter((n) => n.tool === tool).map((n) => n.id) });
  }
  return out;
}

export function planView(record: AnalysisRecord): { approved: boolean; version: number; text: string; updates: { version: number; reason: string }[] } | undefined {
  const a = approvedPlan(record);
  const proposed = liveEntries(record, ["plan"]).filter((e) => e.data.action === "proposed" || e.data.action === "update_proposed").at(-1);
  const cancelled = proposed && liveEntries(record, ["plan"]).some((e) => e.id > proposed.id && e.data.action === "cancelled");
  if (proposed && !cancelled && (!a || proposed.id > a.entry)) return { approved: false, version: Number(proposed.data.version), text: str(proposed.data.full ?? proposed.data.text), updates: [] };
  if (!a) return undefined;
  const now = currentPlan(record);
  return {
    approved: true,
    version: Math.max(a.version, ...a.updates.map((u) => u.version)),
    text: (a.updates.length && now ? planText(now) : a.text) + (a.pilot ? `\n\nPilot\n${pilotText(a.pilot)}` : ""),
    updates: a.updates.map((u) => ({ version: u.version, reason: u.reason })),
  };
}

export function definitionsOf(record: AnalysisRecord): PlanDefinition[] {
  return currentPlan(record)?.definitions ?? [];
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);

export function definitionFindings(record: AnalysisRecord, answer: string): FindingIn[] {
  const defs = definitionsOf(record);
  const out: FindingIn[] = [];
  const sentences = answer.split(/(?<=[.!?\n])\s+/);
  const rx = (m: string) => new RegExp(`\\b${m.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "g");
  for (const d of defs) {
    const longer = defs.filter((x) => x.measure.length > d.measure.length && x.measure.toLowerCase().includes(d.measure.toLowerCase()));
    const about = sentences.filter((s) => {
      let t = s.toLowerCase();
      for (const x of longer) t = t.replace(rx(x.measure), " ");
      return rx(d.measure).test(t);
    });
    if (!about.length) continue;
    const want = words(d.definition);
    const has = about.some((s) => {
      const got = new Set(words(s));
      return want.filter((w) => got.has(w)).length >= Math.max(2, Math.ceil(want.length / 3));
    });
    if (!has) out.push({ check: "measure_without_definition", severity: "warning", message: `The answer reports ${d.measure} but does not say what it counts. Add the definition: ${d.definition}` });
  }
  return out;
}

