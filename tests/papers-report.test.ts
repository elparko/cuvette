import { expect, test } from "vitest";
import { renderPapersReport, summarize } from "../src/bench/papers-report.ts";
import type { PapersResult } from "../src/bench/papers.ts";

const score = (key: string, pass: boolean, reference = false) => ({
  key, description: "", expected: 1, tolerance: "exact" as const, abs: false, inAnswer: true, reference,
  computed: { pass, value: 1, diff: 0, node: "n1", path: "x", entry: 3 },
  reported: { pass, value: 1, diff: 0, via: "tolerance" as const, node: "n1", claimEntry: 4, text: "t" },
});

const result = {
  date: "2026-10-08", models: ["m"], runsPerCell: 1, problems: [], paths: {},
  runs: [{ paper: "p", model: "m", run: 1, status: "answer", durationS: 1, items: [score("a", true), score("b", false, true)] }],
} as unknown as PapersResult;

test("reference items stay out of the totals", () => {
  const cell = summarize(result).totals.m;
  expect([cell.computed, cell.computedOf, cell.reported, cell.reportedOf]).toEqual([1, 1, 1, 1]);
});

test("the report marks reference items", () => {
  const md = renderPapersReport(result);
  expect(md).toContain("| b (reference) |");
  expect(md).toContain("differs 1");
});
