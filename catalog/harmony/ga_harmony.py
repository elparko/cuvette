import hashlib
import json
import os
import re
import sys
import warnings

import matplotlib

matplotlib.use("Agg")
import anndata as ad
import harmonypy
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


def _read_one(path, var_names):
    p = os.path.expanduser(path)
    if os.path.isfile(p) and p.endswith(".h5ad"):
        return sc.read_h5ad(p)
    if os.path.isfile(p) and p.endswith(".h5"):
        a = sc.read_10x_h5(p)
        a.var_names_make_unique()
        return a
    folder = os.path.dirname(p) if os.path.isfile(p) else p
    try:
        return sc.read_10x_mtx(folder, var_names=var_names)
    except Exception:
        return sc.read_10x_mtx(folder, var_names=var_names, compressed=False)


def _is_counts(adata):
    x = adata.X
    values = x.data if sp.issparse(x) else np.asarray(x).ravel()
    values = values[:200000]
    return bool(values.size == 0 or (np.all(values >= 0) and np.allclose(values, np.round(values))))


def merge_samples(paths, sample_names=None, batch_key="sample", var_names="gene_symbols"):
    plist = _as_list(paths)
    if len(plist) < 2:
        return _fail("merge_samples needs at least 2 paths in paths. It got %d." % len(plist))
    names = _as_list(sample_names) or [re.sub(r"\.(h5ad|h5)$", "", os.path.basename(os.path.normpath(p))) for p in plist]
    if len(names) != len(plist):
        return _fail("sample_names has %d entries and paths has %d. Give one name for each path." % (len(names), len(plist)))
    if len(set(names)) != len(names):
        return _fail("sample_names must be unique. Got: %s. Pass sample_names to name the samples." % ", ".join(names))
    missing = [p for p in plist if not os.path.exists(os.path.expanduser(p))]
    if missing:
        return _fail("path not found: %s" % ", ".join(missing))
    parts = []
    for name, p in zip(names, plist):
        a = _read_one(p, var_names)
        a.var_names_make_unique()
        a.obs_names_make_unique()
        a.obs[batch_key] = name
        parts.append(a)
    n_genes_each = [a.n_vars for a in parts]
    merged = ad.concat(parts, join="inner", index_unique="-")
    merged.obs[batch_key] = pd.Categorical(merged.obs[batch_key], categories=names)
    if merged.n_vars == 0:
        return _fail("The samples share no gene names. Check var_names (gene_symbols or gene_ids) and the species.")
    counts = _is_counts(merged)
    frame = pd.DataFrame({"sample": names, "n_cells": [a.n_obs for a in parts], "n_genes": n_genes_each})
    csv = _table(frame, "samples")
    summary = "Merged %d samples into %d cells x %d shared genes. Column %s holds the sample. X holds %s." % (
        len(names), merged.n_obs, merged.n_vars, batch_key, "raw counts" if counts else "non-integer values")
    metrics = {"n_samples": len(names), "n_cells": merged.n_obs, "n_genes": merged.n_vars, "x_is_counts": int(counts), "min_cells_per_sample": min(a.n_obs for a in parts)}
    for name, a in zip(names, parts):
        metrics["cells_" + re.sub(r"\W", "_", name)] = a.n_obs
    return _result(merged, "merged", summary, metrics, [csv], _preview(frame, csv), {"batch_key": batch_key, "samples": names})


def _check_batch(a, batch_key):
    if batch_key not in a.obs:
        return "Column %s not found in obs. Columns: %s." % (batch_key, ", ".join(map(str, a.obs.columns)))
    n = a.obs[batch_key].astype(str).nunique()
    if n < 2:
        return "Column %s has %d value. Integration needs at least 2 batches." % (batch_key, n)
    return None


