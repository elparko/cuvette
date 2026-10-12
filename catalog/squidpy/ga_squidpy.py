import hashlib
import json
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
import squidpy as sq

warnings.filterwarnings("ignore")
sc.settings.verbosity = 0


def _handle(name):
    table = getattr(sys.modules.get("__main__"), "handles", {})
    if name not in table:
        raise KeyError("unknown handle %s. Handles are lost when the worker restarts. Pass the .h5ad checkpoint path instead." % name)
    return table[name]


def _get(x):
    if isinstance(x, str) and x.lstrip().startswith("{"):
        try:
            x = json.loads(x)
        except ValueError:
            pass
    if isinstance(x, dict) and isinstance(x.get("handle"), str):
        x = _handle(x["handle"])
    if isinstance(x, str) and re.fullmatch(r"h\d+", x):
        x = _handle(x)
    if isinstance(x, ad.AnnData):
        return x.copy()
    if isinstance(x, str):
        path = os.path.expanduser(x)
        if not os.path.isfile(path):
            raise FileNotFoundError("adata file not found: %s" % x)
        return sc.read_h5ad(path)
    raise TypeError('adata must be a handle such as {"handle": "h3"} or the path of an .h5ad file')


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


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


def _as_list(x):
    if x is None:
        return []
    if isinstance(x, str):
        if x.lstrip().startswith("["):
            try:
                return [str(v) for v in json.loads(x)]
            except ValueError:
                pass
        return [p.strip() for p in x.split(",") if p.strip()]
    return list(x)


def _is_counts(adata):
    x = adata.X
    values = x.data if sp.issparse(x) else np.asarray(x).ravel()
    values = values[:200000]
    return bool(values.size == 0 or (np.all(values >= 0) and np.allclose(values, np.round(values))))


def _positions_file(folder):
    for name in ("spatial/tissue_positions.csv", "spatial/tissue_positions_list.csv", "spatial/tissue_positions_list.txt", "tissue_positions.csv", "tissue_positions_list.txt", "tissue_positions_list.csv"):
        p = os.path.join(folder, name)
        if os.path.isfile(p):
            return p
    return None


def _read_positions(path):
    frame = pd.read_csv(path, header=None, index_col=0)
    if str(frame.index[0]) == "barcode":
        frame = frame.iloc[1:]
    frame = frame.iloc[:, :5]
    frame.columns = ["in_tissue", "array_row", "array_col", "pxl_row", "pxl_col"]
    return frame.astype(float).assign(in_tissue=lambda f: f["in_tissue"].astype(int))


def load_spatial(path, positions=None, var_names="gene_symbols"):
    p = os.path.expanduser(path)
    if not os.path.exists(p):
        return _fail("path not found: %s" % path)
    outside = 0
    if os.path.isfile(p) and p.endswith(".h5ad"):
        a = sc.read_h5ad(p)
        if "spatial" not in a.obsm:
            return _fail("The file %s has no obsm['spatial']. Give a 10x .h5 file and the positions file, or an .h5ad file with coordinates." % path)
        source = "h5ad"
    else:
        if os.path.isdir(p):
            h5 = os.path.join(p, "filtered_feature_bc_matrix.h5")
            if not os.path.isfile(h5):
                return _fail("Folder %s has no filtered_feature_bc_matrix.h5. Give the Space Ranger outs folder or the .h5 file." % path)
            pos_path = positions and os.path.expanduser(positions) or _positions_file(p)
        else:
            h5 = p
            pos_path = positions and os.path.expanduser(positions)
        if not pos_path:
            return _fail("No positions file found. Give the argument positions: the tissue_positions_list.txt or tissue_positions.csv file of Space Ranger.")
        if not os.path.isfile(pos_path):
            return _fail("positions file not found: %s" % pos_path)
        a = sc.read_10x_h5(h5)
        if var_names == "gene_ids":
            a.var_names = a.var["gene_ids"].astype(str).values
        a.var_names_make_unique()
        pos = _read_positions(pos_path)
        missing = int((~a.obs_names.isin(pos.index)).sum())
        if missing == a.n_obs:
            return _fail("None of the %d barcodes of %s is in %s. Check that both files are from the same sample." % (a.n_obs, h5, pos_path))
        pos = pos.reindex(a.obs_names)
        keep = pos["in_tissue"].fillna(0).astype(int).values == 1
        outside = int((~keep).sum())
        a = a[keep].copy()
        pos = pos[keep]
        a.obsm["spatial"] = pos[["pxl_col", "pxl_row"]].to_numpy(dtype=float)
        a.obs["array_row"] = pos["array_row"].astype(int).values
        a.obs["array_col"] = pos["array_col"].astype(int).values
        source = "10x Visium"
    a.obs_names_make_unique()
    counts = _is_counts(a)
    summary = "Loaded %d spots x %d genes from %s. %d spots outside the tissue were removed. X holds %s." % (
        a.n_obs, a.n_vars, source, outside, "raw counts" if counts else "non-integer values")
    metrics = {"n_spots": a.n_obs, "n_genes": a.n_vars, "n_outside_tissue": outside, "x_is_counts": int(counts)}
    return _result(a, "loaded", summary, metrics, data={"source": source})


