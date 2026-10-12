import math
import os
import re
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy import stats
from skimage import color, feature, filters, io, measure, segmentation

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

BLUE, ORANGE, SKY, VERMILION, GREEN, PURPLE, GREY = "#0072B2", "#E69F00", "#56B4E9", "#D55E00", "#009E73", "#CC79A7", "#999999"
CLASS_COLORS = [BLUE, "#E8D44D", ORANGE, VERMILION]
CLASS_NAMES = ["0", "1+", "2+", "3+"]
AUTO_METHODS = ["otsu", "li", "triangle", "yen", "isodata", "mean"]
COMPARTMENTS = ["nucleus", "cytoplasm", "membrane", "cell"]
STAIN_VECTORS = {
    "ruifrok_hdab": ([0.65, 0.70, 0.29], [0.27, 0.57, 0.78]),
    "qupath_hdab": ([0.651, 0.701, 0.29], [0.269, 0.568, 0.778]),
}
MAX_PIXELS = 40_000_000
X_NAMES = ["centroid x µm", "centroid x um", "centroid x px", "centroid_x", "x"]
Y_NAMES = ["centroid y µm", "centroid y um", "centroid y px", "centroid_y", "y"]


def _fail(msg):
    raise ValueError(msg)


def _need(value, name, decision):
    if value is None or (isinstance(value, str) and not value.strip()):
        _fail("%s is not set. Ask the scientist for the decision %s" % (name, decision))
    return value


def _check_file(path, what):
    if not path or not Path(path).is_file():
        _fail("%s file not found: %s" % (what, path))


def _key(text):
    return re.sub(r"\W+", "_", str(text)).strip("_").lower() or "x"


def _rgb(hexcolor):
    h = hexcolor.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _save_plot(fig, stem):
    png, svg = stem + ".png", stem + ".svg"
    fig.savefig(png, dpi=150, bbox_inches="tight")
    with matplotlib.rc_context({"svg.fonttype": "none"}):
        fig.savefig(svg, format="svg", bbox_inches="tight")
    plt.close(fig)
    return [png, svg]


def _plot_outputs(paths, name):
    return [{"path": p, "kind": "image" if p.endswith(".png") else "file", "name": "%s (%s)" % (name, p.rsplit(".", 1)[-1].upper())} for p in paths]


def _stem(path):
    return os.path.abspath(Path(path).stem)


def _write_table(path, df):
    df.to_csv(path, index=False)
    rows = [[None if (isinstance(v, float) and not math.isfinite(v)) else v for v in r] for r in df.head(30).astype(object).values.tolist()]
    return {"columns": list(df.columns), "rows": rows, "n_rows": int(len(df)), "path": os.path.abspath(path)}


def _read_table(path, what="cell table"):
    _check_file(path, what)
    with open(path, "rb") as f:
        raw = f.read()
    try:
        raw.decode("utf-8")
        enc = "utf-8-sig"
    except UnicodeDecodeError:
        enc = "cp1252"
    head = raw.decode(enc, errors="replace").split("\n", 1)[0]
    sep = "\t" if head.count("\t") > head.count(",") else ","
    try:
        df = pd.read_csv(path, sep=sep, encoding=enc, encoding_errors="replace")
    except Exception as e:
        _fail("cannot read the %s %s as a table: %s" % (what, path, e))
    if df.empty:
        _fail("the %s %s has no rows" % (what, path))
    return df


def _find_col(df, names):
    low = {str(c).strip().lower(): c for c in df.columns}
    return next((low[n] for n in names if n in low), None)


def _intensity_column(df, compartment, intensity_column, path):
    if intensity_column:
        if intensity_column not in df.columns:
            _fail("intensity_column %s is not a column of %s. Columns with DAB in the name: %s" % (intensity_column, path, ", ".join(c for c in df.columns if "dab" in str(c).lower()) or "none"))
        return intensity_column
    comp = str(_need(compartment, "compartment", "scoring_compartment")).strip().lower()
    if comp not in COMPARTMENTS:
        _fail("compartment is %s. Use one of: %s" % (compartment, ", ".join(COMPARTMENTS)))
    col = _find_col(df, ["%s: dab od mean" % comp])
    if col is None:
        _fail("the table %s has no column '%s: DAB OD mean'. Give intensity_column. Columns with DAB in the name: %s" % (path, comp.capitalize(), ", ".join(c for c in df.columns if "dab" in str(c).lower()) or "none"))
    return col


def _xy_columns(df, x_column, y_column, path):
    xc = x_column or _find_col(df, X_NAMES)
    yc = y_column or _find_col(df, Y_NAMES)
    for c, n in ((xc, "x_column"), (yc, "y_column")):
        if c is None or c not in df.columns:
            _fail("%s is not set or not a column of %s. Columns: %s" % (n, path, ", ".join(map(str, df.columns))))
    return xc, yc


def _apply_region(df, region, x_column, y_column, path):
    spec = str(_need(region, "region", "scoring_region")).strip()
    if spec.lower() in ("whole", "whole slide", "all"):
        return df, 0
    if spec.lower().startswith("box:"):
        try:
            x0, y0, w, h = [float(v) for v in spec[4:].split(",")]
        except ValueError:
            _fail("region %s is not box:x,y,width,height with four numbers" % spec)
        xc, yc = _xy_columns(df, x_column, y_column, path)
        keep = (df[xc] >= x0) & (df[xc] < x0 + w) & (df[yc] >= y0) & (df[yc] < y0 + h)
    elif "=" in spec:
        col, val = [s.strip() for s in spec.split("=", 1)]
        if col not in df.columns:
            _fail("region %s names the column %s, which is not in %s. Columns: %s" % (spec, col, path, ", ".join(map(str, df.columns))))
        keep = df[col].astype(str).str.strip() == val
        if not keep.any():
            _fail("region %s matches no row. Values of %s: %s" % (spec, col, ", ".join(map(str, df[col].astype(str).unique()[:10]))))
    else:
        _fail("region is %s. Use whole, box:x,y,width,height, or column=value" % spec)
    return df[keep], int((~keep).sum())


