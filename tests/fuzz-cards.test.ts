import { describe, expect, test } from "vitest";
import {
  RUN_MODES,
  closesCard,
  itemCount,
  numberProblem,
  planInit,
  planQuestions,
  planReduce,
  planResolve,
  pushCard,
  questionCursor,
  questionEnter,
  seqAnswered,
  seqBack,
  seqNext,
  seqPending,
  seqView,
  SEQ_START,
  type Card,
  type PlanAction,
  type PlanCard,
  type PlanState,
  type QuestionSeq,
} from "../src/ui/cards.ts";
import type { Entry, Question } from "../src/core/types.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const question = (r: Rng, qid: string): Question => ({
  qid,
  session: "s",
  decisionKey: "",
  title: r.string("abc ?", 1, 8),
  text: r.string("abc ", 0, 8),
  options: Array.from({ length: r.int(0, 3) }, (_, i) => ({ value: r.pick([i, `v${i}`, { a: i }, null, true]), label: `o${i}` })),
  recommendation: r.bool(0.3) ? { value: r.pick([0, "v0", { a: 0 }, null]), reason: "" } : undefined,
  default: r.bool(0.2) ? r.pick([0, "v1", false]) : undefined,
  evidence: "",
  status: "open",
  created: "",
});

function card(r: Rng, i: number): Card {
  const qids = Array.from({ length: r.int(0, 3) }, () => `q${r.int(0, 5)}`);
  switch (r.int(0, 9)) {
    case 0:
    case 1:
    case 2:
      return { t: "question", q: question(r, `q${r.int(0, 5)}`) };
    case 3:
      return plan(r);
    case 4:
      return { t: "clarify", found: "f", qids, skipped: [] };
    case 5:
      return { t: "setup", profiles: [] };
    case 6:
      return { t: "key" };
    case 7:
      return { t: "permission", rid: `r${r.int(0, 3)}`, tool: "t", args: {}, touches: "x" };
    case 8:
      return { t: "instruction", step: r.int(1, 3), tool: "t", text: "x" };
    default:
      return { t: "config" };
  }
}

function plan(r: Rng): PlanCard {
  const n = (k: number) => Array.from({ length: r.int(0, k) }, (_, i) => i);
  return {
    t: "plan",
    stage: r.pick(["plan", "pilot"] as const),
    version: 1,
    text: "t",
    update: r.bool(),
    qids: Array.from({ length: r.int(0, 3) }, () => `q${r.int(0, 5)}`),
    programs: n(2).map((i) => ({ part: `p${i}`, adapter: "a", alternatives: n(2).map((j) => `alt${j}`), ...(r.bool() ? { program: "prog", why: "w" } : {}) })),
    mode: r.pick(["watch", "follow", "teach", "other" as never]),
    definitions: r.bool() ? n(2).map((i) => ({ measure: `m${i}`, definition: `d${i}` })) : undefined,
    pilot: r.bool() ? "gate" : undefined,
    reference: r.bool() ? { question: "q", candidates: r.bool() ? [{ path: "/a.csv", columns: [], label: "l" }] : [] } : undefined,
    settings: r.bool() ? n(3).map((i) => ({ index: i, step: 1, label: `s${i}`, value: 1, ...(r.bool() ? { options: ["x", "y"] } : {}) })) : undefined,
  };
}

const TEXTS = ["", "  ", "x", "/a.csv; Sheet 1; A, B", ";;", "compare", "blind", "have", "none", "confirm", "another", "change", "d0"];

