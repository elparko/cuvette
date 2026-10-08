import hashlib
import os
import re
import sys
import warnings

import matplotlib

matplotlib.use("Agg")
import anndata as ad
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import scanpy as sc
import scipy.sparse as sp

warnings.filterwarnings("ignore")
sc.settings.verbosity = 0


def _handle(name):
    table = getattr(sys.modules.get("__main__"), "handles", {})
    if name not in table:
        raise KeyError("unknown handle %s. Handles are lost when the worker restarts. Pass the .h5ad checkpoint path instead." % name)
    return table[name]


def _get(x):
    if isinstance(x, dict) and isinstance(x.get("handle"), str):
        x = _handle(x["handle"])
    if isinstance(x, str) and re.fullmatch(r"h\d+", x):
        x = _handle(x)
    if isinstance(x, ad.AnnData):
        return x.copy()
    if isinstance(x, str):
        return sc.read_h5ad(os.path.expanduser(x))
    raise TypeError('adata must be a handle such as {"handle": "h3"} or the path of an .h5ad file')


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def _is_counts(adata):
    x = adata.X
    values = x.data if sp.issparse(x) else np.asarray(x).ravel()
    values = values[: 200000]
    return bool(values.size == 0 or (np.all(values >= 0) and np.allclose(values, np.round(values))))


def _save(adata, step):
    path = os.path.join(os.getcwd(), step + ".h5ad")
    adata.write_h5ad(path, compression="gzip")
    return path


def _png(name):
    path = os.path.join(os.getcwd(), name + ".png")
    plt.savefig(path, dpi=100, bbox_inches="tight")
    plt.close("all")
    return path


def _table(frame, name):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    return path