def _thresholds(t1, t2, t3, need=3):
    vals = [_need(t1, "threshold_1plus", "threshold_1plus")]
    if need > 1:
        vals += [_need(t2, "threshold_2plus", "threshold_2plus"), _need(t3, "threshold_3plus", "threshold_3plus")]
    vals = [float(v) for v in vals]
    if any(b <= a for a, b in zip(vals, vals[1:])):
        _fail("the thresholds must rise: threshold_1plus %g, threshold_2plus %g, threshold_3plus %g" % (t1, t2, t3))
    return vals


def _classify(values, t):
    cls = np.zeros(len(values), dtype=int)
    for i, v in enumerate(t, start=1):
        cls[values >= v] = i
    return cls


def _parse_columns(text, n, name):
    cols = [c.strip() for c in str(text).split(",") if c.strip()]
    if len(cols) != n:
        _fail("%s needs %d column names separated by commas, for 0, 1+, 2+ and 3+. It has %d" % (name, n, len(cols)))
    return cols


def _group_counts(table, compartment, intensity_column, group_column, region, x_column, y_column, t, min_cells, bin_columns, bin_unit):
    df = _read_table(table)
    df, n_out = _apply_region(df, region, x_column, y_column, table)
    if group_column and group_column not in df.columns:
        _fail("group_column %s is not a column of %s. Columns: %s" % (group_column, table, ", ".join(map(str, df.columns))))
    rows = []
    if bin_columns:
        cols = _parse_columns(bin_columns, 4, "bin_columns")
        for c in cols:
            if c not in df.columns:
                _fail("bin_columns names %s, which is not a column of %s. Columns: %s" % (c, table, ", ".join(map(str, df.columns))))
        unit = str(_need(bin_unit, "bin_unit", "bin_unit")).lower()
        if unit not in ("percent", "fraction", "count"):
            _fail("bin_unit is %s. Use percent, fraction or count" % bin_unit)
        for i, r in df.iterrows():
            n = [float(r[c]) for c in cols]
            den = {"percent": 100.0, "fraction": 1.0}.get(unit, sum(n))
            rows.append({"group": str(r[group_column]) if group_column else str(i), "n": n, "denominator": den, "sum": sum(n), "excluded": 0})
        return rows, {"n_outside_region": n_out, "route": "bins", "column": ",".join(cols), "bin_unit": unit}
    col = _intensity_column(df, compartment, intensity_column, table)
    vals_all = pd.to_numeric(df[col], errors="coerce")
    groups = df[group_column].astype(str) if group_column else pd.Series(["all"] * len(df), index=df.index)
    for g in groups.drop_duplicates():
        v = vals_all[groups == g]
        ok = v.dropna().to_numpy(float)
        cls = _classify(ok, t)
        n = [float((cls == i).sum()) for i in range(4)]
        rows.append({"group": g, "n": n, "denominator": float(len(ok)), "sum": float(len(ok)), "excluded": int(v.isna().sum())})
    return rows, {"n_outside_region": n_out, "route": "cells", "column": col, "bin_unit": "count"}


def _score_rows(rows, min_cells, unit_is_count):
    out = []
    for r in rows:
        den = r["denominator"]
        enough = (not unit_is_count) or (r["sum"] >= (min_cells or 0))
        if den <= 0:
            f = [float("nan")] * 4
        else:
            f = [x / den for x in r["n"]]
        out.append({**r, "fractions": f, "enough": bool(enough and den > 0)})
    return out


def _stacked_plot(stem, res, title):
    shown = res[:40]
    fig, ax = plt.subplots(figsize=(max(4.2, 0.45 * len(shown) + 2), 3.8))
    bottom = np.zeros(len(shown))
    for i in range(4):
        h = np.array([100 * r["fractions"][i] if r["enough"] else 0 for r in shown])
        ax.bar(range(len(shown)), h, bottom=bottom, color=CLASS_COLORS[i], label=CLASS_NAMES[i], width=0.8)
        bottom += h
    ax.set_xticks(range(len(shown)))
    ax.set_xticklabels([r["group"] for r in shown], rotation=60, ha="right", fontsize=7)
    ax.set_ylabel("percent of cells")
    ax.set_title(title, fontsize=9)
    ax.legend(title="intensity", frameon=False, bbox_to_anchor=(1.01, 1), loc="upper left")
    ax.spines[["top", "right"]].set_visible(False)
    return _save_plot(fig, stem)


def _result_metrics(res, keyed, name):
    m = {"n_groups": len(res), "n_groups_scored": int(sum(r["enough"] for r in res))}
    scored = [r for r in res if r["enough"]]
    if len(res) <= 50:
        for r in res:
            if r["enough"]:
                m["%s_%s" % (name, _key(r["group"]))] = keyed(r)
    if scored:
        m["mean_" + name] = float(np.mean([keyed(r) for r in scored]))
    return m


def score_h_score(table, threshold_1plus=None, threshold_2plus=None, threshold_3plus=None, compartment=None, intensity_column="", group_column="", region=None, min_cells=None, bin_columns="", bin_unit="", x_column="", y_column=""):
    binned = bool(bin_columns)
    t = [] if binned else _thresholds(threshold_1plus, threshold_2plus, threshold_3plus)
    if not binned and min_cells is None:
        _need(None, "min_cells", "min_cells")
    rows, info = _group_counts(table, compartment, intensity_column, group_column, region, x_column, y_column, t, min_cells, bin_columns, bin_unit)
    res = _score_rows(rows, min_cells, info["route"] == "cells" or info["bin_unit"] == "count")
    cols = ["group", "n_cells", "n_no_value", "pct_0", "pct_1plus", "pct_2plus", "pct_3plus", "pct_positive", "h_score", "status"]
    tab, notes = [], []
    for r in res:
        f = r["fractions"]
        if r["enough"]:
            h = 100 * (f[1] + 2 * f[2] + 3 * f[3])
            status = "scored"
        else:
            h = float("nan")
            status = "below min_cells" if r["denominator"] > 0 else "no cells"
        if info["bin_unit"] == "percent" and abs(r["sum"] - 100) > 1:
            notes.append("%s: the percents add to %g" % (r["group"], r["sum"]))
        tab.append([r["group"], r["sum"] if info["route"] == "cells" or info["bin_unit"] == "count" else float("nan"), r["excluded"]] + [100 * x for x in f] + [100 * (f[1] + f[2] + f[3]), h, status])
    df = pd.DataFrame(tab, columns=cols)
    df["pct_positive"] = df[["pct_1plus", "pct_2plus", "pct_3plus"]].sum(axis=1, min_count=3)
    stem = _stem(table)
    cpath = stem + "_h_score.csv"
    tbl = _write_table(cpath, df)
    scored = {r["group"]: i for i, r in enumerate(res)}
    metrics = _result_metrics(res, lambda r: float(df.loc[scored[r["group"]], "h_score"]), "h_score")
    metrics["n_outside_region"] = info["n_outside_region"]
    metrics["n_cells_total"] = float(sum(r["sum"] for r in res)) if info["route"] == "cells" else 0.0
    metrics["n_cells_no_value"] = float(sum(r["excluded"] for r in res))
    if len(res) == 1 and res[0]["enough"]:
        metrics["h_score"] = float(df.loc[0, "h_score"])
        metrics["pct_positive"] = float(df.loc[0, "pct_positive"])
    plots = _stacked_plot(stem + "_h_score", res, "H-score classes")
    below = [r["group"] for r in res if not r["enough"]]
    summary = "H-score of %d group(s), %d scored from %s%s. Mean H-score %.1f." % (len(res), metrics["n_groups_scored"], "binned percentages" if binned else "cells (%s)" % info["column"], (". Below the minimum or empty: " + ", ".join(map(str, below[:5]))) if below else "", metrics.get("mean_h_score", float("nan")))
    if notes:
        summary += " Check: " + "; ".join(notes[:3])
    return {"ok": True, "summary": summary, "metrics": metrics, "outputs": [{"path": cpath, "kind": "table", "name": "H-score for each group"}] + _plot_outputs(plots, "intensity classes"), "table": tbl}


