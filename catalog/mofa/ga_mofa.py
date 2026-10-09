import contextlib
import json
import os
import sys
import warnings

import h5py
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

warnings.filterwarnings("ignore")

LIKELIHOODS = ("gaussian", "bernoulli", "poisson")


def _fail(message):
    return {"ok": False, "error": message}


def _style():
    plt.rcParams.update({
        "font.size": 9, "font.family": "sans-serif", "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "axes.spines.top": False, "axes.spines.right": False, "svg.fonttype": "none",
    })


def _save(fig, stem):
    png = os.path.join(os.getcwd(), stem + ".png")
    svg = os.path.join(os.getcwd(), stem + ".svg")
    fig.savefig(png, dpi=200, bbox_inches="tight")
    fig.savefig(svg, bbox_inches="tight")
    plt.close(fig)
    return [{"path": png, "kind": "image", "name": os.path.basename(png)}, {"path": svg, "kind": "file", "name": os.path.basename(svg)}]


def _clean(v):
    if isinstance(v, (float, np.floating)):
        return None if np.isnan(v) else float(v)
    if isinstance(v, np.integer):
        return int(v)
    return v


def _table(frame, name, limit=20):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    rows = [[_clean(v) for v in r] for r in frame.head(limit).itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": rows, "n_rows": int(len(frame)), "path": path}


def _as_list(v):
    if v is None:
        return []
    if isinstance(v, str):
        s = v.strip()
        if s.startswith("["):
            try:
                return [str(x) for x in json.loads(s)]
            except ValueError:
                pass
        return [x.strip() for x in s.split(",") if x.strip() and x.strip().lower() != "none"]
    return [str(x) for x in v]


def _pairs(v):
    out = {}
    if isinstance(v, dict):
        return {str(k): str(x) for k, x in v.items()}
    for item in _as_list(v):
        if "=" not in item:
            return None
        k, x = item.split("=", 1)
        out[k.strip()] = x.strip()
    return out


def _read(path, orientation):
    path = os.path.expanduser(str(path))
    if not os.path.exists(path):
        return None, "File not found: %s." % path
    sep = "\t" if path.lower().endswith((".tsv", ".txt")) else ","
    try:
        frame = pd.read_csv(path, sep=sep, index_col=0)
    except Exception as e:
        return None, "Could not read the table %s: %s" % (path, e)
    if orientation == "features in rows":
        frame = frame.T
    return frame, None


def run_mofa(views, orientation="features in rows", likelihoods=None, n_factors=15, drop_factor_r2=0.0, scale_views=False, top_features=0,
             seed=1, convergence_mode="medium", max_iterations=1000, ard_weights=True, spikeslab_weights=True):
    from mofapy2.run.entry_point import entry_point

    pairs = _pairs(views)
    if not pairs:
        return _fail("views must hold name=path pairs, one for each view, such as mrna=/path/mrna.csv. Got: %s" % views)
    if len(pairs) < 2:
        return _fail("MOFA needs 2 views or more. views has %d: %s." % (len(pairs), ", ".join(pairs)))
    if orientation not in ("features in rows", "samples in rows"):
        return _fail("orientation must be 'features in rows' or 'samples in rows', not %s." % orientation)
    if convergence_mode not in ("fast", "medium", "slow"):
        return _fail("convergence_mode must be fast, medium or slow, not %s." % convergence_mode)
    lik = _pairs(likelihoods) if likelihoods else {}
    if lik is None:
        return _fail("likelihoods must hold name=likelihood pairs, such as mutations=bernoulli. Got: %s" % likelihoods)
    for name, l in lik.items():
        if name not in pairs:
            return _fail("likelihoods names the view %s, but the views are: %s." % (name, ", ".join(pairs)))
        if l not in LIKELIHOODS:
            return _fail("likelihood %s of view %s is not one of: %s." % (l, name, ", ".join(LIKELIHOODS)))
    frames = {}
    for name, path in pairs.items():
        frame, err = _read(path, orientation)
        if err:
            return _fail("View %s: %s" % (name, err))
        frame = frame.apply(pd.to_numeric, errors="coerce")
        frame = frame.loc[:, frame.notna().sum() > 0]
        if int(top_features) and frame.shape[1] > int(top_features):
            keep = frame.var(skipna=True).sort_values(ascending=False).index[: int(top_features)]
            frame = frame.loc[:, keep]
        if frame.shape[1] < 2:
            return _fail("View %s has %d feature after the filter. Check orientation (%s) and the table %s." % (name, frame.shape[1], orientation, path))
        frames[name] = frame
    samples = list(dict.fromkeys(s for f in frames.values() for s in f.index))
    names = list(frames)
    data = [[frames[n].reindex(samples).to_numpy(dtype=float)] for n in names]
    n_shared = int(sum(all(s in frames[n].index for n in names) for s in samples))
    if n_shared < 10:
        return _fail("Only %d samples are in all views (%d in total). Check that the sample names match across the views." % (n_shared, len(samples)))
    n_factors = int(n_factors)
    if n_factors < 1 or n_factors >= len(samples):
        return _fail("n_factors must be between 1 and %d, the number of samples minus 1. Got %d." % (len(samples) - 1, n_factors))

    with contextlib.redirect_stdout(sys.stderr):
        ep = entry_point()
    ep.set_data_options(scale_views=bool(scale_views))
    ep.set_data_matrix(data, likelihoods=[lik.get(n, "gaussian") for n in names], views_names=names, groups_names=["all"],
                       samples_names=[samples], features_names=[list(frames[n].columns) for n in names])
    ep.set_model_options(factors=n_factors, spikeslab_weights=bool(spikeslab_weights), ard_weights=bool(ard_weights))
    drop = float(drop_factor_r2)
    ep.set_train_options(iter=int(max_iterations), convergence_mode=convergence_mode, dropR2=(drop / 100.0 if drop > 0 else None), seed=int(seed), verbose=False, quiet=True)
    try:
        with contextlib.redirect_stdout(sys.stderr):
            ep.build()
            ep.run()
    except Exception as e:
        return _fail("MOFA training stopped (%d views, %d samples, %d factors, seed %s): %s" % (len(names), len(samples), n_factors, seed, e))
    model_path = os.path.join(os.getcwd(), "mofa_model.hdf5")
    with contextlib.redirect_stdout(sys.stderr):
        ep.save(model_path)

    with h5py.File(model_path, "r") as f:
        z = f["expectations"]["Z"]["all"][:]
        r2 = f["variance_explained"]["r2_per_factor"]["all"][:]
        r2_total = f["variance_explained"]["r2_total"]["all"][:]
        view_names = [v.decode() if isinstance(v, bytes) else v for v in f["views"]["views"][:]]
        sample_names = [s.decode() if isinstance(s, bytes) else s for s in f["samples"]["all"][:]]
        weights = {v: f["expectations"]["W"][v][:] for v in view_names}
        features = {v: [x.decode() if isinstance(x, bytes) else x for x in f["features"][v][:]] for v in view_names}
    k = z.shape[0]
    order = np.argsort(-r2.sum(axis=0))
    z, r2 = z[order], r2[:, order]
    for v in view_names:
        weights[v] = weights[v][order]
    labels = ["Factor%d" % (i + 1) for i in range(k)]

    factors = pd.DataFrame(z.T, index=sample_names, columns=labels)
    factors.index.name = "sample"
    factors = factors.reset_index()
    factors.to_csv(os.path.join(os.getcwd(), "mofa_factors.csv"), index=False)
    long = pd.concat([pd.DataFrame({"view": v, "feature": features[v], "factor": f, "weight": weights[v][i]}) for v in view_names for i, f in enumerate(labels)], ignore_index=True)
    weights_path = os.path.join(os.getcwd(), "mofa_weights.csv")
    long.to_csv(weights_path, index=False)
    var = pd.DataFrame(r2.T, index=labels, columns=view_names)
    var.insert(0, "factor", labels)
    var.insert(len(var.columns), "sum_views", r2.sum(axis=0))

    metrics = {"n_factors": int(k), "n_samples": len(sample_names), "n_samples_in_all_views": n_shared, "n_views": len(view_names), "seed": int(seed)}
    for j, v in enumerate(view_names):
        metrics["r2_total_%s" % v] = float(r2_total[j])
        metrics["n_features_%s" % v] = len(features[v])
        for i in range(min(k, 10)):
            metrics["r2_factor%d_%s" % (i + 1, v)] = float(r2[j, i])
    _style()
    fig, ax = plt.subplots(figsize=(1.0 + 0.9 * len(view_names), 0.8 + 0.4 * k))
    im = ax.imshow(r2.T, aspect="auto", cmap="Blues", vmin=0)
    ax.set_xticks(range(len(view_names)), view_names)
    ax.set_yticks(range(k), labels)
    for i in range(k):
        for j in range(len(view_names)):
            ax.text(j, i, "%.1f" % r2[j, i], ha="center", va="center", fontsize=7, color="white" if r2[j, i] > r2.max() * 0.6 else "black")
    fig.colorbar(im, ax=ax, label="Variance explained (%)")
    ax.set_title("MOFA variance explained, %d factors" % k)
    outputs = _save(fig, "mofa_variance_explained")
    outputs += [{"path": os.path.join(os.getcwd(), "mofa_factors.csv"), "kind": "table", "name": "mofa_factors.csv"}, {"path": weights_path, "kind": "table", "name": "mofa_weights.csv"},
                {"path": model_path, "kind": "file", "name": "mofa_model.hdf5"}]
    totals = "; ".join("%s %.1f%%" % (v, r2_total[j]) for j, v in enumerate(view_names))
    summary = "MOFA (mofapy2 %s), %d views, %d samples (%d in all views), %d factors kept of %d, seed %s. Variance explained by all factors: %s. Weights file: %s." % (
        _version(), len(view_names), len(sample_names), n_shared, k, n_factors, seed, totals, weights_path)
    return {"ok": True, "summary": summary, "metrics": metrics,
            "data": {"factors_file": os.path.join(os.getcwd(), "mofa_factors.csv"), "weights_file": weights_path, "model_file": model_path, "views": view_names, "seed": int(seed), "mofapy2_version": _version()},
            "table": _table(var, "mofa_variance_explained", 30), "outputs": outputs}


def _version():
    import importlib.metadata as m
    return m.version("mofapy2")


def associate_factors(factors_file, covariates, orientation="features in rows", covariate_names=None):
    factors_file = os.path.expanduser(str(factors_file))
    if not os.path.exists(factors_file):
        return _fail("File not found: %s. Use the factors_file of run_mofa." % factors_file)
    fac = pd.read_csv(factors_file, index_col=0)
    cov, err = _read(covariates, orientation)
    if err:
        return _fail(err)
    names = _as_list(covariate_names)
    if names:
        miss = [n for n in names if n not in cov.columns]
        if miss:
            return _fail("covariate_names not found: %s. With orientation %s the covariates are: %s." % (", ".join(miss), orientation, ", ".join(map(str, list(cov.columns)[:25]))))
        cov = cov[names]
    cov = cov.loc[cov.index.intersection(fac.index)]
    if len(cov) < 5:
        return _fail("Only %d samples are in both the factors and the covariates. Check the sample names and the orientation (%s)." % (len(cov), orientation))
    rows = []
    for c in cov.columns:
        y = cov[c]
        if not pd.api.types.is_numeric_dtype(y):
            codes = pd.Categorical(y).codes.astype(float)
            codes[codes < 0] = np.nan
            if len(set(codes[~np.isnan(codes)])) > 2:
                continue
            y = pd.Series(codes, index=cov.index)
        y = pd.to_numeric(y, errors="coerce")
        for f in fac.columns:
            ok = y.notna()
            if ok.sum() < 5 or y[ok].nunique() < 2:
                continue
            r, p = stats.pearsonr(fac.loc[y.index[ok], f], y[ok])
            rows.append({"covariate": c, "factor": f, "r": float(r), "abs_r": abs(float(r)), "p_value": float(p), "n": int(ok.sum())})
    if not rows:
        return _fail("No covariate can be correlated. A covariate needs 2 different values in 5 samples or more, and a text covariate must have 2 levels. Covariates read: %s." % ", ".join(map(str, cov.columns)))
    res = pd.DataFrame(rows)
    m = len(res)
    order = np.argsort(res["p_value"].to_numpy())
    adj = np.empty(m)
    adj[order] = np.minimum.accumulate((res["p_value"].to_numpy()[order] * m / np.arange(1, m + 1))[::-1])[::-1]
    res["p_adjusted_bh"] = np.minimum(adj, 1.0)
    res = res.sort_values(["covariate", "abs_r"], ascending=[True, False])
    best = res.groupby("covariate", sort=False).head(1)
    metrics = {"n_covariates": int(res["covariate"].nunique()), "n_pairs": m, "n_samples": int(res["n"].max())}
    for r in best.itertuples():
        metrics["best_factor_%s" % r.covariate] = int(r.factor.replace("Factor", ""))
        metrics["abs_r_%s" % r.covariate] = r.abs_r
        metrics["p_adjusted_%s" % r.covariate] = r.p_adjusted_bh
    summary = "Pearson correlation of %d factors with %d covariates in %d samples, Benjamini-Hochberg over %d pairs. Best factor for each covariate: %s." % (
        fac.shape[1], metrics["n_covariates"], metrics["n_samples"], m, "; ".join("%s %s |r| = %.3f, adjusted p = %.3g" % (r.covariate, r.factor, r.abs_r, r.p_adjusted_bh) for r in best.itertuples()))
    return {"ok": True, "summary": summary, "metrics": metrics, "table": _table(res.drop(columns=["abs_r"]), "mofa_factor_covariates", 30), "outputs": []}


def top_features(weights_file, view, factor, n=10):
    weights_file = os.path.expanduser(str(weights_file))
    if not os.path.exists(weights_file):
        return _fail("File not found: %s. Use the weights_file of run_mofa." % weights_file)
    w = pd.read_csv(weights_file)
    if view not in set(w["view"]):
        return _fail("view %s is not in the weights file. Views: %s." % (view, ", ".join(sorted(set(w["view"])))))
    if factor not in set(w["factor"]):
        return _fail("factor %s is not in the weights file. Factors: %s." % (factor, ", ".join(sorted(set(w["factor"]), key=lambda s: int(s[6:])))))
    s = w[(w["view"] == view) & (w["factor"] == factor)].copy()
    s["abs_weight"] = s["weight"].abs()
    s = s.sort_values("abs_weight", ascending=False).head(int(n)).reset_index(drop=True)
    metrics = {"n_features_in_view": int((w["view"] == view).sum() // w["factor"].nunique()), "top_weight": float(s.loc[0, "weight"])}
    summary = "Top %d features of %s in view %s by absolute weight: %s." % (len(s), factor, view, "; ".join("%s %.3f" % (r.feature, r.weight) for r in s.itertuples()))
    return {"ok": True, "summary": summary, "metrics": metrics, "table": _table(s[["feature", "weight"]], "mofa_top_features", int(n)), "outputs": []}
