import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("microbiome");
const python = join(homedir(), ".cuvette/envs/biostats/bin/python");
const counts = join(CATALOG, "microbiome/data/limit_otutable.csv");
const metadata = join(CATALOG, "microbiome/data/limit_metadata.csv");
const slow = 600_000;
const rows = async (path: string) => (await readFile(path, "utf8")).trim().split("\n").map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "")));

const load = `
import numpy as np, pandas as pd
from scipy import stats
from scipy.spatial.distance import pdist, squareform
md = pd.read_csv(${JSON.stringify(metadata)}, index_col=0).replace("", np.nan)
raw = pd.read_csv(${JSON.stringify(counts)}, index_col=0)
cnt = raw[[c for c in raw.columns if c in md.index]].T
md = md.loc[cnt.index]
`;

describe.skipIf(!found || !existsSync(python))("microbiome against numpy and scipy", () => {
  let micro: OpenAdapter;
  beforeAll(async () => {
    micro = await openAdapter("microbiome");
  });
  afterAll(async () => {
    await micro?.close();
  });

  // Shannon (1948), Simpson (1949), Pielou (1966) H / ln(S), and the bias-corrected Chao1 (Chao 1987): S + F1 (F1 - 1) / (2 (F2 + 1)), with F1 and F2 the counts of singletons and doubletons.
  test("the alpha diversity indices and the group tests agree with the formulas and with scipy", { timeout: slow }, async () => {
    const hand = await pyJson<{ ids: string[]; cols: Record<string, number[]>; wilcoxon: number; kruskal: number }>(
      python,
      `${load}
x = cnt.to_numpy(float)
p = x / x.sum(1, keepdims=True)
S = (x > 0).sum(1)
with np.errstate(divide="ignore", invalid="ignore"):
    H = -np.nansum(np.where(p > 0, p * np.log(p), 0), 1)
f1 = (x == 1).sum(1); f2 = (x == 2).sum(1)
cols = {"reads": x.sum(1), "observed": S, "shannon": H, "simpson": 1 - (p ** 2).sum(1), "invsimpson": 1 / (p ** 2).sum(1), "pielou": np.where(S > 1, H / np.log(S), np.nan), "chao1": S + f1 * (f1 - 1) / (2 * (f2 + 1))}
g = md["gender"]; ok = g.notna().to_numpy()
a = H[ok & (g == "M").to_numpy()]; b = H[ok & (g == "F").to_numpy()]
w = stats.mannwhitneyu(a, b, method="asymptotic", use_continuity=True)
k = md["GWG"]; ok2 = k.notna().to_numpy()
kw = stats.kruskal(*[H[ok2 & (k == l).to_numpy()] for l in ("low", "adequate", "excess")])
print(json.dumps({"ids": list(cnt.index), "cols": {n: [None if np.isnan(v) else float(v) for v in c] for n, c in cols.items()}, "wilcoxon": float(w.pvalue), "kruskal": float(kw.pvalue)}))`,
    );
    const out = await micro.run("alpha_diversity", { counts, metadata, index: "chao1" });
    const table = await rows(out.table.path!);
    const head = table[0];
    expect(table.slice(1).map((r) => r[0])).toEqual(hand.ids);
    for (const name of ["reads", "observed", "shannon", "simpson", "invsimpson", "pielou", "chao1"]) {
      const c = head.indexOf(name);
      table.slice(1).forEach((r, i) => {
        const want = hand.cols[name][i];
        if (want === null) expect(r[c] === "NA" || r[c] === "", `${name} ${i}`).toBe(true);
        else expect(Math.abs(Number(r[c]) - want) / Math.max(1, Math.abs(want)), `${name} ${hand.ids[i]}`).toBeLessThan(1e-9);
      });
    }
    const two = await micro.run("alpha_diversity", { counts, metadata, index: "shannon", group_by: "gender" });
    expect(two.data.test.name).toBe("Wilcoxon rank-sum");
    expect(Math.abs(two.metrics.test_p / hand.wilcoxon - 1)).toBeLessThan(1e-6);
    const three = await micro.run("alpha_diversity", { counts, metadata, index: "shannon", group_by: "GWG" });
    expect(three.data.test.name).toBe("Kruskal-Wallis");
    expect(Math.abs(three.metrics.test_p / hand.kruskal - 1)).toBeLessThan(1e-6);
  });

  test("rarefaction gives every kept sample exactly the depth, never adds a feature and drops the shallow samples", { timeout: slow }, async () => {
    const hand = await pyJson<{ keep: string[]; observed: Record<string, number> }>(
      python,
      `${load}
x = cnt.to_numpy(float)
keep = x.sum(1) >= 50000
print(json.dumps({"keep": list(cnt.index[keep]), "observed": dict(zip(cnt.index, (x > 0).sum(1).tolist()))}))`,
    );
    const out = await micro.run("alpha_diversity", { counts, metadata, index: "observed", rarefy_depth: "50000", seed: 7 });
    const table = await rows(out.table.path!);
    const c = (n: string) => table[0].indexOf(n);
    expect(table.slice(1).map((r) => r[0])).toEqual(hand.keep);
    expect(out.metrics.n_dropped).toBe(168 - hand.keep.length);
    for (const r of table.slice(1)) {
      expect(Number(r[c("reads")])).toBe(50000);
      expect(Number(r[c("observed")])).toBeLessThanOrEqual(hand.observed[r[0]]);
    }
    const again = await micro.run("alpha_diversity", { counts, metadata, index: "observed", rarefy_depth: "50000", seed: 7 });
    expect(await readFile(again.table.path!, "utf8")).toBe(await readFile(out.table.path!, "utf8"));
  });

  // McArdle and Anderson (2001): G = -1/2 J D^2 J, SS_total = trace(G), and the SS of a term is the change of trace(H G) when the term enters the model.
  // The sequential test adds GWG first and gender second.
  test("PERMANOVA with two terms gives the sequential R2 and F of the Gower matrix calculation, for Bray-Curtis and Jaccard", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, { r2: number[]; f: number[]; n: number }>>(
      python,
      `${load}
ok = md["GWG"].notna() & md["gender"].notna()
x = cnt[ok.to_numpy()].to_numpy(float)
m = md[ok.to_numpy()]
def gower(D):
    n = D.shape[0]; J = np.eye(n) - 1 / n
    return J @ (-0.5 * D ** 2) @ J
def dummies(s): return pd.get_dummies(s, drop_first=True).to_numpy(float)
def fit(G, X): return float(np.trace(X @ np.linalg.pinv(X.T @ X) @ X.T @ G))
def run(D):
    G = gower(D); n = len(G); sst = float(np.trace(G))
    one = np.column_stack([np.ones(n), dummies(m["GWG"])])
    two = np.column_stack([one, dummies(m["gender"])])
    s1, s12 = fit(G, one), fit(G, two)
    df1, df2, dfr = one.shape[1] - 1, 1, n - two.shape[1]
    ssr = sst - s12
    return {"r2": [s1 / sst, (s12 - s1) / sst], "f": [(s1 / df1) / (ssr / dfr), ((s12 - s1) / df2) / (ssr / dfr)], "n": n}
rel = x / x.sum(1, keepdims=True)
out = {"bray": run(squareform(pdist(rel, "braycurtis"))), "jaccard": run(squareform(pdist(x > 0, "jaccard")))}
print(json.dumps(out))`,
    );
    for (const [distance, want] of Object.entries(hand)) {
      const out = await micro.run("beta_diversity", { counts, metadata, formula: "GWG + gender", normalization: "relative", distance, permutations: 99, seed: 1 });
      expect(out.metrics.n_samples, distance).toBe(want.n);
      const table = await rows(out.table.path!);
      const c = (n: string) => table[0].indexOf(n);
      const terms = table.slice(1);
      expect(terms.map((r) => r[c("term")])).toEqual(["GWG", "gender", "Residual", "Total"]);
      [0, 1].forEach((i) => {
        expect(Math.abs(Number(terms[i][c("R2")]) - want.r2[i]), `${distance} R2 ${i}`).toBeLessThan(1e-9);
        expect(Math.abs(Number(terms[i][c("F")]) - want.f[i]), `${distance} F ${i}`).toBeLessThan(1e-7);
      });
    }
  });

  // Anderson (2006): the dispersion test is the ANOVA F of the distances to the group centre in principal coordinates. Positive axes add to the squared distance and negative axes subtract from it.
  // vegan betadisper uses the spatial median as the centre unless type is centroid. The tool does not set the type, so the F must equal the spatial median F (Weiszfeld iteration).
  test("the dispersion F of the PERMANOVA step uses the spatial median of each group", { timeout: slow }, async () => {
    const hand = await pyJson<{ median: number; centroid: number }>(
      python,
      `${load}
ok = md["GWG"].notna()
x = cnt[ok.to_numpy()].to_numpy(float)
g = md["GWG"][ok.to_numpy()].to_numpy()
rel = x / x.sum(1, keepdims=True)
D = squareform(pdist(rel, "braycurtis"))
n = len(D); J = np.eye(n) - 1 / n
w, v = np.linalg.eigh(-0.5 * J @ D ** 2 @ J)
keep = np.abs(w) > 1e-9
pts = v[:, keep] * np.sqrt(np.abs(w[keep])); pos = w[keep] > 0
def weiszfeld(y):
    c = y.mean(0)
    for _ in range(5000):
        d = np.maximum(np.sqrt(((y - c) ** 2).sum(1)), 1e-12)
        c2 = (y / d[:, None]).sum(0) / (1 / d).sum()
        if np.abs(c2 - c).max() < 1e-12: break
        c = c2
    return c2
def spread(center):
    z = np.zeros(n)
    for l in np.unique(g):
        k = g == l
        cp = center(pts[k][:, pos]); dp = ((pts[k][:, pos] - cp) ** 2).sum(1)
        dn = 0
        if (~pos).any():
            cn = center(pts[k][:, ~pos]); dn = ((pts[k][:, ~pos] - cn) ** 2).sum(1)
        z[k] = np.sqrt(np.maximum(dp - dn, 0))
    return stats.f_oneway(*[z[g == l] for l in np.unique(g)]).statistic
print(json.dumps({"median": float(spread(weiszfeld)), "centroid": float(spread(lambda y: y.mean(0)))}))`,
    );
    const out = await micro.run("beta_diversity", { counts, metadata, formula: "GWG", normalization: "relative", distance: "bray", permutations: 99, seed: 1 });
    expect(Math.abs(out.metrics.dispersion_f / hand.median - 1)).toBeLessThan(1e-3);
    expect(Math.abs(out.metrics.dispersion_f / hand.centroid - 1)).toBeGreaterThan(1e-3);
    expect(out.data.dispersion.center).toBe("spatial median");
    expect(out.summary).toContain("spatial median");
  });
});
