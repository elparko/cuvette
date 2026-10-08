import sys

import numpy as np
import scanpy as sc

MARKERS = ["CD3D", "CD3E", "IL7R", "CCR7", "S100A4", "CD14", "LYZ", "MS4A1", "CD8A", "GNLY", "NKG7", "FCGR3A",
           "MS4A7", "FCER1A", "CST3", "PPBP", "CD79A", "HLA-DRA", "CD74", "GZMB", "CST7", "LDHB", "NKG7", "FTL"]

adata = sc.read_10x_mtx(sys.argv[1], var_names="gene_symbols")
rng = np.random.default_rng(0)
cells = np.sort(rng.choice(adata.n_obs, size=300, replace=False))
small = adata[cells].copy()
totals = np.asarray(small.X.sum(axis=0)).ravel()
keep = {i for i, g in enumerate(small.var_names) if g.startswith("MT-") or g in MARKERS}
for i in np.argsort(-totals):
    if len(keep) >= 1000:
        break
    keep.add(int(i))
small = small[:, sorted(keep)].copy()
small.write_h5ad(sys.argv[2], compression="gzip")
print(small)
