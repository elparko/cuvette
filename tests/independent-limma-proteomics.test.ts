import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("limma-proteomics");
const python = join(homedir(), ".cuvette/envs/biostats/bin/python");
const pxd = join(CATALOG, "limma-proteomics/data/pxd000279_lfq.tsv");
const slow = 600_000;
const cells = (text: string) => text.trim().split("\n").map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "")));

describe.skipIf(!found || !existsSync(python))("limma-proteomics against numpy and scipy", () => {
  let limma: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-limma-"));
    limma = await openAdapter("limma-proteomics");
  });
  afterAll(async () => {
    await limma?.close();
    rmSync(root, { recursive: true, force: true });
  });

  // Hand table of 8 proteins and 6 samples (a1 to a3, b1 to b3). A zero is a missing value. The expected values come from numpy.
  // The log2 step, the flag rows, the valid value rule, the median shift to the mean of the column medians and the minimum imputation are done by hand.
  const handTable = (file: string) => `
import numpy as np
rows = [
 ("P1", "", 1000, 1200, 900, 2000, 2200, 2100),
 ("P2", "", 0, 5000, 5200, 0, 0, 7000),
 ("P3", "+", 100, 100, 100, 100, 100, 100),
 ("P4", "", 3000, 0, 0, 6000, 6100, 5900),
 ("P5", "", 0, 0, 800, 0, 0, 0),
 ("P6", "", 250, 260, 240, 0, 500, 0),
 ("P7", "", 80000, 82000, 79000, 40000, 41000, 39000),
 ("P8", "", 10, 12, 11, 13, 15, 14),
]
with open(${JSON.stringify(file)}, "w") as f:
    f.write("Protein IDs\\tReverse\\tLFQ a1\\tLFQ a2\\tLFQ a3\\tLFQ b1\\tLFQ b2\\tLFQ b3\\n")
    for r in rows: f.write("\\t".join(str(v) for v in r) + "\\n")
kept = [r for r in rows if r[1] != "+"]
x = np.array([[np.nan if v == 0 else np.log2(v) for v in r[2:]] for r in kept])
ids = [r[0] for r in kept]
def valid(x, need, rule):
    a, b = (~np.isnan(x[:, :3])).sum(1), (~np.isnan(x[:, 3:])).sum(1)
    ok = (a >= need) & (b >= need) if rule == "each" else (a >= need) | (b >= need)
    return ok
def run(need, rule, norm, imp):
    ok = valid(x, need, rule)
    m = x[ok].copy()
    if norm == "median":
        med = np.nanmedian(m, 0)
        m = m - med + med.mean()
    if imp == "minimum":
        for j in range(m.shape[1]):
            m[np.isnan(m[:, j]), j] = np.nanmin(m[:, j])
    return {"ids": [i for i, k in zip(ids, ok) if k], "m": [[None if np.isnan(v) else float(v) for v in r] for r in m]}
print(json.dumps({"each2": run(2, "each", "median", "none"), "one2": run(2, "one", "none", "none"), "min": run(2, "one", "median", "minimum")}))`;

  test("the prepared table agrees with a hand computation for the valid value rule, the median shift and the minimum imputation", { timeout: slow }, async () => {
    const file = join(root, "hand.tsv");
    const want = await pyJson<Record<string, { ids: string[]; m: (number | null)[][] }>>(python, handTable(file));
    const cases = [
      ["each2", { valid_rule: "each group", normalization: "median", imputation: "none" }],
      ["one2", { valid_rule: "at least one group", normalization: "none", imputation: "none" }],
      ["min", { valid_rule: "at least one group", normalization: "median", imputation: "minimum" }],
    ] as const;
    for (const [key, args] of cases) {
      const out = await limma.run("prepare_protein_table", { data: file, sample_prefix: "LFQ ", groups: "a,a,a,b,b,b", exclude_flags: "Reverse", min_valid: 2, ...args });
      const lines = cells(await readFile(out.data.prepared_file, "utf8"));
      const header = lines[0];
      const first = header.indexOf("LFQ a1");
      const got = lines.slice(1);
      expect(got.map((r) => r[0]), key).toEqual(want[key].ids);
      got.forEach((r, i) => r.slice(first, first + 6).forEach((v, j) => {
        const w = want[key].m[i][j];
        if (w === null || Number.isNaN(w)) expect(v === "NA" || v === "", `${key} ${i} ${j}`).toBe(true);
        else expect(Math.abs(Number(v) - w), `${key} ${i} ${j}`).toBeLessThan(1e-6);
      }));
    }
  });

  // Moderated t of Smyth (2004): s2 post = (d0 s0^2 + d s^2) / (d0 + d) and t = beta / (sqrt(s2 post) * sqrt(unscaled variance)).
  // The prior d0 and s0^2 come from the tool. numpy fits the least squares model with a group term and a batch term.
  test("the moderated t, the p value and the adjusted p value with a batch term agree with numpy for a given prior", { timeout: slow }, async () => {
    const data = join(root, "prepared.csv");
    const design = join(root, "design.csv");
    await pyJson(
      python,
      `
import numpy as np
rng = np.random.default_rng(7)
n = 300
groups = ["A"] * 4 + ["B"] * 4
batch = ["x", "y", "x", "y", "x", "y", "x", "y"]
base = rng.normal(20, 2, n)[:, None]
effect = np.where(np.arange(n) < 60, 1.5, 0.0)[:, None] * np.array([0] * 4 + [1] * 4)
shift = np.array([0.0, 0.8, 0.0, 0.8, 0.0, 0.8, 0.0, 0.8])
y = base + effect + shift + rng.normal(0, 1, (n, 8)) * (0.5 * np.exp(rng.normal(0, 0.4, n)))[:, None]
with open(${JSON.stringify(data)}, "w") as f:
    f.write("id,label," + ",".join("s%d" % (i + 1) for i in range(8)) + "\\n")
    for i in range(n): f.write("p%d,g%d," % (i, i) + ",".join(repr(float(v)) for v in y[i]) + "\\n")
with open(${JSON.stringify(design)}, "w") as f:
    f.write("sample,group,batch\\n")
    for i in range(8): f.write("s%d,%s,%s\\n" % (i + 1, groups[i], batch[i]))
print(json.dumps(1))`,
    );
    const out = await limma.run("test_differential_proteins", { data, design, group_a: "B", group_b: "A", batch_column: "batch", variance_model: "standard", fdr: 0.05 });
    const d0 = out.metrics.df_prior;
    const s20 = out.metrics.s2_prior_median;
    const hand = await pyJson<{ lfc: number[]; t: number[]; p: number[]; adj: number[]; n_sig: number }>(
      python,
      `
import numpy as np
from scipy import stats
import csv
rows = list(csv.reader(open(${JSON.stringify(data)})))[1:]
y = np.array([[float(v) for v in r[2:]] for r in rows])
grp = np.array([0] * 4 + [1] * 4, float)
bat = np.array([0, 1] * 4, float)
X = np.column_stack([np.ones(8), grp, bat])
xtxi = np.linalg.inv(X.T @ X)
beta = (xtxi @ X.T @ y.T).T
res = y - beta @ X.T
d = 8 - 3
s2 = (res ** 2).sum(1) / d
d0, s20 = ${d0}, ${s20}
s2p = (d0 * s20 + d * s2) / (d0 + d)
t = beta[:, 1] / np.sqrt(s2p * xtxi[1, 1])
p = 2 * stats.t.sf(np.abs(t), d0 + d)
o = np.argsort(p)
adj = np.empty(len(p))
adj[o] = np.minimum(1, np.minimum.accumulate((p[o] * len(p) / np.arange(1, len(p) + 1))[::-1])[::-1])
print(json.dumps({"lfc": beta[:, 1].tolist(), "t": t.tolist(), "p": p.tolist(), "adj": adj.tolist(), "n_sig": int((adj < 0.05).sum())}))`,
    );
    const rowsOut = cells(await readFile(out.data.results_file, "utf8"));
    const col = (name: string) => rowsOut[0].indexOf(name);
    for (const r of rowsOut.slice(1)) {
      const i = Number(r[col("id")].slice(1));
      expect(Math.abs(Number(r[col("log2fc")]) - hand.lfc[i])).toBeLessThan(1e-9);
      expect(Math.abs(Number(r[col("t")]) / hand.t[i] - 1)).toBeLessThan(2e-3);
      expect(Math.abs(Number(r[col("p_value")]) / hand.p[i] - 1)).toBeLessThan(0.05);
    }
    expect(Math.abs(out.metrics.n_significant - hand.n_sig)).toBeLessThanOrEqual(2);
    expect(out.metrics.n_significant).toBeGreaterThan(40);
  });

  // Zhu et al. (2020), Mol Cell Proteomics 19: 1047, data set D2: 6566 proteins after the Reverse and Contaminant rows, and 5022 with 2 values in each condition.
  test("the filter counts agree with the numbers that the paper prints for the PXD000279 table", { timeout: slow }, async () => {
    const out = await limma.run("prepare_protein_table", { data: pxd, sample_prefix: "LFQ intensity ", groups: "H,H,H,L,L,L", exclude_flags: "Reverse, Contaminant", min_valid: 2, valid_rule: "each group", normalization: "none", imputation: "none" });
    expect(out.metrics.n_after_flags).toBe(6566);
    expect(out.metrics.n_kept).toBe(5022);
  });
});