def _embedding(a, use_rep, n_pcs):
    if use_rep not in a.obsm:
        return None, "Embedding %s not found in obsm. Available: %s. Run run_pca or integrate_harmony first." % (use_rep, ", ".join(a.obsm.keys()) or "none")
    x = np.asarray(a.obsm[use_rep], dtype=np.float64)
    if n_pcs is not None:
        if n_pcs > x.shape[1]:
            return None, "n_pcs %d is larger than the %d dimensions of %s." % (n_pcs, x.shape[1], use_rep)
        x = x[:, : int(n_pcs)]
    return x, None


def _batch_shift(x, labels):
    codes = pd.Categorical(labels).codes
    sd = x.std(axis=0)
    sd[sd == 0] = 1.0
    means = np.vstack([x[codes == c].mean(axis=0) for c in np.unique(codes)])
    return float(np.mean((means.max(axis=0) - means.min(axis=0)) / sd))


def integrate_harmony(adata, batch_key, theta=2.0, n_pcs=30, random_state=0, basis="X_pca", adjusted_basis="X_pca_harmony"):
    a = _get(adata)
    err = _check_batch(a, batch_key)
    if err:
        return _fail(err)
    x, err = _embedding(a, basis, n_pcs)
    if err:
        return _fail(err)
    sizes = a.obs[batch_key].astype(str).value_counts()
    if sizes.min() < 2:
        return _fail("Batch %s has %d cell. Each batch needs at least 2 cells." % (sizes.idxmin(), sizes.min()))
    out = harmonypy.run_harmony(x, a.obs[[batch_key]].astype(str), batch_key, theta=float(theta), random_state=int(random_state))
    z = np.asarray(out.Z_corr, dtype=np.float64)
    if z.shape != x.shape:
        z = z.T
    if z.shape != x.shape or not np.isfinite(z).all():
        return _fail("Harmony returned an embedding of shape %s for an input of shape %s." % (z.shape, x.shape))
    a.obsm[adjusted_basis] = z
    before = _batch_shift(x, a.obs[batch_key].astype(str).values)
    after = _batch_shift(z, a.obs[batch_key].astype(str).values)
    rounds = len(getattr(out, "objective_harmony", []) or [])
    summary = "Ran Harmony on %d dimensions of %s for %d batches (theta %g, seed %d). The batch means move from a spread of %.3f to %.3f standard deviations. Result in obsm[%s]." % (
        x.shape[1], basis, len(sizes), theta, random_state, before, after, adjusted_basis)
    metrics = {"n_batches": len(sizes), "n_cells": a.n_obs, "n_pcs": x.shape[1], "theta": float(theta), "random_state": int(random_state),
               "batch_shift_before": before, "batch_shift_after": after, "harmony_rounds": rounds, "smallest_batch": int(sizes.min())}
    return _result(a, "harmony", summary, metrics, data={"embedding": adjusted_basis})