def filter_genes_by_spots(adata, min_counts=3, min_spot_fraction=0.005, exclude_prefix=None):
    a = _get(adata)
    if not _is_counts(a):
        return _fail("X does not hold raw counts. Filter the genes before normalization.")
    if not 0 < min_spot_fraction <= 1:
        return _fail("min_spot_fraction %g is not in the range above 0 up to 1. It is a fraction of spots, such as 0.005 for 0.5 percent." % min_spot_fraction)
    x = a.X.tocsc() if sp.issparse(a.X) else sp.csc_matrix(a.X)
    n_spots_with = np.asarray((x >= min_counts).sum(axis=0)).ravel()
    need = min_spot_fraction * a.n_obs
    keep = n_spots_with >= need
    low = int((~keep).sum())
    dropped_prefix = 0
    if exclude_prefix:
        pre = a.var_names.str.startswith(exclude_prefix)
        dropped_prefix = int((keep & pre).sum())
        keep = keep & ~pre
    before = a.n_vars
    a = a[:, keep].copy()
    summary = "Kept %d of %d genes with at least %d counts in at least %g percent of the %d spots (%.1f spots). Removed %d for low expression%s." % (
        a.n_vars, before, min_counts, 100 * min_spot_fraction, a.n_obs, need, low, " and %d with the prefix %s" % (dropped_prefix, exclude_prefix) if exclude_prefix else "")
    metrics = {"n_genes_before": before, "n_genes_after": a.n_vars, "n_low_expression": low, "n_excluded_prefix": dropped_prefix, "n_spots": a.n_obs, "min_counts": min_counts, "min_spot_fraction": min_spot_fraction}
    return _result(a, "filter_genes", summary, metrics)


def normalize_expression(adata, target_sum):
    a = _get(adata)
    if not _is_counts(a):
        return _fail("X does not hold raw counts. The data look normalized already.")
    a.layers["counts"] = a.X.copy()
    sc.pp.normalize_total(a, target_sum=target_sum)
    sc.pp.log1p(a)
    summary = "Scaled each spot to %g total counts and applied log1p. Raw counts are in layers['counts']." % target_sum
    return _result(a, "normalized", summary, {"target_sum": target_sum, "n_spots": a.n_obs, "n_genes": a.n_vars, "x_max": float(a.X.max())})


