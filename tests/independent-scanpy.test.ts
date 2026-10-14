import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const python = await programOf("scanpy");
const h5ad = join(CATALOG, "scanpy/data/pbmc3k_small.h5ad");
const slow = 600_000;
const handle = (o: { data?: Record<string, any> }) => ({ handle: o.data!.adata.handle });

describe.skipIf(!python)("scanpy against numpy, pandas, scikit-learn and igraph", () => {
  let scanpy: OpenAdapter;
  beforeAll(async () => {
    scanpy = await openAdapter("scanpy");
  });
  afterAll(async () => {
    await scanpy?.close();
  });

  async function pipeline(resolutions: number[]) {
    const steps: Record<string, any> = {};
    let o: any = await scanpy.run("load_data", { path: h5ad });
    o = steps.qc = await scanpy.run("calculate_qc", { adata: handle(o) });
    o = steps.filter = await scanpy.run("filter_cells", { adata: handle(o), min_genes: 100, max_genes: 1500, max_pct_mito: 5 });
    o = steps.norm = await scanpy.run("normalize_log", { adata: handle(o), target_sum: 10000 });
    o = steps.hvg = await scanpy.run("find_variable_genes", { adata: handle(o) });
    o = steps.scale = await scanpy.run("scale_data", { adata: handle(o), regress_out: "total_counts,pct_counts_mt", max_value: 10 });
    o = steps.pca = await scanpy.run("run_pca", { adata: handle(o), random_state: 0 });
    o = steps.neighbors = await scanpy.run("build_neighbors", { adata: handle(o), n_neighbors: 10, n_pcs: 10, random_state: 0 });
    const clusters: Record<string, any> = {};
    for (const r of resolutions) clusters[String(r)] = await scanpy.run("cluster_leiden", { adata: handle(o), resolution: r, random_state: 0 });
    return { steps, clusters };
  }

  // Hand computation from the raw counts with numpy. The highly variable genes follow the Seurat method of Satija et al. (2015):
  // dispersion = variance / mean on expm1 values, z-scored inside 20 equal-width bins of log1p(mean). The PCA uses numpy SVD.
  test("the cell filter, the log values, the highly variable genes and the PCA variance agree with a numpy computation", { timeout: slow }, async () => {
    const hand = await pyJson<{ n_cells: number; x_max: number; n_hvg: number; variance_first10: number }>(
      python!,
      `
import anndata, numpy as np, pandas as pd, scipy.sparse as sp
a = anndata.read_h5ad(${JSON.stringify(h5ad)})
X = (a.X.toarray() if sp.issparse(a.X) else np.asarray(a.X)).astype(float)
n_genes = (X > 0).sum(1); total = X.sum(1)
mt = np.array([g.startswith("MT-") for g in a.var_names]); pct = 100 * X[:, mt].sum(1) / total
keep = (n_genes >= 100) & (n_genes < 1500) & (pct < 5)
counts = X[keep]
logged = np.log1p(counts / counts.sum(1, keepdims=True) * 1e4)
back = np.expm1(logged); mean = back.mean(0); var = back.var(0, ddof=1)
with np.errstate(all="ignore"):
    disp = var / mean
disp[disp == 0] = np.nan
disp = np.log(disp); lmean = np.log1p(mean)
frame = pd.DataFrame({"m": lmean, "d": disp}); frame["bin"] = pd.cut(frame["m"], bins=20)
grouped = frame.groupby("bin", observed=False)["d"]
norm = (frame["d"] - grouped.transform("mean")) / grouped.transform("std")
hvg = ((lmean > 0.0125) & (lmean < 3) & (norm > 0.5)).values
H = logged[:, hvg]
design = np.column_stack([np.ones(len(H)), total[keep], pct[keep]])
resid = H - design @ np.linalg.lstsq(design, H, rcond=None)[0]
Z = np.clip((resid - resid.mean(0)) / resid.std(0, ddof=1), None, 10)
sv = np.linalg.svd(Z - Z.mean(0), compute_uv=False)
print(json.dumps({"n_cells": int(keep.sum()), "x_max": float(logged.max()), "n_hvg": int(hvg.sum()), "variance_first10": float(((sv**2)[:10] / (sv**2).sum()).sum())}))
`,
    );
    const { steps } = await pipeline([]);
    expect(steps.filter.metrics.n_cells_after).toBe(hand.n_cells);
    expect(Math.abs(steps.norm.metrics.x_max - hand.x_max)).toBeLessThan(1e-4);
    expect(steps.hvg.metrics.n_highly_variable).toBe(hand.n_hvg);
    expect(Math.abs(steps.pca.metrics.variance_first10 - hand.variance_first10)).toBeLessThan(1e-4);
  });

  // igraph (a different Leiden code) clusters a plain 10-nearest-neighbor graph that scikit-learn builds on the same 10 components.
  // The weights of the graphs differ, so the cluster counts can differ by one. The adjusted Rand index measures the agreement of the labels.
  test("the Leiden clusters at three resolutions agree with the igraph clusters of a nearest-neighbor graph", { timeout: slow }, async () => {
    const { clusters } = await pipeline([0.3, 1.5]);
    const counts: number[] = [];
    for (const [resolution, out] of Object.entries(clusters)) {
      const hand = await pyJson<{ k: number; ari: number }>(
        python!,
        `
import anndata, igraph, numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import adjusted_rand_score
a = anndata.read_h5ad(${JSON.stringify(out.data.checkpoint)})
labels = a.obs["leiden"].astype(int).values
pcs = a.obsm["X_pca"][:, :10]
neighbors = NearestNeighbors(n_neighbors=11).fit(pcs).kneighbors(pcs)[1]
edges = {(min(i, j), max(i, j)) for i in range(len(pcs)) for j in neighbors[i, 1:]}
part = igraph.Graph(n=len(pcs), edges=list(edges)).community_leiden(objective_function="modularity", resolution=${resolution}, n_iterations=-1)
print(json.dumps({"k": len(set(part.membership)), "ari": adjusted_rand_score(labels, part.membership)}))
`,
      );
      expect(Math.abs(out.metrics.n_clusters - hand.k), resolution).toBeLessThanOrEqual(1);
      expect(hand.ari, resolution).toBeGreaterThan(0.6);
      counts.push(out.metrics.n_clusters);
    }
    expect(counts[1]).toBeGreaterThan(counts[0]);
  });
});
