import sys

import h5py
import numpy as np
import pandas as pd
import scipy.sparse as sp

h5, positions = sys.argv[1], sys.argv[2]
with h5py.File(h5) as f:
    m = f["matrix"]
    barcodes = [b.decode() for b in m["barcodes"][:]]
    names = [b.decode() for b in m["features/name"][:]]
    shape = tuple(m["shape"][:])
    x = sp.csc_matrix((m["data"][:], m["indices"][:], m["indptr"][:]), shape=shape).T.tocsr()
pos = pd.read_csv(positions, header=None, index_col=0).loc[barcodes]
inside = pos[1].values == 1
x = x[inside]
n = x.shape[0]
print("spots in the file %d, outside the tissue %d, inside %d, genes %d" % (len(barcodes), (~inside).sum(), n, len(names)))
counts_ge3 = np.asarray((x >= 3).sum(axis=0)).ravel()
need = 0.005 * n
keep = counts_ge3 >= need
mito = np.array([g.startswith("MT-") for g in names])
print("a spot counts for a gene with at least 3 counts; the gene needs %.3f spots" % need)
print("genes that pass: %d (of them with the prefix MT-: %d)" % (keep.sum(), (keep & mito).sum()))
print("genes that stay after the prefix filter: %d" % (keep & ~mito).sum())
keep2 = np.asarray((x >= 5).sum(axis=0)).ravel() >= 0.2 * n
print("with 5 counts in at least 20 percent of the spots (%.1f spots): %d genes pass, %d with the prefix MT-, %d stay after the prefix filter" % (0.2 * n, keep2.sum(), (keep2 & mito).sum(), (keep2 & ~mito).sum()))
