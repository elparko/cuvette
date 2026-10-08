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
  return { record: record as any, appended, entries };
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

  test("counts small whole numbers in table rows but not in the header row or in prose", () => {
    const { record } = fake([{ node: "n5", path: "segments", value: 3 }, ...nums]);
    const text = "| s | segments |\n|---|---|\n| 64 | 3 |\n\nWe ran 3 steps.";
    expect(checkAnswer(text, record).map((c) => c.value)).toEqual([64, 3]);
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

describe("checkAnswer inputs and small counts", () => {
  test("a small count in a table row counts when a logged result has it", () => {
    const { record } = fake([{ node: "n1", path: "metrics.n_segments", value: 6 }]);
    const c = checkAnswer("| item | n |\n|---|---|\n| segments | 6 |", record);
    expect(c.map((x) => [x.value, x.label, x.node])).toEqual([[6, "measured", "n1"]]);
  });

  test("with the small option a small count in prose counts when a logged result has it", () => {
    const { record } = fake([{ node: "n1", path: "metrics.n_clusters", value: 7 }]);
    const c = checkAnswer("The data fall into 7 clusters.", record, { small: true });
    expect(c.map((x) => [x.value, x.label, x.node])).toEqual([[7, "measured", "n1"]]);
    expect(checkAnswer("The data fall into 7 clusters.", record)).toHaveLength(0);
  });

  test("a small count with no logged match is not flagged", () => {
    const { record } = fake([{ node: "n1", path: "metrics.n", value: 40 }]);
    expect(checkAnswer("The 3 groups differ.", record)).toHaveLength(0);
  });

  test("a small count does not match a comparison run", () => {
    const { record } = fake([{ node: "n1", path: "metrics.n", value: 6 }]);
    record.nodes = () => [{ id: "n1", sensitivityOf: "k" }];
    expect(checkAnswer("| item | n |\n|---|---|\n| segments | 6 |", record)).toHaveLength(0);
  });

  test("a word percent in the request gives the fraction in the answer", () => {
    const { record } = fake([], ["Keep variants with a frequency of at least 5 percent."]);
    expect(checkAnswer("The filter was INFO/AF>=0.05.", record)).toHaveLength(0);
  });

  test("a dataset id with a time stamp is not a number", () => {
    const { record } = fake([{ node: "n1", path: "metrics.n", value: 414 }]);
    const c = checkAnswer("| 2022-08-16_10h14m23s | 414 |", record);
    expect(c.map((x) => [x.value, x.label])).toEqual([[414, "measured"]]);
  });

  test("numbers in tool arguments and the program version are inputs", () => {
    const { record, entries } = fake([]);
    entries.push({ id: 60, ts: "", session: "s", kind: "tool_call", data: { args: { region: "chr20:1000000-1100000", radius: 12.5 } } });
    entries.push({ id: 61, ts: "", session: "s", kind: "session", data: { adapters: [{ version: "0.1.4", programVersion: "4.2.1.1" }] } });
    expect(checkAnswer("The radius was 12.5 pixels. Cellpose 4.2 ran the step.", record)).toHaveLength(0);
  });

  test("numbers typed into a script are not inputs", () => {
    const { record, entries } = fake([]);
    entries.push({ id: 60, ts: "", session: "s", kind: "tool_call", data: { tool: "run_script", args: { code: "x = 2.718" } } });
    expect(checkAnswer("The value is 2.718.", record).map((c) => c.label)).toEqual(["unsourced"]);
  });
});
