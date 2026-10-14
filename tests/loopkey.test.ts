import { expect, test } from "vitest";
import { normalizeText, resultKey } from "../src/core/loopkey.ts";

const W = "/p/out";
const run = (n: number, extra: object = {}) => ({
  ok: true,
  text: "4",
  summary: `The script ran in /p and wrote 1 new file(s) to ${W}.`,
  outputs: [{ path: `${W}/script-${n}/t-${n}.csv`, kind: "table" as const, name: `t-${n}.csv` }],
  data: { script: `${W}/script-${n}/script.py`, duration_s: n * 1.5 },
  ...extra,
});
const key = (o: Parameters<typeof resultKey>[0]) => resultKey(o, W);

test("two runs that differ only in a folder name, a counter, a time or a duration have the same key", () => {
  expect(key(run(1))).toBe(key(run(7)));
  expect(key(run(1, { text: `File ${W}/script-1/script.py, line 2 at 2026-10-14T10:00:00Z in /private/var/folders/ab/cd/T/x1` }))).toBe(
    key(run(2, { text: `File ${W}/script-2/script.py, line 2 at 2026-10-15T11:30:05.123Z in /private/var/folders/zz/yy/T/x9` })),
  );
  expect(key({ ok: true, data: { job_id: "a1", started: "x", status: "queued" } })).toBe(key({ ok: true, data: { job_id: "b2", started: "y", status: "queued" } }));
  expect(normalizeText("id call_abcdef123456 and 123e4567-e89b-12d3-a456-426614174000")).toBe("id <id> and <id>");
});

test("a real change in the result gives another key", () => {
  expect(key(run(1))).not.toBe(key(run(1, { text: "5" })));
  expect(key({ ok: true, summary: "Job running 40 percent." })).not.toBe(key({ ok: true, summary: "Job running 60 percent." }));
  expect(key({ ok: true, metrics: { done: 1 } })).not.toBe(key({ ok: true, metrics: { done: 2 } }));
  expect(key({ ok: true, data: { status: "running" } })).not.toBe(key({ ok: true, data: { status: "done" } }));
  expect(key({ ok: true, summary: "step-2 of the job" })).not.toBe(key({ ok: true, summary: "step-3 of the job" }));
  expect(key(run(1))).not.toBe(key(run(1, { outputs: [{ path: `${W}/script-1/other.csv`, kind: "table", name: "other.csv" }] })));
});

test("the counter rule applies only to names below the work folder", () => {
  expect(key({ ok: true, text: "read /data/sample-3/x.csv" })).not.toBe(key({ ok: true, text: "read /data/sample-4/x.csv" }));
  expect(key({ ok: true, text: "read /data/sample-3.csv" })).not.toBe(key({ ok: true, text: "read /data/sample-4.csv" }));
  expect(key({ ok: true, text: "read /data/2026-10-14/x.csv" })).not.toBe(key({ ok: true, text: "read /data/2026-10-15/x.csv" }));
  expect(key({ ok: true, text: `wrote ${W}/script-3/a.csv` })).toBe(key({ ok: true, text: `wrote ${W}/script-4/a.csv` }));
  expect(key({ ok: true, text: `wrote ${W}/t-2.csv` })).toBe(key({ ok: true, text: `wrote ${W}/t-5.csv` }));
  expect(key({ ok: true, outputs: [{ path: "/data/sample-3.csv", kind: "table", name: "sample-3.csv" }] })).not.toBe(key({ ok: true, outputs: [{ path: "/data/sample-4.csv", kind: "table", name: "sample-4.csv" }] }));
});

test("only whole key names for time and ids are dropped", () => {
  expect(key({ ok: true, data: { median_duration: 3 } })).not.toBe(key({ ok: true, data: { median_duration: 4 } }));
  expect(key({ ok: true, data: { elapsed_days: 3 } })).not.toBe(key({ ok: true, data: { elapsed_days: 4 } }));
  expect(key({ ok: true, data: { durationS: 3, elapsed_s: 1, runtime: 2 } })).toBe(key({ ok: true, data: { durationS: 9, elapsed_s: 8, runtime: 7 } }));
});

test("a temporary path ends at a comma, a semicolon, a bracket, a quote or a space", () => {
  expect(key({ ok: true, text: "/tmp/x.csv,rows=120" })).not.toBe(key({ ok: true, text: "/tmp/x.csv,rows=130" }));
  expect(key({ ok: true, text: "(/tmp/x.csv) rows 1" })).not.toBe(key({ ok: true, text: "(/tmp/y.csv) rows 2" }));
  expect(key({ ok: true, text: '"/tmp/a1";n=1' })).not.toBe(key({ ok: true, text: '"/tmp/a2";n=2' }));
  expect(key({ ok: true, text: "saved /tmp/a1/x.csv" })).toBe(key({ ok: true, text: "saved /tmp/b2/x.csv" }));
});

test("a very long text gives a key fast, and a change at the end or in the length changes the key", () => {
  const big = "ab cd ".repeat(2e6);
  const t0 = Date.now();
  const a = key({ ok: true, text: big });
  expect(Date.now() - t0).toBeLessThan(10_000);
  expect(a).toBe(key({ ok: true, text: big }));
  expect(a).not.toBe(key({ ok: true, text: big + "x" }));
  expect(a).not.toBe(key({ ok: true, text: big + big }));
});
