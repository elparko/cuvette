import { describe, expect, test } from "vitest";
import { annotate, checkAnswer } from "../src/core/claims.ts";
import type { Entry, EntryKind } from "../src/core/types.ts";

function fake(numbers: { node: string; path: string; value: number }[], user: string[] = [], setup: Record<string, unknown> = {}) {
  const entries: Entry[] = [
    ...user.map((t, i) => ({ id: i + 1, ts: "", session: "s", kind: "user" as EntryKind, data: { text: t } })),
    { id: 50, ts: "", session: "s", kind: "setup", data: { values: setup } },
  ];
  const appended: { kind: string; data: Record<string, unknown> }[] = [];
  const record = {
    numbers: () => numbers,
    entries: (kinds?: EntryKind[]) => entries.filter((e) => !kinds || kinds.includes(e.kind)),
    append: (kind: string, data: Record<string, unknown>) => {
      appended.push({ kind, data });
      return { id: 99, ts: "", session: "s", kind, data } as Entry;
    },
  };
  return { record: record as any, appended };
}

const nums = [
  { node: "n1", path: "metrics.auc", value: 0.8123 },
  { node: "n2", path: "result.p", value: 0.0031 },
  { node: "n2", path: "result.frac", value: 0.42 },
];

describe("checkAnswer", () => {
  test("matches rounded numbers and percentages", () => {
    const { record, appended } = fake(nums);
    const c = checkAnswer("The AUC was 0.81. The p = 0.003. About 42% of cells were positive.", record);
    expect(c.map((x) => [x.value, x.label, x.node])).toEqual([
      [0.81, "measured", "n1"],
      [0.003, "measured", "n2"],
      [42, "measured", "n2"],
    ]);
    expect(appended[0].kind).toBe("claim_check");
  });

  test("flags unsourced numbers", () => {
    const { record } = fake(nums);
    const c = checkAnswer("Fold change was 3.7 in group B.", record);
    expect(c).toHaveLength(1);
    expect(c[0].label).toBe("unsourced");
  });

  test("ignores list markers, steps, thresholds and small counts", () => {
    const { record } = fake(nums);
    const c = checkAnswer("1. In step 3 we used p < 0.05 on 4 groups.", record);
    expect(c).toHaveLength(0);
  });

  test("ignores N:N notation such as lipid names and ratios", () => {
    const { record } = fake(nums);
    const claims = checkAnswer("The ion is PI 38:4 and sulfatide 42:1;O2, mixed 1:10 with AUC 0.81.", record);
    expect(claims.map((c) => c.value)).toEqual([0.81]);
  });

  test("prefers a current, later step over an out-of-date or comparison step", () => {
    const { record } = fake([
      { node: "n1", path: "count", value: 47 },
      { node: "n2", path: "count", value: 47 },
      { node: "n3", path: "count", value: 47 },
      { node: "n4", path: "count", value: 47 },
    ]);
    record.nodes = () => [{ id: "n1" }, { id: "n2" }, { id: "n3", sensitivityOf: "method" }, { id: "n4" }];
    record.stale = () => new Set(["n4"]);
    expect(checkAnswer("There are 47 cells.", record)[0]!.node).toBe("n2");
  });

  test("ignores coordinate system names", () => {
    const { record } = fake(nums);
    const claims = checkAnswer("The raster is in WGS 84 (EPSG:4326), from UTM zone 11N, with AUC 0.81.", record);
    expect(claims.map((c) => c.value)).toEqual([0.81]);
  });

  test("ignores file names and PDB codes", () => {
    const { record } = fake(nums);
    const claims = checkAnswer("I compared 4AKE.pdb with 1AKE and read data_set_100.fcs and run2.csv; AUC 0.81.", record);
    expect(claims.map((c) => c.value)).toEqual([0.81]);
  });

  test("ignores version numbers", () => {
    const { record } = fake(nums);
    const claims = checkAnswer("I used vegan 2.7.6 and lmerTest v3.2.1 for AUC 0.81.", record);
    expect(claims.map((c) => c.value)).toEqual([0.81]);
  });

  test("skips numbers from the user and setup", () => {
    const { record } = fake(nums, ["use a 25 um window"], { tol: 7.5 });
    const c = checkAnswer("The window of 25 um and tolerance 7.5 were kept.", record);
    expect(c).toHaveLength(0);
  });

  test("labels citations and hedges", () => {
    const { record } = fake(nums);
    const c = checkAnswer(
      "This ratio of 2.5 was reported before (Smith et al. 2020). The 17 hits may reflect noise. It suggests a batch effect.",
      record,
    );
    expect(c.map((x) => [x.value, x.label])).toEqual([
      [2.5, "literature"],
      [17, "inferred"],
      [null, "inferred"],
    ]);
  });

  test("scientific notation", () => {
    const { record } = fake([{ node: "n9", path: "p", value: 0.00002 }]);
    const c = checkAnswer("The q-value was 2e-5.", record);
    expect(c[0]).toMatchObject({ label: "measured", node: "n9" });
  });
});

describe("annotate", () => {
  test("marks only unsourced numbers", () => {
    const { record } = fake(nums);
    const text = "AUC 0.81 and fold change 3.7.";
    const out = annotate(text, checkAnswer(text, record));
    expect(out).toContain("3.7 [no source]");
    expect(out).not.toContain("0.81 [no source]");
    expect(out).toContain("do not match any logged tool result");
  });

  test("returns text unchanged without unsourced claims", () => {
    expect(annotate("Fine.", [])).toBe("Fine.");
  });
});