def _allred_proportion(f):
    if f <= 0:
        return 0
    if f < 0.01:
        return 1
    if f <= 0.10:
        return 2
    if f <= 1 / 3:
        return 3
    if f <= 2 / 3:
        return 4
    return 5


def _allred_intensity(n, rule):
    pos = n[1:]
    if sum(pos) <= 0:
        return 0
    if rule == "predominant":
        best = max(pos)
        return max(i + 1 for i, v in enumerate(pos) if v == best)
    mean = sum((i + 1) * v for i, v in enumerate(pos)) / sum(pos)
    return int(math.floor(mean + 0.5))


def score_allred(table, threshold_1plus=None, threshold_2plus=None, threshold_3plus=None, compartment=None, intensity_column="", group_column="", region=None, min_cells=None, intensity_rule=None, bin_columns="", bin_unit="", x_column="", y_column=""):
    rule = str(_need(intensity_rule, "intensity_rule", "allred_intensity_rule")).lower()
    if rule not in ("predominant", "average"):
        _fail("intensity_rule is %s. Use predominant or average" % intensity_rule)
    binned = bool(bin_columns)
    t = [] if binned else _thresholds(threshold_1plus, threshold_2plus, threshold_3plus)
    if not binned and min_cells is None:
        _need(None, "min_cells", "min_cells")
    rows, info = _group_counts(table, compartment, intensity_column, group_column, region, x_column, y_column, t, min_cells, bin_columns, bin_unit)
    res = _score_rows(rows, min_cells, info["route"] == "cells" or info["bin_unit"] == "count")
    cols = ["group", "n_cells", "pct_positive", "proportion_score", "intensity_score", "allred_score", "positive_at_3_or_more", "status"]
    tab = []
    for r in res:
        f = r["fractions"]
        if r["enough"]:
            pp = f[1] + f[2] + f[3]
            ps, is_ = _allred_proportion(pp), _allred_intensity(r["n"], rule)
            tab.append([r["group"], r["sum"], 100 * pp, ps, is_, ps + is_, "yes" if ps + is_ >= 3 else "no", "scored"])
        else:
            tab.append([r["group"], r["sum"], float("nan"), None, None, None, "", "below min_cells" if r["denominator"] > 0 else "no cells"])
    df = pd.DataFrame(tab, columns=cols)
    stem = _stem(table)
    cpath = stem + "_allred.csv"
    tbl = _write_table(cpath, df)
    idx = {r["group"]: i for i, r in enumerate(res)}
    metrics = _result_metrics(res, lambda r: float(df.loc[idx[r["group"]], "allred_score"]), "allred")
    metrics["n_outside_region"] = info["n_outside_region"]
    if len(res) == 1 and res[0]["enough"]:
        metrics["allred_score"] = float(df.loc[0, "allred_score"])
        metrics["proportion_score"] = float(df.loc[0, "proportion_score"])
        metrics["intensity_score"] = float(df.loc[0, "intensity_score"])
        metrics["pct_positive"] = float(df.loc[0, "pct_positive"])
    plots = _stacked_plot(stem + "_allred", res, "Intensity classes behind the Allred score")
    summary = "Allred score of %d group(s), %d scored, intensity rule %s. Mean Allred score %.2f." % (len(res), metrics["n_groups_scored"], rule, metrics.get("mean_allred", float("nan")))
    return {"ok": True, "summary": summary, "metrics": metrics, "outputs": [{"path": cpath, "kind": "table", "name": "Allred score for each group"}] + _plot_outputs(plots, "intensity classes"), "table": tbl}


def _hotspot(x, y, pos, side, min_cells):
    step = side / 2.0
    xe = np.arange(x.min(), x.max() + 2 * step, step)
    ye = np.arange(y.min(), y.max() + 2 * step, step)
    tot, _, _ = np.histogram2d(x, y, bins=[xe, ye])
    pc, _, _ = np.histogram2d(x[pos], y[pos], bins=[xe, ye])
    tot, pc = np.pad(tot, 1), np.pad(pc, 1)
    wt = tot[:-1, :-1] + tot[1:, :-1] + tot[:-1, 1:] + tot[1:, 1:]
    wp = pc[:-1, :-1] + pc[1:, :-1] + pc[:-1, 1:] + pc[1:, 1:]
    ok = wt >= min_cells
    if not ok.any():
        return None, int(wt.max())
    idx = np.where(ok, wp / np.maximum(wt, 1), -1)
    best = idx.max()
    cand = np.argwhere(idx == best)
    i, j = max(cand, key=lambda c: wt[c[0], c[1]])
    x0, y0 = x.min() + (i - 1) * step, y.min() + (j - 1) * step
    return {"x0": float(x0), "y0": float(y0), "n_cells": int(wt[i, j]), "n_positive": int(wp[i, j]), "index": float(best)}, int(wt.max())


