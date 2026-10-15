import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { cohenH, minEffectH, minEffectR, minEffectT, normCdf, powerFindings, powerNotes, powerProportions, powerR, powerT, powerText, proportionFromH } from "../src/core/power.ts";
import { commands, type CommandCtx } from "../src/ui/commands.ts";

function recordWith(nodes: any[]) {
  return {
    entries: () => [],
    nodes: () => nodes,
    node: (id: string) => nodes.find((n) => n.id === id),
    replacedBy: () => undefined,
  } as any;
}

function ttest(id: string, test: string, metrics: Record<string, number>) {
  return { id, tool: "compare_two_groups", args: { path: "/d/sleep.csv" }, inputFiles: [{ path: "/d/sleep.csv" }], result: { metrics, data: { test } } };
}

const sleepPaired = ttest("n1", "paired t-test", { n_a: 10, n_b: 10, statistic: 4.0621, mean_diff: 1.58, p_value: 0.00283 });

describe("normal distribution", () => {
  test("matches known values", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 12);
    expect(normCdf(1.96)).toBeCloseTo(0.9750021, 6);
    expect(normCdf(-4)).toBeCloseTo(3.167124e-5, 10);
  });
});

describe("power against R pwr", () => {
  test("paired t test", () => {
    expect(powerT(0.5, { kind: "paired", n1: 10 })).toBeCloseTo(0.29317561, 4);
    expect(powerT(4.0621 / Math.sqrt(10), { kind: "paired", n1: 10 })).toBeCloseTo(0.94960249, 4);
    expect(minEffectT({ kind: "paired", n1: 10 })).toBeCloseTo(0.99600435, 3);
  });

  test("one-sample t test", () => {
    expect(powerT(0.3, { kind: "one", n1: 20 })).toBeCloseTo(0.24708909, 4);
    expect(minEffectT({ kind: "one", n1: 8 })).toBeCloseTo(1.1560353, 3);
    expect(powerT(1, { kind: "one", n1: 3 })).toBeCloseTo(0.17925539, 4);
  });

  test("two-sample t test", () => {
    expect(powerT(1.2, { kind: "two", n1: 10, n2: 10 })).toBeCloseTo(0.71840538, 4);
    expect(minEffectT({ kind: "two", n1: 10, n2: 10 })).toBeCloseTo(1.3249466, 3);
    expect(powerT(0.9, { kind: "two", n1: 8, n2: 12 })).toBeCloseTo(0.46277911, 4);
    expect(minEffectT({ kind: "two", n1: 8, n2: 12 })).toBeCloseTo(1.3522669, 3);
  });

  test("correlation", () => {
    expect(powerR(0.3, 30)).toBeCloseTo(0.37116826, 4);
    expect(powerR(-0.3, 30)).toBeCloseTo(0.37116826, 4);
    expect(minEffectR(30)).toBeCloseTo(0.48664739, 3);
    expect(minEffectR(15)).toBeCloseTo(0.65705878, 3);
  });

  test("two proportions", () => {
    expect(powerProportions(0.5, 30)).toBeCloseTo(0.49068557, 4);
    expect(powerProportions(0.6, 20, 30)).toBeCloseTo(0.54718996, 4);
    expect(minEffectH(30)).toBeCloseTo(0.72336112, 3);
    expect(minEffectH(50)).toBeCloseTo(0.5602983, 3);
  });

  test("proportion helpers", () => {
    expect(cohenH(0.5, 0.5)).toBeCloseTo(0, 12);
    expect(proportionFromH(0.3, cohenH(0.6, 0.3))).toBeCloseTo(0.6, 10);
  });
});

