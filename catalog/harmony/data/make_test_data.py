import gzip
import sys

import anndata as ad
import numpy as np
import pandas as pd
import scanpy as sc
import scipy.sparse as sp

harmonypy_data, cell_lines, out = sys.argv[1], sys.argv[2], sys.argv[3]


def tsv(name):
    return pd.read_csv(gzip.open("%s/%s.tsv.gz" % (harmonypy_data, name), "rt"), sep="\t")


pcs = tsv("pbmc_3500_pcs").to_numpy(dtype=np.float32)
ref = tsv("pbmc_3500_pcs_harmony2").to_numpy(dtype=np.float32)
meta = tsv("pbmc_3500_meta")
a = ad.AnnData(sp.csr_matrix((len(meta), 1), dtype=np.float32), obs=pd.DataFrame({"donor": meta["donor"].astype(str).values, "all_cells": "all"}, index=meta["cell"].astype(str).values + "-" + np.arange(len(meta)).astype(str)))
a.obsm["X_pca"] = pcs
a.obsm["X_pca_harmony_reference"] = ref
a.write_h5ad(out + "/pbmc3500_pcs.h5ad", compression="gzip")

x = tsv("lisi_x").to_numpy(dtype=np.float64)
m = tsv("lisi_metadata")
r = tsv("lisi_lisi")
b = ad.AnnData(sp.csr_matrix((len(m), 1), dtype=np.float32), obs=pd.DataFrame({"label1": m["label1"].astype(str).values, "label2": m["label2"].astype(str).values, "r_lisi_label1": r["label1"].values, "r_lisi_label2": r["label2"].values}, index=np.arange(len(m)).astype(str)))
b.obsm["X_lisi"] = x
b.write_h5ad(out + "/lisi_reference.h5ad", compression="gzip")

rng = np.random.default_rng(0)
genes = None
for name, folder in [("jurkat", "jurkat"), ("t293", "t293"), ("mix", "mix")]:
    c = sc.read_10x_mtx("%s/%s/filtered_matrices_mex/hg19" % (cell_lines, folder), var_names="gene_symbols")
    c.var_names_make_unique()
    c = c[np.sort(rng.choice(c.n_obs, size=100, replace=False))].copy()
    if genes is None:
        totals = np.asarray(c.X.sum(axis=0)).ravel()
        keep = {i for i, g in enumerate(c.var_names) if g.startswith("MT-") or g == "XIST"}
        for i in np.argsort(-totals):
            if len(keep) >= 1500:
                break
            keep.add(int(i))
        genes = sorted(keep)
    c = c[:, genes].copy()
    c.write_h5ad("%s/%s_small.h5ad" % (out, name), compression="gzip")
    print(name, c.shape)
