import { expect, test } from "vitest";
import { comparePapers, countPairs, mcnemarExact, outcomes } from "../src/bench/papers-compare.ts";
import type { PapersResult, PaperRun } from "../src/bench/papers.ts";

const item = (key: string, pass: boolean, reference = false) => ({ key, reference, computed: { pass } }) as unknown as PaperRun["items"][number];
const run = (paper: string, model: string, items: PaperRun["items"], status = "answer") => ({ paper, model, run: 0, status, durationS: 1, items }) as PaperRun;
const result = (runs: PaperRun[]) => ({ date: "2026-10-11", models: [...new Set(runs.map((r) => r.model))], runsPerCell: 1, runs, problems: [] }) as PapersResult;

test("the exact McNemar p value matches the binomial test on the discordant pairs", () => {
  expect(mcnemarExact(0, 0)).toBe(1);
  expect(mcnemarExact(3, 3)).toBe(1);
  expect(mcnemarExact(0, 5)).toBeCloseTo(0.0625, 10);
  expect(mcnemarExact(1, 9)).toBeCloseTo(0.021484375, 10);
  expect(mcnemarExact(9, 1)).toBeCloseTo(mcnemarExact(1, 9), 12);
  expect(mcnemarExact(0, 200)).toBeLessThan(1e-50);
});

test("pairs count only the keys in both files", () => {
  const a = new Map([["x", true], ["y", false], ["z", true], ["only-a", true]]);
  const b = new Map([["x", true], ["y", true], ["z", false], ["only-b", true]]);
  expect(countPairs(a, b)).toEqual({ pairs: 3, both: 1, onlyA: 1, onlyB: 1, neither: 0, p: 1 });
});

test("a paper run passes only if every scored item passes; reference items and skipped runs do not count", () => {
  const o = outcomes([run("p1", "m", [item("a", true), item("b", false, true)]), run("p2", "m", [item("a", true), item("b", false)]), run("p3", "m", [item("a", false)], "skipped")]);
  expect([...o.papers]).toEqual([["p1#0", true], ["p2#0", false]]);
  expect(o.items.size).toBe(3);
});

test("the report names both files and needs one model in each", () => {
  const a = result([run("p1", "ollama:qwen3:8b", [item("a", false)]), run("p2", "ollama:qwen3:8b", [item("a", true)])]);
  const b = result([run("p1", "ollama:qwen3:8b", [item("a", true)]), run("p2", "ollama:qwen3:8b", [item("a", true)])]);
  const text = comparePapers(a, b, { names: ["before.json", "after.json"] });
  expect(text).toContain("A: before.json (ollama:qwen3:8b)");
  expect(text).toContain("| Paper runs (all items pass) | 2 | 1 | 0 | 1 | 0 | 1.000 |");
  const two = result([...a.runs, run("p1", "claude:claude-haiku-5-5", [item("a", true)])]);
  expect(() => comparePapers(two, b)).toThrow(/Name one model with --model/);
  expect(comparePapers(two, b, { model: "ollama:qwen3:8b" })).toContain("| Items | 2 |");
});
