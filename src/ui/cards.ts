import type { BusEvent, Entry, Finding, Mode, PhiEvent, PlanEvent, PlanResponse, Question, ReferenceChoice } from "../core/types.ts";
import type { PhiAction } from "../core/phi.ts";
import { noClaudeCredentials, ENV_KEY_WARNING, elabftwProblem, keyProblem, maskKey, saveClaudeKey, saveElabftw } from "../core/credentials.ts";
import { find, recordSetting, type SettingSession } from "../core/settings.ts";
import { codeOf, plainOf } from "./items.ts";
import { commandText, visibleText } from "../core/plain.ts";
import { cutText } from "../core/places.ts";
import { rewindText, type RewindPoint } from "../core/rewind.ts";
import { stepNumbers } from "../core/housekeeping.ts";
import type { DecisionFieldLike, SessionLike } from "./types.ts";

export type Card =
  | { t: "setup"; profiles: { name: string; version: number }[]; proposed?: Record<string, unknown>; proposedFrom?: string }
  | { t: "eln" }
  | { t: "permission"; rid: string; tool: string; args: Record<string, unknown>; code?: string; touches: string; search?: { root: string; purpose: string } }
  | { t: "question"; q: Question; act?: QuestionAct }
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

export function cardId(c: Card): string {
  if (c.t === "permission") return `permission:${c.rid}`;
  if (c.t === "question") return `question:${c.q.qid}`;
  if (c.t === "plan") return `plan:${c.stage}:${c.version}`;
  if (c.t === "clarify") return `clarify:${c.qids.join(",")}`;
  if (c.t === "instruction") return `instruction:${c.step}`;
  if (c.t === "phi") return `phi:${c.rid}`;
  return c.t;
}

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

const PLAN_ENDS = ["change_requested", "cancelled", "pilot_requested", "stopped"];

export function closesCard(en: Entry, c: Card): boolean {
  if (en.kind === "answer") return c.t === "question" && c.q.qid === en.data.qid;
  if (en.kind === "permission") return c.t === "permission" && c.rid === en.data.rid;
  if (en.kind === "phi") return c.t === "phi" && c.rid === en.data.rid;
  if (en.kind === "follow_step") return c.t === "instruction" && c.step === en.data.step;
  if (en.kind === "clarify" && (en.data.action === "answered" || en.data.action === "stopped")) return c.t === "clarify";
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
  if (session.model.provider === "claude" && noClaudeCredentials(env)) list = pushCard(list, { t: "key", reason: NO_KEY });
  return list;
}

export const needsSetup = (session: SessionLike) => session.decisions.fields().some((f) => f.essential && !f.set);

export const NO_KEY = "There is no Claude API key. Add one now.";
export const KEY_ANT_LOGIN = "If you use ant auth login, sign in there. Cuvette reads that login.";

