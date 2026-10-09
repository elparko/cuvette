import sys

import h5py
import numpy as np
import pandas as pd
import scanpy as sc
import scipy.sparse as sp

hne, imc, out = sys.argv[1:4]

a = sc.read_h5ad(hne)
genes = a[:, a.var.highly_variable].var_names.values[:100]
b = a[:, genes].copy()
b.obs = b.obs[["cluster"]].copy()
b.obs["cluster"] = b.obs["cluster"].astype(str)
b.var = b.var[[]].copy()
b.uns = {}
b.raw = None
for k in ["X_pca", "X_umap"]:
    del b.obsm[k]
b.varm.clear()
b.obsp.clear()
b.layers.clear()
b.write_h5ad(out + "/visium_hne_100hvg.h5ad", compression="gzip")
print(b)

c = sc.read_h5ad(imc)
c.obs["cell type"] = c.obs["cell type"].astype(str)
c.uns = {}
c.write_h5ad(out + "/imc_cells.h5ad", compression="gzip")
print(c)

rng = np.random.default_rng(0)
n_spots, n_genes = 300, 400
rows, cols = np.divmod(np.arange(n_spots), 20)
barcodes = np.array(["SYN%04d-1" % i for i in range(n_spots)])
names = np.array(["MT-G%d" % i if i < 13 else "GENE%d" % i for i in range(n_genes)])
means = rng.gamma(0.6, 1.2, size=n_genes) * 0.6
counts = rng.poisson(means[None, :] * rng.gamma(8, 1 / 8, size=(n_spots, 1)))
x = sp.csc_matrix(counts.T)
with h5py.File(out + "/visium_tiny.h5", "w") as f:
    m = f.create_group("matrix")
    m.create_dataset("barcodes", data=np.array(barcodes, dtype="S"))
    m.create_dataset("data", data=x.data.astype(np.int32))
    m.create_dataset("indices", data=x.indices.astype(np.int64))
    m.create_dataset("indptr", data=x.indptr.astype(np.int64))
    m.create_dataset("shape", data=np.array(x.shape, dtype=np.int32))
    ft = m.create_group("features")
    ft.create_dataset("id", data=np.array(["ENSG%08d" % i for i in range(n_genes)], dtype="S"))
    ft.create_dataset("name", data=np.array(names, dtype="S"))
    ft.create_dataset("feature_type", data=np.array(["Gene Expression"] * n_genes, dtype="S"))
    ft.create_dataset("genome", data=np.array(["GRCh38"] * n_genes, dtype="S"))
pos = pd.DataFrame({"in_tissue": 1, "row": rows, "col": cols, "pxl_row": rows * 100 + 50, "pxl_col": cols * 100 + 50}, index=barcodes)
pos.iloc[:5, 0] = 0
pos.to_csv(out + "/visium_tiny_positions.txt", header=False)
print("synthetic tiny sample", counts.shape, "outside tissue", int((pos["in_tissue"] == 0).sum()))
