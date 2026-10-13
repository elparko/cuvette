import { describe, expect, test } from "vitest";
import { addedSteps, coerceSetting, matchSettings, mergePlan, openDecisions, planText, readPlan, settingsOf, type AnalysisPlan, type KnownDecision } from "../src/core/plan.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const STEPS = ["Segment the nuclei", "segment the nuclei", "Count cells", "Run the t-test", "Normalize", "Fit the curve", "Make the figure", ""];
const WORDS = ["threshold", "method", "minimum size", "alpha", "paired", "test", "Otsu", "Triangle", "0.05", "yes"];

function value(r: Rng): unknown {
  return r.pick([undefined, null, "", "Otsu", 5, 0.05, true, false, [1, 2], { a: 1 }, "  spaced  ", "50 px"]);
}

function rawStep(r: Rng): unknown {
  if (r.bool(0.1)) return r.pick(["a string step", 5, null, ["x"]]);
  return {
    step: r.bool(0.9) ? r.pick(STEPS) : value(r),
    ...(r.bool() ? { method: r.pick(WORDS) } : {}),
    ...(r.bool() ? { tool: r.pick(["count", "lab/count", "run_script", "measure (fiji)"]) } : {}),
    ...(r.bool() ? { status: r.pick(["todo", "done", "skipped", ""]) } : {}),
    ...(r.bool(0.3) ? { reason: r.pick(["not needed", ""]) } : {}),
    ...(r.bool(0.6) ? { decisions: Array.from({ length: r.int(0, 3) }, () => (r.bool(0.1) ? r.pick(WORDS) : { label: r.pick(WORDS), ...(r.bool() ? { value: value(r) } : {}), ...(r.bool(0.3) ? { options: r.pick([["a", "b"], "a", null]) } : {}), ...(r.bool(0.3) ? { by: "scientist" } : {}) })) } : {}),
    ...(r.bool(0.2) ? { settings: [{ key: r.pick(["method", "alpha"]), value: value(r) }] } : {}),
  };
}

function rawPlan(r: Rng, steps = true): Record<string, unknown> {
  return {
    ...(r.bool() ? { restatement: r.pick(["Count the cells.", "", 5, "The tools are installed. Count the cells."]) } : {}),
    ...(r.bool(0.3) ? { definitions: r.pick([[{ measure: "count", definition: "cells per field" }], "x", [null], [{ measure: "", definition: "x" }]]) } : {}),
    ...(r.bool(0.3) ? { exclusions: r.pick([[{ what: "blurry fields" }], ["edge cells"], {}]) } : {}),
    ...(r.bool(0.2) ? { pilot: r.pick([{ sample: "a.tif", shows: "x" }, { sample: "none" }, "x", null]) } : {}),
    ...(r.bool(0.2) ? { data: r.pick([{ files: "a.csv", n: 12 }, null, "x"]) } : {}),
    ...(r.bool(0.2) ? { programs: r.pick([[{ part: "count", adapter: "lab" }], ["lab"], null]) } : {}),
    ...(r.bool(0.2) ? { checks: [{ check: "n per group", if_fails: "stop" }] } : {}),
    ...(r.bool(0.2) ? { outputs: r.pick([["table"], "table", 5]) } : {}),
    ...(steps || r.bool() ? { steps: r.pick([Array.from({ length: r.int(0, 6) }, () => rawStep(r)), "x", null, {}]) } : {}),
  };
}

const known: KnownDecision[] = [
  { key: "method", label: "Threshold method", kind: "str", choices: ["Otsu", "Triangle"], default: "Otsu", tools: ["count"] },
  { key: "min_size", label: "Minimum size", kind: "int", default: 5, tools: ["count"] },
  { key: "alpha", label: "Alpha", kind: "float", default: 0.05, tools: ["run_script"] },
  { key: "paired", label: "Paired test", kind: "bool", tools: ["run_script"] },
];

const lower = (p: AnalysisPlan) => p.steps.map((s) => s.step.toLowerCase());

