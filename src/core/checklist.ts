import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { stepNumbers } from "./housekeeping.ts";
import { approvedPlan, currentPlan } from "./plan.ts";
import { liveEntries, type AnalysisRecord } from "./record.ts";
import type { Node, Question } from "./types.ts";

const Source = z.union([
  z.strictObject({ decision: z.array(z.string()) }),
  z.strictObject({ plan: z.string() }),
  z.strictObject({ sheet: z.enum(["groups", "size", "batches"]) }),
  z.strictObject({ data_check: z.array(z.string()), clear: z.string().optional() }),
  z.strictObject({ steps: z.string() }),
  z.strictObject({ metric: z.array(z.string()) }),
  z.strictObject({ software: z.literal(true) }),
  z.strictObject({ plan_changes: z.literal(true) }),
]);

const Item = z.strictObject({
  id: z.string(),
  section: z.string(),
  text: z.string(),
  from: z.array(Source).default([]),
  ask: z.string().optional(),
  hand: z.string().optional(),
});

const Guideline = z.strictObject({
  id: z.enum(["arrive", "consort", "strobe", "miqe"]),
  name: z.string(),
  full: z.string(),
  reference: z.string(),
  numbering: z.string().optional(),
  guess: z.strictObject({ adapters: z.array(z.string()), words: z.string() }),
  items: z.array(Item).min(1),
});

export type Guideline = z.infer<typeof Guideline>;
export type GuidelineItem = z.infer<typeof Item>;
export type GuidelineId = Guideline["id"];

export const GUIDELINE_IDS: GuidelineId[] = ["arrive", "consort", "strobe", "miqe"];

export const REPORTING_KEY = "reporting_guideline";

export type ItemStatus = "covered" | "missing" | "not_applicable";

export const STATUS_LABEL: Record<ItemStatus, string> = { covered: "Covered", missing: "Not in the record", not_applicable: "Not applicable" };

export interface ChecklistItem {
  id: string;
  section: string;
  text: string;
  status: ItemStatus;
  value: string;
  source: string;
  ask?: string;
  hand?: string;
}

export interface Checklist {
  guideline: Guideline;
  items: ChecklistItem[];
  counts: Record<ItemStatus, number>;
}

const cache = new Map<GuidelineId, Guideline>();

export function loadGuideline(id: GuidelineId): Guideline {
  let g = cache.get(id);
  if (!g) {
    g = Guideline.parse(parseYaml(readFileSync(fileURLToPath(new URL(`./guidelines/${id}.yaml`, import.meta.url)), "utf8")));
    cache.set(id, g);
  }
  return g;
}

export function guidelineId(text: string): GuidelineId | undefined {
  const t = text.trim().toLowerCase();
  return GUIDELINE_IDS.find((id) => id === t);
}

const TITLE = /^Checklist (\w+) ([\w.]+): /;

export const isChecklistQuestion = (q: Pick<Question, "title">) => q.title.startsWith("Checklist");

export const GUIDELINE_QUESTION_TITLE = "Checklist: reporting guideline";

export function itemTitle(g: Guideline, item: Pick<GuidelineItem, "id" | "section">): string {
  return `Checklist ${g.id.toUpperCase()} ${item.id}: ${item.section}`;
}

const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function plain(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(plain).filter(Boolean).join("; ");
  if (typeof v === "object") return Object.values(v).map(plain).filter(Boolean).join(": ");
  return String(v);
}

const has = (v: unknown) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length);

