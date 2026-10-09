import sys

import numpy as np
import pandas as pd
from scipy.spatial.distance import pdist, squareform
from scipy.stats import kruskal

data = sys.argv[1]
otu = pd.read_csv(f"{data}/limit_otutable.csv")
md = pd.read_csv(f"{data}/limit_metadata.csv").set_index("id")
counts = otu.set_index("OTU")[list(md.index)].T.to_numpy(float)
print(f"samples {counts.shape[0]} features {counts.shape[1]}")
depth = counts.sum(1)
print(f"reads min {depth.min():.0f} median {np.median(depth):.0f} max {depth.max():.0f}")
print(f"fraction zero {np.mean(counts == 0):.6f}")

p = counts / depth[:, None]
shannon = np.array([-(r[r > 0] * np.log(r[r > 0])).sum() for r in p])
observed = (counts > 0).sum(1)
print(f"shannon sample 1 {shannon[0]:.6f}")
print(f"mean observed {observed.mean():.6f}")
print(f"mean shannon {shannon.mean():.6f}")

gwg = md["GWG"].replace("", np.nan)
ok = gwg.notna().to_numpy()
groups = [shannon[ok & (gwg == g).to_numpy()] for g in ["adequate", "excess", "low"]]
h, pv = kruskal(*groups)
print(f"kruskal shannon by GWG, {int(ok.sum())} samples: H {h:.6f} p {pv:.6f}")

keep = ok
rel = p[keep]
lab = gwg[keep].to_numpy()
n = len(lab)
D2 = squareform(pdist(rel, "braycurtis")) ** 2
levels = np.unique(lab)


def pseudo_f(g):
    ss_total = D2[np.triu_indices(n, 1)].sum() / n
    ss_within = 0.0
    for level in levels:
        idx = np.where(g == level)[0]
        sub = D2[np.ix_(idx, idx)]
        ss_within += sub[np.triu_indices(len(idx), 1)].sum() / len(idx)
    ss_between = ss_total - ss_within
    a = len(levels)
    return (ss_between / (a - 1)) / (ss_within / (n - a)), ss_between / ss_total


f_obs, r2 = pseudo_f(lab)
print(f"permanova bray relative GWG, {n} samples: R2 {r2:.6f} F {f_obs:.6f}")
rng = np.random.default_rng(1)
hits = sum(pseudo_f(rng.permutation(lab))[0] >= f_obs - 1e-12 for _ in range(999))
print(f"permanova p, 999 permutations, numpy seed 1: {(hits + 1) / 1000:.3f}")

pseudo = 1.0
lg = np.log(counts[keep] + pseudo)
clr = lg - lg.mean(1, keepdims=True)
D2 = squareform(pdist(clr, "euclidean")) ** 2
f_obs, r2 = pseudo_f(lab)
print(f"permanova aitchison (clr, pseudo-count 1) GWG, {n} samples: R2 {r2:.6f} F {f_obs:.6f}")

below = int((depth < 50000).sum())
print(f"samples below 50000 reads {below}, kept {len(depth) - below}")