export function planIntro(session: SessionLike): string | undefined {
  if (session.record.entries(["plan_approved"]).length) return undefined;
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

const ARG_LIMIT = 1000;

export const NO_ALWAYS = new Set(["eln_push", "run_command", "write_file", "search_literature"]);
export const ALWAYS_SCOPE = "Always allow: this session only.";

export function permissionView(card: Extract<Card, { t: "permission" }>) {
  const always = !NO_ALWAYS.has(card.tool) && !card.search;
  const { purpose, does } = plainOf(card.args);
  const argv = Array.isArray(card.args.argv) ? card.args.argv : undefined;
  const given = card.code ?? (argv ? undefined : codeOf(card.args));
  const code = given === undefined ? undefined : visibleText(given);
  const hidden = new Set(["purpose", "does", "code", ...(argv ? ["argv"] : [])]);
  const args = Object.entries(card.args)
    .filter(([k, v]) => !hidden.has(k) && !(code && typeof v === "string" && v.trim() === code.trim()))
    .map(([k, v]) => [k, visibleText(`${k} = ${typeof v === "string" ? v : JSON.stringify(v)}`)] as const)
    .map(([k, a]) => (a.length > ARG_LIMIT && !(argv && k === "cwd") ? `${cutText(a, ARG_LIMIT)}... (${a.length - ARG_LIMIT} more characters)` : a));
  if (argv) args.unshift(`Command: ${commandText(argv)}`);
  return {
    title: card.search ? "Search outside the project" : `Permission needed: ${card.tool}`,
    purpose,
    does,
    args,
    code,
    always,
    touches: card.search ? card.touches : `This will touch: ${card.touches}${always ? ` ${ALWAYS_SCOPE}` : ""}`,
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
    noLocal: card.local ? "" : "There is no local model. To add one, set local_model in /config.",
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
  return { type: `${/(\?|\.\.\.|…)$/.test(q.title.trim()) ? "This question" : q.title} needs your answer. Type it here.` };
}

export function questionNeed(q: Question): string | undefined {
  if (q.recommendation || q.default !== undefined) return undefined;
  const what = /(\?|\.\.\.|…)$/.test(q.title.trim()) ? "There is no recommendation." : `There is no recommendation for ${q.title}.`;
  return q.options.length ? `${what} Choose one of the options.` : `${what} Type your answer.`;
}

export function questionStartText(q: Question, current?: unknown): string {
  const v = current ?? q.recommendation?.value ?? q.default;
  return v === undefined || v === null ? "" : typeof v === "string" ? v : JSON.stringify(v);
}

// ---------------------------------------------------------------- question sequence

export type QuestionAct =
  | { kind: "pick"; rows: ChangeRow[] }
  | { kind: "change"; key?: string; current?: unknown; note?: string; rerun?: string }
  | { kind: "rerun"; text: string };

export interface QuestionSeq {
  done: { q: Question; value: unknown }[];
  back: number;
}

export const SEQ_START: QuestionSeq = { done: [], back: -1 };

export interface SeqView {
  q: Question;
  n: number;
  total: number;
  changing: boolean;
  current?: unknown;
}

export const isPlainQuestion = (c: Card): c is Extract<Card, { t: "question" }> => c.t === "question" && !c.act;

export function seqPending(cards: Card[]): Question[] {
  return cards.filter(isPlainQuestion).map((c) => c.q);
}

export function seqView(seq: QuestionSeq, pending: Question[]): SeqView | undefined {
  const total = seq.done.length + pending.length;
  const d = seq.back >= 0 ? seq.done[seq.back] : undefined;
  if (d && pending.length) return { q: d.q, n: seq.back + 1, total, changing: true, current: d.value };
  const q = pending[0];
  return q ? { q, n: seq.done.length + 1, total, changing: false } : undefined;
}

export function seqProgress(v: SeqView): string {
  return `Question ${v.n} of ${v.total}`;
}

export function seqAnswered(seq: QuestionSeq, q: Question, value: unknown): QuestionSeq {
  if (seq.back >= 0) {
    const done = seq.done.map((d, i) => (i === seq.back ? { q: d.q, value } : d));
    return { done, back: seq.back + 1 < done.length ? seq.back + 1 : -1 };
  }
  return { done: [...seq.done, { q, value }], back: -1 };
}

export function seqBack(seq: QuestionSeq): QuestionSeq {
  if (!seq.done.length || seq.back === 0) return seq;
  return { ...seq, back: seq.back < 0 ? seq.done.length - 1 : seq.back - 1 };
}

export function seqNext(seq: QuestionSeq): QuestionSeq {
  if (seq.back < 0) return seq;
  return { ...seq, back: seq.back + 1 < seq.done.length ? seq.back + 1 : -1 };
}

export const canGoBack = (seq: QuestionSeq) => seq.done.length > 0 && seq.back !== 0;

export function seqLeave(cards: Card[]): Card[] {
  return cards.filter((c) => !isPlainQuestion(c));
}

// A long question has a clipped title. The card then shows the full question as the title and does not repeat it below.
export function questionHead(q: Pick<Question, "title" | "text">): { title: string; text: string } {
  const title = q.title.trim();
  const text = q.text.trim();
  if (text === title) return { title, text: "" };
  const cut = title.replace(/(\.\.\.|…)$/, "").trimEnd();
  if (cut !== title && text.startsWith(cut)) return { title: text, text: "" };
  return { title: q.title, text: q.text };
}

export function reopenQuestions(cards: Card[], open: Question[]): Card[] {
  let list = cards;
  for (const q of open) list = pushCard(list, { t: "question", q });
  return list;
}

export function optionLabel(q: Pick<Question, "options">, value: unknown): string {
  const grid = value && typeof value === "object" && !Array.isArray(value) ? (value as { changes?: unknown; rows?: unknown }) : undefined;
  if (grid && Array.isArray(grid.changes)) return grid.changes.length ? `saved with ${grid.changes.length} ${grid.changes.length === 1 ? "change" : "changes"}` : "saved with no change";
  if (grid && Array.isArray(grid.rows)) return `saved with ${grid.rows.length} rows`;
  return q.options.find((o) => sameValue(o.value, value))?.label ?? show(value);
}

export function answerLine(q: Pick<Question, "qid" | "title" | "options">, value: unknown): string {
  const title = q.title.replace(/\.\.\.$/, "…");
  return `${title}${title.endsWith("?") ? "" : ":"} ${optionLabel(q, value)} · /change ${q.qid}`;
}

// ---------------------------------------------------------------- change an answer or a decision

export interface ChangeRow {
  id: string;
  label: string;
  value: string;
  kind: "question" | "decision";
  q: Question;
  current: unknown;
  key?: string;
  rerun?: string;
  note?: string;
}

const DEMO_NOTE = "The demonstration used the old value. Run it again?";

function demoAfter(session: SessionLike, setAt: number): { sample: string } | undefined {
  const run = session.record.entries(["pilot_run"]).filter((e) => e.id > setAt).at(-1);
  return run ? { sample: String(run.data.sample ?? "the same sample") } : undefined;
}

export function changeRows(session: SessionLike): ChangeRow[] {
  const asked = new Map<string, Question>();
  for (const e of session.record.entries(["question"])) asked.set(String(e.data.qid), e.data as unknown as Question);
  const last = new Map<string, { value: unknown; id: number }>();
  for (const e of session.record.entries(["answer"])) if (!e.data.withdrawn) last.set(String(e.data.qid), { value: e.data.value, id: e.id });
  const rows: (ChangeRow & { at: number })[] = [];
  const keys = new Set<string>();
  for (const [qid, a] of last) {
    const q = asked.get(qid);
    if (!q || q.decisionKey === "adapter" || q.tableFrom) continue;
    if (q.decisionKey) keys.add(q.decisionKey);
    const demo = demoAfter(session, a.id);
    rows.push({ id: qid, label: q.title, value: optionLabel(q, a.value), kind: "question", q: { ...q, status: "open" }, current: a.value, key: q.decisionKey || undefined, at: a.id, ...(demo ? { note: DEMO_NOTE, rerun: demo.sample } : {}) });
  }
  const setAt = new Map<string, number>();
  for (const e of session.record.entries(["setup", "decision"])) {
    if (e.kind === "decision") setAt.set(String(e.data.key), e.id);
    else for (const k of Object.keys((e.data.values as object) ?? {})) setAt.set(k, e.id);
  }
  for (const f of session.decisions.fields()) {
    if (!f.set || keys.has(f.key) || f.owner === "fixed") continue;
    const at = setAt.get(f.key) ?? 0;
    const demo = demoAfter(session, at);
    rows.push({ id: f.key, label: f.label, value: show(f.value), kind: "decision", q: decisionQuestion(f), current: f.value, key: f.key, at, ...(demo ? { note: DEMO_NOTE, rerun: demo.sample } : {}) });
  }
  return rows.sort((a, b) => b.at - a.at).map(({ at: _at, ...r }) => r);
}

export function decisionQuestion(f: DecisionFieldLike): Question {
  const opts = (f.choices ?? []).map((c) => ({ value: choiceValue(c), label: choiceLabel(c) }));
  return localQuestion(`decision:${f.key}`, f.label, f.help || `The value of ${f.label}.`, kind(f) === "bool" ? [{ value: true, label: "yes" }, { value: false, label: "no" }] : opts);
}

const kind = (f: DecisionFieldLike) => fieldKind(f);

export function findChange(rows: ChangeRow[], id: string): ChangeRow | undefined {
  const t = id.trim().toLowerCase();
  return rows.find((r) => r.id.toLowerCase() === t) ?? rows.find((r) => r.key?.toLowerCase() === t) ?? rows.find((r) => r.label.toLowerCase() === t) ?? rows.find((r) => r.label.toLowerCase().startsWith(t));
}

export function changePicker(rows: ChangeRow[]): Card {
  return { t: "question", q: localQuestion("change", "Change an answer", "Choose the answer or decision to change. Newest first.", rows.map((r) => ({ value: r.id, label: `${r.label}: ${r.value}` }))), act: { kind: "pick", rows } };
}

export function changeCard(row: ChangeRow): Card {
  return { t: "question", q: row.q, act: { kind: "change", key: row.kind === "decision" ? row.key : undefined, current: row.current, note: row.note, rerun: row.rerun } };
}

export function rerunCard(label: string, sample: string): Card {
  return {
    t: "question",
    q: localQuestion("rerun", "Run the demonstration again?", `You changed ${label}. ${DEMO_NOTE}`, [{ value: "yes", label: `Yes. Run it again on ${sample}` }, { value: "no", label: "No, not now" }], "yes"),
    act: { kind: "rerun", text: `The scientist changed ${label}. Run the demonstration again on ${sample} with the new value, then call pilot_result.` },
  };
}

export interface QuestionResult {
  next?: Card;
  line?: string;
}

export async function respondQuestion(session: SessionLike, card: Extract<Card, { t: "question" }>, value: unknown, note?: string): Promise<QuestionResult> {
  const act = card.act;
  if (!act) {
    await session.answer(card.q.qid, value, note);
    return {};
  }
  if (act.kind === "pick") {
    const row = act.rows.find((r) => r.id === value) ?? findChange(act.rows, String(value));
    return row ? { next: changeCard(row) } : {};
  }
  if (act.kind === "rerun") {
    if (value === "yes") void session.send(act.text).catch(() => {});
    return {};
  }
  const stale = act.key ? session.setDecision(act.key, value, "changed with /change") : session.changeAnswer ? await session.changeAnswer(card.q.qid, value, note) : [];
  const same = sameValue(act.current, value);
  const line = same ? `${card.q.title} stays ${optionLabel(card.q, value)}.` : `${card.q.title} is now ${optionLabel(card.q, value)}.${stale.length ? ` ${stale.length} ${stale.length === 1 ? "step is" : "steps are"} out of date. /rerun runs them again.` : ""}`;
  return { line, next: !same && act.rerun ? rerunCard(card.q.title, act.rerun) : undefined };
}

export function localQuestion(qid: string, title: string, text: string, options: { value: unknown; label: string }[], rec?: unknown): Question {
  return { qid, session: "", decisionKey: "", title, text, options, recommendation: rec !== undefined ? { value: rec, reason: "" } : undefined, evidence: "", status: "open", created: "" };
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
  if (raw.trim() === "" || !Number.isFinite(n)) return "Type a number.";
  if (f.lo !== undefined && n < f.lo) return `The minimum is ${f.lo}.`;
  if (f.hi !== undefined && n > f.hi) return `The maximum is ${f.hi}.`;
  return undefined;
}

export function fixedProblem(f: DecisionFieldLike): string | undefined {
  return f.owner === "fixed" ? `The lab profile fixes ${f.label}.` : undefined;
}

export function applySetup(session: SessionLike, values: Record<string, unknown>, profile?: string): string | undefined {
  try {
    session.decisions.applySetup(values, { profile, how: "card" });
  } catch (e) {
    return `Setup failed: ${(e as Error).message}`;
  }
  return undefined;
}

// The question of a setup card starts the analysis if the scientist has not asked anything yet.
export function setupRequest(session: SessionLike, values: Record<string, unknown>): string | undefined {
  const q = typeof values.question === "string" ? values.question.trim() : "";
  return q && !session.record.entries(["user"]).length ? q : undefined;
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
  if (env.ANTHROPIC_API_KEY) say.warn(ENV_KEY_WARNING);
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
    ? [{ value: "compare", label: "Yes. Compare in the demonstration" }, { value: "blind", label: "Yes. Hold it back (blind test)" }, { value: "none", label: "No, it is not a reference" }]
    : [{ value: "none", label: "No reference" }, { value: "have", label: "Yes, I have one" }];
  return localQuestion("reference", "Reference", r.question, opts, c ? "compare" : "none");
}

export function refModeQuestion(st: PlanState): Question {
  return localQuestion("refmode", "Reference", `How does the agent use ${st.ref?.path ?? "the reference"}?`, [{ value: "compare", label: "Compare in the demonstration" }, { value: "blind", label: "Hold it back (blind test)" }], "compare");
}

export function pilotQuestion(): Question {
  return localQuestion("pilot", "Confirm and run all?", "Does this look right?", [
    { value: "confirm", label: "Confirm and run all" },
    { value: "change", label: "Change a metric or a setting (in plain words)" },
    { value: "another", label: "Try another sample" },
  ]);
}

export function referenceLine(ref: ReferenceChoice | undefined): string | undefined {
  return ref && ref.mode !== "none" ? `Reference: ${ref.path} (${ref.mode === "blind" ? "held back for a blind test" : "compared in the demonstration"})` : undefined;
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
      if (!Number.isInteger(i) || i < 0 || i >= itemCount(card)) return to(after);
      if (i < ndefs) return to("definition", { defIndex: i });
      const nset = (card.settings ?? []).length;
      if (i < ndefs + nset) return to("setting", { setIndex: i - ndefs });
      return to("useprogram", { progIndex: i - ndefs - nset });
    }
    case "setValue": {
      const v = typeof act.value === "string" ? act.value.trim() : act.value;
      if (st.step !== "setting" || st.setIndex < 0) return { state: st };
      if (v === "" || v === undefined) return to(after);
      return { state: { ...st, step: after, setIndex: -1 }, respond: { action: "set", index: st.setIndex, value: v } };
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
      return s.trim() ? respond({ action: "change", text: s.trim() }) : { state: st };
    }
  }
}

export function planHint(card: PlanCard): string {
  return pilotGate(card) ? "No step runs on the other samples before you confirm." : "No analysis step runs before you approve.";
}
