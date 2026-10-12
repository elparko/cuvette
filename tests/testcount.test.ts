import { describe, expect, test } from "vitest";
import { benjaminiHochberg, collectTests, holm, latestValue, testRows, testsMarkdown, testsText } from "../src/core/testcount.ts";

function recordWith(nodes: any[], entries: any[] = []) {
  return {
    entries: (kinds?: string[]) => entries.filter((e) => !kinds || kinds.includes(e.kind)),
    nodes: () => nodes,
    node: (id: string) => nodes.find((n) => n.id === id),
    replacedBy: (id: string) => (id === "old" ? "n9" : undefined),
  } as any;
}

const node = (id: string, p: number, file = "/d/sleep.csv", extra: any = {}) => ({
  id,
  tool: "compare_two_groups",
  args: { path: file },
  inputFiles: [{ path: file }],
  result: { metrics: { p_value: p, levene_p: 0.5 }, data: { test: "paired t-test" } },
  ...extra,
});

describe("corrections", () => {
  test("Holm for p = 0.01, 0.04, 0.03", () => {
    const h = holm([0.01, 0.04, 0.03]);
    expect(h[0]).toBeCloseTo(0.03, 12);
    expect(h[1]).toBeCloseTo(0.06, 12);
    expect(h[2]).toBeCloseTo(0.06, 12);
  });

  test("Benjamini-Hochberg for p = 0.01, 0.04, 0.03", () => {
    const b = benjaminiHochberg([0.01, 0.04, 0.03]);
    expect(b[0]).toBeCloseTo(0.03, 12);
    expect(b[1]).toBeCloseTo(0.04, 12);
    expect(b[2]).toBeCloseTo(0.04, 12);
  });

  test("Holm and Benjamini-Hochberg cap at 1 and match a single test", () => {
    expect(holm([0.6, 0.7])).toEqual([1, 1]);
    expect(holm([0.02])).toEqual([0.02]);
    expect(benjaminiHochberg([0.02])).toEqual([0.02]);
  });

  test("Holm on five p values keeps the order", () => {
    const h = holm([0.005, 0.011, 0.02, 0.04, 0.13]);
    expect(h.map((x) => Number(x.toFixed(4)))).toEqual([0.025, 0.044, 0.06, 0.08, 0.13]);
  });
});

describe("collecting tests", () => {
  test("three tests on one data file are one family", () => {
    const rows = testRows(recordWith([node("n1", 0.01), node("n2", 0.04), node("n3", 0.03)]));
    expect(rows.map((r) => r.family)).toEqual(["sleep.csv", "sleep.csv", "sleep.csv"]);
    expect(rows.map((r) => Number(r.holm.toFixed(4)))).toEqual([0.03, 0.06, 0.06]);
    expect(rows.every((r) => r.size === 3)).toBe(true);
  });

  test("a different data file is a different family", () => {
    const rows = testRows(recordWith([node("n1", 0.01), node("n2", 0.04, "/d/other.csv")]));
    expect(rows.map((r) => [r.family, r.size])).toEqual([["sleep.csv", 1], ["other.csv", 1]]);
    expect(rows[0].holm).toBe(0.01);
  });

  test("a data set id joins the family", () => {
    const a = { ...node("n1", 0.01), inputFiles: undefined, args: { dataset: "ds1" } };
    const b = { ...node("n2", 0.02), inputFiles: undefined, args: { dataset: "ds1" } };
    expect(testRows(recordWith([a, b])).map((r) => r.size)).toEqual([2, 2]);
  });

  test("comparison runs, replaced nodes and correction tools are skipped", () => {
    const nodes = [node("n1", 0.01), node("n2", 0.02, undefined, { sensitivityOf: "x" }), node("old", 0.03), { ...node("n4", 0.5), tool: "adjust_pvalues" }];
    expect(collectTests(recordWith(nodes)).map((t) => t.node)).toEqual(["n1"]);
  });

  test("the step number counts the steps without comparison runs", () => {
    const nodes = [node("n1", 0.01), node("n2", 0.02, undefined, { sensitivityOf: "x" }), node("n3", 0.03)];
    expect(collectTests(recordWith(nodes)).map((t) => t.step)).toEqual([1, 2]);
  });

  test("the decision test_family changes the grouping", () => {
    const nodes = [node("n1", 0.01), node("n2", 0.04, "/d/other.csv")];
    const one = [{ id: 1, kind: "decision", data: { key: "test_family", new: "one_family" } }];
    expect(testRows(recordWith(nodes, one)).map((r) => [r.family, r.size])).toEqual([["all tests", 2], ["all tests", 2]]);
    const sep = [{ id: 1, kind: "decision", data: { key: "test_family", new: "separate" } }];
    expect(testRows(recordWith([node("n1", 0.01), node("n2", 0.04)], sep)).map((r) => r.size)).toEqual([1, 1]);
  });

  test("a node without a p value is not a test", () => {
    const n = { id: "n1", tool: "inspect_table", args: {}, result: { metrics: { n_rows: 5 } } };
    expect(collectTests(recordWith([n]))).toEqual([]);
  });

  test("latestValue reads setup and decision entries", () => {
    const e = [
      { id: 1, kind: "setup", data: { values: { test_correction: "holm" } } },
      { id: 2, kind: "decision", data: { key: "test_correction", new: "benjamini_hochberg" } },
    ];
    expect(latestValue(recordWith([], e), "test_correction")).toBe("benjamini_hochberg");
    expect(latestValue(recordWith([], [...e, { id: 3, kind: "decision", data: { key: "test_correction", unset: true } }]), "test_correction")).toBeUndefined();
  });
});

describe("tables", () => {
  const record = recordWith([node("n1", 0.01), node("n2", 0.04), node("n3", 0.03)]);

  test("text table", () => {
    const text = testsText(record);
    expect(text).toMatch(/Step\s+Test\s+Raw p\s+Holm p/);
    expect(text).toMatch(/3\s+paired t-test\s+0\.03\s+0\.06\s+0\.04\s+sleep\.csv\s+3/);
    expect(text).toMatch(/No correction is chosen/);
  });

  test("markdown table", () => {
    const md = testsMarkdown(record);
    expect(md[0]).toBe("## Tests in this session");
    expect(md).toHaveLength(8);
  });

  test("no tests", () => {
    expect(testsMarkdown(recordWith([]))).toEqual([]);
    expect(testsText(recordWith([]))).toMatch(/No test/);
  });
});
