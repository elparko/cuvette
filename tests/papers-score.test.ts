import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { checkAnswer } from "../src/core/claims.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import type { NodeIn } from "../src/core/types.ts";
import { checkComputed, finalClaims, processMetrics, scoreItems } from "../src/bench/papers-score.ts";
import type { PaperItem } from "../src/bench/papers-spec.ts";

let record: AnalysisRecord;
beforeEach(() => {
  record = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-score-")), "s1");
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

test("the computed value and diff of each item belong to that item, also when items share a tool and a node", () => {
  node({ metrics: { min_p: 0.01246 }, table: { rows: [[16, 16], [40.22686, 55.6]] } }, { tool: "cmp" });
  const items = [
    item({ key: "n_ctrl", value: 16, exact: true, tool: "cmp" }),
    item({ key: "p", value: 0.018, tolerance: 0.015, tool: "cmp" }),
    item({ key: "amp", value: 38.3, tolerance: 6, tool: "cmp" }),
  ];
  const scores = scoreItems(items, record);
  expect(scores.map((s) => [s.computed.value, s.computed.pass])).toEqual([[16, true], [0.01246, true], [40.22686, true]]);
  expect(scores.map((s) => s.computed.diff!.toFixed(5))).toEqual(["0.00000", "0.00554", "1.92686"]);
});

test("a computed match cannot change after scoring", () => {
  node({ mean: 1.6 });
  const [s] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.5 })], record);
  expect(() => {
    s.computed.value = 99;
  }).toThrow();
});

test("checkComputed fails when value and diff do not agree, or when pass does not follow the diff", () => {
  node({ mean: 1.6, other: 40.2 });
  const [s] = scoreItems([item({ key: "mean", value: 1.58, tolerance: 0.5 })], record);
  expect(checkComputed([s])).toEqual([s]);
  expect(() => checkComputed([{ ...s, computed: { ...s.computed, value: 40.2 } }])).toThrow(/mean: value 40.2 is/);
  expect(() => checkComputed([{ ...s, computed: { ...s.computed, pass: false } }])).toThrow(/mean: pass is false/);
  expect(() => checkComputed([{ ...s, computed: { ...s.computed, value: null } }])).toThrow(/mean: no value/);
});

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

test("a value from a comparison run passes computed, labelled via comparison; a main step wins", () => {
  const main = node({ count: 40 });
  node({ count: 66 }, { sensitivityOf: main.id });
  const [s] = scoreItems([item({ key: "count", value: 66, exact: true })], record);
  expect(s.computed).toMatchObject({ pass: true, via: "comparison" });
  const [m] = scoreItems([item({ key: "count", value: 40, exact: true })], record);
  expect(m.computed).toMatchObject({ pass: true, via: "main" });
});

test("trap items are left out of the score", () => {
  node({ p: 0.0794 });
  const scored = scoreItems([item({ key: "p", value: 0.0794, tolerance: 0.001, trap: true }), item({ key: "q", value: 1, exact: true })], record);
  expect(scored.map((x) => x.key)).toEqual(["q"]);
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

test("a small whole number does not count for an item that is not a whole number", () => {
  node({ rmse: 1.1, allowed: 1 });
  answer("One violation is allowed, 1 in all. The RMSE is 1.1.");
  const [low] = scoreItems([item({ key: "rmse", value: 1.04, tolerance: 0.1 })], record);
  expect(low.reported).toMatchObject({ pass: true, value: 1.1 });
  node({ allowed: 1 });
  answer("Only 1 violation is allowed.");
  const [s] = scoreItems([item({ key: "rmse", value: 1.1, tolerance: 0.1 })], record);
  expect(s.reported.pass).toBe(false);
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

test("a code that the answer states passes when the claim check masks it", () => {
  node({ epsg: 26711 });
  answer("The projection is EPSG:26711 (NAD27).");
  const it = item({ key: "epsg", value: 26711, exact: true, code: "EPSG:26711" });
  expect(scoreItems([it], record)[0].reported.pass).toBe(true);
  answer("The projection is EPSG:4326.");
  expect(scoreItems([it], record)[0].reported.pass).toBe(false);
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

test("modelAnswer drops the harness-written tails", async () => {
  const { modelAnswer } = await import("../src/bench/papers-score.ts");
  expect(modelAnswer("There are 47 cells.\n\nStep results that the answer does not mention, from the record:\n- n1\n\nSettings used, from the decision record: x.")).toBe("There are 47 cells.");
  expect(modelAnswer("Plain answer.")).toBe("Plain answer.");
});

test("finalClaims reads the check of the final answer in the new record shape and in the old one", () => {
  const rec = (entries: unknown[]) => ({ entries: (kinds?: string[]) => (entries as { kind: string }[]).filter((e) => !kinds || kinds.includes(e.kind)) }) as never;
  const claim = (value: number) => [{ text: "x", value, label: "measured" }];
  const next = rec([
    { id: 1, kind: "assistant", data: { final: true } },
    { id: 2, kind: "claim_check", data: { answerEntry: 1, claims: claim(1) } },
    { id: 3, kind: "assistant", data: { final: true } },
    { id: 4, kind: "claim_check", data: { answerEntry: 3, claims: claim(3) } },
  ]);
  expect(finalClaims(next)?.claims[0]!.value).toBe(3);
  const old = rec([
    { id: 1, kind: "claim_check", data: { claims: claim(1) } },
    { id: 2, kind: "assistant", data: { final: true } },
  ]);
  expect(finalClaims(old)?.claims[0]!.value).toBe(1);
});
