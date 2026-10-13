import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { annotate, checkAnswer } from "../src/core/claims.ts";
import { AnalysisRecord } from "../src/core/record.ts";
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
    live: (kinds?: EntryKind[]) => entries.filter((e) => !kinds || kinds.includes(e.kind)),
    rewound: () => new Set(),
    setAside: () => false,
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

  test("counts small whole numbers in table rows and in prose only when a logged result holds them", () => {
    const { record } = fake([{ node: "n5", path: "segments", value: 3 }, ...nums]);
    const text = "| s | segments |\n|---|---|\n| 64 | 3 |\n\nWe ran 3 steps on 4 images.";
    expect(checkAnswer(text, record).map((c) => c.value)).toEqual([64, 3, 3]);
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

  test("reads scientific notation in every common form and matches the logged value", () => {
    const { record } = fake([{ node: "n5", path: "table.rows[4][3]", value: 1.54353e-8 }]);
    const forms = ["1.54 × 10⁻⁸", "1.54 x 10^-8", "1.54×10-8", "1.54e-8", "1.54E-08", "1.54 × 10^−8", "1.54·10⁻⁸", "1.54 × 10^{-8}", "1.54 x 10^(-8)", "1.54*10^-8"];
    for (const form of forms) {
      const c = checkAnswer(`The p-value for the interaction was ${form} in the mixed model.`, record);
      expect(c.map((x) => [x.value, x.label, x.node]), form).toEqual([[1.54e-8, "measured", "n5"]]);
    }
  });

  test("superscript exponents keep their sign and a positive exponent works", () => {
    const { record } = fake([
      { node: "n1", path: "metrics.cells", value: 123456 },
      { node: "n1", path: "metrics.q", value: 0.00042 },
    ]);
    const c = checkAnswer("We counted 1.23 × 10⁵ cells. The q-value was 4.2 × 10⁻⁴.", record);
    expect(c.map((x) => [x.value, x.label, x.node])).toEqual([
      [123000, "measured", "n1"],
      [0.00042, "measured", "n1"],
    ]);
  });

  test("a times sign before a plain number is not an exponent", () => {
    const { record } = fake([
      { node: "n1", path: "metrics.a", value: 3.5 },
      { node: "n1", path: "metrics.b", value: 100 },
    ]);
    const c = checkAnswer("The dilution was 3.5 x 100 in the final mix.", record);
    expect(c.map((x) => [x.value, x.label])).toEqual([
      [3.5, "measured"],
      [100, "measured"],
    ]);
  });

  test("keeps the minus sign after markdown emphasis and code marks", () => {
    const { record } = fake([{ node: "n1", path: "metrics.log_likelihood", value: -21152.5377 }]);
    for (const text of ["The log-likelihood is **-21152.5377**.", "The log-likelihood is *-21152.5377*.", "The log-likelihood is _−21152.5377_.", "The log-likelihood is `-21152.5377`.", "| lnL |-21152.5377 |"]) {
      const c = checkAnswer(text, record);
      expect(c.map((x) => [x.value, x.label, x.node])).toEqual([[-21152.5377, "measured", "n1"]]);
    }
  });

  test("a hyphen between a word or a number and a digit is not a sign", () => {
    const { record } = fake([
      { node: "n1", path: "metrics.a", value: 20 },
      { node: "n1", path: "metrics.b", value: 30 },
    ]);
    const c = checkAnswer("The window was 20-30 bases wide. The substitution model was HKY-85.", record);
    expect(c.every((x) => (x.value ?? 0) >= 0)).toBe(true);
    expect(c.filter((x) => x.label === "measured").map((x) => x.value)).toEqual([20, 30]);
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

  test("a small count in prose counts when a logged result has it", () => {
    const { record } = fake([{ node: "n1", path: "metrics.n_clusters", value: 7 }]);
    const c = checkAnswer("The data fall into 7 clusters.", record);
    expect(c.map((x) => [x.value, x.label, x.node])).toEqual([[7, "measured", "n1"]]);
  });

  test("a small count in prose that matches only a comparison run is not a claim", () => {
    const { record } = fake([{ node: "n2", path: "metrics.n_clusters", value: 5 }]);
    record.nodes = () => [{ id: "n2", sensitivityOf: "resolution" }];
    expect(checkAnswer("The data fall into 5 clusters.", record)).toHaveLength(0);
  });

  test("the harness and the paper score count the same small numbers", () => {
    const { record } = fake([{ node: "n1", path: "metrics.n_clusters", value: 7 }]);
    const text = "The data fall into 7 clusters across 3 samples.\n\n| item | n |\n|---|---|\n| clusters | 7 |";
    const c = checkAnswer(text, record);
    expect(c.map((x) => [x.value, x.label])).toEqual([
      [7, "measured"],
      [7, "measured"],
    ]);
    expect(annotate(text, c)).toBe(text);
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

  function scriptRun(code: string, files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), "cuvette-claims-"));
    const r = new AnalysisRecord(dir, "s1");
    r.append("tool_call", { tool: "run_script", args: { code } });
    const e = r.append("tool_result", { tool: "run_script", ok: true, text: "done" });
    const outputs = Object.entries(files).map(([name, text]) => {
      const path = join(dir, name);
      writeFileSync(path, text);
      return { path, kind: "file" as const, sha: r.putBlob(path) };
    });
    r.addNode({ entry: e.id, adapter: "", adapterVersion: "", programVersion: "", tool: "run_script", args: { code }, decisions: {}, codeHash: "", inputHashes: [], outputs, result: { ok: true, metrics: {} }, parents: [], summary: "", model: "m", manualRoute: "", fidelity: "none" });
    return r;
  }

  test("a number that a script wrote to its output file is sourced with no read_file", () => {
    const r = scriptRun("import csv\npower = 0.8\nopen('power.csv','w').write(f'power,min_effect\\n{power},1.62\\n')", { "power.csv": "power,min_effect\n0.8,1.62\n" });
    expect(checkAnswer("At 80% power, the test can find an effect of 1.62 hours.", r).map((c) => c.label)).toEqual(["measured", "measured"]);
  });

  test("a number only in the script source, or in a code file that the script wrote, is not sourced", () => {
    const r = scriptRun("power = 0.9\nprint('done')", { "copy.py": "power = 0.9\n", "out.csv": "min_effect\n1.62\n" });
    expect(checkAnswer("At 90% power, the test can find an effect of 1.62 hours.", r).map((c) => c.label)).toEqual(["unsourced", "measured"]);
  });

  test("a wrong number that no step wrote is still flagged", () => {
    const r = scriptRun("x = 1", { "power.csv": "power,min_effect\n0.8,1.62\n" });
    expect(checkAnswer("At 90% power, the test can find an effect of 2.4 hours.", r).map((c) => c.label)).toEqual(["unsourced", "unsourced"]);
  });

  test("a very small number must match its logged value, not any small value", () => {
    const { record } = fake([{ node: "n1", path: "p", value: 1e-20 }]);
    expect(checkAnswer("The p value was 3e-14.", record).map((c) => c.label)).toEqual(["unsourced"]);
    const ok = fake([{ node: "n1", path: "p", value: 3.04e-14 }]);
    expect(checkAnswer("The p value was 3e-14.", ok.record).map((c) => c.label)).toEqual(["measured"]);
  });

  test("a number too large for a double gives no claim", () => {
    const { record } = fake([{ node: "n1", path: "x", value: 1 }]);
    expect(checkAnswer("The value was 1e400.", record).filter((c) => c.value !== null)).toEqual([]);
  });

  const labels = (text: string, n: { node: string; path: string; value: number }[]) => checkAnswer(text, fake(n).record).map((c) => c.label);

  test("a unit in the answer converts to the unit in the name of the logged key", () => {
    expect(labels("The decay time constant was 21 ms.", [{ node: "n1", path: "metrics.decay_tau_s", value: 0.0213 }])).toEqual(["measured"]);
    expect(labels("The pellet weighed 250 mg.", [{ node: "n1", path: "metrics.mass_g", value: 0.25 }])).toEqual(["measured"]);
    expect(labels("The run took 2.5 hours.", [{ node: "n1", path: "metrics.duration_min", value: 150 }])).toEqual(["measured"]);
    expect(labels("The pixel size is 650 nm.", [{ node: "n1", path: "metrics.pixel_size_um", value: 0.65 }])).toEqual(["measured"]);
  });

  test("a unit converts only to a key with a unit of the same kind, and a key with no unit does not convert", () => {
    expect(labels("The pellet weighed 250 mg.", [{ node: "n1", path: "metrics.mass", value: 0.25 }])).toEqual(["unsourced"]);
    expect(labels("The pellet weighed 250 mg.", [{ node: "n1", path: "metrics.time_s", value: 0.25 }])).toEqual(["unsourced"]);
    expect(labels("The value was 250.", [{ node: "n1", path: "metrics.mass_g", value: 0.25 }])).toEqual(["unsourced"]);
  });

  test("a fraction matches a percent key, and a percent matches a fraction", () => {
    expect(labels("The CD4 fraction was 0.42 of live cells.", [{ node: "n1", path: "metrics.cd4_pct", value: 42.1 }])).toEqual(["measured"]);
    expect(labels("The CD4 fraction was 0.42 of live cells.", [{ node: "n1", path: "metrics.cd4", value: 42.1 }])).toEqual(["unsourced"]);
    expect(labels("About 42% were positive.", [{ node: "n1", path: "metrics.frac", value: 0.421 }])).toEqual(["measured"]);
  });

  test("a decrease word lets a number with no sign match the negative logged value", () => {
    expect(labels("Drug B lowered sleep by 1.58 hours.", [{ node: "n1", path: "metrics.mean_diff", value: -1.58 }])).toEqual(["measured"]);
    expect(labels("IL6 was downregulated with a log2 fold change of 2.07.", [{ node: "n1", path: "table.rows[0][2]", value: -2.07 }])).toEqual(["measured"]);
  });

  test("with no decrease word, or with a written sign, the sign must match", () => {
    expect(labels("Drug B raised sleep by 1.58 hours.", [{ node: "n1", path: "metrics.mean_diff", value: -1.58 }])).toEqual(["unsourced"]);
    expect(labels("Drug B lowered sleep: the difference was +1.58 hours.", [{ node: "n1", path: "metrics.mean_diff", value: -1.58 }])).toEqual(["unsourced"]);
  });

  test("N-fold matches log2(N) in a log key, and with a decrease word -log2(N), and 1/N in a ratio key", () => {
    expect(labels("IL6 rose 4.2-fold.", [{ node: "n1", path: "metrics.log2_fold_change", value: 2.07 }])).toEqual(["measured"]);
    expect(labels("IL6 fell 4.2-fold.", [{ node: "n1", path: "data.genes[0].log2FoldChange", value: -2.07 }])).toEqual(["measured"]);
    expect(labels("IL6 fell 4.2-fold.", [{ node: "n1", path: "metrics.ratio", value: 0.238 }])).toEqual(["measured"]);
    expect(labels("IL6 rose 4.2-fold.", [{ node: "n1", path: "metrics.log2_fold_change", value: -2.07 }])).toEqual(["unsourced"]);
    expect(labels("IL6 rose 4.2-fold.", [{ node: "n1", path: "metrics.log2_fold_change", value: 2.5 }])).toEqual(["unsourced"]);
  });

  test("a fold claim does not match log2 or 1/N in a key that is not a log or a ratio key", () => {
    expect(labels("IL6 rose 2.0-fold.", [{ node: "n1", path: "metrics.n_groups", value: 1 }])).toEqual(["unsourced"]);
    expect(labels("IL6 fell 4.0-fold.", [{ node: "n1", path: "metrics.alpha_level", value: 0.25 }])).toEqual(["unsourced"]);
  });

  test("the decrease word must be near the number, and a key in _l or _h does not convert", () => {
    expect(labels("Sleep was lower with drug B. In the full cohort of 120 subjects, the trial ran for many weeks and 35.5 percent dropped out.", [{ node: "n1", path: "metrics.n", value: -120 }])).toEqual(["unsourced", "unsourced"]);
    expect(labels("The interval ended at 250 mg.", [{ node: "n1", path: "metrics.ci_l", value: 0.25 }])).toEqual(["unsourced"]);
  });

  test("a unit converts for a value in a list", () => {
    expect(labels("The second pellet weighed 250 mg.", [{ node: "n1", path: "metrics.mass_g[1]", value: 0.25 }])).toEqual(["measured"]);
  });

  test("80% power and other design constants next to their cue word are not claims", () => {
    expect(labels("At 80% power, the test can find d = 1.81.", [{ node: "n1", path: "min_d", value: 1.81 }])).toEqual(["measured"]);
    expect(labels("With a power of 0.8, the test can find d = 1.81.", [{ node: "n1", path: "min_d", value: 1.81 }])).toEqual(["measured"]);
    expect(labels("The confidence level of 95% is the default, and the 5% significance level is the threshold.", [])).toEqual([]);
  });

  test("the same digits with no cue word, another power or power 80 with no percent sign are still flagged", () => {
    expect(labels("About 80% of the samples are above the cut.", [])).toEqual(["unsourced"]);
    expect(labels("The treated mean is 80.", [])).toEqual(["unsourced"]);
    expect(labels("The study has 90% power.", [])).toEqual(["unsourced"]);
    expect(labels("The achieved power was 0.83.", [])).toEqual(["unsourced"]);
    expect(labels("Power 80 is enough.", [])).toEqual(["unsourced"]);
    expect(labels("At 90% power, the mean difference is 0.9.", [{ node: "n1", path: "metrics.estimate", value: 0.9 }])).toEqual(["unsourced", "measured"]);
    expect(labels("The test has a power of 0.83.", [{ node: "n1", path: "stdout", value: 0.83 }])).toEqual(["measured"]);
    expect(labels("The 95% CI is 0.95 to 1.20, and the significance of 0.01 holds.", [])).toEqual(["unsourced", "unsourced", "unsourced"]);
    expect(labels("Effect size d = 1.81\nPower: 80%", [{ node: "n1", path: "metrics.min_d", value: 1.81 }])).toEqual(["measured"]);
    expect(labels("Difference: 0.9\nConfidence level: 95%", [])).toEqual(["unsourced"]);
  });

  test("a row count or a group size from the data check is sourced only next to a count word", () => {
    const { record, entries } = fake([]);
    entries.push({ id: 60, ts: "", session: "s", kind: "data_check", data: { size: "12 rows, 3 columns", groups: { column: "group", sizes: [["control", 16], ["treated", 16]] } } });
    expect(checkAnswer("The file has 12 rows and 32 samples, 16 per group (n = 32).", record)).toHaveLength(0);
    expect(checkAnswer("The mean difference is 12. The file has 14 rows.", record).map((c) => [c.value, c.label])).toEqual([[12, "unsourced"], [14, "unsourced"]]);
  });

  test("a count from the inspect result is sourced", () => {
    const { record, entries } = fake([]);
    entries.push({ id: 60, ts: "", session: "s", kind: "inspection", data: { summary: "data.csv: 24 rows, 3 columns: sample_id (text), group (text), value (number)." } });
    expect(checkAnswer("All 24 samples are in the test.", record)).toHaveLength(0);
    expect(checkAnswer("There are 24 outliers.", record).map((c) => c.label)).toEqual(["unsourced"]);
  });

  test("values of the confirmed plan and decisions of the scientist are inputs, a choice of the agent is not", () => {
    const { record, entries } = fake([]);
    entries.push({ id: 60, ts: "", session: "s", kind: "decision", data: { key: "trim", new: 12.5, by: "human" } });
    entries.push({ id: 61, ts: "", session: "s", kind: "decision", data: { key: "bins", new: 40, by: "agent" } });
    entries.push({ id: 62, ts: "", session: "s", kind: "plan_approved", data: { plan: { steps: [{ step: "test", status: "planned", decisions: [{ label: "minimum", value: 150 }] }], data: { n: "18 mice" }, definitions: [{ measure: "responder", definition: "a drop of 30 percent or more" }] } } });
    expect(checkAnswer("The trim was 12.5, the minimum was 150 and 18 mice had 30% drops.", record)).toHaveLength(0);
    expect(checkAnswer("The data had 40 bins.", record).map((c) => c.label)).toEqual(["unsourced"]);
  });
});

describe("answer check on the two-group whole task", () => {
  const logged = [
    { node: "n2", path: "metrics.mean_control", value: 4.2 },
    { node: "n2", path: "metrics.mean_treated", value: 5.1 },
    { node: "n2", path: "metrics.estimate", value: 0.9 },
    { node: "n2", path: "metrics.t", value: 4.89 },
    { node: "n2", path: "metrics.df", value: 9.8 },
    { node: "n2", path: "metrics.p", value: 0.00063 },
    { node: "n2", path: "metrics.ci_low", value: 0.49 },
    { node: "n2", path: "metrics.ci_high", value: 1.31 },
    { node: "n2", path: "metrics.cohen_d", value: 2.82 },
    { node: "n2", path: "metrics.n1", value: 6 },
    { node: "n2", path: "metrics.n2", value: 6 },
    { node: "n3", path: "metrics.min_effect_d", value: 1.81 },
  ];
  const cases: [string, number[]][] = [
    ["At 80% power, the test can detect an effect of d = 1.81 or larger.", []],
    ["With a power of 0.8, the smallest effect it can detect is d = 1.81.", []],
    ["The study has 80% power to detect d = 1.81.", []],
    ["The data have 12 rows and 3 columns.", []],
    ["Each group has 6 samples (12 samples in total).", []],
    ["n = 12 in total, 6 per group.", []],
    ["The Welch t-test gives t = 4.89 and p = 0.00063.", []],
    ["The mean difference is 0.9 (95% CI 0.49 to 1.31).", []],
    ["At the 95% confidence level, the interval is 0.49 to 1.31.", []],
    ["The two-sided test at alpha = 0.05 is significant (p = 0.00063).", []],
    ["The 5% significance level is the threshold, and p = 0.00063.", []],
    ["Cohen d is 2.82, a large effect.", []],
    ["The control mean is 4.2 and the treated mean is 5.1.", []],
    ["| group | n | mean |\n|---|---|---|\n| control | 6 | 4.2 |\n| treated | 6 | 5.1 |", []],
    ["All 12 samples are in the test, and no rows are left out.", []],
    ["The confidence level of 95% is the default of the tool.", []],
    ["At 90% power, the test can detect d = 1.81.", [90]],
    ["The study has 85% power.", [85]],
    ["Power 80 is enough for d = 1.81.", [80]],
    ["About 80% of the samples are above 4.5.", [80, 4.5]],
    ["The treated mean is 80.", [80]],
    ["The data have 14 rows (n = 13).", [14, 13]],
    ["The mean difference is 12.", [12]],
    ["There are 12 outliers in the treated group.", [12]],
    ["The achieved power was 0.83.", [0.83]],
    ["The 99% CI is 0.31 to 1.49.", [0.31, 1.49]],
    ["The test gives t = 4.98 and p = 0.00063.", [4.98]],
    ["At 80% power, the test can detect d = 1.95.", [1.95]],
    ["The mean difference is 1.2 (95% CI 0.49 to 1.31).", [1.2]],
    ["Each group has 16 samples.", [16]],
  ];
  test.each(cases)("%s", (text, wrong) => {
    const { record, entries } = fake(logged, ["Compare the two groups and tell me if they differ."]);
    entries.push({ id: 60, ts: "", session: "s", kind: "data_check", data: { size: "12 rows, 3 columns", groups: { column: "group", sizes: [["control", 6], ["treated", 6]] } } });
    expect(checkAnswer(text, record).filter((c) => c.label === "unsourced").map((c) => c.value)).toEqual(wrong);
  });
});
