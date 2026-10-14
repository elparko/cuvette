import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const bedtools = await programOf("bedtools");
const python = process.env.PYTHON3 ?? "python3";
const data = join(CATALOG, "bedtools/data");
const slow = 600_000;

// Hand count with the Python standard library. A BED interval is half-open: it covers the bases start+1 to end.
// Two intervals overlap if a.start < b.end and b.start < a.end. The overlap length is min(end) - max(start).
// A fraction filter keeps a pair if the overlap is at least the fraction times the length of the interval.
const hand = `
def read(path):
    out = []
    for line in open(path):
        f = line.rstrip("\\n").split("\\t")
        if len(f) >= 3: out.append((f[0], int(f[1]), int(f[2]), f[5] if len(f) > 5 else "."))
    return out
def pairs(a, b, fa=0.0, fb=0.0, reciprocal=False, strand="any"):
    out = []
    for i, x in enumerate(a):
        for y in b:
            if x[0] != y[0] or not (x[1] < y[2] and y[1] < x[2]): continue
            if strand == "same" and x[3] != y[3]: continue
            if strand == "opposite" and x[3] == y[3]: continue
            n = min(x[2], y[2]) - max(x[1], y[1])
            need_a = fa * (x[2] - x[1]); need_b = fb * (y[2] - y[1])
            if reciprocal: need_b = max(need_b, fa * (y[2] - y[1]))
            if n >= need_a and n >= need_b: out.append((i, n))
    return out
def summary(a, b, **kw):
    p = pairs(a, b, **kw)
    return {"n_result": len(p), "overlap_bases": sum(n for _, n in p), "n_a_with_overlap": len({i for i, _ in p})}
`;

describe.skipIf(!bedtools)("bedtools adapter against a hand count of the intervals", () => {
  let tool: OpenAdapter;
  beforeAll(async () => {
    tool = await openAdapter("bedtools");
  });
  afterAll(async () => {
    await tool?.close();
  });

  const toyA = join(data, "a.bed");
  const toyB = join(data, "b.bed");

  test("the toy overlap rules give the pairs and the overlap bases of the hand count", { timeout: slow }, async () => {
    const h = await pyJson<Record<string, { n_result: number; overlap_bases: number; n_a_with_overlap: number }>>(
      python,
      `${hand}
a, b = read(${JSON.stringify(toyA)}), read(${JSON.stringify(toyB)})
print(json.dumps({"any": summary(a, b), "fa": summary(a, b, fa=0.5), "fb": summary(a, b, fb=0.5), "same": summary(a, b, strand="same"), "opposite": summary(a, b, strand="opposite"), "reciprocal": summary(a, b, fa=0.5, reciprocal=True)}))`,
    );
    const rules: [string, Record<string, unknown>][] = [
      ["any", {}],
      ["fa", { min_fraction_a: 0.5 }],
      ["fb", { min_fraction_b: 0.5 }],
      ["same", { strand: "same" }],
      ["opposite", { strand: "opposite" }],
      ["reciprocal", { min_fraction_a: 0.5, reciprocal: true }],
    ];
    for (const [name, args] of rules) {
      const out = await tool.run("intersect_intervals", { a: toyA, b: toyB, ...args });
      expect({ name, n: out.metrics!.n_result, bases: out.metrics!.overlap_bases }).toEqual({ name, n: h[name].n_result, bases: h[name].overlap_bases });
    }
    const unique = await tool.run("intersect_intervals", { a: toyA, b: toyB, report: "unique_a" });
    expect(unique.metrics!.n_result).toBe(h.any.n_a_with_overlap);
    const none = await tool.run("intersect_intervals", { a: toyA, b: toyB, report: "no_overlap" });
    expect(none.metrics!.n_result).toBe(5 - h.any.n_a_with_overlap);
  });

  test("the exons and AluY repeats of chromosome 1 give the pairs, the bases and the exons of the hand count", { timeout: slow }, async () => {
    const exons = join(data, "exons.chr1_0_10Mb.bed");
    const alu = join(data, "aluY.chr1_0_10Mb.bed");
    const h = await pyJson<Record<string, { n_result: number; overlap_bases: number; n_a_with_overlap: number }>>(
      python,
      `${hand}
a, b = read(${JSON.stringify(exons)}), read(${JSON.stringify(alu)})
print(json.dumps({"any": summary(a, b), "half": summary(a, b, fa=0.5), "same": summary(a, b, strand="same")}))`,
    );
    const any = await tool.run("intersect_intervals", { a: exons, b: alu });
    expect(any.metrics).toMatchObject({ n_result: h.any.n_result, overlap_bases: h.any.overlap_bases, n_a_with_overlap: h.any.n_a_with_overlap });
    const half = await tool.run("intersect_intervals", { a: exons, b: alu, min_fraction_a: 0.5 });
    expect(half.metrics).toMatchObject({ n_result: h.half.n_result, overlap_bases: h.half.overlap_bases });
    const same = await tool.run("intersect_intervals", { a: exons, b: alu, strand: "same", report: "unique_a" });
    expect(same.metrics!.n_result).toBe(h.same.n_a_with_overlap);
  });

  // A gap of at most the distance joins two intervals. The merged length is the sum of the lengths of the merged intervals.
  test("the merge counts and the merged bases agree with the hand merge at two distances", { timeout: slow }, async () => {
    const h = await pyJson<Record<string, number[]>>(
      python,
      `${hand}
def merge(rows, d):
    out = []
    for r in sorted(rows):
        if out and out[-1][0] == r[0] and r[1] - out[-1][2] <= d: out[-1][2] = max(out[-1][2], r[2])
        else: out.append([r[0], r[1], r[2]])
    return [len(out), sum(e - s for _, s, e in out)]
b = read(${JSON.stringify(toyB)})
print(json.dumps({"0": merge(b, 0), "30": merge(b, 30)}))`,
    );
    for (const distance of [0, 30]) {
      const out = await tool.run("merge_intervals", { path: toyB, distance });
      expect([out.metrics!.n_merged, out.metrics!.merged_bases]).toEqual(h[String(distance)]);
    }
  });

  test("the coverage counts agree with the union of the B intervals inside each A interval", { timeout: slow }, async () => {
    const h = await pyJson<{ n: number; covered: number; bases: number; features: number }>(
      python,
      `${hand}
a, b = read(${JSON.stringify(toyA)}), read(${JSON.stringify(toyB)})
n = covered = bases = 0
for x in a:
    spans = sorted((max(x[1], y[1]), min(x[2], y[2])) for y in b if y[0] == x[0] and y[1] < x[2] and x[1] < y[2])
    total, end = 0, -1
    for s, e in spans:
        s = max(s, end); total += max(e - s, 0); end = max(end, e)
    covered += total > 0; bases += total
print(json.dumps({"n": len(a), "covered": covered, "bases": bases, "features": sum(x[2] - x[1] for x in a)}))`,
    );
    const out = await tool.run("coverage_intervals", { a: toyA, b: toyB });
    expect(out.metrics).toMatchObject({ n_features: h.n, n_covered: h.covered, covered_bases: h.bases, feature_bases: h.features });
    expect(Math.abs(out.metrics!.covered_fraction - h.bases / h.features)).toBeLessThan(1e-9);
  });
});