function getPath(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const p of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

interface Found {
  value: string;
  source: string;
}

interface Context {
  record: AnalysisRecord;
  values: Record<string, unknown>;
  nodes: Node[];
}

function decisionValues(record: AnalysisRecord): { values: Record<string, unknown> } {
  const values: Record<string, unknown> = {};
  for (const e of liveEntries(record, ["setup", "decision"])) {
    if (e.kind === "setup") {
      Object.assign(values, e.data.values ?? {});
    } else {
      const k = String(e.data.key);
      if (k.includes(":")) continue;
      if (e.data.unset) delete values[k];
      else values[k] = e.data.new;
    }
  }
  return { values };
}

function fromDecision(c: Context, keys: string[]): Found | undefined {
  const hits = keys.filter((k) => has(c.values[k]));
  if (!hits.length) return undefined;
  return {
    value: hits.map((k) => `${k} = ${plain(c.values[k])}`).join("; "),
    source: `Decision ${hits.join(", ")}`,
  };
}

function fromPlan(c: Context, path: string): Found | undefined {
  const plan = currentPlan(c.record);
  if (!plan) return undefined;
  const raw = path === "steps" ? plan.steps.map((s) => s.step) : getPath(plan, path);
  if (!has(raw)) return undefined;
  const value = plain(raw);
  return value ? { value: clip(value), source: `Confirmed plan, ${path}` } : undefined;
}

function sheetRows(c: Context): Record<string, string>[] | undefined {
  const sheet = liveEntries(c.record, ["samples"]).filter((e) => Array.isArray(e.data.rows) && (e.data.rows as unknown[]).length).at(-1);
  return sheet?.data.rows as Record<string, string>[] | undefined;
}

function fromSheet(c: Context, kind: "groups" | "size" | "batches"): Found | undefined {
  const rows = sheetRows(c);
  if (!rows) return undefined;
  const source = "Sample sheet";
  if (kind === "batches") {
    const batches = [...new Set(rows.map((r) => r.batch).filter(Boolean))];
    return batches.length ? { value: `${batches.length} ${batches.length === 1 ? "batch" : "batches"}: ${batches.slice(0, 6).join(", ")}`, source } : undefined;
  }
  const groups = new Map<string, { units: Set<string>; samples: number }>();
  for (const r of rows) {
    if (!r.group) continue;
    const g = groups.get(r.group) ?? { units: new Set<string>(), samples: 0 };
    g.samples++;
    if (r.unit) g.units.add(r.unit);
    groups.set(r.group, g);
  }
  if (!groups.size) return undefined;
  if (kind === "groups") return { value: [...groups.keys()].join(", "), source };
  const part = (name: string, g: { units: Set<string>; samples: number }) => (g.units.size ? `${name}: ${g.units.size} ${g.units.size === 1 ? "unit" : "units"}, ${g.samples} ${g.samples === 1 ? "sample" : "samples"}` : `${name}: ${g.samples} ${g.samples === 1 ? "sample" : "samples"}`);
  return { value: [...groups].map(([name, g]) => part(name, g)).join("; "), source };
}

function fromDataCheck(c: Context, checks: string[], clear?: string): Found | undefined {
  const entries = liveEntries(c.record, ["data_check"]);
  if (!entries.length) return undefined;
  const hits = entries.flatMap((e) => ((e.data.items as { check: string; text: string }[]) ?? []).filter((i) => checks.includes(i.check)).map((i) => ({ text: i.text, source: String(e.data.source ?? "") })));
  if (hits.length) return { value: clip(hits.slice(0, 2).map((h) => h.text).join(" ")), source: `Data check of ${hits[0]!.source}` };
  return clear ? { value: clear, source: `Data check of ${String(entries.at(-1)!.data.source ?? "the data")}` } : undefined;
}

function fromSteps(c: Context, pattern: string): Found | undefined {
  const re = new RegExp(pattern, "i");
  const num = stepNumbers(c.nodes);
  const hits = c.nodes.filter((n) => re.test(`${n.tool} ${n.summary}`));
  if (!hits.length) return undefined;
  return { value: clip(hits.slice(0, 4).map((n) => `${n.summary || n.tool} (step ${num.get(n.id)})`).join("; ")), source: `Step ${hits.slice(0, 4).map((n) => num.get(n.id)).join(", ")}` };
}

function fromMetric(c: Context, patterns: string[]): Found | undefined {
  const res = patterns.map((p) => new RegExp(p, "i"));
  const num = stepNumbers(c.nodes);
  const found: { text: string; step: number | undefined }[] = [];
  for (const n of c.nodes) {
    const metrics = (n.result as { metrics?: Record<string, unknown> } | null)?.metrics ?? {};
    for (const [k, v] of Object.entries(metrics)) if (res.some((re) => re.test(k)) && has(v)) found.push({ text: `${k} = ${plain(v)}`, step: num.get(n.id) });
  }
  if (!found.length) return undefined;
  return { value: clip(found.slice(0, 4).map((f) => f.text).join("; ")), source: `Result of step ${[...new Set(found.slice(0, 4).map((f) => f.step))].join(", ")}` };
}

function fromSoftware(c: Context): Found | undefined {
  const seen = new Map<string, string>();
  for (const n of c.nodes) if (n.adapter) seen.set(n.adapter, n.programVersion ? `${n.adapter} program ${n.programVersion}` : n.adapter);
  if (!seen.size) return undefined;
  const langs = c.record.environments().map((e) => e.language).filter(Boolean);
  return { value: `${[...seen.values()].join("; ")}${langs.length ? `; ${[...new Set(langs)].join(", ")}` : ""}`, source: "Program steps and environment lock" };
}

function fromPlanChanges(c: Context): Found | undefined {
  const a = approvedPlan(c.record);
  if (!a) return undefined;
  if (!a.updates.length) return { value: `The confirmed plan (version ${a.version}) has no change after the confirmation.`, source: "Confirmed plan" };
  return { value: clip(a.updates.map((u) => `Version ${u.version}: ${u.reason || "no reason given"}`).join("; ")), source: "Changes to the confirmed plan" };
}

function resolve(c: Context, item: GuidelineItem): Found | undefined {
  for (const s of item.from) {
    const f =
      "decision" in s ? fromDecision(c, s.decision)
      : "plan" in s ? fromPlan(c, s.plan)
      : "sheet" in s ? fromSheet(c, s.sheet)
      : "data_check" in s ? fromDataCheck(c, s.data_check, s.clear)
      : "steps" in s ? fromSteps(c, s.steps)
      : "metric" in s ? fromMetric(c, s.metric)
      : "software" in s ? fromSoftware(c)
      : fromPlanChanges(c);
    if (f) return f;
  }
  return undefined;
}

function answersOf(record: AnalysisRecord, g: Guideline): Map<string, { value: string; na: boolean; qid: string }> {
  const asked = new Map<string, string>();
  const out = new Map<string, { value: string; na: boolean; qid: string }>();
  for (const e of liveEntries(record, ["question", "answer"])) {
    if (e.kind === "question") {
      const m = TITLE.exec(String(e.data.title ?? ""));
      if (m && m[1] === g.id.toUpperCase()) asked.set(String(e.data.qid), m[2]!);
    } else {
      const id = asked.get(String(e.data.qid));
      const v = e.data.value;
      if (id === undefined || v === null || v === undefined || String(v).trim() === "") continue;
      const text = String(v).trim();
      out.set(id, { value: text, na: /^not[ _]applicable$/i.test(text), qid: String(e.data.qid) });
    }
  }
  return out;
}

export function buildChecklist(record: AnalysisRecord, id: GuidelineId): Checklist {
  const guideline = loadGuideline(id);
  const { values } = decisionValues(record);
  const c: Context = { record, values, nodes: record.nodes().filter((n) => !n.sensitivityOf) };
  const answers = answersOf(record, guideline);
  const items = guideline.items.map((it): ChecklistItem => {
    const base = { id: it.id, section: it.section, text: it.text, ask: it.ask, hand: it.hand };
    const a = answers.get(it.id);
    if (a?.na) return { ...base, status: "not_applicable", value: "", source: `Your answer to ${a.qid}` };
    if (a) return { ...base, status: "covered", value: clip(a.value), source: `Your answer to ${a.qid}` };
    const f = resolve(c, it);
    if (f) return { ...base, status: "covered", value: f.value, source: f.source };
    return { ...base, status: "missing", value: "", source: "" };
  });
  const counts: Record<ItemStatus, number> = { covered: 0, missing: 0, not_applicable: 0 };
  for (const i of items) counts[i.status]++;
  return { guideline, items, counts };
}

export function setGuideline(record: AnalysisRecord): GuidelineId | undefined {
  const v = decisionValues(record).values[REPORTING_KEY];
  return typeof v === "string" ? guidelineId(v) : undefined;
}

export function guessGuideline(record: AnalysisRecord, adapterNames: string[]): { id: GuidelineId; why: string } | undefined {
  const names = new Set([...adapterNames, ...record.nodes().map((n) => n.adapter)]);
  for (const id of GUIDELINE_IDS) {
    const g = loadGuideline(id);
    const hit = g.guess.adapters.find((a) => names.has(a));
    if (hit) return { id, why: `the program ${hit} is in this session` };
  }
  const { values } = decisionValues(record);
  const text = [values.question, liveEntries(record, ["user"])[0]?.data.text, currentPlan(record)?.restatement, currentPlan(record)?.question].map(plain).join(" ");
  let best: { id: GuidelineId; n: number } | undefined;
  for (const id of GUIDELINE_IDS) {
    const n = text.match(new RegExp(loadGuideline(id).guess.words, "gi"))?.length ?? 0;
    if (n && (!best || n > best.n)) best = { id, n };
  }
  return best ? { id: best.id, why: "the request and the plan use words of this kind of study" } : undefined;
}

export function checklistText(c: Checklist): string {
  const { guideline: g, items, counts } = c;
  const out = [`${g.name}: ${counts.covered} of ${items.length} items covered, ${counts.missing} not in the record, ${counts.not_applicable} not applicable.`];
  if (g.numbering) out.push(g.numbering);
  let section = "";
  for (const i of items) {
    if (i.section !== section) {
      section = i.section;
      out.push("", section);
    }
    const head = `  ${i.id}  [${STATUS_LABEL[i.status]}] ${i.text}`;
    out.push(head);
    if (i.status === "covered") out.push(`        ${i.value} (${i.source})`);
    else if (i.status === "not_applicable") out.push(`        ${i.source}`);
    else out.push(`        ${noteOf(i)}`);
  }
  return out.join("\n");
}

const noteOf = (i: ChecklistItem) => (i.status === "missing" ? (i.hand ?? "Add it with /checklist or by hand.") : i.source);

export function checklistRows(c: Checklist): string[][] {
  return c.items.map((i) => [c.guideline.name, i.id, i.section, i.text, STATUS_LABEL[i.status], i.value, noteOf(i)]);
}

export const CHECKLIST_COLUMNS = ["Guideline", "Item", "Section", "Requirement", "Status", "Value in the record", "Source or note"];

export function recordChecklist(record: AnalysisRecord): Checklist | undefined {
  const id = setGuideline(record);
  return id ? buildChecklist(record, id) : undefined;
}

export function checklistMarkdown(c: Checklist): string[] {
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `## Reporting checklist: ${c.guideline.name}`,
    "",
    `${c.guideline.full}. ${c.counts.covered} of ${c.items.length} items covered, ${c.counts.missing} not in the record, ${c.counts.not_applicable} not applicable.`,
    "",
    "| Item | Requirement | Status | Value in the record | Source or note |",
    "| --- | --- | --- | --- | --- |",
    ...c.items.map((i) => `| ${cell(i.id)} | ${cell(i.text)} | ${STATUS_LABEL[i.status]} | ${cell(i.value)} | ${cell(noteOf(i))} |`),
    "",
  ];
}

export function checklistHtml(c: Checklist, esc: (s: unknown) => string): string {
  const rows = c.items.map((i) => `<tr><td>${esc(i.id)}</td><td>${esc(i.text)}</td><td>${esc(STATUS_LABEL[i.status])}</td><td>${esc(i.value)}</td><td>${esc(noteOf(i))}</td></tr>`).join("");
  return `<h2>Reporting checklist: ${esc(c.guideline.name)}</h2><p>${esc(c.guideline.full)}. ${c.counts.covered} of ${c.items.length} items covered, ${c.counts.missing} not in the record, ${c.counts.not_applicable} not applicable.</p><table><thead><tr><th>Item</th><th>Requirement</th><th>Status</th><th>Value in the record</th><th>Source or note</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function offerText(c: Checklist): string {
  return `The ${c.guideline.name} checklist is ready: ${c.counts.covered} of ${c.items.length} items are covered. Type /checklist to see it and to answer the items that are not in the record.`;
}
