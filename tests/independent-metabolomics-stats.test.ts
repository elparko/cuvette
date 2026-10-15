import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("metabolomics-stats");
const python = join(homedir(), ".cuvette/envs/biostats/bin/python");
const data = join(CATALOG, "metabolomics-stats/data");
const sacurine = join(data, "sacurine.csv");
const tiny = join(data, "tiny_table.csv");
const three = join(data, "tiny_three_groups.csv");
const slow = 600_000;
const cells = (text: string) => text.trim().split("\n").map((l) => [...l.matchAll(/("([^"]|"")*"|[^,]*)(,|$)/g)].filter((m, i, all) => m[0] !== "" || i < all.length - 1).map((m) => m[1].replace(/^"|"$/g, "").replace(/""/g, '"')));

describe.skipIf(!found || !existsSync(python))("metabolomics-stats against numpy, scipy and scikit-learn", () => {
  let metab: OpenAdapter;
  beforeAll(async () => {
    metab = await openAdapter("metabolomics-stats");
  });
  afterAll(async () => {
    await metab?.close();
  });

  const scaled = `
import numpy as np, pandas as pd
from sklearn.cross_decomposition import PLSRegression
sac = pd.read_csv(${JSON.stringify(sacurine)})
feat = list(sac.columns[4:])
X0 = sac[feat].to_numpy(float)
def scale(v, how):
    c = v - v.mean(0)
    sd = v.std(0, ddof=1)
    return c / sd if how == "standard" else c / np.sqrt(sd) if how == "pareto" else c
def pls(X, y, n):
    m = PLSRegression(n_components=n, scale=False).fit(X, y)
    T, P, W, Q = m.x_scores_, m.x_loadings_, m.x_weights_, m.y_loadings_
    r2x = 1 - ((X - T @ P.T) ** 2).sum() / (X ** 2).sum()
    yy = y.reshape(len(y), -1)
    r2y = 1 - ((yy - T @ Q.T) ** 2).sum() / (yy ** 2).sum()
    ss = (Q[0] ** 2) * (T ** 2).sum(0)
    vip = np.sqrt(X.shape[1] * ((W ** 2) @ ss) / ss.sum())
    return r2x, r2y, vip
`;

  // Wold, Sjostrom and Eriksson (2001) PLS by NIPALS in scikit-learn. VIP: sqrt(p * sum_a(w_a^2 * SS_a) / sum_a(SS_a)) with SS_a = q_a^2 t_a't_a.
  // The pareto scaling divides the centred feature by the square root of its standard deviation (van den Berg 2006).
  test("PLS-DA with pareto scaling gives the R2X, the R2Y and the VIP scores of scikit-learn", { timeout: slow }, async () => {
    const hand = await pyJson<{ r2x: number; r2y: number; vip: number[]; top: string; n_vip: number }>(
      python,
      `${scaled}
X = scale(X0, "pareto")
y = np.where(sac.gender == "M", 1.0, 0.0)
r2x, r2y, vip = pls(X, y - y.mean(), 3)
print(json.dumps({"r2x": r2x, "r2y": r2y, "vip": vip.tolist(), "top": feat[int(np.argmax(vip))], "n_vip": int((vip >= 1).sum())}))`,
    );
    const out = await metab.run("fit_multivariate_model", { data: sacurine, response_column: "gender", meta_columns: "age,bmi", model: "pls", scale: "pareto", n_predictive: 3, permutations: 0, vip_cutoff: 1 });
    expect(Math.abs(out.metrics.r2x - hand.r2x)).toBeLessThan(6e-4);
    expect(Math.abs(out.metrics.r2y - hand.r2y)).toBeLessThan(6e-4);
    expect(out.metrics.n_vip_above_cutoff).toBe(hand.n_vip);
    expect(out.table.rows[0][0]).toBe(hand.top);
    expect(Math.abs((out.table.rows[0][2] as number) - Math.max(...hand.vip))).toBeLessThan(1e-3);
  });

  // Trygg and Wold (2002): an OPLS model with k orthogonal components predicts like the PLS model with k + 1 components. The ropls vignette shows the same R2X and R2Y for both on the sacurine table.
  test("OPLS-DA with k orthogonal components has the R2X and the R2Y of the PLS model with k + 1 components", { timeout: slow }, async () => {
    const hand = await pyJson<{ r2x: number; r2y: number }[]>(
      python,
      `${scaled}
X = scale(X0, "standard")
y = np.where(sac.gender == "M", 1.0, 0.0)
print(json.dumps([dict(zip(("r2x", "r2y"), pls(X, y - y.mean(), k)[:2])) for k in (1, 2, 3)]))`,
    );
    for (const n of [0, 1, 2]) {
      const out = await metab.run("fit_multivariate_model", { data: sacurine, response_column: "gender", meta_columns: "age,bmi", model: "opls", scale: "standard", n_predictive: 1, n_orthogonal: n, permutations: 0 });
      expect(out.metrics.n_orthogonal).toBe(n);
      expect(Math.abs(out.metrics.r2y - hand[n].r2y), `orthogonal ${n}`).toBeLessThan(6e-4);
      expect(Math.abs(out.metrics.r2x - hand[n].r2x), `orthogonal ${n}`).toBeLessThan(6e-4);
    }
  });

  test("PLS regression on age gives the R2X and the R2Y of scikit-learn", { timeout: slow }, async () => {
    const hand = await pyJson<{ r2x: number; r2y: number }>(
      python,
      `${scaled}
X = scale(X0, "standard")
y = sac["age"].to_numpy(float)
r2x, r2y, vip = pls(X, y - y.mean(), 2)
print(json.dumps({"r2x": r2x, "r2y": r2y}))`,
    );
    const out = await metab.run("fit_multivariate_model", { data: sacurine, response_column: "age", meta_columns: "gender,bmi", model: "pls", scale: "standard", n_predictive: 2, permutations: 0 });
    expect(Math.abs(out.metrics.r2x - hand.r2x)).toBeLessThan(6e-4);
    expect(Math.abs(out.metrics.r2y - hand.r2y)).toBeLessThan(6e-4);
  });

  // The tiny table has one zero (s1, m5) and one empty cell (s5, m5). The reference of the probabilistic quotient normalization is the median of the group B samples after the total area step (Dieterle 2006).
  test("the preparation agrees with numpy for each imputation, the group reference of PQN and each transform", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, number[][]>>(
      python,
      `
import numpy as np, pandas as pd
d = pd.read_csv(${JSON.stringify(tiny)})
X = d[["m1", "m2", "m3", "m4", "m5"]].to_numpy(float)
def fill(x, how):
    x = x.copy()
    for j in range(x.shape[1]):
        v = x[:, j]
        bad = np.isnan(v)
        pos = v[~bad & (v > 0)]
        v[bad] = {"min": pos.min(), "median": np.nanmedian(v), "zero": 0.0, "half_min": pos.min() / 2}[how]
    return x
def pqn(x, ref_rows):
    tot = x.sum(1)
    tf = tot / np.median(tot)
    xi = x / tf[:, None]
    ref = np.median(xi[ref_rows], 0)
    f = tf * np.median(xi / ref, 1)
    return x / f[:, None]
out = {}
Z = X.copy(); Z[Z == 0] = np.nan
for how in ("min", "median", "zero"):
    out["imp_" + how] = fill(Z, how).tolist()
base = fill(Z, "half_min")
grp = d["group"].to_numpy()
out["pqn_B"] = pqn(base, grp == "B").tolist()
out["sqrt"] = np.sqrt(base).tolist()
out["log2"] = np.log2(base).tolist()
out["zero_kept"] = fill(np.where(np.isnan(X), np.nan, X), "half_min").tolist()
print(json.dumps(out))`,
    );
    const cases: [string, Record<string, unknown>][] = [
      ["imp_min", { zero_as_missing: true, imputation: "min" }],
      ["imp_median", { zero_as_missing: true, imputation: "median" }],
      ["imp_zero", { zero_as_missing: true, imputation: "zero" }],
      ["pqn_B", { zero_as_missing: true, imputation: "half_min", normalization: "pqn", pqn_reference: "B" }],
      ["sqrt", { zero_as_missing: true, imputation: "half_min", transform: "sqrt" }],
      ["log2", { zero_as_missing: true, imputation: "half_min", transform: "log2" }],
      ["zero_kept", { zero_as_missing: false, imputation: "half_min" }],
    ];
    for (const [key, args] of cases) {
      const out = await metab.run("prepare_metabolite_table", { data: tiny, group_column: "group", min_detect_fraction: 0, ...args });
      const rows = cells(await readFile(out.data.prepared_file, "utf8")).slice(1);
      rows.forEach((r, i) => r.slice(2).forEach((v, j) => expect(Math.abs(Number(v) - hand[key][i][j]), `${key} ${i} ${j}`).toBeLessThan(1e-6)));
    }
  });

  const adjusted = (p: number[], how: string) => {
    const n = p.length;
    const o = p.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const out = new Array<number>(n);
    if (how === "bonferroni") p.forEach((v, i) => (out[i] = Math.min(1, v * n)));
    else if (how === "holm") {
      let run = 0;
      o.forEach((i, k) => {
        run = Math.max(run, (n - k) * p[i]);
        out[i] = Math.min(1, run);
      });
    } else {
      const c = how === "BY" ? Array.from({ length: n }, (_, k) => 1 / (k + 1)).reduce((a, b) => a + b, 0) : 1;
      let run = 1;
      for (let k = n - 1; k >= 0; k--) {
        run = Math.min(run, (p[o[k]] * n * c) / (k + 1));
        out[o[k]] = Math.min(1, run);
      }
    }
    return out;
  };

  // Bonferroni, Holm (1979) and Benjamini and Yekutieli (2001) adjustments from their formulas. Pearson correlation, Kruskal-Wallis and Welch from scipy.
  test("the Pearson and Kruskal-Wallis tests and the adjustments agree with scipy and the formulas", { timeout: slow }, async () => {
    const hand = await pyJson<{ pearson: number[]; kruskal: number[]; r: number[] }>(
      python,
      `
import numpy as np, pandas as pd
from scipy import stats
sac = pd.read_csv(${JSON.stringify(sacurine)})
feat = list(sac.columns[4:])
pr = [stats.pearsonr(sac[f], sac["age"]) for f in feat]
t3 = pd.read_csv(${JSON.stringify(three)})
kr = [stats.kruskal(*[t3.loc[t3.group == g, f] for g in "ABC"]).pvalue for f in ["m1", "m2", "m3", "m4"]]
print(json.dumps({"pearson": [float(x.pvalue) for x in pr], "r": [float(x.statistic) for x in pr], "kruskal": kr}))`,
    );
    const names = cells(await readFile(sacurine, "utf8"))[0].slice(4);
    for (const adjust of ["bonferroni", "holm", "BY", "BH"]) {
      const out = await metab.run("test_features", { data: sacurine, response_column: "age", meta_columns: "gender,bmi", test: "pearson", values_are: "log10", adjust, fdr: 0.05 });
      const rows = cells(await readFile(out.data.results_file, "utf8"));
      const col = (n: string) => rows[0].indexOf(n);
      const byName = new Map(rows.slice(1).map((r) => [r[col("feature")], r]));
      const want = adjusted(hand.pearson, adjust);
      names.forEach((n, i) => {
        const r = byName.get(n)!;
        expect(Math.abs(Number(r[col("p_value")]) / hand.pearson[i] - 1), n).toBeLessThan(1e-6);
        expect(Math.abs(Number(r[col("statistic")]) - hand.r[i]), n).toBeLessThan(1e-6);
        expect(Math.abs(Number(r[col("adj_p")]) / want[i] - 1), `${adjust} ${n}`).toBeLessThan(1e-6);
      });
      expect(out.metrics.n_significant).toBe(want.filter((v) => v < 0.05).length);
    }
    const kw = await metab.run("test_features", { data: three, response_column: "group", test: "kruskal", values_are: "linear", adjust: "none", fdr: 0.05 });
    const rows = cells(await readFile(kw.data.results_file, "utf8"));
    const col = (n: string) => rows[0].indexOf(n);
    for (const r of rows.slice(1)) {
      const i = Number(r[col("feature")].slice(1)) - 1;
      expect(Math.abs(Number(r[col("p_value")]) - hand.kruskal[i])).toBeLessThan(1e-9);
    }
  });

  // log2 fold change: the log2 of the ratio of means for linear values, and the difference of means for log values (a log10 difference d is d * log2(10) in log2 units).
  test("the fold change of linear, log2 and log10 tables agrees with the means and the fold change filter keeps the direction", { timeout: slow }, async () => {
    const hand = await pyJson<{ linear: Record<string, number>; log10: Record<string, number>; n_up: number; n_down: number }>(
      python,
      `
import numpy as np, pandas as pd
from scipy import stats
sac = pd.read_csv(${JSON.stringify(sacurine)})
feat = list(sac.columns[4:])
m = (sac.gender == "M").to_numpy()
lin = 10 ** sac[feat]
d10 = {f: float((sac.loc[m, f].mean() - sac.loc[~m, f].mean()) * np.log2(10)) for f in feat}
dl = {f: float(np.log2(lin.loc[m, f].mean() / lin.loc[~m, f].mean())) for f in feat}
p = np.array([stats.ttest_ind(sac.loc[m, f], sac.loc[~m, f], equal_var=False).pvalue for f in feat])
o = np.argsort(p); n = len(p); q = np.empty(n); q[o] = np.minimum(1, np.minimum.accumulate((p[o] * n / np.arange(1, n + 1))[::-1])[::-1])
sig = (q < 0.05) & (np.abs([d10[f] for f in feat]) >= 1)
up = int((sig & (np.array([d10[f] for f in feat]) > 0)).sum()); down = int(sig.sum()) - up
print(json.dumps({"linear": dl, "log10": d10, "n_up": up, "n_down": down}))`,
    );
    const out = await metab.run("test_features", { data: sacurine, response_column: "gender", meta_columns: "age,bmi", test: "welch", values_are: "log10", group_a: "M", group_b: "F", adjust: "BH", fdr: 0.05, min_abs_log2fc: 1 });
    const rows = cells(await readFile(out.data.results_file, "utf8"));
    const col = (n: string) => rows[0].indexOf(n);
    for (const r of rows.slice(1)) expect(Math.abs(Number(r[col("log2fc")]) - hand.log10[r[col("feature")]]), r[col("feature")]).toBeLessThan(1e-9);
    expect(out.metrics.n_up).toBe(hand.n_up);
    expect(out.metrics.n_down).toBe(hand.n_down);
    const linearFile = join(data, "sacurine_linear.csv");
    const lin = await metab.run("test_features", { data: linearFile, response_column: "gender", meta_columns: "age,bmi", test: "welch", values_are: "linear", group_a: "M", group_b: "F", adjust: "BH", fdr: 0.05 });
    const linRows = cells(await readFile(lin.data.results_file, "utf8"));
    const lc = (n: string) => linRows[0].indexOf(n);
    for (const r of linRows.slice(1)) expect(Math.abs(Number(r[lc("log2fc")]) - hand.linear[r[lc("feature")]]), r[lc("feature")]).toBeLessThan(1e-6);
  });
});