def _preview(frame, path, limit=12):
    rows = frame.head(limit)
    clean = [[v.item() if hasattr(v, "item") else v for v in r] for r in rows.itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": clean, "n_rows": int(len(frame)), "path": path}


def _result(adata, step, summary, metrics, outputs=(), table=None, data=None):
    checkpoint = _save(adata, step)
    files = [{"path": checkpoint, "kind": "file", "name": step + ".h5ad"}]
    for path in outputs:
        kind = "image" if path.endswith(".png") else "table" if path.endswith(".csv") else "file"
        files.append({"path": path, "kind": kind, "name": os.path.basename(path)})
    out = {
        "ok": True,
        "summary": summary,
        "metrics": {k: (float(v) if isinstance(v, (float, np.floating)) else int(v)) for k, v in metrics.items()},
        "outputs": files,
        "checkpoint": checkpoint,
        "checkpoint_sha256": _sha256(checkpoint),
        "adata": adata,
    }
    if table is not None:
        out["table"] = table
    if data:
        out.update(data)
    return out


def _fail(message):
    return {"ok": False, "error": message}


def _ensure_qc(adata, mito_prefix="MT-"):
    if "pct_counts_mt" not in adata.obs or "n_genes_by_counts" not in adata.obs:
        adata.var["mt"] = adata.var_names.str.startswith(mito_prefix)
        sc.pp.calculate_qc_metrics(adata, qc_vars=["mt"], percent_top=None, log1p=False, inplace=True)


def _state(adata):
    return {
        "n_cells": int(adata.n_obs),
        "n_genes": int(adata.n_vars),
        "obs_columns": [str(c) for c in adata.obs.columns],
        "var_columns": [str(c) for c in adata.var.columns],
        "layers": list(adata.layers.keys()),
        "obsm": list(adata.obsm.keys()),
        "uns": list(adata.uns.keys()),
        "has_raw": adata.raw is not None,
    }


def inspect_data(adata):
    a = _get(adata)
    x = a.X
    vmax = float(x.max()) if x.shape[0] and x.shape[1] else 0.0
    counts = _is_counts(a)
    return {
        "ok": True,
        "summary": "%d cells x %d genes. X holds %s." % (a.n_obs, a.n_vars, "raw counts" if counts else "non-integer values (normalized or scaled)"),
        "metrics": {"n_cells": int(a.n_obs), "n_genes": int(a.n_vars), "x_max": vmax, "x_is_counts": int(counts)},
        "state": _state(a),
    }


def load_data(path, var_names="gene_symbols"):
    p = os.path.expanduser(path)
    if os.path.isfile(p) and p.endswith(".h5ad"):
        adata = sc.read_h5ad(p)
        source = "h5ad"
    elif os.path.isfile(p) and p.endswith(".h5"):
        adata = sc.read_10x_h5(p)
        adata.var_names_make_unique()
        source = "10x h5"
    else:
        folder = os.path.dirname(p) if os.path.isfile(p) else p
        if not os.path.isdir(folder):
            return _fail("path not found: %s" % path)
        try:
            adata = sc.read_10x_mtx(folder, var_names=var_names)
        except Exception:
            adata = sc.read_10x_mtx(folder, var_names=var_names, compressed=False)
        source = "10x matrix folder"
    counts = _is_counts(adata)
    adata.obs_names_make_unique()
    summary = "Loaded %d cells x %d genes from a %s. X holds %s." % (adata.n_obs, adata.n_vars, source, "raw counts" if counts else "non-integer values")
    metrics = {"n_cells": adata.n_obs, "n_genes": adata.n_vars, "x_is_counts": int(counts)}
    return _result(adata, "loaded", summary, metrics, data={"source": source})


def calculate_qc(adata, mito_prefix="MT-"):
    a = _get(adata)
    a.var["mt"] = a.var_names.str.startswith(mito_prefix)
    sc.pp.calculate_qc_metrics(a, qc_vars=["mt"], percent_top=None, log1p=False, inplace=True)
    cols = ["n_genes_by_counts", "total_counts", "pct_counts_mt"]
    rows = []
    for c in cols:
        v = a.obs[c].astype(float)
        rows.append([c, float(v.min()), float(v.quantile(0.5)), float(v.quantile(0.95)), float(v.max())])
    summary_frame = pd.DataFrame(rows, columns=["metric", "min", "median", "p95", "max"])
    cells = a.obs[cols].reset_index().rename(columns={"index": "cell"})
    cells_csv = _table(cells, "qc_cells")
    fig, axes = plt.subplots(1, 3, figsize=(9, 3.5))
    for ax, c in zip(axes, cols):
        ax.violinplot(a.obs[c].astype(float).values, showmedians=True)
        ax.set_title(c)
        ax.set_xticks([])
    plot = _png("qc_violin")
    n_mt = int(a.var["mt"].sum())
    summary = "QC for %d cells. Median %d genes per cell, median %.2f percent mitochondrial counts. %d mitochondrial genes (prefix %s)." % (
        a.n_obs, a.obs["n_genes_by_counts"].median(), a.obs["pct_counts_mt"].median(), n_mt, mito_prefix)
    metrics = {
        "n_cells": a.n_obs,
        "n_mito_genes": n_mt,
        "median_genes_per_cell": float(a.obs["n_genes_by_counts"].median()),
        "median_total_counts": float(a.obs["total_counts"].median()),
        "median_pct_mito": float(a.obs["pct_counts_mt"].median()),
        "max_pct_mito": float(a.obs["pct_counts_mt"].max()),
        "max_genes_per_cell": float(a.obs["n_genes_by_counts"].max()),
    }
    return _result(a, "qc", summary, metrics, [plot, cells_csv], _preview(summary_frame, ""))


def filter_genes(adata, min_cells):
    a = _get(adata)
    before = a.n_vars
    sc.pp.filter_genes(a, min_cells=min_cells)
    summary = "Kept %d of %d genes that are present in at least %d cells." % (a.n_vars, before, min_cells)
    return _result(a, "filter_genes", summary, {"n_genes_before": before, "n_genes_after": a.n_vars, "n_genes_removed": before - a.n_vars, "n_cells": a.n_obs})


def filter_cells(adata, min_genes, max_genes=None, max_pct_mito=None, mito_prefix="MT-"):
    a = _get(adata)
    if not _is_counts(a):
        return _fail("X does not hold raw counts. Filter cells before normalization.")
    _ensure_qc(a, mito_prefix)
    before = a.n_obs
    ngenes = a.obs["n_genes_by_counts"]
    low = ngenes < min_genes
    high = ngenes >= max_genes if max_genes is not None else pd.Series(False, index=a.obs_names)
    mito = a.obs["pct_counts_mt"] >= max_pct_mito if max_pct_mito is not None else pd.Series(False, index=a.obs_names)
    drop = low | high | mito
    a = a[~drop.values].copy()
    rows = [["fewer than min_genes genes", int(low.sum())], ["max_genes genes or more", int(high.sum())],
            ["max_pct_mito percent mitochondrial counts or more", int(mito.sum())], ["removed in total", int(drop.sum())]]
    frame = pd.DataFrame(rows, columns=["reason", "n_cells"])
    summary = "Kept %d of %d cells. Removed %d for few genes, %d for many genes, %d for high mitochondrial counts." % (
        a.n_obs, before, low.sum(), high.sum(), mito.sum())
    metrics = {"n_cells_before": before, "n_cells_after": a.n_obs, "n_removed": int(drop.sum()), "n_low_genes": int(low.sum()),
               "n_high_genes": int(high.sum()), "n_high_mito": int(mito.sum()), "n_genes": a.n_vars}
    return _result(a, "filter_cells", summary, metrics, table=_preview(frame, ""))


def normalize_log(adata, target_sum):
    a = _get(adata)
    if not _is_counts(a):
        return _fail("X does not hold raw counts. The data look normalized already.")
    a.layers["counts"] = a.X.copy()
    sc.pp.normalize_total(a, target_sum=target_sum)
    sc.pp.log1p(a)
    a.raw = a
    summary = "Scaled each cell to %g total counts and applied log1p. Raw counts are in layers['counts']. Log values are in .raw." % target_sum
    return _result(a, "normalized", summary, {"target_sum": target_sum, "n_cells": a.n_obs, "n_genes": a.n_vars, "x_max": float(a.X.max())})


def find_variable_genes(adata, n_top_genes=0, min_mean=0.0125, max_mean=3.0, min_disp=0.5, flavor="seurat"):
    a = _get(adata)
    if _is_counts(a) and float(a.X.max()) > 50:
        return _fail("X looks like raw counts. Run normalize_log first.")
    if n_top_genes and n_top_genes > 0:
        sc.pp.highly_variable_genes(a, n_top_genes=int(n_top_genes), flavor=flavor)
    else:
        sc.pp.highly_variable_genes(a, min_mean=min_mean, max_mean=max_mean, min_disp=min_disp, flavor=flavor)
    n = int(a.var["highly_variable"].sum())
    frame = a.var.loc[a.var["highly_variable"]].sort_values("dispersions_norm", ascending=False)[["means", "dispersions", "dispersions_norm"]]
    frame = frame.reset_index().rename(columns={frame.index.name or "index": "gene"})
    csv = _table(frame, "highly_variable_genes")
    fig, ax = plt.subplots(figsize=(5, 4))
    mask = a.var["highly_variable"].values
    ax.scatter(a.var["means"][~mask], a.var["dispersions_norm"][~mask], s=3, c="0.6")
    ax.scatter(a.var["means"][mask], a.var["dispersions_norm"][mask], s=3, c="k")
    ax.set_xlabel("mean expression")
    ax.set_ylabel("normalized dispersion")
    plot = _png("highly_variable_genes")
    how = "the top %d genes" % n_top_genes if n_top_genes and n_top_genes > 0 else "min_mean %g, max_mean %g, min_disp %g" % (min_mean, max_mean, min_disp)
    summary = "Marked %d highly variable genes (%s, flavor %s)." % (n, how, flavor)
    return _result(a, "variable_genes", summary, {"n_highly_variable": n, "n_genes": a.n_vars}, [plot, csv], _preview(frame, csv))


def scale_data(adata, regress_out="none", max_value=10.0, subset_to_hvg=True):
    a = _get(adata)
    if "highly_variable" in a.var and subset_to_hvg:
        a = a[:, a.var["highly_variable"].values].copy()
    keys = [] if regress_out in (None, "", "none") else [k.strip() for k in regress_out.split(",") if k.strip()]
    if keys:
        _ensure_qc(a)
        missing = [k for k in keys if k not in a.obs]
        if missing:
            return _fail("regress_out keys not in obs: %s. Run calculate_qc first." % ", ".join(missing))
        sc.pp.regress_out(a, keys)
    sc.pp.scale(a, max_value=max_value)
    summary = "Scaled %d genes to unit variance, clipped at %g%s." % (a.n_vars, max_value, ", after regressing out " + ", ".join(keys) if keys else "")
    return _result(a, "scaled", summary, {"n_cells": a.n_obs, "n_genes": a.n_vars, "max_value": max_value, "n_regressed": len(keys), "x_max": float(np.max(a.X))})


def run_pca(adata, n_comps=50, random_state=0):
    a = _get(adata)
    n_comps = int(min(n_comps, a.n_obs - 1, a.n_vars - 1))
    sc.pp.pca(a, n_comps=n_comps, svd_solver="arpack", random_state=int(random_state))
    ratio = a.uns["pca"]["variance_ratio"]
    fig, ax = plt.subplots(figsize=(5, 3.5))
    ax.plot(np.arange(1, len(ratio) + 1), np.log(ratio), "o-", ms=3)
    ax.set_xlabel("principal component")
    ax.set_ylabel("log variance ratio")
    plot = _png("pca_variance")
    frame = pd.DataFrame({"pc": np.arange(1, len(ratio) + 1), "variance_ratio": ratio, "cumulative": np.cumsum(ratio)})
    csv = _table(frame, "pca_variance")
    summary = "Computed %d principal components. The first 10 explain %.1f percent of the variance." % (n_comps, 100 * ratio[:10].sum())
    metrics = {"n_comps": n_comps, "variance_first10": float(ratio[:10].sum()), "variance_all": float(ratio.sum()), "random_state": int(random_state)}
    return _result(a, "pca", summary, metrics, [plot, csv], _preview(frame, csv, 10))


def build_neighbors(adata, n_neighbors=15, n_pcs=None, random_state=0):
    a = _get(adata)
    if "X_pca" not in a.obsm:
        return _fail("No PCA found. Run run_pca first.")
    if n_pcs is not None and n_pcs > a.obsm["X_pca"].shape[1]:
        return _fail("n_pcs %d is larger than the %d components that run_pca made." % (n_pcs, a.obsm["X_pca"].shape[1]))
    sc.pp.neighbors(a, n_neighbors=int(n_neighbors), n_pcs=None if n_pcs is None else int(n_pcs), random_state=int(random_state))
    summary = "Built the neighbor graph with %d neighbors on %s principal components." % (n_neighbors, "all" if n_pcs is None else int(n_pcs))
    metrics = {"n_neighbors": n_neighbors, "n_pcs": n_pcs if n_pcs is not None else a.obsm["X_pca"].shape[1], "random_state": random_state, "n_cells": a.n_obs}
    return _result(a, "neighbors", summary, metrics)


def run_umap(adata, color="leiden", random_state=0, min_dist=0.5, n_components=2):
    a = _get(adata)
    if "neighbors" not in a.uns:
        return _fail("No neighbor graph found. Run build_neighbors first.")
    sc.tl.umap(a, min_dist=min_dist, n_components=int(n_components), random_state=int(random_state))
    colors = [c for c in ([color] if isinstance(color, str) else color or []) if c in a.obs or c in a.var_names]
    sc.pl.umap(a, color=colors or None, show=False)
    plot = _png("umap")
    summary = "Computed the UMAP embedding (seed %d) and drew it%s." % (random_state, " colored by " + ", ".join(colors) if colors else "")
    return _result(a, "umap", summary, {"n_cells": a.n_obs, "random_state": random_state, "min_dist": min_dist}, [plot])


def cluster_leiden(adata, resolution=1.0, random_state=0):
    a = _get(adata)
    if "neighbors" not in a.uns:
        return _fail("No neighbor graph found. Run build_neighbors first.")
    sc.tl.leiden(a, resolution=float(resolution), random_state=int(random_state), flavor="igraph", n_iterations=2, directed=False)
    sizes = a.obs["leiden"].value_counts().sort_values(ascending=False)
    frame = pd.DataFrame({"cluster": sizes.index.astype(str), "n_cells": sizes.values, "fraction": sizes.values / a.n_obs})
    csv = _table(frame, "leiden_clusters")
    outputs = [csv]
    if "X_umap" in a.obsm:
        sc.pl.umap(a, color="leiden", show=False)
        outputs.append(_png("umap_leiden"))
    summary = "Found %d Leiden clusters at resolution %g (seed %d). Sizes: %s." % (len(sizes), resolution, random_state, ", ".join(str(int(s)) for s in sizes.values))
    metrics = {"n_clusters": len(sizes), "resolution": resolution, "random_state": random_state, "largest_cluster": int(sizes.max()), "smallest_cluster": int(sizes.min()), "n_cells": a.n_obs}
    return _result(a, "leiden", summary, metrics, outputs, _preview(frame, csv), {"cluster_sizes": {str(k): int(v) for k, v in sizes.items()}})


def find_markers(adata, groupby="leiden", method="t-test", n_genes=25, n_top=3):
    a = _get(adata)
    if groupby not in a.obs:
        return _fail("Column %s not found in obs. Run cluster_leiden first." % groupby)
    use_raw = a.raw is not None
    sc.tl.rank_genes_groups(a, groupby, method=method, n_genes=int(n_genes), use_raw=use_raw)
    frame = sc.get.rank_genes_groups_df(a, group=None)
    csv = _table(frame, "markers")
    top = frame.sort_values(["group", "scores"], ascending=[True, False]).groupby("group", sort=False).head(int(n_top))
    top = top[["group", "names", "scores", "logfoldchanges", "pvals_adj"]]
    sc.pl.rank_genes_groups(a, n_genes=min(int(n_genes), 20), sharey=False, show=False)
    plot = _png("markers")
    groups = a.obs[groupby].astype(str).nunique()
    summary = "Ranked genes for %d groups in %s with the %s test. Top genes: %s." % (
        groups, groupby, method, "; ".join("%s %s" % (g, ", ".join(d["names"])) for g, d in top.groupby("group", sort=False)))
    metrics = {"n_groups": groups, "n_genes_ranked": int(n_genes), "used_raw": int(use_raw)}
    return _result(a, "markers", summary, metrics, [plot, csv], _preview(top, csv, 40), {"method": method, "groupby": groupby})


def plot_genes(adata, genes=None, kind="umap", groupby="leiden"):
    a = _get(adata)
    names = [genes] if isinstance(genes, str) else list(genes or [])
    pool = set(a.raw.var_names) if a.raw is not None else set(a.var_names)
    missing = [g for g in names if g not in pool]
    names = [g for g in names if g in pool]
    if kind == "umap":
        if "X_umap" not in a.obsm:
            return _fail("No UMAP found. Run run_umap first.")
        sc.pl.umap(a, color=names or [groupby], show=False)
    elif kind == "dotplot":
        if names:
            sc.pl.dotplot(a, names, groupby=groupby, show=False)
        elif "rank_genes_groups" in a.uns:
            sc.pl.rank_genes_groups_dotplot(a, n_genes=3, show=False)
        else:
            return _fail("Give genes, or run find_markers first.")
    elif kind == "violin":
        if not names:
            return _fail("Give genes for a violin plot.")
        sc.pl.violin(a, names, groupby=groupby, show=False)
    else:
        return _fail("kind must be umap, dotplot or violin")
    plot = _png("genes_" + kind)
    summary = "Drew the %s plot%s." % (kind, " of " + ", ".join(names) if names else "") + (" Genes not found: %s." % ", ".join(missing) if missing else "")
    return {
        "ok": True,
        "summary": summary,
        "metrics": {"n_genes_plotted": len(names), "n_genes_missing": len(missing)},
        "outputs": [{"path": plot, "kind": "image", "name": os.path.basename(plot)}],
    }
