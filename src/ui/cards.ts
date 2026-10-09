import type { BusEvent, Entry, Finding, Mode, PhiEvent, PlanEvent, PlanResponse, Question, ReferenceChoice } from "../core/types.ts";
import type { PhiAction } from "../core/phi.ts";
import { claudeKey, elabftwProblem, keyProblem, maskKey, saveClaudeKey, saveElabftw } from "../core/credentials.ts";
import { find, recordSetting, type SettingSession } from "../core/settings.ts";
import { codeOf, plainOf } from "./items.ts";
import { rewindText, type RewindPoint } from "../core/rewind.ts";
import { stepNumbers } from "../core/housekeeping.ts";
import type { DecisionFieldLike, SessionLike } from "./types.ts";

export type Card =
  | { t: "setup"; profiles: { name: string; version: number }[]; proposed?: Record<string, unknown>; proposedFrom?: string }
  | { t: "eln" }
  | { t: "permission"; rid: string; tool: string; args: Record<string, unknown>; code?: string; touches: string; search?: { root: string; purpose: string } }
  | { t: "question"; q: Question }
  | { t: "instruction"; step: number; tool: string; text: string }
  | { t: "findings"; list: Finding[] }
  | { t: "key"; reason?: string }
  | { t: "config" }
  | { t: "programs"; name?: string }
  | ({ t: "plan" } & Omit<PlanEvent, "type">)
  | { t: "clarify"; found: string; qids: string[]; skipped: string[]; check?: string; notes?: string[] }
  | { t: "rewind"; points: RewindPoint[] }
  | ({ t: "phi" } & Omit<PhiEvent, "type">);

export type CardType = Card["t"];

