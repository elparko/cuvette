import { expect, test } from "vitest";
import { normalizeText, resultKey } from "../src/core/loopkey.ts";

const run = (n: number, extra: object = {}) => ({
  ok: true,
  text: "4",
  summary: `The script ran in /p and wrote 1 new file(s) to /p/out.`,
  outputs: [{ path: `/p/out/script-${n}/t-${n}.csv`, kind: "table" as const, name: `t-${n}.csv` }],
  data: { script: `/p/out/script-${n}/script.py`, duration_s: n * 1.5 },
  ...extra,
});

test("two runs that differ only in a folder name, a counter, a time or a duration have the same key", () => {
  expect(resultKey(run(1))).toBe(resultKey(run(7)));
  expect(resultKey(run(1, { text: "File /p/out/script-1/script.py, line 2 at 2026-10-14T10:00:00Z in /private/var/folders/ab/cd/T/x1" }))).toBe(
    resultKey(run(2, { text: "File /p/out/script-2/script.py, line 2 at 2026-10-15T11:30:05.123Z in /private/var/folders/zz/yy/T/x9" })),
  );
  expect(resultKey({ ok: true, data: { job_id: "a1", started: "x", status: "queued" } })).toBe(resultKey({ ok: true, data: { job_id: "b2", started: "y", status: "queued" } }));
  expect(normalizeText("id call_abcdef123456 and 123e4567-e89b-12d3-a456-426614174000")).toBe("id <id> and <id>");
});

test("a real change in the result gives another key", () => {
  expect(resultKey(run(1))).not.toBe(resultKey(run(1, { text: "5" })));
  expect(resultKey({ ok: true, summary: "Job running 40 percent." })).not.toBe(resultKey({ ok: true, summary: "Job running 60 percent." }));
  expect(resultKey({ ok: true, metrics: { done: 1 } })).not.toBe(resultKey({ ok: true, metrics: { done: 2 } }));
  expect(resultKey({ ok: true, data: { status: "running" } })).not.toBe(resultKey({ ok: true, data: { status: "done" } }));
  expect(resultKey({ ok: true, summary: "step-2 of the job" })).not.toBe(resultKey({ ok: true, summary: "step-3 of the job" }));
  expect(resultKey(run(1))).not.toBe(resultKey(run(1, { outputs: [{ path: "/p/out/script-1/other.csv", kind: "table", name: "other.csv" }] })));
});

test("a very long text gives a key fast, and a change at the end or in the length changes the key", () => {
  const big = "ab cd ".repeat(2e6);
  const t0 = Date.now();
  const a = resultKey({ ok: true, text: big });
  expect(Date.now() - t0).toBeLessThan(10_000);
  expect(a).toBe(resultKey({ ok: true, text: big }));
  expect(a).not.toBe(resultKey({ ok: true, text: big + "x" }));
  expect(a).not.toBe(resultKey({ ok: true, text: big + big }));
});
