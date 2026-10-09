import sys

import h5py
import numpy as np
import pandas as pd
import scipy.sparse as sp
from scipy.spatial import cKDTree

root = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/weber2023-nnsvg-dlpfc/151673"
with h5py.File(root + "/151673_filtered_feature_bc_matrix.h5") as f:
    m = f["matrix"]
    barcodes = np.array([b.decode() for b in m["barcodes"][:]])
    names = np.array([b.decode() for b in m["features/name"][:]])
    shape = tuple(m["shape"][:])
    x = sp.csc_matrix((m["data"][:], m["indices"][:], m["indptr"][:]), shape=shape).T.tocsr()
pos = pd.read_csv(root + "/tissue_positions_list.txt", header=None, index_col=0).loc[barcodes]
inside = pos[1].values == 1
x, xy = x[inside], pos.loc[inside, [5, 4]].to_numpy(dtype=float)
n = x.shape[0]
print("spots in the tissue: %d (of %d in the file), genes in the file: %d" % (n, len(barcodes), x.shape[1]))
print("genes with at least one count: %d" % (np.asarray(x.sum(axis=0)).ravel() > 0).sum())

passes = np.asarray((x >= 3).sum(axis=0)).ravel() >= 0.005 * n
mito = np.array([g.startswith("MT-") for g in names])
print("genes with at least 3 counts in at least 0.5 percent of the spots: %d (%d without MT- genes)" % (passes.sum(), (passes & ~mito).sum()))
keep = passes & ~mito
x, genes = x[:, keep], names[keep]

total = np.asarray(x.sum(axis=1)).ravel()
logx = sp.diags(1e4 / total) @ x
logx.data = np.log1p(logx.data)
logx = logx.toarray()

tree = cKDTree(xy)
nearest = tree.query(xy, k=2)[0][:, 1]
pairs = tree.query_pairs(1.05 * np.median(nearest), output_type="ndarray")
w = sp.coo_matrix((np.ones(len(pairs)), (pairs[:, 0], pairs[:, 1])), shape=(n, n))
w = (w + w.T).tocsr()
degree = np.asarray(w.sum(axis=1)).ravel()
print("hexagonal grid: %d edges, neighbors per spot: median %d, minimum %d, maximum %d" % (w.nnz // 2, np.median(degree), degree.min(), degree.max()))
w = sp.diags(1.0 / degree) @ w

z = logx - logx.mean(axis=0)
moran = (n / w.sum()) * (z * (w @ z)).sum(axis=0) / (z**2).sum(axis=0)
order = np.argsort(-moran)
rank = {genes[j]: r + 1 for r, j in enumerate(order)}
print("Moran's I of %d genes. Top 5: %s" % (len(genes), ", ".join("%s %.3f" % (genes[j], moran[j]) for j in order[:5])))
for g in ["MOBP", "SNAP25", "PCP4", "HBB", "IGKC", "NPY"]:
    j = list(genes).index(g)
    print("%s: rank %d, I %.3f" % (g, rank[g], moran[j]))
