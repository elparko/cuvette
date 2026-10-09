import sys

import numpy as np
import pandas as pd
from scipy.spatial.distance import pdist, squareform
from scipy.stats import kruskal

data = sys.argv[1]
otu = pd.read_csv(f"{data}/otutable.csv")
md = pd.read_csv(f"{data}/metadata.csv").set_index("id")
md = md[md["birth_type"] == "natural"]
md["GWG"] = md["GWG"].replace("", np.nan)
md = md[md["GWG"].notna()]
counts = otu.set_index("OTU")[list(md.index)].T.to_numpy(float)
print(f"vaginal births with a GWG category {len(md)}")
print("GWG categories " + " ".join(f"{k} {v}" for k, v in md["GWG"].value_counts().sort_index().items()))

p = counts / counts.sum(1, keepdims=True)
shannon = np.array([-(r[r > 0] * np.log(r[r > 0])).sum() for r in p])
levels = ["adequate", "excess", "low"]
groups = [shannon[(md["GWG"] == g).to_numpy()] for g in levels]
h, pv = kruskal(*groups)
print(f"shannon (natural log) by GWG, Kruskal-Wallis: H {h:.6f} p {pv:.6f}")

lab = md["GWG"].to_numpy()
n = len(lab)
D2 = squareform(pdist(p, "braycurtis")) ** 2


def pseudo_f(g):
    ss_total = D2[np.triu_indices(n, 1)].sum() / n
    ss_within = 0.0
    for level in levels:
        idx = np.where(g == level)[0]
        sub = D2[np.ix_(idx, idx)]
        ss_within += sub[np.triu_indices(len(idx), 1)].sum() / len(idx)
    ss_between = ss_total - ss_within
    return (ss_between / (len(levels) - 1)) / (ss_within / (n - len(levels))), ss_between / ss_total


f_obs, r2 = pseudo_f(lab)
print(f"PERMANOVA Bray-Curtis on relative abundances by GWG: R2 {r2:.6f} F {f_obs:.6f}")
rng = np.random.default_rng(1)
hits = sum(pseudo_f(rng.permutation(lab))[0] >= f_obs - 1e-12 for _ in range(999))
print(f"p with 999 permutations, numpy seed 1: {(hits + 1) / 1000:.3f}")
