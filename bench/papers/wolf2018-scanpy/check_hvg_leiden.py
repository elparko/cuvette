import sys
from collections import Counter

import igraph as ig
import leidenalg
import numpy as np
import scipy.io
import scipy.sparse as sp
from scipy.sparse.linalg import svds
from sklearn.neighbors import NearestNeighbors

d = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/wolf2018-scanpy/filtered_gene_bc_matrices/hg19"

X = scipy.io.mmread(f"{d}/matrix.mtx").T.tocsr().astype(np.float64)
genes = [line.rstrip("\n").split("\t")[1] for line in open(f"{d}/genes.tsv")]
print(f"cells_at_load {X.shape[0]} genes_at_load {X.shape[1]}")

genes_per_cell = np.diff(X.indptr)
keep_cells = genes_per_cell >= 200
X = X[keep_cells]
cells_per_gene = np.asarray((X > 0).sum(0)).ravel()
keep_genes = cells_per_gene >= 3
X = X[:, keep_genes]
genes = [g for g, k in zip(genes, keep_genes) if k]
print(f"genes_after_min_cells {X.shape[1]}")

mito = np.array([g.startswith("MT-") for g in genes])
total = np.asarray(X.sum(1)).ravel()
pct_mt = np.asarray(X[:, mito].sum(1)).ravel() / total * 100
n_genes = np.diff(X.indptr)
keep = (n_genes < 2500) & (pct_mt < 5)
X, total, pct_mt = X[keep], total[keep], pct_mt[keep]
print(f"cells_after_qc {X.shape[0]}")

L = sp.diags(1e4 / total) @ X
L.data = np.log1p(L.data)

E = L.copy()
E.data = np.expm1(E.data)
mean = np.asarray(E.mean(0)).ravel()
sq = np.asarray(E.multiply(E).mean(0)).ravel()
n = E.shape[0]
var = (sq - mean**2) * n / (n - 1)
with np.errstate(divide="ignore", invalid="ignore"):
    disp = var / mean
disp[disp == 0] = np.nan
disp = np.log(disp)
lmean = np.log1p(mean)
edges = np.linspace(lmean.min(), lmean.max(), 21)
edges[0] -= (lmean.max() - lmean.min()) * 0.001
bins = np.clip(np.searchsorted(edges, lmean, side="left") - 1, 0, 19)
norm = np.full_like(disp, np.nan)
for b in range(20):
    m = bins == b
    vals = disp[m]
    ok = ~np.isnan(vals)
    if m.sum() == 0:
        continue
    if ok.sum() <= 1:
        norm[m] = 1.0 if ok.sum() == 1 else np.nan
        continue
    mu, sd = vals[ok].mean(), vals[ok].std(ddof=1)
    norm[m] = (vals - mu) / sd
hv = (lmean > 0.0125) & (lmean < 3) & (np.nan_to_num(norm, nan=-np.inf) > 0.5)
print(f"highly_variable_genes {int(hv.sum())}")

Y = L[:, hv].toarray()
D = np.column_stack([np.ones(len(total)), total, pct_mt])
beta, *_ = np.linalg.lstsq(D, Y, rcond=None)
Y = Y - D @ beta + beta[0]
Y = (Y - Y.mean(0)) / Y.std(0, ddof=1)
Y = np.minimum(Y, 10)

Yc = Y - Y.mean(0)
U, S, _ = svds(Yc, k=50, random_state=0)
order = np.argsort(S)[::-1]
pcs = (U * S)[:, order][:, :40]

k = 10
dist, idx = NearestNeighbors(n_neighbors=k).fit(pcs).kneighbors(pcs)
rho = np.array([r[r > 0][0] if (r > 0).any() else 0.0 for r in dist])
target = np.log2(k)
sigma = np.zeros(len(pcs))
for i in range(len(pcs)):
    lo, hi, mid = 0.0, np.inf, 1.0
    for _ in range(64):
        dd = dist[i, 1:] - rho[i]
        psum = np.where(dd > 0, np.exp(-dd / mid), 1.0).sum()
        if abs(psum - target) < 1e-5:
            break
        if psum > target:
            hi = mid
            mid = (lo + hi) / 2
        else:
            lo = mid
            mid = mid * 2 if hi == np.inf else (lo + hi) / 2
    sigma[i] = max(mid, 1e-3 * dist[i].mean()) if rho[i] > 0 else mid
rows, cols, vals = [], [], []
for i in range(len(pcs)):
    for j in range(k):
        if idx[i, j] == i:
            continue
        dd = dist[i, j] - rho[i]
        rows.append(i)
        cols.append(idx[i, j])
        vals.append(1.0 if dd <= 0 else np.exp(-dd / sigma[i]))
A = sp.csr_matrix((vals, (rows, cols)), shape=(len(pcs), len(pcs)))
C = (A + A.T - A.multiply(A.T)).tocoo()

upper = C.row < C.col
g = ig.Graph(n=len(pcs), edges=list(zip(C.row[upper], C.col[upper])), directed=False)
w = C.data[upper]
counts = []
for seed in range(10):
    part = leidenalg.find_partition(g, leidenalg.RBConfigurationVertexPartition, weights=w, resolution_parameter=0.7, seed=seed, n_iterations=-1)
    counts.append(len(part))
print(f"leiden_clusters seed 0: {counts[0]}")
print(f"leiden_clusters over seeds 0 to 9: {dict(sorted(Counter(counts).items()))}")
