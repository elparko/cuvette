import os
import re
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.optimize import curve_fit

warnings.filterwarnings("ignore")

COLORS = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9", "#D55E00", "#F0E442", "#000000"]
MODELS = ("linear", "linear_origin", "quadratic", "4PL")
UG_PER_UL = {"ug/mL": 1e-3, "mg/mL": 1.0, "ug/uL": 1.0}
FACTORS = {"dsDNA": 50.0, "RNA": 40.0, "ssDNA": 33.0}
RANGES_280 = {"dsDNA": (1.7, 2.0), "RNA": (1.9, 2.2), "ssDNA": (1.7, 2.0), "custom": (1.7, 2.0)}


def _fail(message):
    return {"ok": False, "error": message}


def _clean(v):
    if v is None:
        return None
    if isinstance(v, (np.floating, float)):
        return None if np.isnan(v) or np.isinf(v) else float(v)
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.bool_):
        return bool(v)
    return v


def _fmt(x):
    if x is None or (isinstance(x, (float, np.floating)) and not np.isfinite(x)):
        return "missing"
    return "%.4g" % x if isinstance(x, (float, np.floating)) else str(x)


def _preview(frame, path, limit=30):
    rows = [[_clean(v) for v in r] for r in frame.head(limit).itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": rows, "n_rows": int(len(frame)), "path": path}


def _out_dir(sub=""):
    base = os.environ.get("CUVETTE_OUTPUT_DIR") or os.environ.get("CUVETTE_WORK_DIR") or os.getcwd()
    d = os.path.join(base, sub) if sub else base
    os.makedirs(d, exist_ok=True)
    return d


def _unique(d, stem, ext):
    stem = re.sub(r"[^\w.-]+", "-", stem).strip("-") or "result"
    p, n = os.path.join(d, stem + ext), 1
    while os.path.exists(p):
        n += 1
        p = os.path.join(d, "%s-%d%s" % (stem, n, ext))
    return p


def _save(frame, stem):
    path = _unique(_out_dir("tables"), stem, ".csv")
    frame.to_csv(path, index=False)
    return path


def _style():
    plt.rcParams.update({
        "font.size": 10, "axes.labelsize": 10, "xtick.labelsize": 9, "ytick.labelsize": 9, "legend.fontsize": 9,
        "font.family": "sans-serif", "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "axes.spines.top": False, "axes.spines.right": False, "axes.linewidth": 0.8,
        "svg.fonttype": "none", "savefig.dpi": 300, "legend.frameon": False,
    })


def _save_fig(fig, stem):
    png = _unique(_out_dir("figures"), stem, ".png")
    svg = png[:-4] + ".svg"
    fig.savefig(png, dpi=300)
    fig.savefig(svg)
    plt.close(fig)
    return png, svg


def _figure_outputs(png, svg):
    return [{"path": png, "kind": "image", "name": os.path.basename(png)}, {"path": svg, "kind": "file", "name": os.path.basename(svg)}]


def load(path, sheet=None):
    path = os.path.expanduser(path)
    if path.lower().endswith((".xlsx", ".xlsm")):
        return pd.read_excel(path, sheet_name=sheet or 0)
    return pd.read_csv(path, sep="\t" if path.lower().endswith((".tsv", ".tab")) else ",")


def _need(frame, cols):
    missing = [c for c in cols if c not in frame.columns]
    if missing:
        return "Unknown column: %s. The columns are: %s." % (", ".join(map(str, missing)), ", ".join(str(c) for c in frame.columns if not str(c).startswith("_")))
    return None


def _numeric(frame, cols):
    for c in cols:
        frame[c] = pd.to_numeric(frame[c], errors="coerce")


def _drop_excluded(frame, exclude):
    frame["_row"] = np.arange(len(frame)) + 2
    text = str(exclude or "none").strip().lower()
    if text in ("", "none"):
        return frame, [], None
    try:
        rows = [int(t) for t in re.split(r"[,;\s]+", text) if t]
    except ValueError:
        return None, [], "exclude must be none or a list of Excel row numbers, such as 5, 6. The header is row 1."
    return frame[~frame["_row"].isin(rows)].copy(), rows, None


def _sd(s):
    return float(np.std(s, ddof=1)) if len(s) > 1 else float("nan")


def _cv(s):
    m = float(np.mean(s))
    return _sd(s) / m * 100 if len(s) > 1 and m != 0 else float("nan")


def _r2(y, fit):
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    return 1 - float(np.sum((y - fit) ** 2)) / ss_tot if ss_tot > 0 else float("nan")


# ------------------------------------------------------------- protein_assay


def _fit_curve(model, x, y):
    if model == "linear":
        m, c = np.polyfit(x, y, 1)
        pred = lambda v: m * v + c
        inv = lambda v: (v - c) / m
        return {"slope": m, "intercept": c}, pred, inv, 2
    if model == "linear_origin":
        m = float(np.sum(x * y) / np.sum(x * x))
        return {"slope": m}, (lambda v: m * v), (lambda v: v / m), 1
    if model == "quadratic":
        a, b, c = np.polyfit(x, y, 2)
        xv = -b / (2 * a) if a else float("inf")
        side = 1.0 if np.mean(x) >= xv else -1.0

        def inv(v):
            v = np.asarray(v, dtype=float)
            if abs(a) < 1e-15:
                return (v - c) / b
            disc = b * b - 4 * a * (c - v)
            with np.errstate(invalid="ignore"):
                return xv + side * np.sqrt(np.where(disc >= 0, disc, np.nan)) / (2 * abs(a))

        return {"a": a, "b": b, "c": c, "vertex": xv}, (lambda v: a * v * v + b * v + c), inv, 3
    f = lambda v, lo, slope, mid, hi: hi + (lo - hi) / (1 + (v / mid) ** slope)
    pos = x[x > 0]
    p0 = [float(np.min(y)), 1.0, float(np.median(pos)), float(np.max(y)) * 1.5]
    bounds = ([-np.inf, 0.05, float(pos.min()) * 1e-3, -np.inf], [np.inf, 20.0, float(pos.max()) * 1e3, np.inf])
    p, _ = curve_fit(f, x, y, p0=p0, bounds=bounds, maxfev=50000)
    lo, slope, mid, hi = p

    def inv(v):
        v = np.asarray(v, dtype=float)
        with np.errstate(invalid="ignore", divide="ignore"):
            r = (lo - hi) / (v - hi) - 1
            return np.where(r > 0, mid * np.power(np.where(r > 0, r, np.nan), 1 / slope), np.nan)

    return {"bottom": lo, "hill_slope": slope, "midpoint": mid, "top": hi}, (lambda v: f(v, *p)), inv, 4


def _kind(value):
    t = str(value).strip().lower()
    if t.startswith("st"):
        return "standard"
    if t.startswith("bl"):
        return "blank"
    if t.startswith(("sa", "un", "u")):
        return "sample"
    return None


def _protein_route(model, assay, blank, unit):
    wave = {"BCA": "562 nm", "Bradford": "595 nm", "Lowry": "750 nm"}.get(assay, "the wavelength of the kit")
    fit = {
        "linear": "slope =SLOPE(abs, conc), intercept =INTERCEPT(abs, conc), R squared =RSQ(abs, conc). Sample conc = (abs - intercept) / slope.",
        "linear_origin": "slope =SUMPRODUCT(conc, abs) / SUMSQ(conc). Sample conc = abs / slope. A chart trendline with Set Intercept = 0 gives the same slope.",
        "quadratic": "=LINEST(abs, conc ^ {1, 2}) gives a, b, c (y = a x^2 + b x + c). Sample conc = (-b + SQRT(b^2 - 4 a (c - abs))) / (2 a) on the branch of the standards.",
        "4PL": "Excel has no 4PL function. Fit it with Solver (minimize the sum of squared residuals of y = D + (A - D) / (1 + (x / C) ^ B)), or fit in Prism. Sample conc = C * ((A - D) / (abs - D) - 1) ^ (1 / B).",
    }[model]
    prism = {
        "linear": "Analyze > Interpolate a standard curve > Standard curve X from Y > Linear regression.",
        "linear_origin": "Analyze > Nonlinear regression > Straight line, then set Intercept constant = 0 on the Constrain tab. Use the Interpolate a standard curve option.",
        "quadratic": "Analyze > Interpolate a standard curve > Second order polynomial (quadratic).",
        "4PL": "Analyze > Interpolate a standard curve > Sigmoidal, 4PL, X is concentration.",
    }[model]
    sub = "Subtract the mean of the blank wells (%s) from every well." % assay if blank == "subtract" else "Do not subtract a blank."
    return ("In Excel: read the plate at %s. %s Fit the standards by this model (%s). %s Multiply each result by the dilution factor, "
            "then average the replicates (=AVERAGE, =STDEV.S, CV = STDEV.S / AVERAGE x 100). Mark a sample as outside the range if it lies "
            "below the lowest or above the highest standard (%s). In GraphPad Prism: enter the standards as X and Y, enter the samples as Y with no X. %s" % (wave, sub, model, fit, unit, prism))


def protein_assay(path, sheet=None, assay="BCA", sample_col="Sample", type_col="Type", conc_col="Concentration", signal_col="Absorbance",
                  dilution_col=None, dilution=1.0, blank="subtract", model="linear", exclude="none", cv_limit_pct=20.0, conc_unit="ug/mL",
                  load_ug=None, final_volume_ul=None, file_name=None):
    if model not in MODELS:
        return _fail("model must be linear, linear_origin, quadratic or 4PL.")
    if blank not in ("subtract", "none"):
        return _fail("blank must be subtract or none.")
    if conc_unit not in UG_PER_UL:
        return _fail("conc_unit must be ug/mL, mg/mL or ug/uL.")
    frame = load(path, sheet)
    problem = _need(frame, [sample_col, type_col, conc_col, signal_col] + ([dilution_col] if dilution_col else []))
    if problem:
        return _fail(problem)
    frame, excluded, problem = _drop_excluded(frame, exclude)
    if problem:
        return _fail(problem)
    _numeric(frame, [conc_col, signal_col] + ([dilution_col] if dilution_col else []))
    frame["_kind"] = frame[type_col].map(_kind)
    bad = frame[frame["_kind"].isna()]
    if len(bad):
        return _fail("Type values must start with standard, blank or sample (unknown also works). Check rows: %s." % ", ".join(map(str, bad["_row"].head(5))))
    no_signal = frame.loc[frame[signal_col].isna(), "_row"].tolist()
    frame = frame.dropna(subset=[signal_col])
    std = frame[frame["_kind"] == "standard"].dropna(subset=[conc_col])
    smp = frame[frame["_kind"] == "sample"].copy()
    if not len(smp):
        return _fail("The table has no sample rows.")
    blank_value, zero_is_blank = 0.0, False
    if blank == "subtract":
        wells = frame[frame["_kind"] == "blank"][signal_col]
        if not len(wells):
            wells = std[std[conc_col] == 0][signal_col]
            zero_is_blank = True
        if not len(wells):
            return _fail("blank is subtract, but the table has no blank wells and no standard with concentration 0. Add blank wells or set blank to none.")
        blank_value = float(wells.mean())
        if zero_is_blank:
            std = std[std[conc_col] != 0]
    x = std[conc_col].to_numpy(float)
    y = std[signal_col].to_numpy(float) - blank_value
    need = {"linear": 2, "linear_origin": 1, "quadratic": 3, "4PL": 5}[model]
    if len(np.unique(x)) < need:
        return _fail("The %s model needs at least %d standard levels. The table has %d." % (model, need, len(np.unique(x))))
    try:
        params, pred, inv, npar = _fit_curve(model, x, y)
    except (RuntimeError, ValueError) as e:
        return _fail("The %s fit did not converge (%s). Choose a simpler model or remove a standard." % (model, e))
    r2 = _r2(y, pred(x))
    warnings_out = []
    if no_signal:
        warnings_out.append("%d rows have no number in %s and are left out (rows %s)." % (len(no_signal), signal_col, ", ".join(map(str, no_signal[:10]))))
    if model == "quadratic" and x.min() < params["vertex"] < x.max():
        warnings_out.append("The quadratic curve turns inside the standard range (at %s %s). Back-calculated values are not reliable. Choose another model." % (_fmt(params["vertex"]), conc_unit))
    levels = std.assign(_y=y, _x=x).groupby("_x")
    std_rows = []
    for level, part in levels:
        back = inv(part["_y"].to_numpy(float))
        mean_back = float(np.nanmean(back)) if np.isfinite(back).any() else float("nan")
        std_rows.append([float(level), len(part), float(part["_y"].mean()), mean_back, mean_back / level * 100 if level else float("nan")])
    std_out = pd.DataFrame(std_rows, columns=["conc", "n_wells", "mean_signal", "back_calculated", "recovery_pct"])
    bias = (std_out["recovery_pct"] - 100).abs().max()
    lo, hi = float(x.min()), float(x.max())
    smp["_y"] = smp[signal_col] - blank_value
    smp["_well"] = inv(smp["_y"].to_numpy(float))
    smp["_dil"] = smp[dilution_col] if dilution_col else float(dilution)
    smp["_final"] = smp["_well"] * smp["_dil"]
    rows = []
    for name, part in smp.groupby(sample_col, sort=False):
        well = part["_well"].to_numpy(float)
        mean_well = float(np.mean(well)) if np.isfinite(well).all() else float("nan")
        final = float(np.mean(part["_final"])) if np.isfinite(well).all() else float("nan")
        cv = _cv(well) if np.isfinite(well).all() else float("nan")
        flags = []
        if not np.isfinite(mean_well):
            flags.append("beyond curve")
        elif mean_well < lo:
            flags.append("below range")
        elif mean_well > hi:
            flags.append("above range")
        if np.isfinite(cv) and cv > cv_limit_pct:
            flags.append("high CV")
        rows.append([name, len(part), float(part["_y"].mean()), mean_well, _sd(well) if np.isfinite(well).all() else float("nan"), cv,
                     float(part["_dil"].mean()), final, conc_unit, "; ".join(flags)])
    out = pd.DataFrame(rows, columns=["sample", "n_wells", "mean_signal", "conc_in_well", "sd_in_well", "cv_pct", "dilution", "conc", "unit", "flag"])
    if load_ug is not None:
        per_ul = out["conc"] * UG_PER_UL[conc_unit]
        out["load_volume_ul"] = load_ug / per_ul
        if final_volume_ul is not None:
            out["buffer_volume_ul"] = final_volume_ul - out["load_volume_ul"]
            low = out["buffer_volume_ul"] < 0
            out.loc[low, "flag"] = (out.loc[low, "flag"] + "; too dilute for the load").str.lstrip("; ")
    elif final_volume_ul is not None:
        return _fail("final_volume_ul needs load_ug.")
    flagged = out[out["flag"] != ""]
    std_path = _save(std_out, (file_name or "protein") + "-standards")
    smp_path = _save(out, (file_name or "protein") + "-samples")
    _style()
    fig, ax = plt.subplots(figsize=(4.0, 3.2), layout="constrained")
    xs = np.linspace(0, hi * 1.1, 200)
    ax.axvspan(lo, hi, color="#0072B2", alpha=0.07, linewidth=0)
    ax.plot(xs, pred(xs), color="#0072B2", linewidth=1.2, label="%s fit (R² = %.4f)" % (model, r2))
    ax.scatter(x, y, s=18, color="#0072B2", edgecolor="black", linewidth=0.4, zorder=3, label="Standards (n = %d)" % len(x))
    ok = out[np.isfinite(out["conc_in_well"])]
    ax.scatter(ok["conc_in_well"], ok["mean_signal"], s=34, marker="D", facecolor="white", edgecolor="#D55E00", linewidth=1.0, zorder=4, label="Samples (n = %d)" % len(ok))
    ax.set_xlabel("Protein in the well (%s)" % conc_unit)
    ax.set_ylabel("Absorbance minus blank (AU)")
    ax.legend(loc="upper left")
    png, svg = _save_fig(fig, (file_name or "protein") + "-curve")
    metrics = {"n_standard_levels": int(len(std_out)), "n_standard_wells": int(len(x)), "r2": float(r2), "blank": blank_value, "n_samples": int(len(out)),
               "n_flagged": int(len(flagged)), "range_low": lo, "range_high": hi, "max_recovery_error_pct": float(bias) if np.isfinite(bias) else None}
    metrics.update({k: float(v) for k, v in params.items()})
    parts = ["%s %s" % (r["sample"], _fmt(r["conc"]) + (" (%s)" % r["flag"] if r["flag"] else "")) for _, r in out.head(8).iterrows()]
    summary = ("%s standard curve: %s, %d levels (%d wells), R squared %s, blank %s %s. %d samples in %s after the dilution factor: %s%s. %d flagged. "
               "Standards cover %s to %s %s.%s Saved %s." % (
                   assay, model, len(std_out), len(x), _fmt(r2), _fmt(blank_value), "subtracted" if blank == "subtract" else "(not subtracted)", len(out), conc_unit, "; ".join(parts),
                   "; ..." if len(out) > 8 else "", len(flagged), _fmt(lo), _fmt(hi), conc_unit, (" " + " ".join(warnings_out)) if warnings_out else "", smp_path))
    return {
        "ok": True,
        "summary": summary,
        "metrics": metrics,
        "data": {"params": {k: _clean(v) for k, v in params.items()}, "standards_path": std_path, "samples_path": smp_path, "excluded_rows": excluded,
                 "warnings": warnings_out, "flagged": [str(s) for s in flagged["sample"]]},
        "table": _preview(out, smp_path),
        "png": png, "svg": svg,
        "outputs": [{"path": smp_path, "kind": "table", "name": os.path.basename(smp_path)}, {"path": std_path, "kind": "table", "name": os.path.basename(std_path)}] + _figure_outputs(png, svg),
        "manualRoute": _protein_route(model, assay, blank, conc_unit),
        "fidelity": "close",
    }


# ----------------------------------------------------------- ratio_normalize


def _ratio_route(assay, background, scope, control):
    tool = "Image Lab (Bio-Rad): Lane and Bands, then Analysis Table > Adj. Volume; ImageJ: Analyze > Gels > Plot Lanes, close each peak with the line tool, then the Wand tool." if assay == "western" else \
        "Luminometer: firefly and Renilla counts for each well."
    bg = "Subtract the background of each signal first." if background == "subtract" else "Do not subtract a background."
    where = "the mean of the %s lanes or wells on the same blot or plate" % control if scope == "within_block" else "the mean of all %s lanes or wells" % control
    return ("%s In Excel: %s Ratio = target / reference for each lane or well (=B2/C2). Divide each ratio by %s. Fold change = that value. Log2 = LOG(value, 2). "
            "Group mean, SD and n: =AVERAGE, =STDEV.S, =COUNT, or a PivotTable. Average lanes of the same biological replicate before the statistics. "
            "In GraphPad Prism: enter the ratios in a column table with one column per group, Analyze > Transform to divide by the control mean, "
            "then Analyze > Column statistics. For the test use the biostats adapter or Prism t test or one-way ANOVA." % (tool, bg, where))


def ratio_normalize(path, sheet=None, assay="western", sample_col="Sample", group_col="Group", target_col="Target", reference_col="Reference",
                    control_group=None, replicate_col=None, block_col=None, background="none", target_bg_col=None, reference_bg_col=None,
                    scope="pooled", log2=False, saturation_max=None, exclude="none", file_name=None):
    if assay not in ("western", "dual_luciferase"):
        return _fail("assay must be western or dual_luciferase.")
    if background not in ("none", "subtract"):
        return _fail("background must be none or subtract.")
    if scope not in ("pooled", "within_block"):
        return _fail("scope must be pooled or within_block.")
    if not control_group:
        return _fail("control_group is required. Name the group that is the reference (fold change 1).")
    if background == "subtract" and not (target_bg_col and reference_bg_col):
        return _fail("background is subtract, so give target_bg_col and reference_bg_col.")
    if scope == "within_block" and not block_col:
        return _fail("scope is within_block, so give block_col (the blot or plate column).")
    frame = load(path, sheet)
    problem = _need(frame, [group_col, target_col, reference_col] + [c for c in (replicate_col, block_col) if c] + ([target_bg_col, reference_bg_col] if background == "subtract" else []))
    if problem:
        return _fail(problem)
    frame, excluded, problem = _drop_excluded(frame, exclude)
    if problem:
        return _fail(problem)
    if str(control_group) not in set(frame[group_col].astype(str)):
        return _fail("control_group %s is not in column %s. The groups are: %s." % (control_group, group_col, ", ".join(dict.fromkeys(frame[group_col].astype(str)))))
    frame[group_col] = frame[group_col].astype(str)
    _numeric(frame, [target_col, reference_col] + ([target_bg_col, reference_bg_col] if background == "subtract" else []))
    t = frame[target_col] - (frame[target_bg_col] if background == "subtract" else 0)
    r = frame[reference_col] - (frame[reference_bg_col] if background == "subtract" else 0)
    frame["target_corrected"], frame["reference_corrected"] = t, r
    warns = []
    bad = (r <= 0) | (t < 0) | t.isna() | r.isna()
    frame["ratio"] = np.where(bad, np.nan, t / r.where(r != 0))
    if bad.any():
        warns.append("%d rows have a reference at or below 0, a target below 0 or a missing value after the background step. They have no ratio and are left out." % int(bad.sum()))
    frame["flag"] = np.where(bad, "no ratio", "")
    if saturation_max is not None:
        sat = (frame[target_col] >= saturation_max) | (frame[reference_col] >= saturation_max)
        frame.loc[sat, "ratio"] = np.nan
        frame.loc[sat, "flag"] = (frame.loc[sat, "flag"] + "; saturated").str.lstrip("; ")
        if sat.any():
            warns.append("%d rows have a raw signal at or above %s (saturated). They have no ratio and are left out. Image the blot again at a shorter exposure." % (int(sat.sum()), _fmt(float(saturation_max))))
    good = frame.dropna(subset=["ratio"])
    key = [group_col] + [c for c in (replicate_col, block_col) if c]
    if replicate_col:
        units = good.groupby(key, sort=False).agg(ratio=("ratio", "mean"), n_rows=("ratio", "size")).reset_index()
    else:
        units = good[key + ["ratio"]].copy()
        units["n_rows"] = 1
        if sample_col in good.columns:
            units.insert(0, "sample", good[sample_col].astype(str).to_numpy())
        warns.append("No replicate_col. Each row is one unit, so n counts lanes or wells. Lanes or wells of one sample are technical replicates. Give replicate_col to average them to one value per biological replicate.")
    is_ctrl = units[group_col] == str(control_group)
    if scope == "within_block":
        ctrl = units[is_ctrl].groupby(block_col)["ratio"].mean()
        missing = sorted(set(units[block_col].astype(str)) - set(ctrl.index.astype(str)))
        if missing:
            return _fail("These blocks have no %s lane or well: %s. Use scope pooled or add a control to each block." % (control_group, ", ".join(missing)))
        units["control_mean"] = units[block_col].map(ctrl)
    else:
        units["control_mean"] = float(units[is_ctrl]["ratio"].mean())
    if not (units["control_mean"] > 0).all():
        return _fail("The mean ratio of the control group is 0 or missing. Check the control group and the background.")
    units["normalized"] = units["ratio"] / units["control_mean"]
    if log2:
        units["log2_fold_change"] = np.where(units["normalized"] > 0, np.log2(units["normalized"].where(units["normalized"] > 0)), np.nan)
    order = [str(control_group)] + [g for g in dict.fromkeys(units[group_col]) if g != str(control_group)]
    rows = []
    for g in order:
        v = units.loc[units[group_col] == g, "normalized"].to_numpy(float)
        row = [g, len(v), float(v.mean()), _sd(v), _sd(v) / np.sqrt(len(v)) if len(v) > 1 else float("nan")]
        if log2:
            lv = units.loc[units[group_col] == g, "log2_fold_change"].dropna().to_numpy(float)
            row += [float(lv.mean()) if len(lv) else float("nan"), _sd(lv)]
        rows.append(row)
    stats = pd.DataFrame(rows, columns=["group", "n", "mean", "sd", "sem"] + (["mean_log2", "sd_log2"] if log2 else []))
    if (stats["n"] < 2).any():
        warns.append("Groups with n below 2: %s. SD is missing for them." % ", ".join(stats.loc[stats["n"] < 2, "group"]))
    if scope == "within_block":
        warns.append("Each block is divided by its own control mean, so the control group has no spread (SD 0). Do not use a test that treats the control as a random sample. Ask the scientist, or use scope pooled.")
    rows_path = _save(frame.drop(columns=["_row"]), (file_name or "ratio") + "-rows")
    units_path = _save(units, (file_name or "ratio") + "-units")
    stats_path = _save(stats, (file_name or "ratio") + "-groups")
    _style()
    fig, ax = plt.subplots(figsize=(max(2.2, 0.9 * len(order) + 1.0), 3.0), layout="constrained")
    rng = np.random.default_rng(0)
    for i, g in enumerate(order):
        v = units.loc[units[group_col] == g, "normalized"].to_numpy(float)
        col = COLORS[i % len(COLORS)]
        ax.bar(i, v.mean(), width=0.6, color=col, alpha=0.35, edgecolor=col, linewidth=1.0, zorder=1)
        ax.errorbar(i, v.mean(), yerr=_sd(v) if len(v) > 1 else 0, fmt="none", ecolor="black", elinewidth=1.0, capsize=4, zorder=3)
        ax.scatter(i + rng.uniform(-0.12, 0.12, len(v)), v, s=16, color=col, edgecolor="black", linewidth=0.4, zorder=4)
    ax.axhline(1, color="grey", linewidth=0.6, linestyle=":")
    ax.set_xticks(range(len(order)), ["%s\nn = %d" % (g, n) for g, n in zip(order, stats["n"])])
    ax.set_ylim(bottom=0)
    ax.set_ylabel("Fold change vs %s (ratio)" % control_group)
    ax.text(1.0, 1.0, "mean ± SD", transform=ax.transAxes, ha="right", va="bottom", fontsize=8)
    png, svg = _save_fig(fig, (file_name or "ratio") + "-fold-change")
    metrics = {"n_rows": int(len(frame)), "n_units": int(len(units)), "n_groups": len(order), "n_excluded": len(excluded), "n_warnings": len(warns)}
    for _, s in stats.iterrows():
        metrics["mean_" + s["group"]] = float(s["mean"])
        metrics["sd_" + s["group"]] = _clean(s["sd"])
        metrics["n_" + s["group"]] = int(s["n"])
        if log2:
            metrics["mean_log2_" + s["group"]] = _clean(s["mean_log2"])
    label = "biological replicates" if replicate_col else "lanes or wells"
    desc = "; ".join("%s %s ± %s (n = %d)" % (s["group"], _fmt(s["mean"]), _fmt(s["sd"]), s["n"]) for _, s in stats.iterrows())
    summary = ("Fold change vs %s (%s, %s background, %s control mean): %s. n counts %s. SD is the sample SD. "
               "The statistics come from the biostats adapter: run compare_two_groups or anova_oneway on the column normalized of %s, one row per %s. %s" % (
                   control_group, assay, "with" if background == "subtract" else "no", "per-block" if scope == "within_block" else "pooled", desc, label, units_path,
                   "biological replicate" if replicate_col else "unit (check that each is a biological replicate)", " ".join(warns)))
    return {
        "ok": True,
        "summary": summary.strip(),
        "metrics": metrics,
        "data": {"rows_path": rows_path, "units_path": units_path, "groups_path": stats_path, "excluded_rows": excluded, "warnings": warns,
                 "units": [{k: _clean(v) for k, v in rec.items()} for rec in units.head(60).to_dict("records")]},
        "table": _preview(stats, stats_path),
        "png": png, "svg": svg,
        "outputs": [{"path": stats_path, "kind": "table", "name": os.path.basename(stats_path)}, {"path": units_path, "kind": "table", "name": os.path.basename(units_path)},
                    {"path": rows_path, "kind": "table", "name": os.path.basename(rows_path)}] + _figure_outputs(png, svg),
        "manualRoute": _ratio_route(assay, background, scope, control_group),
        "fidelity": "exact",
    }


# --------------------------------------------------------------- cell_counts


def _cells_route(source, factor, dilution):
    if source == "counter":
        return ("At the counter: read Live cells/mL, Total cells/mL and Viability from the export. In Excel: live = total x viability / 100 if a column is missing; "
                "multiply by the dilution factor if the export is not corrected for it. Volume of cells = target cells / live per mL. Medium = final volume - volume of cells.")
    return ("In Excel: for each chamber, live per large square = live / squares. Cells per mL = live per square x %g x dilution factor (%g for this call). "
            "Viability %% = live / (live + dead) x 100. Average the chambers of one sample (=AVERAGE, =STDEV.S). "
            "Volume of cells (mL) = target cells / cells per mL. Medium (mL) = final volume - volume of cells. "
            "Count the cells that touch the top and left lines and skip the cells on the bottom and right lines." % (factor, dilution))


def cell_counts(path, sheet=None, source="hemocytometer", sample_col="Sample", live_col="Live", dead_col="Dead", squares_col=None, squares=4,
                dilution=2.0, dilution_col=None, chamber_factor=10000.0, live_per_ml_col="Live/mL", total_per_ml_col="Total/mL", viability_col="Viability",
                target_cells=None, target_density=None, final_volume_ml=None, exclude="none", file_name=None):
    if source not in ("hemocytometer", "counter"):
        return _fail("source must be hemocytometer or counter.")
    if target_cells is not None and target_density is not None:
        return _fail("Give target_cells or target_density, not both.")
    if target_density is not None and final_volume_ml is None:
        return _fail("target_density needs final_volume_ml.")
    frame = load(path, sheet)
    frame, excluded, problem = _drop_excluded(frame, exclude)
    if problem:
        return _fail(problem)
    if source == "hemocytometer":
        problem = _need(frame, [sample_col, live_col, dead_col] + [c for c in (squares_col, dilution_col) if c])
    else:
        problem = _need(frame, [sample_col] + [c for c in (dilution_col,) if c])
        have = [c for c in (live_per_ml_col, total_per_ml_col, viability_col) if c in frame.columns]
        if not problem and len(have) < 2:
            problem = "A counter export needs at least two of %s, %s and %s. The columns are: %s." % (live_per_ml_col, total_per_ml_col, viability_col, ", ".join(map(str, frame.columns)))
    if problem:
        return _fail(problem)
    dil = pd.to_numeric(frame[dilution_col], errors="coerce") if dilution_col else float(dilution)
    warns, rows = [], []
    if source == "hemocytometer":
        _numeric(frame, [live_col, dead_col] + ([squares_col] if squares_col else []))
        sq = frame[squares_col] if squares_col else float(squares)
        if (np.atleast_1d(sq) <= 0).any():
            return _fail("The number of squares must be above 0.")
        frame["_live_ml"] = frame[live_col] / sq * chamber_factor * dil
        frame["_dead_ml"] = frame[dead_col] / sq * chamber_factor * dil
        frame["_counted"] = frame[live_col] + frame[dead_col]
        frame["_per_square"] = frame[live_col] / sq
    else:
        _numeric(frame, [c for c in (live_per_ml_col, total_per_ml_col, viability_col) if c in frame.columns])
        nan = pd.Series(np.nan, index=frame.index)
        live = frame[live_per_ml_col] if live_per_ml_col in frame.columns else nan
        total = frame[total_per_ml_col] if total_per_ml_col in frame.columns else nan
        viab = frame[viability_col] if viability_col in frame.columns else nan
        live = live.fillna(total * viab / 100)
        total = total.fillna(live / (viab / 100))
        frame["_live_ml"], frame["_dead_ml"] = live * dil, (total - live) * dil
        frame["_counted"], frame["_per_square"] = np.nan, np.nan
    frame = frame.dropna(subset=["_live_ml"])
    for name, part in frame.groupby(sample_col, sort=False):
        live, dead = part["_live_ml"].to_numpy(float), part["_dead_ml"].to_numpy(float)
        flags = []
        counted = part["_counted"].sum()
        if source == "hemocytometer":
            if counted < 100:
                flags.append("fewer than 100 cells counted")
            if part["_per_square"].mean() > 100:
                flags.append("more than 100 live cells per large square")
        viability = live.sum() / (live.sum() + dead.sum()) * 100 if (live.sum() + dead.sum()) > 0 else float("nan")
        row = [name, len(part), float(live.mean()), _sd(live), _cv(live), float(live.mean() + dead.mean()), viability, "; ".join(flags)]
        rows.append(row)
    out = pd.DataFrame(rows, columns=["sample", "n_counts", "live_per_ml", "sd_live_per_ml", "cv_pct", "total_per_ml", "viability_pct", "flag"])
    if target_cells is not None or target_density is not None:
        cells = float(target_cells) if target_cells is not None else float(target_density) * float(final_volume_ml)
        out["cells_needed"] = cells
        out["volume_of_cells_ml"] = cells / out["live_per_ml"]
        if final_volume_ml is not None:
            out["medium_ml"] = float(final_volume_ml) - out["volume_of_cells_ml"]
            low = out["medium_ml"] < 0
            out.loc[low, "flag"] = (out.loc[low, "flag"] + "; suspension too dilute for the final volume").str.lstrip("; ")
    path_out = _save(out, (file_name or "cell-counts") + "-samples")
    _style()
    fig, ax = plt.subplots(figsize=(max(2.2, 0.9 * len(out) + 1.0), 3.0), layout="constrained")
    for i, (_, s) in enumerate(out.iterrows()):
        col = COLORS[i % len(COLORS)]
        vals = frame.loc[frame[sample_col] == s["sample"], "_live_ml"].to_numpy(float)
        ax.bar(i, s["live_per_ml"], width=0.6, color=col, alpha=0.35, edgecolor=col, linewidth=1.0, zorder=1)
        ax.scatter([i] * len(vals), vals, s=16, color=col, edgecolor="black", linewidth=0.4, zorder=4)
        if np.isfinite(s["viability_pct"]):
            ax.text(i, s["live_per_ml"] * 1.04, "%.0f%%" % s["viability_pct"], ha="center", va="bottom", fontsize=8)
    ax.set_xticks(range(len(out)), ["%s\nn = %d" % (s, n) for s, n in zip(out["sample"], out["n_counts"])])
    ax.set_ylim(bottom=0, top=out["live_per_ml"].max() * 1.2)
    ax.set_ylabel("Live cells (cells/mL)")
    ax.text(1.0, 1.0, "viability above bars", transform=ax.transAxes, ha="right", va="bottom", fontsize=8)
    png, svg = _save_fig(fig, (file_name or "cell-counts") + "-live")
    metrics = {"n_samples": int(len(out)), "n_rows": int(len(frame)), "n_flagged": int((out["flag"] != "").sum())}
    for _, s in out.iterrows():
        metrics["live_per_ml_" + str(s["sample"])] = float(s["live_per_ml"])
        metrics["viability_pct_" + str(s["sample"])] = _clean(s["viability_pct"])
    parts = ["%s %s live/mL, viability %s%%%s" % (s["sample"], "{:,.0f}".format(s["live_per_ml"]), _fmt(s["viability_pct"]), " (%s)" % s["flag"] if s["flag"] else "") for _, s in out.head(8).iterrows()]
    plan = ""
    if "volume_of_cells_ml" in out:
        plan = " Plan: " + "; ".join("%s needs %s mL of suspension%s" % (s["sample"], _fmt(s["volume_of_cells_ml"]), " and %s mL of medium" % _fmt(s["medium_ml"]) if "medium_ml" in out else "") for _, s in out.head(8).iterrows()) + "."
    summary = "Cell counts (%s, dilution %s, %d samples): %s.%s Saved %s." % (source, "from the column" if dilution_col else _fmt(float(dilution)), len(out), "; ".join(parts), plan, path_out)
    return {
        "ok": True,
        "summary": summary,
        "metrics": metrics,
        "data": {"samples_path": path_out, "excluded_rows": excluded, "warnings": warns},
        "table": _preview(out, path_out),
        "png": png, "svg": svg,
        "outputs": [{"path": path_out, "kind": "table", "name": os.path.basename(path_out)}] + _figure_outputs(png, svg),
        "manualRoute": _cells_route(source, chamber_factor, dilution),
        "fidelity": "exact",
    }


# ---------------------------------------------------------- nucleic_acid_qc


def _na_route(factor, path_length, baseline):
    base = "Subtract A320 from A260 and A280 first. " if baseline == "a320" else ""
    return ("In Excel: %sConcentration (ng/uL) = A260 x %g x (10 / %g) x dilution factor. A260/A280 = A260 / A280. A260/A230 = A260 / A230. "
            "Mark a ratio outside its range with a conditional format (Home > Conditional Formatting > Highlight Cells Rules > Between). "
            "NanoDrop software shows the same values in the Nucleic Acid view; check that it uses the same constant and baseline correction. "
            "In GraphPad Prism: enter the table and use Analyze > Transform with the same formula." % (base, factor, path_length))


def nucleic_acid_qc(path, sheet=None, sample_type="dsDNA", sample_col="Sample", a260_col="A260", a280_col="A280", a230_col="A230", a320_col=None,
                    baseline="none", factor=None, path_length_mm=10.0, dilution=1.0, dilution_col=None, a260_280_min=None, a260_280_max=None,
                    a260_230_min=2.0, a260_230_max=2.2, exclude="none", file_name=None):
    if sample_type not in ("dsDNA", "RNA", "ssDNA", "custom"):
        return _fail("sample_type must be dsDNA, RNA, ssDNA or custom.")
    if baseline not in ("none", "a320"):
        return _fail("baseline must be none or a320.")
    if sample_type == "custom" and not factor:
        return _fail("sample_type custom needs factor (ng/uL per absorbance unit).")
    if path_length_mm <= 0:
        return _fail("path_length_mm must be above 0.")
    factor = float(factor) if factor else FACTORS[sample_type]
    lo280, hi280 = RANGES_280[sample_type]
    lo280 = lo280 if a260_280_min is None else a260_280_min
    hi280 = hi280 if a260_280_max is None else a260_280_max
    frame = load(path, sheet)
    a320_col = a320_col or "A320"
    problem = _need(frame, [sample_col, a260_col, a280_col] + ([a320_col] if baseline == "a320" else []) + ([dilution_col] if dilution_col else []))
    if problem:
        return _fail(problem)
    frame, excluded, problem = _drop_excluded(frame, exclude)
    if problem:
        return _fail(problem)
    has230 = a230_col in frame.columns
    _numeric(frame, [a260_col, a280_col] + ([a230_col] if has230 else []) + ([a320_col] if baseline == "a320" else []) + ([dilution_col] if dilution_col else []))
    base = frame[a320_col] if baseline == "a320" else 0.0
    a260, a280 = frame[a260_col] - base, frame[a280_col] - base
    a230 = frame[a230_col] - base if has230 else pd.Series(np.nan, index=frame.index)
    dil = frame[dilution_col] if dilution_col else float(dilution)
    conc = a260 * factor * (10.0 / path_length_mm) * dil
    r280 = a260 / a280.where(a280 != 0)
    r230 = a260 / a230.where(a230 != 0)
    flags = []
    for i in frame.index:
        f = []
        if not np.isfinite(a260[i]) or not np.isfinite(a280[i]):
            f.append("missing absorbance")
        else:
            if a260[i] * 10.0 / path_length_mm < 0.1:
                f.append("low A260: ratios not reliable")
            if np.isfinite(r280[i]):
                if r280[i] < lo280:
                    f.append("A260/A280 low")
                elif r280[i] > hi280:
                    f.append("A260/A280 high")
            if has230 and np.isfinite(r230[i]):
                if r230[i] < a260_230_min:
                    f.append("A260/A230 low")
                elif r230[i] > a260_230_max:
                    f.append("A260/A230 high")
        flags.append("; ".join(f))
    out = pd.DataFrame({"sample": frame[sample_col].astype(str).to_numpy(), "a260": a260.to_numpy(), "a280": a280.to_numpy(), "a230": a230.to_numpy(),
                        "conc_ng_per_ul": conc.to_numpy(), "a260_280": r280.to_numpy(), "a260_230": r230.to_numpy(), "flag": flags})
    path_out = _save(out, (file_name or "nucleic-acid") + "-qc")
    _style()
    fig, ax = plt.subplots(figsize=(3.6, 3.2), layout="constrained")
    if has230:
        ax.axvspan(lo280, hi280, ymin=0, ymax=1, color="#009E73", alpha=0.08, linewidth=0)
        ax.axhspan(a260_230_min, a260_230_max, color="#009E73", alpha=0.08, linewidth=0)
        ax.scatter(out["a260_280"], out["a260_230"], s=22, color="#0072B2", edgecolor="black", linewidth=0.4, zorder=3)
        if len(out) <= 12:
            for _, s in out.iterrows():
                if np.isfinite(s["a260_280"]) and np.isfinite(s["a260_230"]):
                    ax.annotate(s["sample"], (s["a260_280"], s["a260_230"]), textcoords="offset points", xytext=(4, 3), fontsize=7)
        ax.set_xlabel("A260/A280 (ratio)")
        ax.set_ylabel("A260/A230 (ratio)")
    else:
        pos = np.arange(len(out))
        ax.axhspan(lo280, hi280, color="#009E73", alpha=0.08, linewidth=0)
        ax.bar(pos, out["a260_280"], width=0.6, color="#0072B2", alpha=0.6)
        ax.set_xticks(pos, out["sample"], rotation=45, ha="right")
        ax.set_ylabel("A260/A280 (ratio)")
    png, svg = _save_fig(fig, (file_name or "nucleic-acid") + "-ratios")
    n_flag = int((out["flag"] != "").sum())
    parts = ["%s %s ng/uL, A260/A280 %s, A260/A230 %s%s" % (s["sample"], _fmt(s["conc_ng_per_ul"]), _fmt(s["a260_280"]), _fmt(s["a260_230"]), " (%s)" % s["flag"] if s["flag"] else "")
             for _, s in out.head(8).iterrows()]
    summary = ("Nucleic acid QC (%s, factor %g, path %g mm, baseline %s): %s%s. %d of %d flagged. The ratio ranges are rules of thumb "
               "(A260/A280 %s to %s, A260/A230 %s to %s), not pass or fail limits. A260/A280 does not detect protein well. Saved %s." % (
                   sample_type, factor, path_length_mm, "A320" if baseline == "a320" else "none", "; ".join(parts), "; ..." if len(out) > 8 else "", n_flag, len(out),
                   _fmt(float(lo280)), _fmt(float(hi280)), _fmt(float(a260_230_min)), _fmt(float(a260_230_max)), path_out))
    metrics = {"n_samples": int(len(out)), "n_flagged": n_flag, "factor": factor, "path_length_mm": float(path_length_mm)}
    return {
        "ok": True,
        "summary": summary,
        "metrics": metrics,
        "data": {"qc_path": path_out, "excluded_rows": excluded},
        "table": _preview(out, path_out),
        "png": png, "svg": svg,
        "outputs": [{"path": path_out, "kind": "table", "name": os.path.basename(path_out)}] + _figure_outputs(png, svg),
        "manualRoute": _na_route(factor, path_length_mm, baseline),
        "fidelity": "exact",
    }
