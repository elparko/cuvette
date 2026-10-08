import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { checkAnswer } from "../src/core/claims.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import type { NodeIn } from "../src/core/types.ts";
import { processMetrics, scoreItems } from "../src/bench/papers-score.ts";
import type { PaperItem } from "../src/bench/papers-spec.ts";

let record: AnalysisRecord;
beforeEach(() => {
  record = new AnalysisRecord(mkdtempSync(join(tmpdir(), "ga-score-")), "s1");
});

const item = (o: Partial<PaperItem> & { key: string; value: number }): PaperItem => ({ description: "", abs: false, in_answer: true, ...o }) as PaperItem;

function node(result: unknown, extra: Partial<NodeIn> = {}) {
  const entry = record.append("tool_result", { tool: "t", ok: true });
  return record.addNode({
    entry: entry.id, adapter: "a", adapterVersion: "1", programVersion: "1", tool: "t", args: {}, decisions: {}, codeHash: "", inputHashes: [],
    outputs: [], result, parents: [], summary: "", model: "m", manualRoute: "", fidelity: "exact", ...extra,
  });
}

function answer(text: string) {
  checkAnswer(text, record);
  record.append("assistant", { text, final: true });
}

test("computed passes when a logged number is within tolerance and names the node and entry", () => {
  const n = node({ stats: { mean: 1.5801, p: 0.0031 } });
  const [s] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.005 })], record);
  expect(s.computed).toMatchObject({ pass: true, value: 1.5801, node: n.id, path: "stats.mean", entry: n.entry });
});

test("computed fails outside the tolerance and still names the nearest number", () => {
  node({ mean: 1.6 });
  const [s] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.005 })], record);
  expect(s.computed.pass).toBe(false);
  expect(s.computed.value).toBe(1.6);
});

test("computed picks the nearest number among several", () => {
  node({ a: 1.59, b: 1.581, c: 7 });
  const [s] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.02 })], record);
  expect(s.computed.path).toBe("b");
});

test("exact needs equality", () => {
  node({ n: 133671 });
  expect(scoreItems([item({ key: "n", value: 133670, exact: true })], record)[0].computed.pass).toBe(false);
  node({ n: 133670 });
  expect(scoreItems([item({ key: "n", value: 133670, exact: true })], record)[0].computed.pass).toBe(true);
});

test("abs compares the absolute value", () => {
  node({ t: -4.0621 });
  expect(scoreItems([item({ key: "t", value: 4.0621, tolerance: 0.001, abs: true })], record)[0].computed.pass).toBe(true);
  expect(scoreItems([item({ key: "t", value: 4.0621, tolerance: 0.001 })], record)[0].computed.pass).toBe(false);
});

test("comparison runs do not count as computed", () => {
  const main = node({ count: 40 });
  node({ count: 66 }, { sensitivityOf: main.id });
  const [s] = scoreItems([item({ key: "count", value: 66, exact: true })], record);
  expect(s.computed.pass).toBe(false);
});

test("an item with from_comparison counts comparison runs", () => {
  const main = node({ count: 40 });
  const cmp = node({ count: 66 }, { sensitivityOf: main.id });
  const [s] = scoreItems([item({ key: "count", value: 66, exact: true, from_comparison: true })], record);
  expect(s.computed).toMatchObject({ pass: true, node: cmp.id });
});

test("an item with tool only looks at the nodes of that tool", () => {
  node({ r2: 0.7333 }, { tool: "rule_of_five" });
  const [a] = scoreItems([item({ key: "r2", value: 0.752, tolerance: 0.03, tool: "fit_solubility_model" })], record);
  expect(a.computed.pass).toBe(false);
  expect(a.computed.value).toBeNull();
  node({ r2: 0.75 }, { tool: "fit_solubility_model" });
  const [b] = scoreItems([item({ key: "r2", value: 0.752, tolerance: 0.03, tool: "fit_solubility_model" })], record);
  expect(b.computed.pass).toBe(true);
});