function action(r: Rng, c: PlanCard): PlanAction {
  const t = () => r.pick(TEXTS);
  switch (r.int(0, 22)) {
    case 0: return { a: "restate", ok: r.bool() };
    case 1: return { a: "correct", text: t() };
    case 2: return { a: "later", qid: `q${r.int(0, 5)}` };
    case 3: return { a: "reference", value: t() };
    case 4: return { a: "refpath", text: t() };
    case 5: return { a: "refmode", value: t() };
    case 6: return { a: "definition", index: r.int(-2, 4) };
    case 7: return { a: "define", text: t() };
    case 8: return { a: "run" };
    case 9: return { a: "change" };
    case 10: return { a: "changeText", text: t() };
    case 11: return { a: "cancel" };
    case 12: return { a: "mode", mode: r.pick([undefined, "watch", "follow", "teach", "zzz" as never]) };
    case 13: return { a: "programs" };
    case 14: return { a: "program", index: r.int(-1, 8) };
    case 15: return { a: "back" };
    case 16: return { a: "pilot", value: t() };
    case 17: return { a: "details" };
    case 18: return { a: "item", n: r.pick([r.int(-1, itemCount(c) + 2), NaN, 1.5]) };
    case 19: return { a: "pick" };
    case 20: return { a: "setValue", value: r.pick(["", " ", "y", 3, undefined, null]) };
    default: return { a: "useProgram", value: r.pick(["a", "alt0", "zz"]) };
  }
}