def compute_lisi(adata, label_key, use_rep="X_pca_harmony", n_pcs=None, perplexity=30.0, by=None):
    a = _get(adata)
    if label_key not in a.obs:
        return _fail("Column %s not found in obs. Columns: %s." % (label_key, ", ".join(map(str, a.obs.columns))))
    x, err = _embedding(a, use_rep, n_pcs)
    if err:
        return _fail(err)
    if perplexity < 2 or perplexity * 3 >= a.n_obs:
        return _fail("perplexity %g does not fit %d cells. Use a value from 2 to %d." % (perplexity, a.n_obs, (a.n_obs - 1) // 3))
    meta = a.obs[[label_key]].astype(str)
    labels = meta[label_key].nunique()
    if labels < 2:
        return _fail("Column %s has %d value. LISI needs at least 2 labels." % (label_key, labels))
    lisi = harmonypy.compute_lisi(x, meta, [label_key], perplexity=float(perplexity))[:, 0]
    q = np.quantile(lisi, [0.025, 0.05, 0.25, 0.5, 0.75, 0.95, 0.975])
    rows = [["all cells", int(len(lisi)), float(np.median(lisi)), float(lisi.mean()), float(q[1]), float(q[5])]]
    if by:
        if by not in a.obs:
            return _fail("Column %s (argument by) not found in obs." % by)
        for g, idx in a.obs.groupby(by, observed=True).indices.items():
            v = lisi[idx]
            rows.append([str(g), int(len(v)), float(np.median(v)), float(v.mean()), float(np.quantile(v, 0.05)), float(np.quantile(v, 0.95))])
    frame = pd.DataFrame(rows, columns=["group", "n_cells", "median", "mean", "q05", "q95"])
    csv = _table(frame, "lisi_%s_%s" % (label_key, use_rep))
    a.obs["lisi_%s_%s" % (label_key, use_rep)] = lisi
    summary = "LISI of %s on %s (%d dimensions, perplexity %g, %d labels): median %.2f, 5th to 95th percentile %.2f to %.2f. A value near %d means well mixed. A value near 1 means one label in each neighborhood." % (
        label_key, use_rep, x.shape[1], perplexity, labels, q[3], q[1], q[5], labels)
    metrics = {"median": q[3], "mean": lisi.mean(), "q025": q[0], "q05": q[1], "q25": q[2], "q75": q[4], "q95": q[5], "q975": q[6],
               "n_labels": labels, "n_cells": a.n_obs, "n_dims": x.shape[1], "perplexity": float(perplexity)}
    return _result(a, "lisi", summary, metrics, [csv], _preview(frame, csv, 30))


def label_by_reference(adata, reference_key, reference_groups, label_key="reference_label"):
    a = _get(adata)
    if reference_key not in a.obs:
        return _fail("Column %s not found in obs. Columns: %s." % (reference_key, ", ".join(map(str, a.obs.columns))))
    groups = _as_list(reference_groups)
    present = set(a.obs[reference_key].astype(str))
    absent = [g for g in groups if g not in present]
    if len(groups) < 2 or absent:
        return _fail("reference_groups must name at least 2 values of %s. Missing: %s. Values: %s." % (reference_key, ", ".join(absent) or "none", ", ".join(sorted(present))))
    if a.raw is not None:
        x = a.raw.X
        space = "log-normalized values of .raw"
    else:
        x = a.X
        space = "X"
    x = x.toarray() if sp.issparse(x) else np.asarray(x)
    if a.raw is None and _is_counts(a):
        x = np.log1p(x / np.maximum(x.sum(axis=1, keepdims=True), 1) * 1e4)
        space = "X scaled to 10000 counts per cell and log1p"
    key = a.obs[reference_key].astype(str).values
    refs = np.vstack([x[key == g].mean(axis=0) for g in groups])
    xc = x - x.mean(axis=1, keepdims=True)
    rc = refs - refs.mean(axis=1, keepdims=True)
    corr = (xc @ rc.T) / (np.linalg.norm(xc, axis=1)[:, None] * np.linalg.norm(rc, axis=1)[None, :] + 1e-12)
    best = corr.argmax(axis=1)
    a.obs[label_key] = pd.Categorical([groups[i] for i in best], categories=groups)
    table = pd.crosstab(a.obs[reference_key].astype(str), a.obs[label_key]).reset_index().rename(columns={reference_key: "sample"})
    csv = _table(table, "reference_labels")
    margin = np.sort(corr, axis=1)
    gap = margin[:, -1] - margin[:, -2]
    summary = "Labeled %d cells by the best Pearson correlation with the mean profile of each reference group (%s), on %s. Counts: %s. Median gap between the best and second correlation: %.3f." % (
        a.n_obs, ", ".join(groups), space, "; ".join("%s %d" % (g, (best == i).sum()) for i, g in enumerate(groups)), np.median(gap))
    metrics = {"n_cells": a.n_obs, "median_gap": float(np.median(gap)), "n_low_gap": int((gap < 0.05).sum())}
    for i, g in enumerate(groups):
        metrics["n_" + re.sub(r"\W", "_", g)] = int((best == i).sum())
    return _result(a, "labeled", summary, metrics, [csv], _preview(table, csv, 30), {"label_key": label_key})


def compare_embeddings(adata, rep_a, rep_b, n_dims=None):
    a = _get(adata)
    xa, err = _embedding(a, rep_a, n_dims)
    if err:
        return _fail(err)
    xb, err = _embedding(a, rep_b, n_dims)
    if err:
        return _fail(err)
    k = min(xa.shape[1], xb.shape[1])
    r = np.array([np.corrcoef(xa[:, i], xb[:, i])[0, 1] for i in range(k)])
    frame = pd.DataFrame({"dimension": np.arange(1, k + 1), "pearson_r": r})
    csv = _table(frame, "embedding_correlation")
    summary = "Compared %d dimensions of %s and %s. Pearson r per dimension: minimum %.4f, mean %.4f." % (k, rep_a, rep_b, r.min(), r.mean())
    return {"ok": True, "summary": summary, "metrics": {"n_dims": k, "min_r": float(r.min()), "mean_r": float(r.mean())},
            "outputs": [{"path": csv, "kind": "table", "name": os.path.basename(csv)}], "table": _preview(frame, csv, 30)}


def plot_integration(adata, batch_key, label_key=None, reps=None, n_pcs=None, n_neighbors=15, random_state=0):
    a = _get(adata)
    err = _check_batch(a, batch_key)
    if err:
        return _fail(err)
    names = _as_list(reps) or [r for r in ("X_pca", "X_pca_harmony") if r in a.obsm]
    if not names:
        return _fail("No embedding found. Run run_pca first.")
    colors = [batch_key] + ([label_key] if label_key and label_key in a.obs else [])
    fig, axes = plt.subplots(len(colors), len(names), figsize=(4.5 * len(names), 4 * len(colors)), squeeze=False)
    for j, rep in enumerate(names):
        x, err = _embedding(a, rep, n_pcs)
        if err:
            return _fail(err)
        b = ad.AnnData(np.zeros((a.n_obs, 1)), obs=a.obs[colors].astype("category"))
        b.obsm["X_emb"] = x
        sc.pp.neighbors(b, n_neighbors=int(n_neighbors), use_rep="X_emb", random_state=int(random_state))
        sc.tl.umap(b, random_state=int(random_state))
        for i, c in enumerate(colors):
            sc.pl.umap(b, color=c, ax=axes[i][j], show=False, title="%s by %s" % (rep, c), frameon=False)
    plot = _png("integration_umap")
    summary = "Drew UMAP plots of %s colored by %s. These plots are for viewing. Judge the mixing with compute_lisi." % (", ".join(names), ", ".join(colors))
    return {"ok": True, "summary": summary, "metrics": {"n_embeddings": len(names), "n_cells": a.n_obs},
            "outputs": [{"path": plot, "kind": "image", "name": os.path.basename(plot)}]}


def count_groups(adata, key, by=None):
    a = _get(adata)
    if key not in a.obs:
        return _fail("Column %s not found in obs. Columns: %s." % (key, ", ".join(map(str, a.obs.columns))))
    if by is not None and by not in a.obs:
        return _fail("Column %s (argument by) not found in obs. Columns: %s." % (by, ", ".join(map(str, a.obs.columns))))
    if by:
        frame = pd.crosstab(a.obs[key].astype(str), a.obs[by].astype(str)).reset_index()
    else:
        counts = a.obs[key].astype(str).value_counts().sort_index()
        frame = pd.DataFrame({key: counts.index, "n_cells": counts.values})
    csv = _table(frame, "counts_%s" % key)
    summary = "Counted %d cells in %d groups of %s%s. %s." % (a.n_obs, a.obs[key].nunique(), key, " by " + by if by else "", "; ".join("%s %s" % (r[0], ", ".join(str(v) for v in r[1:])) for r in frame.itertuples(index=False)))
    return {"ok": True, "summary": summary, "metrics": {"n_cells": a.n_obs, "n_groups": int(a.obs[key].nunique())},
            "outputs": [{"path": csv, "kind": "table", "name": os.path.basename(csv)}], "table": _preview(frame, csv, 40)}
