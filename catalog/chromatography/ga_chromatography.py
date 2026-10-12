import glob
import os
import re
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from hplc.quant import Chromatogram
from scipy import integrate, stats

warnings.filterwarnings("ignore")


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


def _table(frame, name, limit=30):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    rows = [[_clean(v) for v in r] for r in frame.head(limit).itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": rows, "n_rows": int(len(frame)), "path": path}


def _read(path, time_column, signal_column, delimiter=None, skip_rows=0):
    path = os.path.expanduser(str(path))
    if not os.path.exists(path):
        return None, "File not found: %s." % path
    sep = delimiter if delimiter else ("\t" if path.lower().endswith((".txt", ".tsv", ".tab")) else ",")
    try:
        frame = pd.read_csv(path, sep=sep, skiprows=int(skip_rows), engine="python")
    except Exception as e:
        return None, "Could not read %s with the separator %r: %s. Set delimiter or skip_rows for an instrument export with a header block." % (path, sep, e)
    if frame.shape[1] < 2:
        return None, "Only %d column in %s with the separator %r. Set delimiter (',', ';' or a tab) or skip_rows." % (frame.shape[1], path, sep)
    cols = {str(c).strip(): c for c in frame.columns}
    t = cols.get(str(time_column).strip()) if time_column else None
    s = cols.get(str(signal_column).strip()) if signal_column else None
    if time_column and t is None:
        return None, "Unknown time column %r in %s. The columns are: %s." % (time_column, path, ", ".join(map(str, frame.columns)))
    if signal_column and s is None:
        return None, "Unknown signal column %r in %s. The columns are: %s." % (signal_column, path, ", ".join(map(str, frame.columns)))
    if t is None or s is None:
        t, s = frame.columns[0], frame.columns[1]
    out = pd.DataFrame({"time": pd.to_numeric(frame[t], errors="coerce"), "signal": pd.to_numeric(frame[s], errors="coerce")}).dropna()
    if len(out) < 20:
        return None, "Only %d numeric rows in %s. Set skip_rows to the number of header lines of the export." % (len(out), path)
    return out.reset_index(drop=True), None


def read_trace(path, time_column=None, signal_column=None, delimiter=None, skip_rows=0):
    d, err = _read(path, time_column, signal_column, delimiter, skip_rows)
    if d is None:
        return _fail(err)
    step = float(np.median(np.diff(d["time"].values)))
    metrics = {"n_points": len(d), "time_start": float(d["time"].min()), "time_end": float(d["time"].max()), "time_step": step,
               "signal_min": float(d["signal"].min()), "signal_max": float(d["signal"].max()), "signal_at_start": float(d["signal"].iloc[0]),
               "signal_at_end": float(d["signal"].iloc[-1])}
    even = bool(np.allclose(np.diff(d["time"].values), step, rtol=0.02))
    _style()
    fig, ax = plt.subplots(figsize=(7, 2.6))
    ax.plot(d["time"], d["signal"], color="#0072B2", lw=0.8)
    ax.set_xlabel("Time")
    ax.set_ylabel("Signal")
    ax.set_title(os.path.basename(path), fontsize=9)
    summary = "%s: %d points from %.4g to %.4g (step %.4g, %s spacing). Signal %.6g to %.6g; it starts at %.6g and ends at %.6g." % (
        os.path.basename(path), len(d), metrics["time_start"], metrics["time_end"], step, "even" if even else "uneven",
        metrics["signal_min"], metrics["signal_max"], metrics["signal_at_start"], metrics["signal_at_end"])
    if abs(metrics["signal_at_end"] - metrics["signal_at_start"]) > 0.02 * (metrics["signal_max"] - metrics["signal_min"]):
        summary += " The start and the end differ, so the trace drifts. Set baseline to snip in integrate_peaks."
    return {"ok": True, "summary": summary, "metrics": metrics, "data": {"even_spacing": even, "path": path},
            "table": _table(d.head(200), "trace_head"), "outputs": _save(fig, "trace")}


def integrate_peaks(path, baseline=None, prominence=None, time_column=None, signal_column=None, delimiter=None, skip_rows=0,
                    peak_width=None, time_window=None, integration_window=None, known_peaks=None, buffer=0):
    if baseline not in ("snip", "none"):
        return _fail("baseline is missing or not snip or none. The baseline is a decision: it changes every peak area.")
    if prominence is None:
        return _fail("prominence is missing. It is a decision: the smallest peak height, as a fraction of the largest, that counts as a peak.")
    if baseline == "snip" and peak_width is None:
        return _fail("peak_width is missing. The SNIP baseline needs the approximate width of a peak, in time units.")
    d, err = _read(path, time_column, signal_column, delimiter, skip_rows)
    if d is None:
        return _fail(err)
    chrom = Chromatogram(d, cols={"time": "time", "signal": "signal"})
    if time_window:
        w = [float(x) for x in (time_window.split(",") if isinstance(time_window, str) else time_window)]
        if len(w) != 2 or w[0] >= w[1]:
            return _fail("time_window must be two numbers, the start and the end. It is %r." % (time_window,))
        if w[0] < d["time"].min() or w[1] > d["time"].max():
            return _fail("time_window %g to %g is outside the trace, which runs from %g to %g." % (w[0], w[1], d["time"].min(), d["time"].max()))
        chrom.crop(w)
    kwargs = {"correct_baseline": baseline == "snip", "prominence": float(prominence), "verbose": False, "buffer": int(buffer)}
    if peak_width is not None:
        kwargs["approx_peak_width"] = float(peak_width)
    if integration_window:
        iw = [float(x) for x in (integration_window.split(",") if isinstance(integration_window, str) else integration_window)]
        if len(iw) != 2 or iw[0] >= iw[1]:
            return _fail("integration_window must be two numbers, the start and the end. It is %r." % (integration_window,))
        kwargs["integration_window"] = iw
    if known_peaks:
        kwargs["known_peaks"] = [float(x) for x in (known_peaks.split(",") if isinstance(known_peaks, str) else known_peaks)]
    try:
        peaks = chrom.fit_peaks(**kwargs)
    except Exception as e:
        return _fail("hplc-py fit_peaks stopped on %s (%d points, baseline %s, prominence %g): %s" % (
            os.path.basename(path), len(d), baseline, float(prominence), e))
    if peaks is None or len(peaks) == 0:
        return _fail("No peak found in %s with prominence %g. The signal runs from %.6g to %.6g. Lower prominence, or set time_window around the peak." % (
            os.path.basename(path), float(prominence), d["signal"].min(), d["signal"].max()))
    out = peaks.rename(columns={"retention_time": "retention_time", "area": "area", "amplitude": "amplitude", "scale": "scale", "skew": "skew"}).copy()
    keep = [c for c in ["peak_id", "retention_time", "area", "amplitude", "scale", "skew"] if c in out.columns]
    out = out[keep].sort_values("retention_time").reset_index(drop=True)
    total = float(out["area"].sum())
    out["area_percent"] = 100.0 * out["area"] / total
    work = chrom.df
    signal_col = "estimated_background" if "estimated_background" in work.columns else None
    metrics = {"n_peaks": len(out), "total_area": total}
    for i, r in out.iterrows():
        metrics["retention_time_%d" % (i + 1)] = float(r["retention_time"])
        metrics["area_%d" % (i + 1)] = float(r["area"])
    _style()
    fig, ax = plt.subplots(figsize=(7, 3))
    ycol = "signal_corrected" if "signal_corrected" in work.columns else "signal"
    ax.plot(work["time"], work[ycol], color="#0072B2", lw=0.8, label="signal" + (" after the baseline" if ycol != "signal" else ""))
    if signal_col:
        ax.plot(work["time"], work[signal_col], color="#E69F00", lw=0.8, ls="--", label="SNIP baseline")
    for r in out.itertuples():
        ax.annotate("%.3g" % r.retention_time, (r.retention_time, work[ycol].max() * 0.95), ha="center", fontsize=7, rotation=90)
        ax.axvline(r.retention_time, color="#D55E00", lw=0.5, alpha=0.5)
    ax.set_xlabel("Time")
    ax.set_ylabel("Signal")
    ax.legend(fontsize=7, frameon=False)
    ax.set_title("%s: %d peaks" % (os.path.basename(path), len(out)), fontsize=9)
    summary = "%s: %d peak(s) with the %s baseline and prominence %g. %s. Total area %.6g." % (
        os.path.basename(path), len(out), baseline, float(prominence),
        "; ".join("retention time %.4g, area %.6g (%.1f%%)" % (r.retention_time, r.area, r.area_percent) for r in out.itertuples()), total)
    summary += " hplc-py fits a skew-normal peak to each window, so the area includes the fitted tail."
    if integration_window:
        summary += " The area covers the window %g to %g only." % (iw[0], iw[1])
    return {"ok": True, "summary": summary, "metrics": metrics,
            "data": {"baseline": baseline, "prominence": float(prominence), "peak_width": peak_width, "file": os.path.basename(path)},
            "table": _table(out, "peaks"), "outputs": _save(fig, "peaks")}


def area_in_window(path, start, end, baseline_points=None, time_column=None, signal_column=None, delimiter=None, skip_rows=0):
    d, err = _read(path, time_column, signal_column, delimiter, skip_rows)
    if d is None:
        return _fail(err)
    if start >= end:
        return _fail("start (%g) must be smaller than end (%g)." % (start, end))
    sel = d[(d["time"] >= float(start)) & (d["time"] <= float(end))]
    if len(sel) < 3:
        return _fail("Only %d points between %g and %g. The trace runs from %g to %g." % (len(sel), start, end, d["time"].min(), d["time"].max()))
    y = sel["signal"].to_numpy(dtype=float)
    t = sel["time"].to_numpy(dtype=float)
    rule = "no baseline"
    if baseline_points:
        pts = [float(x) for x in (baseline_points.split(",") if isinstance(baseline_points, str) else baseline_points)]
        if len(pts) != 2:
            return _fail("baseline_points must be two times, one on each side of the peak. It is %r." % (baseline_points,))
        y0 = [float(d.loc[(d["time"] - p).abs().idxmin(), "signal"]) for p in pts]
        line = np.interp(t, pts, y0)
        y = y - line
        rule = "straight line between t = %g and t = %g" % (pts[0], pts[1])
    area = float(integrate.trapezoid(y, t))
    i = int(np.argmax(y))
    half = y[i] / 2.0
    above = np.where(y >= half)[0]
    width = float(t[above[-1]] - t[above[0]]) if len(above) > 1 else float("nan")
    metrics = {"area": area, "height": float(y[i]), "retention_time": float(t[i]), "width_at_half_height": width, "n_points": len(sel)}
    return {"ok": True, "summary": "Area between %g and %g by the trapezoid rule (%s): %.6g. Height %.6g at t = %.4g, width at half height %.4g, %d points." % (
        start, end, rule, area, metrics["height"], metrics["retention_time"], width, len(sel)),
        "metrics": metrics, "data": {"baseline_rule": rule}}


def calibration_curve(concentrations, areas, through_origin=None, weighting="none", unit="unit"):
    if through_origin is None:
        return _fail("through_origin is missing. It is a decision: a line through zero, or a line with an intercept.")
    x = np.asarray([float(v) for v in (concentrations.split(",") if isinstance(concentrations, str) else concentrations)], dtype=float)
    y = np.asarray([float(v) for v in (areas.split(",") if isinstance(areas, str) else areas)], dtype=float)
    if len(x) != len(y):
        return _fail("concentrations has %d values and areas has %d. They must match." % (len(x), len(y)))
    if len(x) < 3:
        return _fail("A calibration curve needs 3 or more standards. It has %d." % len(x))
    if weighting not in ("none", "1/x", "1/x2"):
        return _fail("weighting %r is not known. Use none, 1/x or 1/x2." % weighting)
    w = np.ones_like(x) if weighting == "none" else (1.0 / np.where(x == 0, np.nan, x) if weighting == "1/x" else 1.0 / np.where(x == 0, np.nan, x) ** 2)
    w = np.nan_to_num(w, nan=0.0)
    if through_origin:
        slope = float(np.sum(w * x * y) / np.sum(w * x * x))
        intercept = 0.0
        pred = slope * x
        dof = int(np.sum(w > 0)) - 1
    else:
        W = np.diag(w)
        X = np.column_stack([np.ones_like(x), x])
        beta = np.linalg.solve(X.T @ W @ X, X.T @ W @ y)
        intercept, slope = float(beta[0]), float(beta[1])
        pred = intercept + slope * x
        dof = int(np.sum(w > 0)) - 2
    resid = y - pred
    ss_res = float(np.sum(w * resid ** 2))
    ss_tot = float(np.sum(w * (y - np.average(y, weights=w)) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot else float("nan")
    se_resid = float(np.sqrt(ss_res / dof)) if dof > 0 else float("nan")
    se_area = float(np.sqrt(np.sum(resid[w > 0] ** 2) / dof)) if dof > 0 else float("nan")
    lod = float(3.3 * se_area / slope) if slope else float("nan")
    loq = float(10.0 * se_area / slope) if slope else float("nan")
    frame = pd.DataFrame({"concentration": x, "area": y, "fitted_area": pred, "residual": resid,
                          "residual_percent": 100.0 * resid / np.where(y == 0, np.nan, y)})
    _style()
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(5, 4.4), sharex=True, gridspec_kw={"height_ratios": [3, 1]})
    a1.scatter(x, y, color="#0072B2")
    xs = np.linspace(0, x.max() * 1.05, 50)
    a1.plot(xs, intercept + slope * xs, color="#D55E00", lw=1)
    a1.set_ylabel("Peak area")
    a1.set_title("area = %.6g x concentration %s %.6g, R squared %.6f" % (slope, "+" if intercept >= 0 else "-", abs(intercept), r2), fontsize=9)
    a2.axhline(0, color="#444444", lw=0.6)
    a2.scatter(x, frame["residual_percent"], color="#0072B2")
    a2.set_ylabel("Residual (%)")
    a2.set_xlabel("Concentration (%s)" % unit)
    metrics = {"slope": slope, "intercept": intercept, "r_squared": r2, "n_standards": len(x), "residual_se": se_resid,
               "lod": lod, "loq": loq, "max_residual_percent": float(np.nanmax(np.abs(frame["residual_percent"])))}
    summary = "Calibration from %d standards (%s, weighting %s): area = %.6g x concentration %s %.6g. R squared %.6f. Largest residual %.2f%%. Estimated limit of detection %.4g %s and limit of quantification %.4g %s, from 3.3 and 10 times the residual standard error over the slope." % (
        len(x), "through the origin" if through_origin else "with an intercept", weighting, slope, "+" if intercept >= 0 else "-", abs(intercept),
        r2, metrics["max_residual_percent"], lod, unit, loq, unit)
    summary += " R squared alone does not show that the curve is linear. Read the residual plot."
    return {"ok": True, "summary": summary, "metrics": metrics,
            "data": {"through_origin": bool(through_origin), "weighting": weighting, "unit": unit},
            "table": _table(frame, "calibration"), "outputs": _save(fig, "calibration")}


def quantify_areas(areas, slope, intercept, unit="unit", labels=None, lowest_standard=None, highest_standard=None):
    y = np.asarray([float(v) for v in (areas.split(",") if isinstance(areas, str) else areas)], dtype=float)
    if slope == 0:
        return _fail("slope is 0, so the calibration cannot give a concentration.")
    names = [str(x).strip() for x in (labels.split(",") if isinstance(labels, str) else (labels or []))]
    if names and len(names) != len(y):
        return _fail("labels has %d values and areas has %d. They must match." % (len(names), len(y)))
    conc = (y - float(intercept)) / float(slope)
    frame = pd.DataFrame({"sample": names or ["sample %d" % (i + 1) for i in range(len(y))], "area": y, "concentration": conc})
    outside = []
    if lowest_standard is not None or highest_standard is not None:
        lo = float(lowest_standard) if lowest_standard is not None else -np.inf
        hi = float(highest_standard) if highest_standard is not None else np.inf
        frame["in_calibration_range"] = (conc >= lo) & (conc <= hi)
        outside = frame.loc[~frame["in_calibration_range"], "sample"].tolist()
    metrics = {"n_samples": len(y), "mean_concentration": float(np.mean(conc)), "n_outside_range": len(outside)}
    for i, r in frame.iterrows():
        metrics["concentration_%d" % (i + 1)] = float(r["concentration"])
    summary = "%d sample(s) from area = %.6g x concentration %s %.6g: %s." % (
        len(y), float(slope), "+" if float(intercept) >= 0 else "-", abs(float(intercept)),
        "; ".join("%s %.6g %s" % (r.sample, r.concentration, unit) for r in frame.itertuples()))
    if outside:
        summary += " Outside the calibration range (%g to %g %s): %s. Dilute the sample and measure again." % (
            float(lowest_standard), float(highest_standard), unit, ", ".join(outside))
    return {"ok": True, "summary": summary, "metrics": metrics, "data": {"unit": unit}, "table": _table(frame, "concentrations")}
