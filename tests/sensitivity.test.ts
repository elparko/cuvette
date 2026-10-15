import { expect, test } from "vitest";
import { Decision } from "../src/adapters/manifest.ts";
import { runSensitivity } from "../src/core/sensitivity.ts";

const rec = { logged: [] as any[], append(k: string, d: any) { this.logged.push([k, d]); return {} as any; } };

const decision = Decision.parse({
  key: "thr", label: "Threshold", kind: "choice", choices: ["Default", "Otsu", "Li", "Yen"],
  sensitivity: { args: { extra: 1 }, compare: ["metrics.count", "metrics.area"], max_runs: 3 },
});

test("table, holds, depends, failures", async () => {
  const calls: any[] = [];
  const call = async (tool: string, args: any, meta: any) => {
    calls.push({ tool, args, meta });
    const v = args.params.thr;
    if (v === "Li") throw new Error("boom");
    const count = v === "Default" ? 64 : 41;
    return { output: { ok: true, metrics: { count, area: 100 + (v === "Otsu" ? 3 : 0) } }, node: `n-${v}` };
  };
  const r = await runSensitivity(decision, "seg", { img: "a" }, "params.thr", call, rec as any);
  expect(calls).toHaveLength(3);
  expect(calls[0]).toMatchObject({ tool: "seg", args: { img: "a", extra: 1, params: { thr: "Default" } }, meta: { sensitivityOf: "thr" } });
  expect(r.depends).toEqual(["count depends on the choice: 64 with Default, 41 with Otsu"]);
  expect(r.holds).toEqual(["area is about 100 with every option"]);
  expect(r.options[2].ok).toBe(false);
  expect(r.table.split("\n")).toHaveLength(4);
  expect(r.table).toContain("failed: boom");
  expect(rec.logged[0][0]).toBe("sensitivity");
});

test("default metrics", async () => {
  const d = Decision.parse({ key: "k", label: "K", kind: "choice", choices: [1, 2] });
  const r = await runSensitivity(d, "t", {}, "k", async () => ({ output: { ok: true, metrics: { n: 5 } } }), rec as any);
  expect(r.holds).toEqual(["n is about 5 with every option"]);
});

test("the table keeps the integer digits of a metric", async () => {
  const d = Decision.parse({ key: "k", label: "K", kind: "choice", choices: [1, 2] });
  const r = await runSensitivity(d, "t", {}, "k", async () => ({ output: { ok: true, metrics: { n: 12345.67 } } }), rec as any);
  expect(r.holds).toEqual(["n is about 12346 with every option"]);
  expect(r.table).toContain("12346");
});
