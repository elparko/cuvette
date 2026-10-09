import { fitAnswer } from "./answers.ts";
import type { Session } from "./session.ts";
import type { Question } from "./types.ts";

export async function answerHeadless(s: Session, q: Question, value: unknown, note: string): Promise<void> {
  const tries = [value, q.recommendation?.value, q.default, q.options[0]?.value].filter((x, i, a) => x !== undefined && a.findIndex((y) => String(y) === String(x)) === i);
  let refusal = "";
  for (const v of tries) {
    try {
      await s.answer(q.qid, v, refusal ? `${note}; the harness used a fallback` : note);
    } catch (err) {
      refusal ||= (err as Error).message;
      continue;
    }
    if (refusal) s.record.append("notice", { text: `The answers file gave '${String(value)}' for ${q.decisionKey || q.title}, which it refused: ${refusal} Used '${String(v)}' instead.` });
    return;
  }
  const text = `No answer for ${q.decisionKey || q.title} was accepted: ${refusal}`;
  s.record.append("notice", { text });
  console.error(text);
}

export function attachHeadless(s: Session, opts: { answers: Record<string, unknown>; allow: Set<string> }): void {
  const { answers, allow } = opts;
  s.bus.on((e) => {
    if (e.type === "question") {
      const q = e.question;
      const catchAll = "*" in answers && !(q.decisionKey && !q.options.length && q.recommendation?.value !== undefined);
      const wanted = q.decisionKey && q.decisionKey in answers ? answers[q.decisionKey] : q.title in answers ? answers[q.title] : catchAll ? answers["*"] : q.recommendation?.value;
      const fallback = "The scientist is not available. Use your recommendation and state it as an assumption.";
      const v = q.decisionKey ? (q.options.length ? fitAnswer(q, wanted) : wanted) : wanted ?? fallback;
      if (v === undefined) return;
      const note = wanted === undefined ? "no answer in the answers file; the harness used the recommendation or the first option" : "answered from the answers file";
      setTimeout(() => void answerHeadless(s, q, v, note), 0);
    }
    if (e.type === "permission") s.respondPermission(e.rid, allow.has("all") || allow.has(e.tool), allow.size ? "" : "headless mode denies by default; pass --allow");
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