test("reported passes when the answer states a measured value in tolerance", () => {
  node({ mean: 1.58 });
  answer("The mean difference is 1.58 hours.");
  const [s] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.005 })], record);
  expect(s.reported).toMatchObject({ pass: true, value: 1.58, via: "tolerance", node: "n1" });
});

test("an unsourced reported number does not count", () => {
  node({ mean: 3.2 });
  answer("The mean difference is 1.58 hours.");
  const [s] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.005 })], record);
  expect(s.reported.pass).toBe(false);
  expect(s.computed.pass).toBe(false);
});

test("a logged value that the answer leaves out fails reported and passes computed", () => {
  node({ mean: 1.58 });
  answer("The second drug gives more sleep.");
  const [s] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.005 })], record);
  expect(s.computed.pass).toBe(true);
  expect(s.reported.pass).toBe(false);
});

test("a rounded reported number equal to the rounded expected value passes", () => {
  node({ p: 0.002833 });
  answer("The two-sided p-value is 0.0028.");
  const [s] = scoreItems([item({ key: "p", value: 0.002833, tolerance: 0.00001 })], record);
  expect(s.reported).toMatchObject({ pass: true, via: "rounding" });
});

test("a wrong rounded number fails", () => {
  node({ p: 0.0029 });
  answer("The two-sided p-value is 0.0029.");
  const [s] = scoreItems([item({ key: "p", value: 0.002833, tolerance: 0.00001 })], record);
  expect(s.reported.pass).toBe(false);
});

test("rounding does not apply to exact items", () => {
  node({ n: 133670 });
  answer("There are 1.3e5 CD3+ events.");
  const [s] = scoreItems([item({ key: "n", value: 133670, exact: true })], record);
  expect(s.reported.pass).toBe(false);
});

test("thousands separators in the answer match", () => {
  node({ n: 133670 });
  answer("There are 133,670 CD3+ events.");
  expect(scoreItems([item({ key: "n", value: 133670, exact: true })], record)[0].reported.pass).toBe(true);
});

test("items that the answer need not hold have no reported score", () => {
  node({ n: 9 });
  answer("Done.");
  const [s] = scoreItems([item({ key: "df", value: 9, exact: true, in_answer: false })], record);
  expect(s.computed.pass).toBe(true);
  expect(s.reported.pass).toBeNull();
});

test("no final answer means no reported pass", () => {
  node({ mean: 1.58 });
  const [s] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.005 })], record);
  expect(s.reported.pass).toBe(false);
});

test("process metrics count requests, tokens, tool calls, nudges and findings", () => {
  record.append("usage", { inputTokens: 100, outputTokens: 10, cacheRead: 5 });
  record.append("usage", { inputTokens: 50, outputTokens: 20 });
  record.append("tool_call", { tool: "t" });
  record.append("tool_result", { tool: "t", ok: false });
  const msg = (role: string, text: string) => record.append("message", { message: { role, parts: [{ type: "text", text }] } });
  msg("user", "[Notes from the harness]\n- brief\n\nDo the task");
  msg("assistant", "ok");
  msg("user", "[Notes from the harness]\n- You said what you will do next");
  msg("user", "[Notes from the harness]\n- Your plan still has steps that are not done: a");
  record.append("finding", { severity: "warning", message: "w" });
  record.append("finding", { severity: "info", message: "i" });
  record.append("deviation", { deviations: [{ overwritten: true }, {}] });
  const m = processMetrics(record);
  expect(m).toMatchObject({ requests: 2, inputTokens: 150, outputTokens: 30, cacheRead: 5, toolCalls: 1, failedToolCalls: 1, nudges: 1, planReminders: 1, deviations: 2, overwritten: 1 });
  expect(m.findings).toEqual({ info: 1, warning: 1, error: 0 });
});

test("rounding needs at least two significant digits", () => {
  node({ mean: 1.58 });
  answer("The mean difference is 2 hours.");
  const [a] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.005 })], record);
  expect(a.reported.pass).toBe(false);
  answer("The mean difference is 1.6 hours.");
  const [b] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.005 })], record);
  expect(b.reported).toMatchObject({ pass: true, via: "rounding" });
});
