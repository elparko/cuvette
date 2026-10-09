import sys

import harmonypy
import numpy as np
import pandas as pd
import scipy.io
import scipy.sparse as sp
from scipy.sparse.linalg import svds
from sklearn.neighbors import NearestNeighbors

root = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/korsunsky2019-harmony"
names = ["jurkat", "t293", "mix"]
mats, genes, batch = [], None, []
for n in names:
    d = "%s/%s/filtered_matrices_mex/hg19" % (root, n)
    X = scipy.io.mmread(d + "/matrix.mtx").T.tocsr().astype(np.float64)
    g = [line.rstrip("\n").split("\t")[1] for line in open(d + "/genes.tsv")]
    genes = genes or g
    mats.append(X)
    batch += [n] * X.shape[0]
X = sp.vstack(mats).tocsr()
batch = np.array(batch)
print("cells at load: " + ", ".join("%s %d" % (n, (batch == n).sum()) for n in names), "total", X.shape[0])

keep_genes = np.asarray((X > 0).sum(0)).ravel() >= 3
X = X[:, keep_genes]
genes = [g for g, k in zip(genes, keep_genes) if k]
total = np.asarray(X.sum(1)).ravel()
mt = np.array([g.startswith("MT-") for g in genes])
pct_mt = np.asarray(X[:, mt].sum(1)).ravel() / total * 100
keep = (np.diff(X.indptr) >= 500) & (pct_mt < 20)
X, total, batch = X[keep], total[keep], batch[keep]
print("genes with at least 3 cells %d" % X.shape[1])
print("cells after quality control: " + ", ".join("%s %d" % (n, (batch == n).sum()) for n in names), "total", X.shape[0])

L = sp.diags(1e4 / total) @ X
L.data = np.log1p(L.data)
E = L.copy()
E.data = np.expm1(E.data)
mean = np.asarray(E.mean(0)).ravel()
var = (np.asarray(E.multiply(E).mean(0)).ravel() - mean**2) * X.shape[0] / (X.shape[0] - 1)
with np.errstate(divide="ignore", invalid="ignore"):
    disp = np.log(np.where(mean > 0, var / mean, np.nan))
lmean = np.log1p(mean)
edges = np.linspace(lmean.min(), lmean.max(), 21)
edges[0] -= 1e-3 * (lmean.max() - lmean.min())
bins = np.clip(np.searchsorted(edges, lmean, side="left") - 1, 0, 19)
norm = np.full_like(disp, np.nan)
for b in range(20):
    m = bins == b
    v = disp[m]
    ok = ~np.isnan(v)
    if ok.sum() > 1:
        norm[m] = (v - v[ok].mean()) / v[ok].std(ddof=1)
hv = np.argsort(-np.nan_to_num(norm, nan=-np.inf))[:1000]

Y = L[:, hv].toarray()
Y = (Y - Y.mean(0)) / Y.std(0, ddof=1)
Y = np.minimum(Y, 10)
U, S, _ = svds(Y - Y.mean(0), k=30, random_state=0)
order = np.argsort(S)[::-1]
pcs = (U * S)[:, order]

meta = pd.DataFrame({"dataset": batch})
ho = harmonypy.run_harmony(pcs, meta, "dataset", theta=2.0, random_state=0)
corrected = np.asarray(ho.Z_corr)

logx = L.toarray()
ref_j = logx[batch == "jurkat"].mean(0)
ref_t = logx[batch == "t293"].mean(0)
cj = np.array([np.corrcoef(r, ref_j)[0, 1] for r in logx])
ct = np.array([np.corrcoef(r, ref_t)[0, 1] for r in logx])
line = np.where(cj > ct, "jurkat", "t293")
print("cells labeled in the mix: jurkat %d, t293 %d" % (((batch == "mix") & (line == "jurkat")).sum(), ((batch == "mix") & (line == "t293")).sum()))


def lisi(x, labels, perplexity=30.0):
    k = int(perplexity * 3)
    dist, idx = NearestNeighbors(n_neighbors=k + 1).fit(x).kneighbors(x)
    dist, idx = dist[:, 1:], idx[:, 1:]
    codes = np.unique(labels, return_inverse=True)[1]
    out = np.zeros(len(x))
    target = np.log(perplexity)
    for i in range(len(x)):
        d = dist[i]
        beta, lo, hi = 1.0, -np.inf, np.inf
        for _ in range(50):
            p = np.exp(-d * beta)
            s = max(p.sum(), 1e-12)
            h = np.log(s) + beta * (d * p).sum() / s
            if abs(h - target) < 1e-5:
                break
            if h > target:
                lo = beta
                beta = beta * 2 if hi == np.inf else (beta + hi) / 2
            else:
                hi = beta
                beta = beta / 2 if lo == -np.inf else (beta + lo) / 2
        p = np.exp(-d * beta)
        p /= p.sum()
        out[i] = 1.0 / (np.bincount(codes[idx[i]], weights=p, minlength=codes.max() + 1) ** 2).sum()
    return out


for rep, x in (("before Harmony", pcs), ("after Harmony", corrected)):
    for label, v in (("iLISI (dataset)", batch), ("cLISI (cell line)", line)):
        r = lisi(x, v)
        print("%s %s: median %.3f, 2.5th to 97.5th percentile %.2f to %.2f" % (rep, label, np.median(r), *np.quantile(r, [0.025, 0.975])))
