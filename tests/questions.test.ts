import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { QuestionQueue, allOpenQuestions } from "../src/core/questions.ts";

class FakeRecord {
  items: any[] = [];
  constructor(public dir: string) {}
  append(kind: string, data: any) {
    const e = { id: this.items.length + 1, ts: new Date().toISOString(), session: "s", kind, data };
    this.items.push(e);
    return e;
  }
  entries(kinds?: string[]) {
    return this.items.filter((e) => !kinds || kinds.includes(e.kind));
  }
}

const spec = (extra: object = {}) => ({
  decisionKey: "norm",
  title: "Normalization",
  text: "Which?",
  options: [{ value: "tic", label: "TIC" }, { value: "rms", label: "RMS" }],
  evidence: "",
  ...extra,
});

let rec: FakeRecord;
beforeEach(() => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-"));
  rec = new FakeRecord(join(process.env.GA_HOME, "sessions", "s1"));
});

test("ask, answer by label, closed throws, restore", async () => {
  const q = new QuestionQueue(rec as any);
  const a = await q.ask(spec());
  const b = await q.ask(spec());
  expect([a.qid, b.qid]).toEqual(["q1", "q2"]);
  expect(allOpenQuestions().map((x) => x.qid)).toEqual(["q1", "q2"]);
  expect(q.answer("q1", "rms").answer).toBe("rms");
  expect(() => q.answer("q1", "tic")).toThrow(/closed/);
  expect(q.match(q.get("q2")!, "TIC")).toBe("tic");
  expect(q.match(q.get("q2")!, " 200 ")).toBe(200);
  expect(q.match(q.get("q2")!, "use the median")).toBe("use the median");
  q.answer("q2", "TIC");
  expect(allOpenQuestions()).toEqual([]);
  const again = new QuestionQueue(rec as any);
  expect(again.get("q1")!.status).toBe("answered");
  expect((await again.ask(spec())).qid).toBe("q3");
});

test("notify failure becomes a notice", async () => {
  const q = new QuestionQueue(rec as any, { notify: async () => { throw new Error("down"); } });
  await q.ask(spec());
  expect(rec.entries(["notice"])).toHaveLength(1);
});

test("expire and wait", async () => {
  const q = new QuestionQueue(rec as any);
  const a = await q.ask(spec({ timeoutS: 1, default: "tic", useDefaultOnTimeout: true }));
  const b = await q.ask(spec({ timeoutS: 1 }));
  const c = await q.ask(spec());
  const w = q.wait(a.qid);
  expect(q.expire(Date.now())).toHaveLength(0);
  q.expire(Date.now() + 5000);
  expect((await w).status).toBe("defaulted");
  expect(q.get(a.qid)!.answer).toBe("tic");
  expect(q.get(b.qid)!.status).toBe("timed_out");
  expect(rec.entries(["answer"]).map((e) => e.data.by)).toEqual(["timeout-default", "timeout"]);
  const still = await q.wait(c.qid, 10);
  expect(still.status).toBe("open");
});
