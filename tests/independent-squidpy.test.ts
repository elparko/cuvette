import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("squidpy");
const python = join(homedir(), ".cuvette/envs/squidpy/bin/python");
const data = join(CATALOG, "squidpy/data");
const tinyH5 = join(data, "visium_tiny.h5");
const tinyPositions = join(data, "visium_tiny_positions.txt");
const hne = join(data, "visium_hne_100hvg.h5ad");
const imc = join(data, "imc_cells.h5ad");
const slow = 600_000;
const bh = (p: number[]) => {
  const n = p.length;
  const order = p.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const out = new Array<number>(n);
  let run = 1;
  for (let k = n - 1; k >= 0; k--) {
    run = Math.min(run, (p[order[k]] * n) / (k + 1));
    out[order[k]] = Math.min(1, run);
  }
  return out;
};
const cells = (text: string) => text.trim().split("\n").map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "")));

describe.skipIf(!found || !existsSync(python))("squidpy against numpy and scipy formulas", () => {
  let sq: OpenAdapter;
  beforeAll(async () => {
    sq = await openAdapter("squidpy");
  });
  afterAll(async () => {
    await sq?.close();
  });

  // The synthetic Visium file is a square lattice: the array coordinates step by 1 and the pixel coordinates step by 100. A spot has 4 neighbors at the array offsets (+-1, 0) and (0, +-1).
  // The positions file has the barcode, in_tissue, array_row, array_col, pxl_row and pxl_col.
  test("loading the Visium files keeps the spots in the tissue and the grid graph has the edges of the square lattice rule", { timeout: slow }, async () => {
    const hand = await pyJson<{ barcodes: string[]; pos: number[][]; array: number[][]; edges: number; degree: number[] }>(
      python,
      `
import csv, h5py, numpy as np
rows = {r[0]: r[1:] for r in csv.reader(open(${JSON.stringify(tinyPositions)}))}
with h5py.File(${JSON.stringify(tinyH5)}) as f:
    bc = [b.decode() for b in f["matrix/barcodes"][:]]
keep = [b for b in bc if rows[b][0] == "1"]
pos = [[float(rows[b][4]), float(rows[b][3])] for b in keep]
arr = [[int(rows[b][1]), int(rows[b][2])] for b in keep]
index = {tuple(a): i for i, a in enumerate(arr)}
deg = np.zeros(len(keep), int); edges = 0
for i, (r, c) in enumerate(arr):
    for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        j = index.get((r + dr, c + dc))
        if j is not None: deg[i] += 1; edges += 1
print(json.dumps({"barcodes": keep, "pos": pos, "array": arr, "edges": edges // 2, "degree": deg.tolist()}))`,
    );
    const loaded = await sq.run("load_spatial", { path: tinyH5, positions: tinyPositions });
    expect(loaded.metrics.n_spots).toBe(hand.barcodes.length);
    const graph = await sq.run("build_spatial_graph", { adata: loaded.data.checkpoint, coord_type: "grid", n_neighs: 4 });
    expect(graph.metrics.n_edges).toBe(hand.edges);
    expect(graph.metrics.max_neighbors).toBe(Math.max(...hand.degree));
    expect(graph.metrics.min_neighbors).toBe(Math.min(...hand.degree));
    expect(Math.abs(graph.metrics.mean_neighbors - hand.degree.reduce((a, b) => a + b, 0) / hand.degree.length)).toBeLessThan(1e-9);
    const check = await pyJson<{ same_order: boolean; max_diff: number }>(
      python,
      `
import numpy as np, scanpy as sc
a = sc.read_h5ad(${JSON.stringify(graph.data.checkpoint)})
expected = np.array(${JSON.stringify(hand.pos)})
print(json.dumps({"same_order": list(a.obs_names) == ${JSON.stringify(hand.barcodes)}, "max_diff": float(np.abs(a.obsm["spatial"] - expected).max())}))`,
    );
    expect(check.same_order).toBe(true);
    expect(check.max_diff).toBeLessThan(1e-9);
  });

  // Moran (1950): I = N / W * sum_ij w_ij z_i z_j / sum_i z_i^2. Geary (1954): C = (N - 1) / (2 W) * sum_ij w_ij (x_i - x_j)^2 / sum_i z_i^2.
  // The weights are the graph that the tool saved, with each row divided by its sum (the squidpy default). The p values use the normal approximation of Cliff and Ord (1981). They are one-sided in the direction of the statistic, as in squidpy.
  test("Moran's I, Geary's C and the normal approximation p values equal the formulas on the saved graph", { timeout: slow }, async () => {
    const graph = await sq.run("build_spatial_graph", { adata: hne, coord_type: "grid", n_neighs: 6 });
    const hand = await pyJson<{ genes: string[]; I: number[]; C: number[]; p: number[]; pc: number[] }>(
      python,
      `
import numpy as np, scanpy as sc, scipy.sparse as sp
from scipy import stats
a = sc.read_h5ad(${JSON.stringify(graph.data.checkpoint)})
x = a.X.toarray() if sp.issparse(a.X) else np.asarray(a.X)
x = x.astype(float)
w = a.obsp["spatial_connectivities"].tocsr().astype(float)
w = sp.diags(1 / np.asarray(w.sum(1)).ravel()) @ w
w = w.tocsr()
n = x.shape[0]; W = w.sum()
z = x - x.mean(0)
den = (z ** 2).sum(0)
I = (n / W) * np.array([(z[:, j] * (w @ z[:, j])).sum() for j in range(x.shape[1])]) / den
coo = w.tocoo()
C = np.array([(n - 1) / (2 * W) * (coo.data * (x[coo.row, j] - x[coo.col, j]) ** 2).sum() / den[j] for j in range(x.shape[1])])
s1 = 0.5 * ((w + w.T).power(2)).sum(); s2 = ((np.asarray(w.sum(0)).ravel() + np.asarray(w.sum(1)).ravel()) ** 2).sum()
EI = -1 / (n - 1)
varI = (n * n * s1 - n * s2 + 3 * W * W) / ((n * n - 1) * W * W) - EI * EI
zi = (I - EI) / np.sqrt(varI)
p = np.where(zi > 0, stats.norm.sf(zi), stats.norm.cdf(zi))
varC = ((2 * s1 + s2) * (n - 1) - 4 * W * W) / (2 * (n + 1) * W * W)
zc = (C - 1) / np.sqrt(varC)
pc = np.where(zc > 0, stats.norm.sf(zc), stats.norm.cdf(zc))
print(json.dumps({"genes": list(a.var_names), "I": I.tolist(), "C": C.tolist(), "p": p.tolist(), "pc": pc.tolist()}))`,
    );
    const moran = await sq.run("spatial_autocorr", { adata: graph.data.checkpoint, mode: "moran", n_perms: 0, top_n: 100 });
    const rows = cells(await readFile(moran.table.path!, "utf8")).slice(1);
    expect(rows.length).toBe(hand.genes.length);
    for (const r of rows) {
      const j = hand.genes.indexOf(r[1]);
      expect(Math.abs(Number(r[2]) - hand.I[j]), `I ${r[1]}`).toBeLessThan(1e-6);
      expect(Math.abs(Number(r[3]) - bh(hand.p)[j]), `I fdr ${r[1]}`).toBeLessThan(1e-6);
    }
    expect(rows[0][1]).toBe(hand.genes[hand.I.indexOf(Math.max(...hand.I))]);
    expect(moran.summary).toContain("one-sided");
    const geary = await sq.run("spatial_autocorr", { adata: graph.data.checkpoint, mode: "geary", n_perms: 0, top_n: 100 });
    const gRows = cells(await readFile(geary.table.path!, "utf8")).slice(1);
    for (const r of gRows) {
      const j = hand.genes.indexOf(r[1]);
      expect(Math.abs(Number(r[2]) - hand.C[j]), `C ${r[1]}`).toBeLessThan(1e-6);
      expect(Math.abs(Number(r[3]) - bh(hand.pc)[j]), `C fdr ${r[1]}`).toBeLessThan(1e-6);
    }
    expect(gRows[0][1]).toBe(hand.genes[hand.C.indexOf(Math.min(...hand.C))]);
  });

  // Palla et al. (2022): the count of links between two groups is compared with the counts of label shuffles. z = (observed - mean of shuffles) / sd of shuffles.
  test("the neighborhood enrichment counts equal the link counts of the graph and the z scores agree with a hand permutation test", { timeout: slow }, async () => {
    const graph = await sq.run("build_spatial_graph", { adata: imc, coord_type: "generic", n_neighs: 10 });
    const out = await sq.run("nhood_enrichment", { adata: graph.data.checkpoint, cluster_key: "cell type", n_perms: 1000, random_state: 0, top_pairs: 200 });
    const hand = await pyJson<{ cats: string[]; count: number[][]; z: number[][] }>(
      python,
      `
import numpy as np, scanpy as sc, scipy.sparse as sp
a = sc.read_h5ad(${JSON.stringify(graph.data.checkpoint)})
lab = a.obs["cell type"].astype("category")
codes = lab.cat.codes.to_numpy(); k = len(lab.cat.categories)
w = a.obsp["spatial_connectivities"].tocoo()
def counts(c):
    m = np.zeros((k, k))
    np.add.at(m, (c[w.row], c[w.col]), 1)
    return m
obs = counts(codes)
rng = np.random.default_rng(3)
perm = np.array([counts(rng.permutation(codes)) for _ in range(2000)])
z = (obs - perm.mean(0)) / perm.std(0)
print(json.dumps({"cats": list(lab.cat.categories), "count": obs.tolist(), "z": z.tolist()}))`,
    );
    const rows = cells(await readFile(out.outputs.find((o) => o.path.endsWith(".csv"))!.path, "utf8")).slice(1);
    expect(rows.length).toBe(hand.cats.length ** 2);
    for (const r of rows) {
      const i = hand.cats.indexOf(r[0]);
      const j = hand.cats.indexOf(r[1]);
      expect(Number(r[3]), `${r[0]} / ${r[1]}`).toBe(hand.count[i][j]);
      const want = hand.z[i][j];
      expect(Math.abs(Number(r[2]) - want), `z ${r[0]} / ${r[1]}`).toBeLessThan(Math.max(0.4, 0.08 * Math.abs(want)));
    }
    expect(out.metrics.n_links).toBe(hand.count.flat().reduce((a, b) => a + b, 0));
    expect(out.metrics.n_links_same_group).toBe(hand.count.reduce((s, row, i) => s + row[i], 0));
  });

  test("the normalized expression equals log1p of the counts scaled to the target sum, and the spatial domains report the Rand index of the formula", { timeout: slow }, async () => {
    const tiny = await sq.run("load_spatial", { path: tinyH5, positions: tinyPositions });
    const norm = await sq.run("normalize_expression", { adata: tiny.data.checkpoint, target_sum: 10000 });
    const hand = await pyJson<{ max_diff: number; max_value: number }>(
      python,
      `
import numpy as np, scanpy as sc, scipy.sparse as sp
raw = sc.read_h5ad(${JSON.stringify(tiny.data.checkpoint)})
out = sc.read_h5ad(${JSON.stringify(norm.data.checkpoint)})
x = raw.X.toarray().astype(float)
expected = np.log1p(x / x.sum(1, keepdims=True) * 10000)
print(json.dumps({"max_diff": float(np.abs(out.X.toarray() - expected).max()), "max_value": float(expected.max())}))`,
    );
    expect(hand.max_diff).toBeLessThan(1e-5);
    expect(Math.abs(norm.metrics.x_max - hand.max_value)).toBeLessThan(1e-4);

    const graph = await sq.run("build_spatial_graph", { adata: hne, coord_type: "grid", n_neighs: 6 });
    const dom = await sq.run("find_spatial_domains", { adata: graph.data.checkpoint, resolution: 0.5, spatial_weight: 0.3, n_top_genes: 100, n_pcs: 10, n_neighbors: 15, random_state: 0, compare_to: "cluster" });
    const ari = await pyJson<{ ari: number; coherence: number }>(
      python,
      `
import numpy as np, scanpy as sc, pandas as pd
a = sc.read_h5ad(${JSON.stringify(dom.data.checkpoint)})
t = pd.crosstab(a.obs["cluster"].astype(str), a.obs["spatial_domain"].astype(str)).to_numpy().astype(float)
c2 = lambda v: v * (v - 1) / 2
sum_ij, sum_a, sum_b, n = c2(t).sum(), c2(t.sum(1)).sum(), c2(t.sum(0)).sum(), t.sum()
expected = sum_a * sum_b / c2(n)
ari = (sum_ij - expected) / (0.5 * (sum_a + sum_b) - expected)
w = a.obsp["spatial_connectivities"].tocoo(); lab = a.obs["spatial_domain"].astype(str).to_numpy()
print(json.dumps({"ari": float(ari), "coherence": float((lab[w.row] == lab[w.col]).mean())}))`,
    );
    expect(Math.abs(dom.metrics.adjusted_rand_index - ari.ari)).toBeLessThan(1e-9);
    expect(Math.abs(dom.metrics.spatial_coherence - ari.coherence)).toBeLessThan(1e-9);
  });
});
