import sys

import anndata as ad
import numpy as np
import scipy.sparse as sp
from sklearn.neighbors import NearestNeighbors

a = ad.read_h5ad(sys.argv[1])
xy = np.asarray(a.obsm["spatial"], dtype=float)
labels = a.obs["cell type"].astype(str).values
cats, codes = np.unique(labels, return_inverse=True)
k = len(cats)
n = len(xy)
nn = NearestNeighbors(n_neighbors=10 + 1).fit(xy).kneighbors(xy, return_distance=False)[:, 1:]
rows = np.repeat(np.arange(n), 10)
adj = sp.csr_matrix((np.ones(n * 10), (rows, nn.ravel())), shape=(n, n))
print("cells %d, groups %d, directed neighbor links %d" % (n, k, adj.nnz))


def pair_counts(c):
    onehot = sp.csr_matrix((np.ones(n), (np.arange(n), c)), shape=(n, k))
    return (onehot.T @ adj @ onehot).toarray()


observed = pair_counts(codes)
rng = np.random.default_rng(1)
perm = np.stack([pair_counts(rng.permutation(codes)) for _ in range(1000)])
z = (observed - perm.mean(axis=0)) / perm.std(axis=0)
np.set_printoptions(linewidth=200, precision=2, suppress=True)
print("groups: " + ", ".join(cats[:4]) + ", ...")
print("observed pair counts of the links, first 3 x 3:")
print(observed[:3, :3].astype(int))
print("z score, first 3 x 3:")
print(z[:3, :3])
print("largest z score between two different groups: %.2f (%s and %s)" % (max((z[i, j], cats[i], cats[j]) for i in range(k) for j in range(i + 1, k))))
print("smallest z score between two different groups: %.2f (%s and %s)" % (min((z[i, j], cats[i], cats[j]) for i in range(k) for j in range(i + 1, k))))
print("links between cells of the same group: %d of %d" % (np.trace(observed), observed.sum()))
print("links between T cells and endothelial cells: %d" % observed[list(cats).index("T cells"), list(cats).index("endothelial")])