def score_ki67(table, positive_threshold=None, compartment=None, intensity_column="", group_column="", region=None, min_cells=None, hotspot_mode=None, hotspot_side=None, hotspot_min_cells=None, x_column="", y_column=""):
    t = _thresholds(positive_threshold, None, None, need=1)
    mode = str(_need(hotspot_mode, "hotspot_mode", "ki67_hotspot")).lower()
    if mode not in ("none", "hotspot"):
        _fail("hotspot_mode is %s. Use none or hotspot" % hotspot_mode)
    if min_cells is None:
        _need(None, "min_cells", "min_cells")
    df = _read_table(table)
    df, n_out = _apply_region(df, region, x_column, y_column, table)
    col = _intensity_column(df, compartment, intensity_column, table)
    if group_column and group_column not in df.columns:
        _fail("group_column %s is not a column of %s. Columns: %s" % (group_column, table, ", ".join(map(str, df.columns))))
    if mode == "hotspot":
        side = float(_need(hotspot_side, "hotspot_side", "ki67_hotspot_side"))
        hmin = int(_need(hotspot_min_cells, "hotspot_min_cells", "ki67_hotspot_min_cells"))
        if side <= 0:
            _fail("hotspot_side is %g. It must be above zero, in the units of the x and y columns" % side)
        xc, yc = _xy_columns(df, x_column, y_column, table)
    vals = pd.to_numeric(df[col], errors="coerce")
    groups = df[group_column].astype(str) if group_column else pd.Series(["all"] * len(df), index=df.index)
    cols = ["group", "n_cells", "n_positive", "ki67_index_percent", "status", "hotspot_index_percent", "hotspot_n_cells", "hotspot_n_positive", "hotspot_x0", "hotspot_y0"]
    tab, metrics, first_plot, busiest = [], {}, None, []
    for g in groups.drop_duplicates():
        sel = (groups == g) & vals.notna()
        v = vals[sel].to_numpy(float)
        pos = v >= t[0]
        n, npos = len(v), int(pos.sum())
        enough = n >= min_cells and n > 0
        idx = 100.0 * npos / n if enough else float("nan")
        row = [g, n, npos, idx, "scored" if enough else "below min_cells", float("nan"), None, None, float("nan"), float("nan")]
        if mode == "hotspot" and n > 0:
            hs, maxn = _hotspot(df.loc[sel, xc].to_numpy(float), df.loc[sel, yc].to_numpy(float), pos, side, hmin)
            if hs is None:
                busiest.append("%s: %d cells" % (g, maxn))
                row[4] += ", no hot spot window"
            else:
                row[5:] = [100 * hs["index"], hs["n_cells"], hs["n_positive"], hs["x0"], hs["y0"]]
            if hs is not None and first_plot is None:
                first_plot = (g, df.loc[sel, xc].to_numpy(float), df.loc[sel, yc].to_numpy(float), pos, hs, side)
        tab.append(row)
        if enough and len(groups.unique()) <= 50:
            metrics["ki67_index_%s" % _key(g)] = idx
            if mode == "hotspot" and math.isfinite(row[5]):
                metrics["hotspot_index_%s" % _key(g)] = row[5]
    if mode == "hotspot" and len(busiest) == len(tab):
        _fail("no window of side %g has %d cells or more in any group. The busiest window of each group: %s. Lower hotspot_min_cells or raise hotspot_side" % (side, hmin, "; ".join(busiest[:5])))
    out = pd.DataFrame(tab, columns=cols)
    if mode == "none":
        out = out[cols[:5]]
    stem = _stem(table)
    cpath = stem + "_ki67.csv"
    tbl = _write_table(cpath, out)
    scored = out[out["status"].str.startswith("scored")]
    metrics.update({"n_groups": len(out), "n_groups_scored": int(len(scored)), "n_outside_region": n_out, "n_cells_total": float(out["n_cells"].sum())})
    if len(out) == 1 and len(scored) == 1:
        metrics["ki67_index"] = float(out.loc[0, "ki67_index_percent"])
        metrics["n_cells"] = float(out.loc[0, "n_cells"])
        metrics["n_positive"] = float(out.loc[0, "n_positive"])
        if mode == "hotspot":
            metrics["hotspot_index"] = float(out.loc[0, "hotspot_index_percent"])
            metrics["hotspot_n_cells"] = float(out.loc[0, "hotspot_n_cells"])
    plots = []
    fig, ax = plt.subplots(figsize=(5.2 if first_plot else 4.6, 4.2))
    if first_plot:
        g, x, y, pos, hs, side = first_plot
        ax.scatter(x[~pos], y[~pos], s=4, color=BLUE, label="negative")
        ax.scatter(x[pos], y[pos], s=6, color=VERMILION, label="positive")
        ax.add_patch(plt.Rectangle((hs["x0"], hs["y0"]), side, side, fill=False, ec="black", lw=1.5, label="hot spot"))
        ax.set_aspect("equal")
        ax.invert_yaxis()
        ax.set_xlabel(str(xc))
        ax.set_ylabel(str(yc))
        ax.set_title("Hot spot of %s: %.1f percent of %d cells" % (g, 100 * hs["index"], hs["n_cells"]), fontsize=9)
        ax.legend(frameon=False, fontsize=8, loc="upper left", bbox_to_anchor=(1.01, 1))
    else:
        shown = scored.head(40)
        ax.bar(range(len(shown)), shown["ki67_index_percent"], color=VERMILION)
        ax.set_xticks(range(len(shown)))
        ax.set_xticklabels(shown["group"], rotation=60, ha="right", fontsize=7)
        ax.set_ylabel("Ki-67 positive cells (percent)")
    ax.spines[["top", "right"]].set_visible(False)
    plots = _save_plot(fig, stem + "_ki67")
    summary = "Ki-67 labeling index of %d group(s), %d scored (positive from %g in %s)." % (len(out), len(scored), t[0], col)
    if len(out) == 1 and len(scored) == 1:
        summary += " Global index %.2f percent of %d cells." % (metrics["ki67_index"], metrics["n_cells"])
        if mode == "hotspot":
            summary += " Hot spot index %.2f percent of %d cells." % (metrics["hotspot_index"], metrics["hotspot_n_cells"])
    return {"ok": True, "summary": summary, "metrics": metrics, "outputs": [{"path": cpath, "kind": "table", "name": "Ki-67 index for each group"}] + _plot_outputs(plots, "Ki-67"), "table": tbl}


