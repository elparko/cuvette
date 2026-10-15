import { readFileSync, statSync } from "node:fs";
import { fileFits, fitAnswer } from "./answers.ts";
import type { Session } from "./session.ts";
import { METHOD_DATA_TITLE } from "./datacompare.ts";
import type { Question } from "./types.ts";

const MAX_JSON_BYTES = 5_000_000;

export function readJsonObject(path: string): Record<string, unknown> {
  if (statSync(path).size > MAX_JSON_BYTES) throw new Error(`the file is larger than ${MAX_JSON_BYTES / 1e6} MB`);
  const v = JSON.parse(readFileSync(path, "utf8"));
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("the file must hold one JSON object, with a value for each key");
  return v;
}

export async function answerHeadless(s: Session, q: Question, value: unknown, note: string, by: "human" | "default" = "human"): Promise<void> {
  const tries = [value, q.recommendation?.value, q.default].filter((x, i, a) => x !== undefined && a.findIndex((y) => String(y) === String(x)) === i);
  let refusal = "";
  for (const v of tries) {
    try {
      await s.answer(q.qid, v, refusal ? `${note}; the harness used a fallback` : note, refusal ? "default" : by);
    } catch (err) {
      refusal ||= (err as Error).message;
      continue;
    }
    if (refusal) s.record.append("notice", { text: `The answers file gave '${String(value)}' for ${q.decisionKey || q.title}, which it refused: ${refusal} Used '${String(v)}' instead.` });
    return;
  }
  const text = `No answer for ${q.decisionKey || q.title} was accepted: ${refusal}`;
  s.questions.withdraw(q.qid, text);
  s.record.append("notice", { text });
  console.error(text);
}

export function attachHeadless(s: Session, opts: { answers: Record<string, unknown>; allow: Set<string> }): void {
  const { answers, allow } = opts;
  s.bus.on((e) => {
    if (e.type === "question") {
      const q = e.question;
      if (q.title === `Data check: ${METHOD_DATA_TITLE}`) {
        const go = allow.has("all") || allow.has("data-change");
        const stop = !go && q.recommendation?.value === "stop";
        if (stop) s.record.append("notice", { text: `Headless mode stops at a likely unit change. ${q.text.split(" The method ")[0]} Pass --allow data-change to continue.` });
        setTimeout(() => void answerHeadless(s, q, stop ? "stop" : "continue", stop ? "likely unit change; no --allow data-change" : "continued; the difference is in the record", "default"), 0);
        return;
      }
      const has = (k: string) => Object.hasOwn(answers, k);
      const catchAll = has("*") && !(q.decisionKey && !q.options.length && q.recommendation?.value !== undefined);
      const fromFile = q.decisionKey && has(q.decisionKey) ? answers[q.decisionKey] : has(q.title) ? answers[q.title] : catchAll ? answers["*"] : undefined;
      const wanted = fromFile ?? q.recommendation?.value;
      const fallback = "The scientist is not available. Use your recommendation and state it as an assumption.";
      const filed = fromFile !== undefined && (!q.decisionKey || !q.options.length || fileFits(q, fromFile));
      const v = q.decisionKey ? (q.options.length ? fitAnswer(q, wanted, { first: false }) : wanted ?? q.default) : wanted ?? fallback;
      if (v === undefined) {
        const why = `The answers file has no value for ${q.decisionKey || q.title} that fits the question, and the question has no recommendation and no default. No one can answer it in a headless run. Give the value in the answers file.`;
        setTimeout(() => {
          if (s.questions.withdraw(q.qid, why)) s.record.append("notice", { text: why });
        }, 0);
        return;
      }
      const note = fromFile !== undefined && filed ? "answered from the answers file" : fromFile !== undefined ? `the answers file value does not fit the options; the harness used ${q.recommendation ? "the recommendation" : "the default"}` : q.recommendation ? `no answer in the answers file; the harness used the recommendation${q.recommendation.reason ? `: ${q.recommendation.reason}` : ""}` : q.decisionKey ? "no answer in the answers file; the harness used the default" : "no answer in the answers file; the agent uses its own recommendation";
      if (fromFile !== undefined && !filed) s.record.append("notice", { text: `The answers file gave '${String(fromFile)}' for ${q.decisionKey || q.title}, which does not fit the options. The harness used '${String(v)}' instead.` });
      setTimeout(() => void answerHeadless(s, q, v, note, filed ? "human" : "default"), 0);
    }
    if (e.type === "permission") {
      const ok = allow.has("all") || (e.search ? allow.has("search") : allow.has(e.tool));
      s.respondPermission(e.rid, ok, ok ? "" : e.search ? "a search outside the project needs --allow search" : allow.size ? "" : "headless mode denies by default; pass --allow");
    }
    if (e.type === "instruction") s.followDone(e.step, "", true);
    if (e.type === "plan") {
      const c = e.reference?.candidates[0];
      const mode = (answers.reference_mode as "compare" | "blind" | "none" | undefined) ?? s.settings.referenceMode ?? "compare";
      const reference = c && mode !== "none" ? { mode, path: c.path, sheet: c.sheet } : undefined;
      setTimeout(() => s.respondPlan(e.stage === "pilot" ? { action: "confirm" } : e.pilot ? { action: "pilot", reference } : { action: "approve", reference }), 0);
    }
  });
  s.settings.autoResume = false;
}

export function applyHeadlessSetup(s: Session, setup: Record<string, unknown> | undefined, answers: Record<string, unknown>): void {
  const setupKeys = new Set(s.decisions.fields().filter((f) => f.stage === "setup").map((f) => f.key));
  const fromAnswers = Object.fromEntries(Object.entries(answers).filter(([k]) => setupKeys.has(k)));
  s.setupPreset = { ...answers, ...(setup ?? {}) };
  if (setup || Object.keys(fromAnswers).length || s.setupNeeded())
    s.decisions.applySetup({ ...fromAnswers, ...(setup ?? {}) }, { how: setup || Object.keys(fromAnswers).length ? "from the setup and answers files" : "defaults accepted (headless)" });
}