describe("fuzz: plan merge and update", () => {
  test("random tool arguments read into a plan without a crash", () => {
    const r = new Rng(1101);
    for (let i = 0; i < runs(1000); i++) {
      const p = { steps: [], ...readPlan(rawPlan(r, false), r.bool()) } as AnalysisPlan;
      planText(p);
      settingsOf(p);
      openDecisions(p);
      matchSettings(structuredClone(p), known);
      for (const s of p.steps) expect(typeof s.step).toBe("string");
    }
  });

  test("a merge keeps every old step, adds each new name once, and does not change its inputs", () => {
    const r = new Rng(1102);
    const bad: string[] = [];
    for (let i = 0; i < runs(1000); i++) {
      const prev = { steps: [], ...readPlan(rawPlan(r)) } as AnalysisPlan;
      const next = readPlan(rawPlan(r), false);
      const before = JSON.stringify([prev, next]);
      const out = mergePlan(prev, next);
      if (JSON.stringify([prev, next]) !== before) bad.push("an input changed");
      const names = lower(out);
      for (const s of prev.steps) if (!names.includes(s.step.toLowerCase())) bad.push(`lost ${s.step}`);
      if (out.steps.length !== prev.steps.length + addedSteps(prev, out).length) bad.push("step count");
      for (const s of out.steps) if (!s.status) bad.push(`no status on ${s.step}`);
      const plain = (x: AnalysisPlan) => JSON.stringify(x, (_k, v) => v);
      out.steps[0]?.decisions?.push({ label: "x" });
      if (JSON.stringify([prev, next]) !== before) bad.push(`the merged plan shares objects with an input: ${plain(out).slice(0, 80)}`);
    }
    expect([...new Set(bad)].slice(0, 5)).toEqual([]);
  });

  test("a merge with nothing new, or with the plan itself, changes nothing", () => {
    const r = new Rng(1103);
    const bad: string[] = [];
    for (let i = 0; i < runs(1000); i++) {
      const prev = { steps: [], ...readPlan(rawPlan(r)) } as AnalysisPlan;
      const same = (a: AnalysisPlan, b: AnalysisPlan) => JSON.stringify(a) === JSON.stringify(b);
      if (!same(mergePlan(prev, {}), prev)) bad.push("empty update changed the plan");
      if (!same(mergePlan(prev, { steps: [] }), prev)) bad.push("no steps changed the plan");
      const self = mergePlan(prev, structuredClone(prev));
      if (!same(self, prev)) bad.push(`self merge changed the plan: ${JSON.stringify(prev.steps.map((s) => s.step))} -> ${JSON.stringify(self.steps.map((s) => s.step))}`);
      const once = mergePlan(prev, readPlan(rawPlan(r), false));
      const twice = mergePlan(once, structuredClone(once));
      if (!same(once, twice)) bad.push("a merge is not stable");
    }
    expect([...new Set(bad)].slice(0, 5)).toEqual([]);
  });

  test("a status update of one step changes only that step", () => {
    const r = new Rng(1104);
    for (let i = 0; i < runs(500); i++) {
      const prev = { steps: [], ...readPlan(rawPlan(r)) } as AnalysisPlan;
      if (!prev.steps.length) continue;
      const k = r.int(0, prev.steps.length - 1);
      const target = prev.steps[k]!;
      const out = mergePlan(prev, readPlan({ steps: [{ step: target.step.toUpperCase(), status: "done" }] }, false));
      const first = prev.steps.findIndex((s) => s.step.toLowerCase() === target.step.toLowerCase());
      out.steps.forEach((s, j) => {
        if (j === first) expect(s.status).toBe("done");
        else expect(s).toEqual(prev.steps[j]);
      });
    }
  });

  test("a setting value is read the same way each time", () => {
    const r = new Rng(1105);
    for (let i = 0; i < runs(1000); i++) {
      const k = r.pick(known);
      const v = r.pick([value(r), r.pick(WORDS), `${r.int(0, 999)},${r.int(100, 999)}`, `-${r.logUniform(0.001, 100)}`, "1e-3", "no, not paired", "1,000 px"]);
      const a = coerceSetting(k, v);
      expect(coerceSetting(k, v)).toEqual(a);
      if (a.ok && k.choices) expect(k.choices).toContain(a.value);
      if (a.ok && /int|float/.test(k.kind)) expect(Number.isFinite(a.value)).toBe(true);
    }
  });
});