def _icc(m):
    n, k = m.shape
    gm = m.mean()
    ssr = k * ((m.mean(axis=1) - gm) ** 2).sum()
    ssc = n * ((m.mean(axis=0) - gm) ** 2).sum()
    sst = ((m - gm) ** 2).sum()
    sse = sst - ssr - ssc
    msr, msc, mse = ssr / (n - 1), ssc / (k - 1), sse / ((n - 1) * (k - 1))
    msw = (ssc + sse) / (n * (k - 1))
    return n, k, msr, msc, mse, msw


def icc_table(m, alpha=0.05):
    n, k, msr, msc, mse, msw = _icc(np.asarray(m, float))
    q = lambda p, a, b: stats.f.ppf(p, a, b)
    p = 1 - alpha / 2
    out = {}
    out["ICC1"] = (msr - msw) / (msr + (k - 1) * msw)
    out["ICC2"] = (msr - mse) / (msr + (k - 1) * mse + k * (msc - mse) / n)
    out["ICC3"] = (msr - mse) / (msr + (k - 1) * mse)
    out["ICC1k"] = (msr - msw) / msr
    out["ICC2k"] = (msr - mse) / (msr + (msc - mse) / n)
    out["ICC3k"] = (msr - mse) / msr
    ci = {}
    f1 = msr / msw
    fl, fu = f1 / q(p, n - 1, n * (k - 1)), f1 * q(p, n * (k - 1), n - 1)
    ci["ICC1"] = ((fl - 1) / (fl + k - 1), (fu - 1) / (fu + k - 1))
    ci["ICC1k"] = (1 - 1 / fl, 1 - 1 / fu)
    f3 = msr / mse
    fl, fu = f3 / q(p, n - 1, (n - 1) * (k - 1)), f3 * q(p, (n - 1) * (k - 1), n - 1)
    ci["ICC3"] = ((fl - 1) / (fl + k - 1), (fu - 1) / (fu + k - 1))
    ci["ICC3k"] = (1 - 1 / fl, 1 - 1 / fu)
    r = out["ICC2"]
    fj = msc / mse
    vn = (k - 1) * (n - 1) * (k * r * fj + n * (1 + (k - 1) * r) - k * r) ** 2
    vd = (n - 1) * k ** 2 * r ** 2 * fj ** 2 + (n * (1 + (k - 1) * r) - k * r) ** 2
    v = vn / vd
    fs_l, fs_u = q(p, n - 1, v), q(p, v, n - 1)
    lo = n * (msr - fs_l * mse) / (fs_l * (k * msc + (k * n - k - n) * mse) + n * msr)
    hi = n * (fs_u * msr - mse) / (k * msc + (k * n - k - n) * mse + n * fs_u * msr)
    ci["ICC2"] = (lo, hi)
    ci["ICC2k"] = (lo * k / (1 + lo * (k - 1)), hi * k / (1 + hi * (k - 1)))
    return out, ci


def weighted_kappa(a, b, weights, labels):
    idx = {v: i for i, v in enumerate(labels)}
    r = len(labels)
    o = np.zeros((r, r))
    for x, y in zip(a, b):
        o[idx[x], idx[y]] += 1
    e = np.outer(o.sum(axis=1), o.sum(axis=0)) / o.sum()
    d = np.abs(np.subtract.outer(np.arange(r), np.arange(r))).astype(float)
    w = np.zeros((r, r)) if weights == "none" else d / max(r - 1, 1)
    if weights == "none":
        w = (d > 0).astype(float)
    elif weights == "quadratic":
        w = w ** 2
    den = (w * e).sum()
    return float(1 - (w * o).sum() / den) if den > 0 else float("nan")


def _categories(a, b, cutpoints, label):
    if cutpoints and str(cutpoints).strip().lower() != "none":
        try:
            cuts = sorted(float(c) for c in str(cutpoints).split(",") if c.strip())
        except ValueError:
            _fail("cutpoints is %s. Give numbers separated by commas, such as 100,200" % cutpoints)
        ca, cb = np.digitize(a, cuts), np.digitize(b, cuts)
        return ca, cb, list(range(len(cuts) + 1))
    both = np.concatenate([a, b])
    if not np.all(both == np.round(both)):
        _fail("%s are not whole numbers, so weighted kappa has no categories. Give cutpoints, such as 100,200 for an H-score" % label)
    lo, hi = int(both.min()), int(both.max())
    if hi - lo + 1 > 20:
        _fail("%s have %d possible levels from %d to %d. Give cutpoints to group them into categories" % (label, hi - lo + 1, lo, hi))
    return a.astype(int), b.astype(int), list(range(lo, hi + 1))