describe("fuzz: the cards", () => {
  test("the plan card state stays in range and every response is valid, for any sequence of actions", () => {
    const steps = ["restate", "decisions", "reference", "refpath", "refmode", "actions", "change", "correct", "program", "definition", "setting", "pick", "useprogram"];
    const responses = ["approve", "pilot", "confirm", "another", "change", "set", "cancel"];
    for (let seed = 1; seed <= runs(300); seed++) {
      const r = new Rng(seed);
      const c = plan(r);
      let st: PlanState = planInit(c);
      expect(RUN_MODES).toContain(st.mode);
      for (let i = 0; i < 25; i++) {
        const a = action(r, c);
        let out;
        try {
          out = planReduce(c, st, a);
        } catch (e) {
          throw new Error(`seed ${seed}: ${JSON.stringify(a)} threw ${(e as Error).message}`);
        }
        const s = planResolve(c, out.state, []);
        expect(steps, `seed ${seed} ${JSON.stringify(a)}`).toContain(s.step);
        expect(RUN_MODES).toContain(s.mode);
        expect(s.defIndex).toBeLessThan((c.definitions ?? []).length);
        expect(s.setIndex).toBeLessThan((c.settings ?? []).length);
        expect(s.later.every((q) => typeof q === "string")).toBe(true);
        if (out.respond) {
          expect(responses).toContain(out.respond.action);
          if (out.respond.action === "change") expect(out.respond.text.trim()).not.toBe("");
          if (out.respond.action === "set") expect(out.respond.index).toBeGreaterThanOrEqual(0);
          if ("mode" in out.respond && out.respond.mode) expect(RUN_MODES).toContain(out.respond.mode);
          if (out.respond.action === "approve" || out.respond.action === "pilot") expect(out.respond.action).toBe(c.stage === "plan" && c.pilot ? "pilot" : "approve");
        }
        if (s.step === "definition") expect(c.definitions?.[s.defIndex]).toBeDefined();
        if (s.step === "setting") expect(c.settings?.[s.setIndex]).toBeDefined();
        if (s.step === "useprogram") expect(c.programs[s.progIndex ?? -1]).toBeDefined();
        st = out.respond ? planInit(c) : s;
      }
    }
  });

  test("the card list never holds two copies of a card that must be single, or a question that a plan asks", () => {
    for (let seed = 1; seed <= runs(300); seed++) {
      const r = new Rng(seed + 2000);
      let list: Card[] = [];
      for (let i = 0; i < 25; i++) {
        const c = card(r, i);
        const next = pushCard(list, c);
        expect(next.filter((x) => x.t === "plan").length).toBeLessThanOrEqual(1);
        expect(next.filter((x) => x.t === "clarify").length).toBeLessThanOrEqual(1);
        expect(next.filter((x) => x.t === "setup").length).toBeLessThanOrEqual(1);
        expect(next.filter((x) => x.t === "key").length).toBeLessThanOrEqual(1);
        const qids = next.flatMap((x) => (x.t === "question" ? [x.q.qid] : []));
        expect(new Set(qids).size, `seed ${seed}`).toBe(qids.length);
        for (const x of next) if (x.t === "plan" || x.t === "clarify") for (const id of x.qids) expect(qids, `seed ${seed}: ${id} is in a ${x.t} card`).not.toContain(id);
        if (c.t === "key") expect(next[0]!.t).toBe("key");
        if (["question", "setup", "key"].includes(c.t)) expect(pushCard(next, c)).toEqual(next);
        list = next;
      }
    }
  });

  test("a card that the log entry closes is the one that the entry names", () => {
    for (let seed = 1; seed <= runs(200); seed++) {
      const r = new Rng(seed + 3000);
      const c = card(r, 0);
      const entry = (kind: string, data: Record<string, unknown>) => ({ id: 1, ts: "", session: "s", kind, data }) as unknown as Entry;
      const closes = (e: Entry) => closesCard(e, c);
      if (c.t !== "question") expect(closes(entry("answer", { qid: "q1" }))).toBe(false);
      if (c.t !== "permission") expect(closes(entry("permission", { rid: "r1" }))).toBe(false);
      if (c.t === "question") {
        expect(closes(entry("answer", { qid: c.q.qid }))).toBe(true);
        expect(closes(entry("answer", { qid: c.q.qid + "x" }))).toBe(false);
      }
      expect(closes(entry("answer", {}))).toBe(false);
      expect(closes(entry("note", { qid: "q1", rid: "r1", step: 1 }))).toBe(false);
    }
  });

  test("the question sequence keeps its position in range, and answers are never lost", () => {
    for (let seed = 1; seed <= runs(300); seed++) {
      const r = new Rng(seed + 4000);
      let seq: QuestionSeq = SEQ_START;
      let pending: Question[] = Array.from({ length: r.int(0, 4) }, (_, i) => question(r, `p${i}`));
      let asked = pending.length;
      const answered = new Map<string, unknown>();
      for (let i = 0; i < 40; i++) {
        const k = r.int(0, 3);
        const view = seqView(seq, pending);
        if (k === 0 && view) {
          const v = r.int(0, 9);
          const was = seq.done.length;
          seq = seqAnswered(seq, view.q, v);
          answered.set(view.q.qid, v);
          if (!view.changing) pending = pending.filter((q) => q.qid !== view.q.qid);
          expect(seq.done.length).toBe(view.changing ? was : was + 1);
        } else if (k === 1) seq = seqBack(seq);
        else if (k === 2) seq = seqNext(seq);
        else if (pending.length < 3) pending = [...pending, question(r, `p${asked++}`)];
        expect(seq.back).toBeGreaterThanOrEqual(-1);
        expect(seq.back).toBeLessThan(seq.done.length || 1);
        expect(new Set(seq.done.map((d) => d.q.qid)).size).toBe(seq.done.length);
        for (const d of seq.done) expect(d.value, `seed ${seed}`).toBe(answered.get(d.q.qid));
        const v = seqView(seq, pending);
        if (v) {
          expect(v.n).toBeGreaterThanOrEqual(1);
          expect(v.n).toBeLessThanOrEqual(v.total);
        }
        expect(seqPending(pending.map((q) => ({ t: "question", q })))).toEqual(pending);
      }
    }
  });

  test("a question with options gives an answer from its options", () => {
    for (let seed = 1; seed <= runs(300); seed++) {
      const r = new Rng(seed + 5000);
      const q = question(r, "q");
      const cur = q.options.length ? r.int(-3, q.options.length + 3) : 0;
      const at = questionCursor(q, r.pick([undefined, 0, "v1", { a: 1 }, null]));
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThanOrEqual(Math.max(0, q.options.length - 1));
      const out = questionEnter(q, cur);
      if (q.options.length && "value" in out) expect(q.options.map((o) => o.value)).toContainEqual(out.value);
    }
  });

  test("a number field accepts only a finite number", () => {
    const raws = ["", " ", "1", "-2.5", "1e3", "Infinity", "-Infinity", "1e999", "NaN", "0x10", "1_0", "abc", "  7  ", ".5", "5.", "+3"];
    for (const raw of raws) {
      for (const lim of [{}, { lo: 0 }, { hi: 10 }, { lo: -5, hi: 5 }]) {
        const problem = numberProblem({ key: "k", label: "K", kind: "int", set: false, ...lim } as never, raw);
        if (problem === undefined) expect(Number.isFinite(Number(raw)), `"${raw}" is accepted`).toBe(true);
      }
    }
  });
});