def build_spatial_graph(adata, coord_type="grid", n_neighs=6, n_rings=1, radius=None, delaunay=False):
    a = _get(adata)
    if "spatial" not in a.obsm:
        return _fail("No coordinates in obsm['spatial']. Run load_spatial first.")
    if coord_type == "grid" and n_neighs not in (4, 6):
        return _fail("n_neighs %d does not fit coord_type grid. A grid has 4 or 6 neighbors. Use coord_type generic for another number." % n_neighs)
    kwargs = {"coord_type": coord_type, "n_rings": int(n_rings), "delaunay": bool(delaunay)}
    if coord_type == "generic" and radius:
        kwargs["radius"] = float(radius)
    else:
        kwargs["n_neighs"] = int(n_neighs)
    sq.gr.spatial_neighbors(a, **kwargs)
    c = a.obsp["spatial_connectivities"]
    degree = np.asarray((c > 0).sum(axis=1)).ravel()
    undirected = int(((c + c.T) > 0).nnz // 2)
    how = "radius %g" % radius if coord_type == "generic" and radius else "Delaunay triangulation" if delaunay else "%d nearest neighbors" % n_neighs
    summary = "Built the spatial graph of %d spots (%s, coord_type %s). Neighbors per spot: mean %.2f, minimum %d, maximum %d. %d spots have none." % (
        a.n_obs, how, coord_type, degree.mean(), degree.min(), degree.max(), int((degree == 0).sum()))
    metrics = {"n_spots": a.n_obs, "mean_neighbors": float(degree.mean()), "min_neighbors": int(degree.min()), "max_neighbors": int(degree.max()), "n_isolated": int((degree == 0).sum()), "n_edges": undirected, "n_links": int(c.nnz)}
    return _result(a, "spatial_graph", summary, metrics, data={"coord_type": coord_type})


def spatial_autocorr(adata, mode="moran", n_perms=0, random_state=0, top_n=20, report_genes=None, genes=None, rank_cutoff=100):
    a = _get(adata)
    if "spatial_connectivities" not in a.obsp:
        return _fail("No spatial graph. Run build_spatial_graph first.")
    if _is_counts(a) and float(a.X.max()) > 50:
        return _fail("X looks like raw counts. Run normalize_expression first. Moran's I needs log-normalized values.")
    names = _as_list(genes) or list(a.var_names)
    absent = [g for g in names if g not in a.var_names]
    if absent:
        return _fail("Genes not found: %s." % ", ".join(absent[:10]))
    sq.gr.spatial_autocorr(a, mode=mode, genes=names, n_perms=int(n_perms) if n_perms else None, seed=int(random_state), n_jobs=1, show_progress_bar=False)
    key = "moranI" if mode == "moran" else "gearyC"
    frame = a.uns[key].copy()
    stat = "I" if mode == "moran" else "C"
    frame = frame.sort_values(stat, ascending=(mode != "moran"))
    frame.insert(0, "rank", np.arange(1, len(frame) + 1))
    frame.insert(1, "gene", frame.index.astype(str))
    fdr = "pval_norm_fdr_bh" if not n_perms else "pval_z_sim_fdr_bh"
    csv = _table(frame[["rank", "gene", stat, fdr]], "spatial_autocorr")
    n_sig = int((frame[fdr] < 0.05).sum())
    top = frame.head(int(top_n))[["rank", "gene", stat, fdr]]
    reported = _as_list(report_genes)
    metrics = {"n_genes": len(frame), "n_significant_fdr05": n_sig, "top_value": float(frame[stat].iloc[0]), "n_perms": int(n_perms or 0), "random_state": int(random_state), "n_spots": a.n_obs}
    notes = []
    inside = 0
    for g in reported:
        if g in frame["gene"].values:
            r = frame.loc[frame["gene"] == g].iloc[0]
            metrics["rank_" + re.sub(r"\W", "_", g)] = int(r["rank"])
            inside += int(r["rank"]) <= int(rank_cutoff)
            notes.append("%s rank %d (%s %.3f)" % (g, int(r["rank"]), stat, r[stat]))
        else:
            notes.append("%s is not in the genes that were tested" % g)
    if reported:
        metrics["n_report_genes_within_cutoff"] = inside
        metrics["rank_cutoff"] = int(rank_cutoff)
        notes.append("%d of %d reported genes are within the top %d" % (inside, len(reported), int(rank_cutoff)))
    summary = "%s %s for %d genes on %d spots (%s). %d genes have an FDR below 0.05. Top genes: %s.%s" % (
        "Moran's I" if mode == "moran" else "Geary's C", "was computed", len(frame), a.n_obs, "%d permutations" % n_perms if n_perms else "normal approximation for p values",
        n_sig, ", ".join("%s %.3f" % (g, v) for g, v in zip(top["gene"].head(5), top[stat].head(5))), " " + "; ".join(notes) + "." if notes else "")
    return _result(a, "spatial_autocorr", summary, metrics, [csv], _preview(top, csv, int(top_n)), {"statistic": stat})


def nhood_enrichment(adata, cluster_key, n_perms=1000, random_state=0, top_pairs=10):
    a = _get(adata)
    if "spatial_connectivities" not in a.obsp:
        return _fail("No spatial graph. Run build_spatial_graph first.")
    if cluster_key not in a.obs:
        return _fail("Column %s not found in obs. Columns: %s." % (cluster_key, ", ".join(map(str, a.obs.columns))))
    a.obs[cluster_key] = a.obs[cluster_key].astype("category")
    k = len(a.obs[cluster_key].cat.categories)
    if k < 2:
        return _fail("Column %s has %d group. Neighborhood enrichment needs at least 2 groups." % (cluster_key, k))
    sq.gr.nhood_enrichment(a, cluster_key=cluster_key, n_perms=int(n_perms), seed=int(random_state), n_jobs=1, show_progress_bar=False)
    res = a.uns[cluster_key + "_nhood_enrichment"]
    z = np.asarray(res["zscore"], dtype=float)
    count = np.asarray(res["count"], dtype=float)
    cats = list(a.obs[cluster_key].cat.categories)
    rows = [[str(cats[i]), str(cats[j]), float(z[i, j]), float(count[i, j])] for i in range(k) for j in range(k)]
    frame = pd.DataFrame(rows, columns=["group_a", "group_b", "zscore", "n_edges"])
    csv = _table(frame, "nhood_enrichment")
    fig, ax = plt.subplots(figsize=(0.5 * k + 3, 0.5 * k + 2.5))
    lim = max(float(np.nanmax(np.abs(z))), 1.0)
    im = ax.imshow(z, cmap="RdBu_r", vmin=-lim, vmax=lim)
    ax.set_xticks(range(k))
    ax.set_xticklabels(cats, rotation=90, fontsize=7)
    ax.set_yticks(range(k))
    ax.set_yticklabels(cats, fontsize=7)
    fig.colorbar(im, ax=ax, label="z score")
    plot = _png("nhood_enrichment")
    off = frame[frame["group_a"] != frame["group_b"]]
    upper = off[off["group_a"] < off["group_b"]].sort_values("zscore", ascending=False)
    top = upper.head(int(top_pairs))
    self_z = frame[frame["group_a"] == frame["group_b"]]["zscore"]
    summary = "Neighborhood enrichment of %s (%d groups, %d permutations, seed %d). Highest z scores between groups: %s. Lowest: %s. Median z score of a group with itself: %.1f." % (
        cluster_key, k, n_perms, random_state, "; ".join("%s and %s %.1f" % (r.group_a, r.group_b, r.zscore) for r in top.head(3).itertuples()),
        "; ".join("%s and %s %.1f" % (r.group_a, r.group_b, r.zscore) for r in upper.tail(3).itertuples()), self_z.median())
    metrics = {"n_groups": k, "n_perms": int(n_perms), "random_state": int(random_state), "max_zscore_pair": float(upper["zscore"].max()) if len(upper) else 0.0,
               "min_zscore_pair": float(upper["zscore"].min()) if len(upper) else 0.0, "median_self_zscore": float(self_z.median()), "n_spots": a.n_obs,
               "n_links": int(count.sum()), "n_links_same_group": int(np.trace(count))}
    return _result(a, "nhood_enrichment", summary, metrics, [plot, csv], _preview(top, csv, int(top_pairs)))


def find_spatial_domains(adata, resolution=0.5, spatial_weight=0.3, n_top_genes=2000, n_pcs=15, n_neighbors=15, random_state=0, compare_to=None):
    a = _get(adata)
    if "spatial_connectivities" not in a.obsp:
        return _fail("No spatial graph. Run build_spatial_graph first.")
    if not 0 <= spatial_weight <= 1:
        return _fail("spatial_weight %g is not in the range 0 to 1." % spatial_weight)
    if _is_counts(a) and float(a.X.max()) > 50:
        return _fail("X looks like raw counts. Run normalize_expression first. The domains need log-normalized values.")
    if compare_to is not None and compare_to not in a.obs:
        return _fail("Column %s (argument compare_to) not found in obs. Columns: %s." % (compare_to, ", ".join(map(str, a.obs.columns))))
    work = a.copy()
    sc.pp.highly_variable_genes(work, n_top_genes=int(min(n_top_genes, work.n_vars)), flavor="seurat")
    work = work[:, work.var["highly_variable"].values].copy()
    sc.pp.scale(work, max_value=10)
    n_pcs = int(min(n_pcs, work.n_obs - 1, work.n_vars - 1))
    sc.pp.pca(work, n_comps=n_pcs, svd_solver="arpack", random_state=int(random_state))
    sc.pp.neighbors(work, n_neighbors=int(n_neighbors), n_pcs=n_pcs, random_state=int(random_state))
    expr = work.obsp["connectivities"].tocsr()
    expr = expr.maximum(expr.T)
    expr.data[:] = 1.0
    spat = a.obsp["spatial_connectivities"].tocsr().copy()
    spat.data[:] = 1.0
    combined = ((1 - spatial_weight) * expr + spatial_weight * spat).tocsr()
    a.obsp["domain_graph"] = combined
    work.obsp["domain_graph"] = combined
    sc.tl.leiden(work, resolution=float(resolution), random_state=int(random_state), flavor="igraph", n_iterations=2, directed=False, obsp="domain_graph", key_added="spatial_domain")
    a.obs["spatial_domain"] = work.obs["spatial_domain"].astype(str).astype("category").values
    labels = a.obs["spatial_domain"].astype(str).values
    sizes = a.obs["spatial_domain"].value_counts().sort_values(ascending=False)
    coo = a.obsp["spatial_connectivities"].tocoo()
    coherence = float((labels[coo.row] == labels[coo.col]).mean()) if coo.nnz else 0.0
    metrics = {"n_domains": len(sizes), "resolution": float(resolution), "spatial_weight": float(spatial_weight), "random_state": int(random_state), "spatial_coherence": coherence,
               "largest_domain": int(sizes.max()), "smallest_domain": int(sizes.min()), "n_spots": a.n_obs, "n_pcs": n_pcs}
    extra = ""
    if compare_to:
        from sklearn.metrics import adjusted_rand_score

        ari = float(adjusted_rand_score(a.obs[compare_to].astype(str).values, labels))
        metrics["adjusted_rand_index"] = ari
        extra = " Adjusted Rand index with %s: %.3f." % (compare_to, ari)
    frame = pd.DataFrame({"domain": sizes.index.astype(str), "n_spots": sizes.values, "fraction": sizes.values / a.n_obs})
    csv = _table(frame, "spatial_domains")
    sc.pl.embedding(a, basis="spatial", color="spatial_domain", show=False, size=max(1.0, 2000.0 / a.n_obs * 8))
    plot = _png("spatial_domains")
    summary = "Found %d spatial domains at resolution %g with spatial weight %g (seed %d). Sizes: %s. Neighbor pairs in the same domain: %.3f.%s" % (
        len(sizes), resolution, spatial_weight, random_state, ", ".join(str(int(s)) for s in sizes.values), coherence, extra)
    return _result(a, "spatial_domains", summary, metrics, [plot, csv], _preview(frame, csv), {"cluster_sizes": {str(k): int(v) for k, v in sizes.items()}})


def plot_spatial(adata, color, point_size=None):
    a = _get(adata)
    if "spatial" not in a.obsm:
        return _fail("No coordinates in obsm['spatial'].")
    names = _as_list(color)
    pool = set(a.obs.columns) | set(a.var_names)
    missing = [c for c in names if c not in pool]
    names = [c for c in names if c in pool]
    if not names:
        return _fail("None of %s is a gene or a column of obs." % ", ".join(missing or ["the given names"]))
    sc.pl.embedding(a, basis="spatial", color=names, show=False, size=point_size or max(1.0, 2000.0 / a.n_obs * 8))
    plot = _png("spatial_" + "_".join(re.sub(r"\W", "", n) for n in names[:3]))
    summary = "Drew %s on the tissue coordinates.%s" % (", ".join(names), " Not found: %s." % ", ".join(missing) if missing else "")
    return {"ok": True, "summary": summary, "metrics": {"n_plotted": len(names), "n_missing": len(missing)},
            "outputs": [{"path": plot, "kind": "image", "name": os.path.basename(plot)}]}