def compare_scorers(table, scorer_a, scorer_b, extra_scorers="", subject_column="", subset="", kappa_weights=None, icc_form=None, cutpoints="", ci_level=0.95, bootstrap=2000, seed=1):
    df = _read_table(table, "score table")
    for c, n in ((scorer_a, "scorer_a"), (scorer_b, "scorer_b")):
        if not c or c not in df.columns:
            _fail("%s is %s, which is not a column of %s. Columns: %s" % (n, c, table, ", ".join(map(str, df.columns))))
    if scorer_a == scorer_b:
        _fail("scorer_a and scorer_b are both %s. Give two different columns" % scorer_a)
    extras = [c.strip() for c in str(extra_scorers or "").split(",") if c.strip() and c.strip().lower() != "none"]
    for c in extras:
        if c not in df.columns:
            _fail("extra_scorers names %s, which is not a column of %s. Columns: %s" % (c, table, ", ".join(map(str, df.columns))))
    weights = str(_need(kappa_weights, "kappa_weights", "kappa_weights")).lower()
    if weights not in ("linear", "quadratic", "none"):
        _fail("kappa_weights is %s. Use linear, quadratic or none" % kappa_weights)
    form = str(_need(icc_form, "icc_form", "icc_form")).upper().replace("(", "").replace(")", "").replace(",", "").replace(" ", "")
    if form not in ("ICC1", "ICC2", "ICC3", "ICC1K", "ICC2K", "ICC3K"):
        _fail("icc_form is %s. Use ICC1, ICC2, ICC3, ICC1k, ICC2k or ICC3k" % icc_form)
    form = form.replace("K", "k")
    n_subset = 0
    if subset:
        df, n_subset = _apply_region(df, subset, "", "", table)
    num = df[[scorer_a, scorer_b] + extras].apply(pd.to_numeric, errors="coerce")
    a_all, b_all = num[scorer_a], num[scorer_b]
    ok = num.notna().all(axis=1)
    n_missing = int((~ok).sum())
    a, b = a_all[ok].to_numpy(float), b_all[ok].to_numpy(float)
    if len(a) < 3:
        _fail("only %d subjects have both scores in %s and %s. Weighted kappa and ICC need at least 3" % (len(a), scorer_a, scorer_b))
    ca, cb, labels = _categories(a, b, cutpoints, "the scores")
    kappa = weighted_kappa(ca, cb, weights, labels)
    rng = np.random.default_rng(int(seed))
    boots = []
    for _ in range(int(bootstrap)):
        s = rng.integers(0, len(a), len(a))
        kb = weighted_kappa(ca[s], cb[s], weights, labels)
        if math.isfinite(kb):
            boots.append(kb)
    alpha = 1 - float(ci_level)
    klo, khi = (float(np.percentile(boots, 100 * alpha / 2)), float(np.percentile(boots, 100 * (1 - alpha / 2)))) if len(boots) > 20 else (float("nan"), float("nan"))
    iccs, cis = icc_table(num[ok].to_numpy(float), alpha)
    diff = a - b
    bias, sd = float(diff.mean()), float(diff.std(ddof=1))
    rho = stats.spearmanr(a, b)
    pr = stats.pearsonr(a, b)
    names = {"ICC1": "ICC(1,1)", "ICC2": "ICC(2,1)", "ICC3": "ICC(3,1)", "ICC1k": "ICC(1,k)", "ICC2k": "ICC(2,k)", "ICC3k": "ICC(3,k)"}
    metrics = {"n_subjects": float(len(a)), "n_scorers": float(2 + len(extras)), "n_missing": float(n_missing), "kappa": kappa, "kappa_lower": klo, "kappa_upper": khi, "icc": float(iccs[form]), "icc_lower": float(cis[form][0]), "icc_upper": float(cis[form][1]),
               "spearman_rho": float(rho.statistic), "spearman_p": float(rho.pvalue), "pearson_r": float(pr.statistic), "mean_difference": bias, "sd_difference": sd,
               "loa_lower": bias - 1.96 * sd, "loa_upper": bias + 1.96 * sd, "exact_agreement_fraction": float(np.mean(ca == cb)), "n_categories": float(len(labels))}
    for k in iccs:
        metrics["icc_" + k.lower()] = float(iccs[k])
    rows = [["weighted kappa (%s weights)" % weights, kappa, klo, khi]] + [[names[k], float(iccs[k]), float(cis[k][0]), float(cis[k][1])] for k in iccs]
    rows += [["Spearman rho", float(rho.statistic), float("nan"), float("nan")], ["Pearson r", float(pr.statistic), float("nan"), float("nan")], ["mean difference (A minus B)", bias, bias - 1.96 * sd, bias + 1.96 * sd]]
    stem = _stem(table)
    cpath = stem + "_agreement.csv"
    tbl = _write_table(cpath, pd.DataFrame(rows, columns=["statistic", "estimate", "lower", "upper"]))
    pairs = pd.DataFrame({"subject": df.loc[ok, subject_column].astype(str).to_numpy() if subject_column and subject_column in df.columns else np.arange(1, len(a) + 1), scorer_a: a, scorer_b: b, "category_a": ca, "category_b": cb})
    ppath = stem + "_agreement_pairs.csv"
    pairs.to_csv(ppath, index=False)
    fig, axs = plt.subplots(1, 2, figsize=(9, 4))
    hi = max(a.max(), b.max())
    axs[0].scatter(b, a, s=18, color=BLUE)
    axs[0].plot([0, hi], [0, hi], color=GREY, ls="--", lw=1)
    axs[0].set_xlabel(scorer_b)
    axs[0].set_ylabel(scorer_a)
    axs[1].scatter((a + b) / 2, diff, s=18, color=BLUE)
    for yv, ls in ((bias, "-"), (bias - 1.96 * sd, ":"), (bias + 1.96 * sd, ":")):
        axs[1].axhline(yv, color=VERMILION, ls=ls, lw=1)
    axs[1].set_xlabel("mean of the two scores")
    axs[1].set_ylabel("%s minus %s" % (scorer_a, scorer_b))
    for ax in axs:
        ax.spines[["top", "right"]].set_visible(False)
    plots = _save_plot(fig, stem + "_agreement")
    summary = "%d subjects. Weighted kappa (%s) %.3f (%.3f to %.3f). %s %.3f (%.3f to %.3f). Mean difference %.2f, limits %.2f to %.2f." % (len(a), weights, kappa, klo, khi, names[form], iccs[form], cis[form][0], cis[form][1], bias, bias - 1.96 * sd, bias + 1.96 * sd)
    if n_missing:
        summary += " %d subjects had a missing score." % n_missing
    return {"ok": True, "summary": summary, "metrics": metrics, "outputs": [{"path": cpath, "kind": "table", "name": "agreement statistics"}, {"path": ppath, "kind": "table", "name": "paired scores"}] + _plot_outputs(plots, "agreement"), "table": tbl}


def inspect_cell_table(path):
    df = _read_table(path)
    dab = [c for c in df.columns if "dab" in str(c).lower() and pd.api.types.is_numeric_dtype(df[c])]
    xc, yc = _find_col(df, X_NAMES), _find_col(df, Y_NAMES)
    rows = [[c, float(df[c].min()), float(df[c].max()), float(df[c].mean()), int(df[c].isna().sum())] for c in dab]
    groups = {}
    for c in df.columns:
        if df[c].dtype == object and 1 < df[c].nunique() <= 20:
            groups[str(c)] = {str(k): int(v) for k, v in df[c].value_counts().head(10).items()}
    comp = [c for c in COMPARTMENTS if _find_col(df, ["%s: dab od mean" % c]) is not None]
    summary = "%d rows, %d columns. DAB columns: %s. Compartments found: %s. Position columns: %s." % (len(df), len(df.columns), ", ".join(map(str, dab)) or "none", ", ".join(comp) or "none", ("%s and %s" % (xc, yc)) if xc and yc else "none")
    return {"ok": True, "summary": summary, "metrics": {"n_rows": float(len(df)), "n_columns": float(len(df.columns)), "n_dab_columns": float(len(dab)), "n_compartments": float(len(comp))},
            "data": {"columns": [str(c) for c in df.columns], "group_candidates": groups, "x_column": xc, "y_column": yc},
            "table": {"columns": ["column", "min", "max", "mean", "n_missing"], "rows": rows, "n_rows": len(rows)}}