describe("power notes from the record", () => {
  test("the Student (1908) sleep sample", () => {
    const [p] = powerNotes(recordWith([sleepPaired]));
    expect(p.sample).toBe("10 pairs");
    expect(p.observed).toBeCloseTo(1.2845, 3);
    expect(p.power).toBeCloseTo(0.9496, 3);
    expect(p.mediumPower).toBeCloseTo(0.2932, 3);
    expect(p.minimum).toBeCloseTo(0.996, 2);
    expect(p.minimumText).toMatch(/difference of 1\.2 or more/);
  });

  test("t and the mean difference from the sleep.csv file", () => {
    const rows = readFileSync("samples/sleep/sleep.csv", "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
    const by = (drug: string) => rows.filter((r) => r[1] === drug).sort((a, b) => Number(a[0]) - Number(b[0])).map((r) => Number(r[2]));
    const diff = by("2").map((v, i) => v - by("1")[i]);
    const mean = diff.reduce((a, b) => a + b) / diff.length;
    const sd = Math.sqrt(diff.reduce((a, b) => a + (b - mean) ** 2, 0) / (diff.length - 1));
    const t = mean / (sd / Math.sqrt(diff.length));
    expect(mean).toBeCloseTo(1.58, 10);
    expect(t).toBeCloseTo(4.0621, 3);
    const [p] = powerNotes(recordWith([ttest("n1", "paired t-test", { n_a: 10, n_b: 10, statistic: t, mean_diff: mean, p_value: 0.0028 })]));
    expect(p.minimum * sd).toBeCloseTo(1.225, 2);
  });

  test("an unpaired t-test uses the two-sample design, a paired one uses the paired design", () => {
    const m = { n_a: 10, n_b: 12, statistic: 2.5, mean_diff: 1.2, p_value: 0.02 };
    const unpaired = powerFindings(recordWith([ttest("n1", "unpaired t-test", m)]))[0].message;
    expect(unpaired).toMatch(/^With 10 and 12 subjects in the groups, the unpaired t-test/);
    expect(powerFindings(recordWith([ttest("n1", "Welch unpaired t-test", m)]))[0].message).toMatch(/^With 10 and 12 subjects in the groups/);
    for (const name of ["un-paired t-test", "non-paired t-test", "non paired t-test"]) expect(powerFindings(recordWith([ttest("n1", name, m)]))[0].message).toMatch(/^With 10 and 12 subjects in the groups/);
    expect(powerFindings(recordWith([ttest("n1", "paired t-test", { ...m, n_b: 10 })]))[0].message).toMatch(/^With 10 pairs, the paired t-test/);
    expect(powerFindings(recordWith([ttest("n1", "(paired) t-test", { ...m, n_b: 10 })]))[0].message).toMatch(/^With 10 pairs/);
  });

  test("a note, not an error, for a small sample", () => {
    const out = powerFindings(recordWith([sleepPaired]));
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe("info");
    expect(out[0].message).toMatch(/^With 10 pairs, the paired t-test in step 1 finds only a difference of 1\.2 or more/);
  });

  test("no note for a large sample", () => {
    const big = ttest("n1", "Welch t-test (unequal variances)", { n_a: 200, n_b: 200, statistic: 3, mean_diff: 1, p_value: 0.003 });
    expect(powerFindings(recordWith([big]))).toHaveLength(0);
  });

  test("a Wilcoxon test gets no power note", () => {
    const w = ttest("n1", "Wilcoxon signed-rank test", { n_a: 10, n_b: 10, statistic: 3, p_value: 0.01 });
    expect(powerNotes(recordWith([w]))).toHaveLength(0);
  });

  test("a correlation", () => {
    const r = { id: "n1", tool: "correlate", args: {}, result: { metrics: { r: 0.4, n: 20, p_value: 0.08 }, data: { test: "Pearson correlation" } } };
    const out = powerFindings(recordWith([r]));
    expect(out[0].message).toMatch(/^With 20 subjects, the Pearson correlation in step 1 finds only a correlation of 0\.58 or more/);
  });
});

describe("the /power command", () => {
  const run = (record: unknown) => {
    const printed: string[] = [];
    const notices: string[] = [];
    const ctx = { session: { record }, print: (t: string) => printed.push(t), notice: (t: string) => notices.push(t) } as unknown as CommandCtx;
    void commands.find((c) => c.name === "power")!.run([], ctx);
    return { printed, notices };
  };

  test("it says so when no test has a power note", () => {
    const { printed, notices } = run(recordWith([]));
    expect(printed).toEqual([]);
    expect(notices[0]).toMatch(/so there is no power note/);
  });

  test("it shows the note of each test, also for a large sample", () => {
    const big = ttest("n2", "Welch t-test (unequal variances)", { n_a: 200, n_b: 200, statistic: 3, mean_diff: 1, p_value: 0.003 });
    const { printed } = run(recordWith([sleepPaired, big]));
    const lines = printed[0].split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^With 10 pairs, the paired t-test in step 1 finds a difference of 1\.2 or more/);
    expect(lines[1]).toMatch(/^With 200 and 200 subjects in the groups, the Welch t-test/);
  });

  test("the text says only for the finding and not for the command", () => {
    const [p] = powerNotes(recordWith([sleepPaired]));
    expect(powerText(p, true)).toContain("finds only a difference");
    expect(powerText(p, false)).toContain("finds a difference");
  });
});
