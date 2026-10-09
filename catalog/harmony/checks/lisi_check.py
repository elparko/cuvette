import sys

import numpy as np
from sklearn.neighbors import NearestNeighbors

import anndata as ad

a = ad.read_h5ad(sys.argv[1])
x = np.asarray(a.obsm["X_lisi"], dtype=np.float64)
perplexity = 30.0


def lisi(x, labels, perplexity):
    n = len(x)
    k = min(int(perplexity * 3), n - 1)
    dist, idx = NearestNeighbors(n_neighbors=k + 1).fit(x).kneighbors(x)
    dist, idx = dist[:, 1:], idx[:, 1:]
    codes = np.unique(labels, return_inverse=True)[1]
    out = np.zeros(n)
    target = np.log(perplexity)
    for i in range(n):
        d2 = dist[i]
        beta, lo, hi = 1.0, -np.inf, np.inf
        for _ in range(50):
            p = np.exp(-d2 * beta)
            s = p.sum()
            if s == 0:
                s = 1e-12
            h = np.log(s) + beta * (d2 * p).sum() / s
            if abs(h - target) < 1e-5:
                break
            if h > target:
                lo = beta
                beta = beta * 2 if hi == np.inf else (beta + hi) / 2
            else:
                hi = beta
                beta = beta / 2 if lo == -np.inf else (beta + lo) / 2
        p = np.exp(-d2 * beta)
        p = p / p.sum()
        per_label = np.bincount(codes[idx[i]], weights=p, minlength=codes.max() + 1)
        out[i] = 1.0 / (per_label**2).sum()
    return out


for name in ["label1", "label2"]:
    mine = lisi(x, a.obs[name].astype(str).values, perplexity)
    ref = a.obs["r_lisi_" + name].to_numpy()
    print("%s: own median %.4f mean %.4f | R reference median %.4f mean %.4f | max abs diff %.4f | mean abs diff %.4f" % (
        name, np.median(mine), mine.mean(), np.median(ref), ref.mean(), np.abs(mine - ref).max(), np.abs(mine - ref).mean()))