def stain_matrix(spec):
    s = str(_need(spec, "stain_vectors", "stain_vectors")).strip().lower()
    if s in STAIN_VECTORS:
        h, d = STAIN_VECTORS[s]
    else:
        try:
            v = [float(x) for x in s.replace(";", ",").split(",") if x.strip()]
        except ValueError:
            _fail("stain_vectors is %s. Use ruifrok_hdab, qupath_hdab, or six numbers: the red, green and blue of hematoxylin, then of DAB" % spec)
        if len(v) != 6:
            _fail("stain_vectors has %d numbers. Give six: the red, green and blue of hematoxylin, then of DAB" % len(v))
        h, d = v[:3], v[3:]
    h, d = np.array(h, float), np.array(d, float)
    if not (h.any() and d.any()):
        _fail("stain_vectors has a vector with only zeros")
    h, d = h / np.linalg.norm(h), d / np.linalg.norm(d)
    r = np.cross(h, d)
    if np.linalg.norm(r) < 1e-6:
        _fail("the hematoxylin and DAB vectors in stain_vectors point the same way, so they cannot be separated")
    r = r / np.linalg.norm(r)
    return np.vstack([h, d, r])


def optical_density(rgb, matrix):
    conv = np.linalg.inv(matrix)
    return 6.0 * color.separate_stains(rgb, conv)


def _read_image(path):
    _check_file(path, "image")
    try:
        im = io.imread(path)
    except Exception as e:
        _fail("cannot read the image file %s: %s" % (path, e))
    if im.ndim == 2 or im.shape[-1] < 3:
        _fail("the image %s is not a color image (shape %s). The color deconvolution needs red, green and blue channels" % (path, im.shape))
    im = im[..., :3]
    if im.dtype != np.uint8:
        top = 65535.0 if im.dtype == np.uint16 else max(float(im.max()), 1.0)
        im = np.clip(im.astype(float) / top * 255, 0, 255).astype(np.uint8)
    return im


def _threshold_value(values, spec):
    s = str(_need(spec, "nucleus_threshold", "nucleus_threshold")).strip().lower()
    try:
        return float(s)
    except ValueError:
        pass
    if s not in AUTO_METHODS:
        _fail("nucleus_threshold is %s. Give a method name (%s) or a number" % (spec, ", ".join(AUTO_METHODS)))
    if values.size == 0 or values.min() == values.max():
        _fail("the region holds no contrast, so the %s method cannot find a threshold" % s)
    return float(getattr(filters, "threshold_" + s)(values))


def _region_mask(shape, region, path):
    spec = str(_need(region, "region", "scoring_region")).strip()
    if spec.lower() in ("whole", "whole slide", "all"):
        return np.ones(shape, bool), "whole"
    if spec.lower().startswith("box:"):
        try:
            x0, y0, w, h = [int(float(v)) for v in spec[4:].split(",")]
        except ValueError:
            _fail("region %s is not box:x,y,width,height with four numbers in pixels" % spec)
        m = np.zeros(shape, bool)
        m[max(y0, 0):max(y0 + h, 0), max(x0, 0):max(x0 + w, 0)] = True
        if not m.any():
            _fail("region %s lies outside the image of %d by %d pixels" % (spec, shape[1], shape[0]))
        return m, spec
    if spec.lower().startswith("mask:"):
        mp = spec[5:].strip()
        _check_file(mp, "region mask")
        mk = io.imread(mp)
        if mk.ndim == 3:
            mk = mk[..., 0]
        if mk.shape != shape:
            _fail("the mask %s is %d by %d pixels and the image %s is %d by %d pixels. They must match" % (mp, mk.shape[1], mk.shape[0], path, shape[1], shape[0]))
        m = mk > 0
        if not m.any():
            _fail("the mask %s has no non-zero pixel, so the region is empty" % mp)
        return m, spec
    _fail("region is %s. Use whole, box:x,y,width,height, or mask:path" % spec)


