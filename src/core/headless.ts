import { fitAnswer } from "./answers.ts";
import type { Session } from "./session.ts";

export function attachHeadless(s: Session, opts: { answers: Record<string, unknown>; allow: Set<string> }): void {
  const { answers, allow } = opts;
  s.bus.on((e) => {
    if (e.type === "question") {
      const q = e.question;
      const wanted = q.decisionKey && q.decisionKey in answers ? answers[q.decisionKey] : q.title in answers ? answers[q.title] : "*" in answers ? answers["*"] : q.recommendation?.value;
      const fallback = "The scientist is not available. Use your recommendation and state it as an assumption.";
      const v = q.decisionKey ? (q.options.length ? fitAnswer(q, wanted) : wanted) : wanted ?? fallback;
      if (v === undefined) return;
      const note = wanted === undefined ? "no answer in the answers file; the harness used the recommendation or the first option" : "answered from the answers file";
      setTimeout(() => s.answer(q.qid, v, note).catch((err) => console.error(String(err))), 0);
    }
    if (e.type === "permission") s.respondPermission(e.rid, allow.has("all") || allow.has(e.tool), allow.size ? "" : "headless mode denies by default; pass --allow");
    if (e.type === "instruction") s.followDone(e.step, "", true);
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
