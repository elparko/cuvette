import sys

import anndata as ad
import numpy as np
import scipy.sparse as sp
from scipy.spatial import cKDTree

a = ad.read_h5ad(sys.argv[1])
xy = np.asarray(a.obsm["spatial"], dtype=float)
tree = cKDTree(xy)
nearest = tree.query(xy, k=2)[0][:, 1]
radius = 1.05 * np.median(nearest)
pairs = tree.query_pairs(radius, output_type="ndarray")
n = len(xy)
w = sp.coo_matrix((np.ones(len(pairs)), (pairs[:, 0], pairs[:, 1])), shape=(n, n))
w = (w + w.T).tocsr()
degree = np.asarray(w.sum(axis=1)).ravel()
w = sp.diags(1.0 / degree) @ w
print("spots %d, edges %d, neighbors per spot: median %d, minimum %d, maximum %d" % (n, w.nnz // 2, np.median(degree), degree.min(), degree.max()))

x = a.X.toarray() if sp.issparse(a.X) else np.asarray(a.X)
z = x - x.mean(axis=0)
num = np.asarray([(z[:, j] * (w @ z[:, j])).sum() for j in range(z.shape[1])])
den = (z**2).sum(axis=0)
moran = (n / w.sum()) * num / den
order = np.argsort(-moran)
print("Moran's I of the first %d genes, top 6:" % len(order))
for j in order[:6]:
    print("%s %.6f" % (a.var_names[j], moran[j]))