def measure_stain_intensity(path, stain_vectors="ruifrok_hdab", compartment=None, region=None, detection_image=None, nucleus_threshold=None, min_diameter=None, max_diameter=0, split_touching=True, cell_expand=0, membrane_width=2, smoothing_sigma=1.0, pixel_size=0.0, threshold_1plus=None, threshold_2plus=None, threshold_3plus=None):
    comp = str(_need(compartment, "compartment", "scoring_compartment")).lower()
    if comp not in COMPARTMENTS:
        _fail("compartment is %s. Use one of: %s" % (compartment, ", ".join(COMPARTMENTS)))
    det_kind = str(_need(detection_image, "detection_image", "detection_image")).lower()
    if det_kind not in ("hematoxylin", "od_sum"):
        _fail("detection_image is %s. Use hematoxylin or od_sum" % detection_image)
    if min_diameter is None:
        _need(None, "min_diameter", "nucleus_min_diameter")
    if comp != "nucleus" and float(cell_expand) < 1:
        _fail("compartment %s needs cell_expand of 1 pixel or more, because the cell is the nucleus grown by that distance" % comp)
    matrix = stain_matrix(stain_vectors)
    im = _read_image(path)
    if im.shape[0] * im.shape[1] > MAX_PIXELS:
        _fail("the image %s has %d million pixels. Give region as box:x,y,width,height to score a part, or reduce the image" % (path, im.shape[0] * im.shape[1] // 1_000_000))
    od = optical_density(im, matrix)
    hem, dab = od[..., 0], od[..., 1]
    mask_r, rtext = _region_mask(im.shape[:2], region, path)
    det = filters.gaussian(hem if det_kind == "hematoxylin" else hem + dab, sigma=float(smoothing_sigma))
    thr = _threshold_value(det[mask_r], nucleus_threshold)
    fg = (det > thr) & mask_r
    fg = ndi.binary_fill_holes(fg)
    if split_touching and fg.any():
        dist = filters.gaussian(ndi.distance_transform_edt(fg), 1)
        lab0 = measure.label(fg)
        peaks = feature.peak_local_max(dist, min_distance=max(3, int(float(min_diameter) / 2)), labels=lab0, exclude_border=False)
        markers = np.zeros(fg.shape, int)
        markers[tuple(peaks.T)] = np.arange(1, len(peaks) + 1)
        lab = segmentation.watershed(-dist, markers, mask=fg)
    else:
        lab = measure.label(fg)
    n_raw = int(lab.max())
    props = measure.regionprops(lab)
    keep, too_small, too_large = [], 0, 0
    for p in props:
        d = 2 * math.sqrt(p.area / math.pi)
        if d < float(min_diameter):
            too_small += 1
        elif float(max_diameter) > 0 and d > float(max_diameter):
            too_large += 1
        else:
            keep.append(p.label)
    nuc = np.where(np.isin(lab, keep), lab, 0)
    nuc, _, _ = segmentation.relabel_sequential(nuc)
    n = int(nuc.max())
    if n == 0:
        _fail("no nucleus remains in the region %s of %s: %d objects were found, %d below %g pixels across, %d above %g. Change nucleus_threshold, detection_image or the size limits" % (rtext, path, n_raw, too_small, float(min_diameter), too_large, float(max_diameter)))
    expand = float(cell_expand)
    cell = segmentation.expand_labels(nuc, distance=expand) if expand > 0 else nuc
    labels = np.arange(1, n + 1)
    comps = {"nucleus": nuc}
    if expand > 0:
        cyto = np.where(nuc > 0, 0, cell)
        edge = ndi.distance_transform_edt(~segmentation.find_boundaries(cell, mode="inner"))
        comps.update({"cytoplasm": cyto, "membrane": np.where(edge <= float(membrane_width), cell, 0), "cell": cell})
    table = {"cell_id": labels}
    cent = np.array(ndi.center_of_mass(np.ones_like(nuc), nuc, labels))
    scale = float(pixel_size) if pixel_size and float(pixel_size) > 0 else None
    table["Centroid X px"] = cent[:, 1]
    table["Centroid Y px"] = cent[:, 0]
    if scale:
        table["Centroid X µm"] = cent[:, 1] * scale
        table["Centroid Y µm"] = cent[:, 0] * scale
    table["Nucleus: Area px"] = ndi.sum(np.ones_like(nuc), nuc, labels)
    for name, lb in comps.items():
        table["%s: DAB OD mean" % name.capitalize()] = ndi.mean(dab, lb, labels)
    table["Nucleus: Hematoxylin OD mean"] = ndi.mean(hem, nuc, labels)
    df = pd.DataFrame(table)
    centers = np.round(cent).astype(int)
    inside = mask_r[centers[:, 0].clip(0, mask_r.shape[0] - 1), centers[:, 1].clip(0, mask_r.shape[1] - 1)]
    df = df[inside].reset_index(drop=True)
    col = "%s: DAB OD mean" % comp.capitalize()
    stem = _stem(path)
    cpath = stem + "_cells.csv"
    tbl = _write_table(cpath, df)
    metrics = {"n_cells": float(len(df)), "n_objects_found": float(n_raw), "n_too_small": float(too_small), "n_too_large": float(too_large), "nucleus_threshold_used": thr,
               "mean_dab_od": float(df[col].mean()), "median_dab_od": float(df[col].median()), "region_pixels": float(mask_r.sum()),
               "region_mean_dab_od": float(dab[mask_r].mean()), "region_mean_hematoxylin_od": float(hem[mask_r].mean())}
    base = im.copy()
    cls_layers = []
    if threshold_1plus is not None and threshold_2plus is not None and threshold_3plus is not None:
        t = _thresholds(threshold_1plus, threshold_2plus, threshold_3plus)
        v = ndi.mean(dab, comps[comp], labels)
        metrics["n_cells_no_%s_pixels" % comp] = float(np.isnan(v[inside]).sum())
        cls = _classify(np.nan_to_num(v), t)
        cls_img = np.zeros(nuc.shape, int)
        cls_img[nuc > 0] = cls[nuc[nuc > 0] - 1] + 1
        cls_layers = [(cls_img == i + 1, CLASS_COLORS[i]) for i in range(4)]
        for i in range(4):
            metrics["n_class_%s" % ["0", "1plus", "2plus", "3plus"][i]] = float((cls == i).sum())
    else:
        cls_layers = [(nuc > 0, GREEN)]
    bound = segmentation.find_boundaries(nuc, mode="outer")
    for m, c in cls_layers:
        b = bound & ndi.binary_dilation(m, iterations=1)
        base[b] = _rgb(c)
    h, w = base.shape[:2]
    legend = [(CLASS_COLORS[i], CLASS_NAMES[i]) for i in range(4)] if len(cls_layers) == 4 else [(GREEN, "nucleus counted")]
    canvas = Image.new("RGB", (max(w, 260), h + 22 * len(legend) + 8), "white")
    canvas.paste(Image.fromarray(base), (0, 0))
    dr = ImageDraw.Draw(canvas)
    for i, (c, txt) in enumerate(legend):
        y = h + 4 + 22 * i
        dr.rectangle([8, y + 3, 24, y + 17], fill=_rgb(c), outline=(0, 0, 0))
        dr.text((32, y + 2), txt, fill=(0, 0, 0))
    opath = stem + "_overlay.png"
    canvas.save(opath)
    fig, ax = plt.subplots(figsize=(4.6, 3.6))
    ax.hist(df[col], bins=40, color=BLUE)
    ax.set_xlabel("%s DAB optical density (no unit)" % comp)
    ax.set_ylabel("cells")
    ax.spines[["top", "right"]].set_visible(False)
    plots = _save_plot(fig, stem + "_dab_od")
    summary = "%d cells in region %s (%d objects found, %d too small, %d too large). Mean %s DAB OD %.3f, nucleus threshold %.3f on %s." % (len(df), rtext, n_raw, too_small, too_large, comp, metrics["mean_dab_od"], thr, det_kind)
    return {"ok": True, "summary": summary, "metrics": metrics, "outputs": [{"path": cpath, "kind": "table", "name": "cells with DAB optical density"}, {"path": opath, "kind": "image", "name": "QC overlay of the counted nuclei"}] + _plot_outputs(plots, "DAB optical density"), "table": tbl}
