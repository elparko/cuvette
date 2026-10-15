import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("harmony");
const python = join(homedir(), ".cuvette/envs/scanpy/bin/python");
const pcs = join(CATALOG, "harmony/data/pbmc3500_pcs.h5ad");
const slow = 600_000;

describe.skipIf(!found || !existsSync(python))("harmony against a hand implementation of LISI", () => {
  let harmony: OpenAdapter;
  beforeAll(async () => {
    harmony = await openAdapter("harmony");
  });
  afterAll(async () => {
    await harmony?.close();
  });

  // Korsunsky et al. (2019), methods: the neighbors are the 3 x perplexity nearest cells without the cell itself. The weights are exp(-beta x distance), as in the R package lisi. data/lisi_reference.h5ad holds the R values for a check of this rule.
  // The kernel width is found for each cell so that the entropy of the weights equals log(perplexity). LISI is 1 / sum over labels of (weight of the label)^2.
  test("the LISI of the principal components and of the Harmony components agrees with a hand implementation with the kernel width search", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, { median: number; mean: number; q05: number; q95: number; lisi: number[] }>>(
      python,
      `
import numpy as np, scanpy as sc
from sklearn.neighbors import NearestNeighbors
a = sc.read_h5ad(${JSON.stringify(pcs)})
lab = a.obs["donor"].astype(str).to_numpy()
codes = np.unique(lab, return_inverse=True)[1]
def lisi(x, perplexity=30.0):
    k = int(perplexity * 3)
    d, idx = NearestNeighbors(n_neighbors=k + 1).fit(x).kneighbors(x)
    d2, idx = d[:, 1:], idx[:, 1:]
    out = np.zeros(len(x))
    target = np.log(perplexity)
    for i in range(len(x)):
        lo, hi, beta = -np.inf, np.inf, 1.0
        for _ in range(200):
            p = np.exp(-d2[i] * beta)
            s = p.sum()
            if s == 0: beta /= 2; continue
            h = np.log(s) + beta * (d2[i] * p).sum() / s
            diff = h - target
            if abs(diff) < 1e-5: break
            if diff > 0:
                lo = beta; beta = beta * 2 if hi == np.inf else (beta + hi) / 2
            else:
                hi = beta; beta = beta / 2 if lo == -np.inf else (beta + lo) / 2
        p = np.exp(-d2[i] * beta); p = p / p.sum()
        out[i] = 1 / sum(p[codes[idx[i]] == c].sum() ** 2 for c in np.unique(codes))
    return out
res = {}
for rep in ("X_pca", "X_pca_harmony_reference"):
    v = lisi(np.asarray(a.obsm[rep], float)[:, :30])
    res[rep] = {"median": float(np.median(v)), "mean": float(v.mean()), "q05": float(np.quantile(v, 0.05)), "q95": float(np.quantile(v, 0.95)), "lisi": v.tolist()}
print(json.dumps(res))`,
    );
    for (const rep of ["X_pca", "X_pca_harmony_reference"]) {
      const out = await harmony.run("compute_lisi", { adata: pcs, label_key: "donor", use_rep: rep, n_pcs: 30, perplexity: 30 });
      const want = hand[rep];
      expect(Math.abs(out.metrics.median - want.median), `${rep} median`).toBeLessThan(0.01);
      expect(Math.abs(out.metrics.mean - want.mean), `${rep} mean`).toBeLessThan(0.005);
      expect(Math.abs(out.metrics.q05 - want.q05), `${rep} q05`).toBeLessThan(0.01);
      expect(Math.abs(out.metrics.q95 - want.q95), `${rep} q95`).toBeLessThan(0.01);
    }
    const before = await harmony.run("compute_lisi", { adata: pcs, label_key: "donor", use_rep: "X_pca", n_pcs: 30 });
    const after = await harmony.run("compute_lisi", { adata: pcs, label_key: "donor", use_rep: "X_pca_harmony_reference", n_pcs: 30 });
    expect(after.metrics.median).toBeGreaterThan(before.metrics.median);
    expect(after.metrics.median).toBeLessThanOrEqual(3);
  });

  // Pearson r of the columns of two matrices with numpy.corrcoef. A matrix against itself gives 1.
  test("the embedding comparison gives the Pearson r of each dimension and the batch shift agrees with the group means", { timeout: slow }, async () => {
    const hand = await pyJson<{ r: number[]; shift: number }>(
      python,
      `
import numpy as np, scanpy as sc
a = sc.read_h5ad(${JSON.stringify(pcs)})
x, y = np.asarray(a.obsm["X_pca"], float), np.asarray(a.obsm["X_pca_harmony_reference"], float)
r = [float(np.corrcoef(x[:, i], y[:, i])[0, 1]) for i in range(30)]
lab = a.obs["donor"].astype(str).to_numpy()
m = np.vstack([x[lab == g].mean(0) for g in np.unique(lab)])
print(json.dumps({"r": r, "shift": float(np.mean((m.max(0) - m.min(0)) / x.std(0)))}))`,
    );
    const cmp = await harmony.run("compare_embeddings", { adata: pcs, rep_a: "X_pca", rep_b: "X_pca_harmony_reference", n_dims: 30 });
    expect(cmp.metrics.n_dims).toBe(30);
    expect(Math.abs(cmp.metrics.min_r - Math.min(...hand.r))).toBeLessThan(1e-9);
    expect(Math.abs(cmp.metrics.mean_r - hand.r.reduce((s, v) => s + v, 0) / 30)).toBeLessThan(1e-9);
    const run = await harmony.run("integrate_harmony", { adata: pcs, batch_key: "donor", theta: 2, n_pcs: 30, random_state: 0 });
    expect(Math.abs(run.metrics.batch_shift_before - hand.shift)).toBeLessThan(1e-9);
    expect(run.metrics.batch_shift_after).toBeLessThan(run.metrics.batch_shift_before);
  });
});