export function show(v: unknown): string {
  if (v === undefined || v === null || v === "") return "not set";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function pushCard(list: Card[], c: Card): Card[] {
  if (c.t === "question" && list.some((y) => (y.t === "question" && y.q.qid === c.q.qid) || ((y.t === "plan" || y.t === "clarify") && y.qids.includes(c.q.qid)))) return list;
  if (c.t === "plan" || c.t === "clarify") return [...list.filter((y) => !(y.t === "question" && c.qids.includes(y.q.qid)) && y.t !== c.t), c];
  if (c.t === "setup" && list.some((y) => y.t === "setup")) return list;
  if (c.t === "key") return list.some((y) => y.t === "key") ? list : [c, ...list];
  return [...list, c];
}

export function cardFromEvent(e: BusEvent): Card | undefined {
  switch (e.type) {
    case "permission":
      return { t: "permission", rid: e.rid, tool: e.tool, args: e.args, code: e.code, touches: e.touches, search: e.search };
    case "question":
      return { t: "question", q: e.question };
    case "instruction":
      return { t: "instruction", step: e.step, tool: e.tool, text: e.text };
    case "plan": {
      const { type: _t, ...rest } = e;
      return { t: "plan", ...rest };
    }
    case "clarify":
      return { t: "clarify", found: e.found, qids: e.qids, skipped: e.skipped, check: e.check, notes: e.notes };
    case "phi": {
      const { type: _t, ...rest } = e;
      return { t: "phi", ...rest };
    }
  }
  return undefined;
}

const PLAN_ENDS = ["change_requested", "cancelled", "pilot_requested"];

export function closesCard(en: Entry, c: Card): boolean {
  if (en.kind === "answer") return c.t === "question" && c.q.qid === en.data.qid;
  if (en.kind === "permission") return c.t === "permission" && c.rid === en.data.rid;
  if (en.kind === "phi") return c.t === "phi" && c.rid === en.data.rid;
  if (en.kind === "follow_step") return c.t === "instruction" && c.step === en.data.step;
  if (en.kind === "clarify" && en.data.action === "answered") return c.t === "clarify";
  if (en.kind === "plan_approved" || en.kind === "pilot_approved" || en.kind === "pilot_rejected" || (en.kind === "plan" && PLAN_ENDS.includes(String(en.data.action)))) return c.t === "plan";
  return false;
}

export const refreshesStatus = (en: Entry) => en.kind === "mode" || en.kind === "permission_mode" || en.kind === "question" || en.kind === "answer";

export function startCards(session: SessionLike, env: Record<string, string | undefined>): Card[] {
  let list: Card[] = [];
  for (const q of session.questions.open()) list = pushCard(list, { t: "question", q });
  for (const e of session.openEvents?.() ?? []) {
    const c = cardFromEvent(e);
    if (c) list = pushCard(list, c);
  }
  if (session.model.provider === "claude" && claudeKey(env).from === "none") list = pushCard(list, { t: "key", reason: NO_KEY });
  return list;
}

export const needsSetup = (session: SessionLike) => session.decisions.fields().some((f) => f.essential && !f.set);

export const NO_KEY = "No Claude API key is set. Add one now, or press Esc if you use `ant auth login`.";

export function planIntro(session: SessionLike): string {
  return session.planFirst ? "The agent asks a few questions, proposes the metrics, and shows them on one sample. You confirm before the batch runs." : "Type /plan to get questions, proposed metrics and a demonstration before any step runs.";
}

// ---------------------------------------------------------------- rewind

export const REWIND_TITLE = "Return to an earlier point";
export const REWIND_HELP = "The results after the point stay in the folder and in the record, marked rewound. Decisions return to their values at that point.";

export function applyRewind(session: SessionLike, n: number): { ok: boolean; text: string; input?: string } {
  if (!session.rewind) return { ok: false, text: "Not available yet." };
  try {
    const r = session.rewind(n);
    return { ok: true, text: rewindText(r, stepNumbers(session.record.nodes())), input: r.text };
  } catch (e) {
    return { ok: false, text: (e as Error).message };
  }
}

// ---------------------------------------------------------------- permission

export function permissionView(card: Extract<Card, { t: "permission" }>) {
  const always = card.tool !== "eln_push" && !card.search;
  const { purpose, does } = plainOf(card.args);
  const code = card.code ?? codeOf(card.args);
  const hidden = new Set(["purpose", "does", "code", ...(code && purpose ? ["argv"] : [])]);
  const args = Object.entries(card.args)
    .filter(([k, v]) => !hidden.has(k) && !(code && typeof v === "string" && v.trim() === code.trim()))
    .map(([k, v]) => `${k} = ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .map((a) => (a.length > 160 ? a.slice(0, 157) + "..." : a));
  return {
    title: card.search ? "Search outside the project" : `Permission needed: ${card.tool}`,
    purpose,
    does,
    args,
    code,
    always,
    touches: card.search ? card.touches : `This will touch: ${card.touches}`,
  };
}

export type PermissionChoice = { ok: true; always?: boolean } | { ok: false; note?: string } | { stop: true };

export function respondPermission(session: SessionLike, card: Extract<Card, { t: "permission" }>, c: PermissionChoice): void {
  if ("stop" in c) return session.interrupt();
  if (c.ok) session.respondPermission(card.rid, true, ...((c.always ? ["", true] : []) as [string?, boolean?]));
  else session.respondPermission(card.rid, false, c.note);
}

// ---------------------------------------------------------------- patient identifiers

export const PHI_TITLE = "Possible patient identifiers";

export function phiView(card: Extract<Card, { t: "phi" }>) {
  const actions: { act: PhiAction; key: string; label: string; help: string }[] = [
    { act: "send", key: "s", label: "Send anyway", help: "The record logs this choice." },
    { act: "mask", key: "m", label: "Mask the values and send", help: "The model sees placeholders, such as [NAME 1]. Your files do not change." },
    ...(card.local ? [{ act: "local" as const, key: "l", label: `Use the local model ${card.local} for this session`, help: "The data stays on this computer." }] : []),
    { act: "stop", key: "x", label: "Stop", help: "Nothing goes to the model." },
  ];
  return {
    title: PHI_TITLE,
    intro: `This content goes to the cloud model ${card.model}. It can contain patient identifiers:`,
    lines: card.hits.map((h) => `${h.label}: ${h.masked} (${h.where})`),
    more: card.more ? `${card.more} more not shown.` : "",
    actions,
    noLocal: card.local ? "" : "No local model is set. To add one, set local_model in /config.",
    note: "This check looks for patterns. It does not find all identifiers, and it can be wrong. Your choice applies to the rest of this session.",
  };
}

export function respondPhi(session: SessionLike, card: Extract<Card, { t: "phi" }>, action: PhiAction): void {
  session.respondPhi?.(card.rid, action);
}

// ---------------------------------------------------------------- question

export function recommendedIndex(q: Question): number {
  if (!q.recommendation) return -1;
  return q.options.findIndex((o) => Object.is(o.value, q.recommendation!.value) || JSON.stringify(o.value) === JSON.stringify(q.recommendation!.value));
}

const sameValue = (a: unknown, b: unknown) => Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b) || (a !== undefined && b !== undefined && String(a) === String(b));

export function questionCursor(q: Question, current?: unknown): number {
  for (const v of [current, q.recommendation?.value, q.default]) {
    if (v === undefined) continue;
    const i = q.options.findIndex((o) => sameValue(o.value, v));
    if (i >= 0) return i;
  }
  return 0;
}

export function questionEnter(q: Question, cursor: number): { value: unknown } | { type: string } {
  if (q.options.length) return { value: q.options[Math.max(0, Math.min(cursor, q.options.length - 1))]!.value };
  if (q.recommendation) return { value: q.recommendation.value };
  if (q.default !== undefined) return { value: q.default };
  return { type: `${q.title} needs your answer. Type it here.` };
}

export function questionNeed(q: Question): string | undefined {
  if (q.recommendation || q.default !== undefined) return undefined;
  return q.options.length ? `There is no recommendation for ${q.title}. Choose one of the options.` : `There is no recommendation for ${q.title}. Type your answer.`;
}

export function questionStartText(q: Question, current?: unknown): string {
  const v = current ?? q.recommendation?.value ?? q.default;
  return v === undefined || v === null ? "" : typeof v === "string" ? v : JSON.stringify(v);
}

export function localQuestion(qid: string, title: string, text: string, options: { value: string; label: string }[], rec?: string): Question {
  return { qid, session: "", decisionKey: "", title, text, options, recommendation: rec ? { value: rec, reason: "" } : undefined, evidence: "", status: "open", created: "" };
}

// ---------------------------------------------------------------- setup

export type FieldKind = "choice" | "bool" | "number" | "text";

export function fieldKind(f: DecisionFieldLike): FieldKind {
  if (f.choices?.length) return "choice";
  if (/bool/.test(f.kind)) return "bool";
  if (/int|float|num|real/.test(f.kind)) return "number";
  return "text";
}

export function choiceValue(c: any): unknown {
  return c !== null && typeof c === "object" && "value" in c ? c.value : c;
}

export function choiceLabel(c: any): string {
  return c !== null && typeof c === "object" && "label" in c ? String(c.label) : show(c);
}

export function setupValues(fields: DecisionFieldLike[], card: Extract<Card, { t: "setup" }>): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => [f.key, f.key in (card.proposed ?? {}) ? card.proposed![f.key] : f.set ? f.value : (f.value ?? f.default)]).filter(([, v]) => v !== undefined && v !== null));
}

export function numberProblem(f: DecisionFieldLike, raw: string): string | undefined {
  const n = Number(raw);
  if (raw.trim() === "" || Number.isNaN(n)) return "Type a number.";
  if (f.lo !== undefined && n < f.lo) return `The minimum is ${f.lo}.`;
  if (f.hi !== undefined && n > f.hi) return `The maximum is ${f.hi}.`;
  return undefined;
}

export function fixedProblem(f: DecisionFieldLike): string | undefined {
  return f.owner === "fixed" ? `${f.label} is fixed by the lab profile.` : undefined;
}

export function applySetup(session: SessionLike, values: Record<string, unknown>, profile?: string): string | undefined {
  try {
    session.decisions.applySetup(values, { profile, how: "card" });
  } catch (e) {
    return `Setup failed: ${(e as Error).message}`;
  }
  return undefined;
}

// ---------------------------------------------------------------- key and eLabFTW

export interface Say {
  ok(text: string): void;
  bad(text: string): void;
  dim(text: string): void;
  warn(text: string): void;
}

export { keyProblem };

export type KeyCheck = (key: string, model?: string) => Promise<{ ok: boolean; text: string }>;

export async function saveKey(session: SessionLike, key: string, env: Record<string, string | undefined>, say: Say, check: KeyCheck): Promise<{ ok: boolean; text: string }> {
  say.dim(`Checking the key ${maskKey(key)} with the Claude API…`);
  const r = await check(key, session.model.provider === "claude" ? session.model.model : undefined);
  if (!r.ok) return (say.bad(r.text), r);
  const path = saveClaudeKey(key);
  recordSetting(session as unknown as SettingSession, find("claude_key")!, undefined, undefined, "user");
  say.ok(`${r.text} Saved to ${path}.`);
  if (env.ANTHROPIC_API_KEY) say.warn("ANTHROPIC_API_KEY is also set in this shell. The harness uses that one first.");
  return r;
}

export function saveEln(session: SessionLike, url: string, key: string, say: Say): boolean {
  const problem = elabftwProblem(url, key);
  if (problem) return (say.bad(problem), false);
  say.ok(`Saved the eLabFTW address and key ${maskKey(key)} to ${saveElabftw(url, key)}.`);
  recordSetting(session as unknown as SettingSession, find("elabftw_key")!, undefined, undefined, "user");
  return true;
}

// ---------------------------------------------------------------- findings

export type FindingAction = "accept" | "reject" | "fix";

export function findingTitle(i: number, total: number): string {
  return `Review finding ${i + 1} of ${total}`;
}

export function findingReasonLabel(a: "reject" | "fix"): string {
  return a === "reject" ? "Why do you reject it? (Enter to skip)" : "What did you fix? (Enter to skip)";
}

// ---------------------------------------------------------------- questions (phase 1)

export type ClarifyCard = Extract<Card, { t: "clarify" }>;

export const CLARIFY_TITLE = "Questions";

export function clarifyOpen(card: ClarifyCard, open: Question[]): Question[] {
  return open.filter((q) => card.qids.includes(q.qid));
}

export function clarifyProgress(card: ClarifyCard, open: Question[]): string {
  const left = clarifyOpen(card, open).length;
  return `Question ${card.qids.length - left + 1} of ${card.qids.length}`;
}

export const CLARIFY_SKIP_ANSWER = "No answer. Use your judgment and say what you chose.";

export const DATA_CHECK_TITLE = "Data check";
export const DESIGN_TITLE = "Design notes";

export function checkLines(card: ClarifyCard, max = 14): string[] {
  const lines = (card.check ?? "").split("\n").filter(Boolean);
  if (max === 1) return lines.slice(0, 1);
  return lines.length > max ? [...lines.slice(0, max - 1), `… ${lines.length - max + 1} more lines. Type /samples check to see all.`] : lines;
}

export function sheetRows(fields: Record<string, unknown>, q: Question): string[][] | undefined {
  if (!q.table) return undefined;
  return q.table.rows.map((r, i) => q.table!.columns.map((_, j) => (typeof fields[`cell:${i}:${j}`] === "string" ? (fields[`cell:${i}:${j}`] as string).trim() : (r[j] ?? ""))));
}

// ---------------------------------------------------------------- the proposed metrics

export const RUN_MODES: Mode[] = ["watch", "follow", "teach"];

export type PlanStep = "restate" | "decisions" | "reference" | "refpath" | "refmode" | "actions" | "change" | "correct" | "program" | "definition" | "setting" | "pick" | "useprogram";

export interface PlanState {
  step: PlanStep;
  later: string[];
  mode: Mode;
  ref?: ReferenceChoice;
  defIndex: number;
  setIndex: number;
  progIndex?: number;
  details: boolean;
}

export type PlanCard = Extract<Card, { t: "plan" }>;

export type PlanAction =
  | { a: "restate"; ok: boolean }
  | { a: "correct"; text: string }
  | { a: "later"; qid: string }
  | { a: "reference"; value: string }
  | { a: "refpath"; text: string }
  | { a: "refmode"; value: string }
  | { a: "definition"; index: number }
  | { a: "define"; text: string }
  | { a: "run" }
  | { a: "change" }
  | { a: "changeText"; text: string }
  | { a: "cancel" }
  | { a: "mode"; mode?: Mode }
  | { a: "programs" }
  | { a: "program"; index: number }
  | { a: "back" }
  | { a: "pilot"; value: string }
  | { a: "details" }
  | { a: "item"; n: number }
  | { a: "pick" }
  | { a: "setValue"; value: unknown }
  | { a: "useProgram"; value: string };

export function parseReference(raw: string): ReferenceChoice | undefined {
  const [path = "", sheet = "", cols = ""] = raw.split(";").map((x) => x.trim());
  if (!path) return undefined;
  return { mode: "compare", path, sheet: sheet || undefined, columns: cols ? cols.split(",").map((c) => c.trim()).filter(Boolean) : undefined };
}

export function planInit(card: PlanCard): PlanState {
  return { step: "decisions", later: [], mode: RUN_MODES.includes(card.mode) ? card.mode : "watch", defIndex: -1, setIndex: -1, details: false };
}

export function planQuestions(card: PlanCard, st: PlanState, open: Question[]): Question[] {
  return open.filter((q) => card.qids.includes(q.qid) && !st.later.includes(q.qid));
}

export function planResolve(card: PlanCard, st: PlanState, open: Question[]): PlanState {
  if (st.step !== "decisions" || card.stage !== "plan" || planQuestions(card, st, open).length) return st;
  return { ...st, step: card.reference ? "reference" : "actions" };
}

export function programSwitches(card: PlanCard): string[] {
  return card.programs.flatMap((g) => g.alternatives.map((alt) => `Use ${alt} for ${g.part}, not ${g.adapter}.`));
}

export function planTitle(card: PlanCard): string {
  return card.stage === "pilot" ? "Demonstration on a sample" : `${card.update ? "Proposed change to the metrics" : "Proposed metrics"}, version ${card.version}`;
}

export function pilotGate(card: PlanCard): string | undefined {
  return card.stage === "plan" ? card.pilot : undefined;
}

export function referenceQuestion(card: PlanCard): Question {
  const r = card.reference!;
  const c = r.candidates[0];
  const opts = c
    ? [{ value: "compare", label: "Yes. Compare in the pilot" }, { value: "blind", label: "Yes. Hold it back (blind test)" }, { value: "none", label: "No, it is not a reference" }]
    : [{ value: "none", label: "No reference" }, { value: "have", label: "Yes, I have one" }];
  return localQuestion("reference", "Reference", r.question, opts, c ? "compare" : "none");
}

export function refModeQuestion(st: PlanState): Question {
  return localQuestion("refmode", "Reference", `How does the agent use ${st.ref?.path ?? "the reference"}?`, [{ value: "compare", label: "Compare in the pilot" }, { value: "blind", label: "Hold it back (blind test)" }], "compare");
}

export function pilotQuestion(): Question {
  return localQuestion("pilot", "Confirm and run all?", "Does this look right?", [
    { value: "confirm", label: "Confirm and run all" },
    { value: "change", label: "Change a metric or a setting (in plain words)" },
    { value: "another", label: "Try another sample" },
  ]);
}

export function referenceLine(ref: ReferenceChoice | undefined): string | undefined {
  return ref && ref.mode !== "none" ? `Reference: ${ref.path} (${ref.mode === "blind" ? "held back for a blind test" : "compared in the pilot"})` : undefined;
}

export const REFERENCE_PATH_LABEL = "File; sheet; value columns (for example /data/counts.xlsx; Set 1; Red dots, Total cells):";

export function definitionLabel(card: PlanCard, st: PlanState): string | undefined {
  const d = (card.definitions ?? [])[st.defIndex];
  return d ? `New definition of ${d.measure} (now: ${d.definition}):` : undefined;
}

export function itemCount(card: PlanCard): number {
  return (card.stage === "plan" ? (card.definitions ?? []).length + card.programs.length : 0) + (card.settings ?? []).length;
}

export function programQuestion(card: PlanCard, st: PlanState): Question | undefined {
  const g = card.programs[st.progIndex ?? -1];
  if (!g) return undefined;
  const name = (a: string) => (a === g.adapter && g.program && g.program !== a ? `${g.program} through ${a}` : a);
  return localQuestion("program", `Program for ${g.part || "this analysis"}`, `Now: ${name(g.adapter)}, chosen by the agent${g.why ? `: ${g.why}` : "."}`, [g.adapter, ...g.alternatives].map((a, i) => ({ value: a, label: i ? `Use ${a}` : `Keep ${name(a)}` })), g.adapter);
}

export function settingQuestion(card: PlanCard, st: PlanState): Question | undefined {
  const x = (card.settings ?? [])[st.setIndex];
  if (!x || !x.options?.length) return undefined;
  return localQuestion("setting", x.label, `Now: ${show(x.value)}${x.by ? ` (${x.by})` : ""}. Choose a new value, or press o to type one.`, x.options.map((o) => ({ value: o, label: o })));
}

export function settingLabel(card: PlanCard, st: PlanState): string | undefined {
  const x = (card.settings ?? [])[st.setIndex];
  return x ? `New value for ${x.label} (now: ${show(x.value)}${x.by ? `, ${x.by}` : ""}):` : undefined;
}

export const PICK_LABEL = "Number of the metric or setting to change:";

export function planReduce(card: PlanCard, st: PlanState, act: PlanAction): { state: PlanState; respond?: PlanResponse } {
  const to = (step: PlanStep, more: Partial<PlanState> = {}) => ({ state: { ...st, ...more, step } });
  const respond = (r: PlanResponse) => ({ state: st, respond: r });
  const defs = card.definitions ?? [];
  const after = card.stage === "pilot" ? "decisions" : "actions";
  const ndefs = card.stage === "plan" ? defs.length : 0;
  switch (act.a) {
    case "details":
      return { state: { ...st, details: !st.details } };
    case "pick":
      return itemCount(card) ? to("pick") : { state: st };
    case "item": {
      const i = act.n - 1;
      if (i < 0 || i >= itemCount(card)) return to(after);
      if (i < ndefs) return to("definition", { defIndex: i });
      const nset = (card.settings ?? []).length;
      if (i < ndefs + nset) return to("setting", { setIndex: i - ndefs });
      return to("useprogram", { progIndex: i - ndefs - nset });
    }
    case "setValue": {
      const v = typeof act.value === "string" ? act.value.trim() : act.value;
      if (v === "" || v === undefined) return to(after);
      return respond({ action: "set", index: st.setIndex, value: v });
    }
    case "useProgram": {
      const g = card.programs[st.progIndex ?? -1];
      if (!g || act.value === g.adapter) return to(after);
      return respond({ action: "change", text: `Use ${act.value} for ${g.part || "the analysis"}, not ${g.adapter}.` });
    }
    case "restate":
      return to(act.ok ? "decisions" : "correct");
    case "correct":
      return act.text.trim() ? respond({ action: "change", text: `The scientist corrects the request. The scientist wants: ${act.text.trim()}` }) : to("restate");
    case "later":
      return { state: { ...st, later: [...st.later, act.qid] } };
    case "reference": {
      const s = act.value;
      const c = card.reference?.candidates[0];
      if (s === "have") return to("refpath");
      if (s === "none") return to("actions", { ref: { mode: "none" } });
      if ((s === "compare" || s === "blind") && c) return to("actions", { ref: { mode: s, path: c.path, sheet: c.sheet } });
      const typed = parseReference(s);
      return typed ? to("refmode", { ref: typed }) : { state: st };
    }
    case "refpath": {
      const r = parseReference(act.text);
      return r ? to("refmode", { ref: r }) : to("actions");
    }
    case "refmode":
      return to("actions", { ref: st.ref ? { ...st.ref, mode: act.value === "blind" ? "blind" : "compare" } : st.ref });
    case "definition":
      return act.index >= 0 && act.index < defs.length ? to("definition", { defIndex: act.index }) : { state: st };
    case "define": {
      const d = defs[st.defIndex];
      const v = act.text.trim();
      if (!d || !v || v === d.definition) return to("actions");
      return respond({ action: "change", text: `Change the definition of ${d.measure} to: ${v}`, definition: { measure: d.measure, old: d.definition, new: v } });
    }
    case "run":
      return respond({ action: pilotGate(card) ? "pilot" : "approve", mode: st.mode, reference: st.ref });
    case "change":
      return to("change");
    case "changeText":
      return act.text.trim() ? respond({ action: "change", text: act.text.trim() }) : to(after);
    case "cancel":
      return respond({ action: "cancel" });
    case "mode":
      return { state: { ...st, mode: act.mode && RUN_MODES.includes(act.mode) ? act.mode : RUN_MODES[(RUN_MODES.indexOf(st.mode) + 1) % RUN_MODES.length]! } };
    case "programs":
      return programSwitches(card).length ? to("program") : { state: st };
    case "program": {
      const t = programSwitches(card)[act.index];
      return t ? respond({ action: "change", text: t }) : { state: st };
    }
    case "back":
      return st.step === "restate" || st.step === "correct" ? to("restate") : to(after);
    case "pilot": {
      const s = act.value;
      if (s === "confirm") return respond({ action: "confirm" });
      if (s === "another") return respond({ action: "another" });
      if (s === "change") return to("change");
      return respond({ action: "change", text: s });
    }
  }
}

export function planHint(card: PlanCard): string {
  return pilotGate(card) ? "The method runs on the pilot sample only. You check the result before the other samples run." : "No analysis step runs before you approve.";
}
