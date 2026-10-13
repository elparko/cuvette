import csv
import json
import math
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy import ndimage as ndi
from scipy import stats

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

BLUE, ORANGE, VERMILION, GREEN, GREY = "#0072B2", "#E69F00", "#D55E00", "#009E73", "#999999"
TIME_NAMES = {"time", "time_s", "time (s)", "time(s)", "t", "t_s", "seconds", "sec", "time_sec", "time_ms", "time (ms)", "time(ms)", "t_ms", "ms", "milliseconds"}
INDEX_NAMES = {"", " ", "frame", "frames", "slice", "index", "#", "n", "label", "unnamed: 0"}
MAD_TO_SD = 1.4826


def _fail(msg):
    raise ValueError(msg)


def _check_file(path, what):
    if not path or not Path(path).exists():
        _fail("%s not found: %s" % (what, path))


def _stem(path):
    return Path(path).stem


def _write_csv(path, columns, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(columns)
        w.writerows(rows)


def _table(path, columns, rows, preview=12):
    return {"columns": columns, "rows": rows[:preview], "n_rows": len(rows), "path": os.path.abspath(path)}


def _save_plot(fig, stem):
    png, svg = stem + ".png", stem + ".svg"
    fig.savefig(png, dpi=150, bbox_inches="tight")
    with matplotlib.rc_context({"svg.fonttype": "none"}):
        fig.savefig(svg, format="svg", bbox_inches="tight")
    plt.close(fig)
    return [png, svg]


def _plot_outputs(paths, name):
    return [{"path": p, "kind": "image" if p.endswith(".png") else "file", "name": "%s (%s)" % (name, p.rsplit(".", 1)[-1].upper())} for p in paths]


def _num(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)):
        return ""
    return round(float(v), 6)


def _split_list(value, label):
    if value is None or value == "":
        return []
    if isinstance(value, (list, tuple)):
        return [str(v).strip() for v in value if str(v).strip()]
    return [v.strip() for v in str(value).replace(";", ",").split(",") if v.strip()]


def _load_suite2p(folder, name, iscell_threshold):
    p = Path(folder)
    if not (p / (name + ".npy")).exists() and (p / "plane0" / (name + ".npy")).exists():
        p = p / "plane0"
    f = p / (name + ".npy")
    if not f.exists():
        _fail("the Suite2p folder %s has no %s.npy. Give the plane folder that holds F.npy, Fneu.npy and iscell.npy" % (folder, name))
    arr = np.load(f, allow_pickle=False).astype(float)
    if arr.ndim != 2:
        _fail("%s has %d dimensions. Suite2p traces must have one row for each cell and one column for each frame" % (f, arr.ndim))
    ids = np.arange(arr.shape[0])
    ic = p / "iscell.npy"
    if ic.exists() and iscell_threshold is not None:
        prob = np.load(ic, allow_pickle=False)
        keep = prob[:, 1] >= iscell_threshold if prob.ndim == 2 and prob.shape[1] > 1 else prob.ravel() > 0
        arr, ids = arr[keep], ids[keep]
    return arr.T, ["cell%d" % i for i in ids]


def _load_traces(path, frame_rate=0.0, time_column="", rois="", kind="F", iscell_threshold=0.5):
    if not path:
        _fail("the traces path is empty. Give a CSV file or a Suite2p plane folder")
    warnings = []
    if Path(path).is_dir():
        X, names = _load_suite2p(path, kind, iscell_threshold)
        t = None
    else:
        _check_file(path, "traces file")
        with open(path, newline="", encoding="utf-8-sig") as f:
            rows = [r for r in csv.reader(f) if any(c.strip() for c in r)]
        if len(rows) < 3:
            _fail("the traces file %s has %d row(s). It needs a header row and at least 2 frames" % (path, len(rows)))
        header = [h.strip() for h in rows[0]]
        body = rows[1:]
        tcol = None
        if time_column:
            if time_column not in header:
                _fail("time_column %r is not a column of %s. The columns are: %s" % (time_column, path, ", ".join(header[:20])))
            tcol = header.index(time_column)
        else:
            tcol = next((i for i, h in enumerate(header) if h.lower() in TIME_NAMES), None)
        mean_cols = [i for i, h in enumerate(header) if re.fullmatch(r"Mean\d+", h)]
        skip = {tcol} if tcol is not None else set()
        cand = mean_cols if mean_cols else [i for i, h in enumerate(header) if i not in skip and h.lower() not in INDEX_NAMES]
        mat = np.full((len(body), len(cand)), np.nan)
        for r, row in enumerate(body):
            for k, c in enumerate(cand):
                try:
                    mat[r, k] = float(row[c])
                except (ValueError, IndexError):
                    pass
        ok = [k for k in range(len(cand)) if np.isfinite(mat[:, k]).mean() > 0.5]
        if not ok:
            _fail("the traces file %s has no numeric trace column. The columns are: %s" % (path, ", ".join(header[:20])))
        X = mat[:, ok]
        names = [header[cand[k]] for k in ok]
        t = None
        if tcol is not None:
            tt = np.array([float(r[tcol]) if r[tcol].strip() else np.nan for r in body])
            if re.search(r"(?<![a-z])ms(?![a-z])|millisec", header[tcol].lower()):
                tt = tt / 1000.0
            t = tt
    if rois and str(rois).lower() != "all":
        want = _split_list(rois, "rois")
        missing = [w for w in want if w not in names]
        if missing:
            _fail("rois %s are not in the traces. The ROI names are: %s" % (", ".join(missing[:5]), ", ".join(names[:20])))
        idx = [names.index(w) for w in want]
        X, names = X[:, idx], want
    n = X.shape[0]
    if frame_rate and frame_rate > 0:
        if t is not None and np.isfinite(t).all() and n > 1:
            fs_file = 1.0 / np.median(np.diff(t))
            if abs(fs_file - frame_rate) / frame_rate > 0.02:
                warnings.append("The time column gives %.4g Hz but frame_rate is %.4g Hz. The tool uses frame_rate." % (fs_file, frame_rate))
        t0 = float(t[0]) if t is not None and np.isfinite(t[0]) else 0.0
        t = t0 + np.arange(n) / float(frame_rate)
    elif t is not None and np.isfinite(t).all():
        d = np.diff(t)
        if (d <= 0).any():
            _fail("the time column of %s is not increasing. Sort the rows or give frame_rate" % path)
        if d.std() / d.mean() > 0.05:
            warnings.append("The time step is not constant (SD %.1f percent of the mean). The tool treats the frames as evenly spaced." % (100 * d.std() / d.mean()))
        frame_rate = round(1.0 / float(np.median(d)), 6)
    else:
        _fail("the frame rate is unknown. The file %s has no time column. Give frame_rate in Hz" % path)
    if np.isnan(X).any():
        warnings.append("%d value(s) are NaN. The tool fills each NaN with the nearest earlier value." % int(np.isnan(X).sum()))
        for k in range(X.shape[1]):
            col = X[:, k]
            bad = np.isnan(col)
            if bad.all():
                _fail("the trace %s has no numeric value" % names[k])
            idx = np.where(~bad, np.arange(n), 0)
            np.maximum.accumulate(idx, out=idx)
            col[:] = col[idx]
            first = np.argmax(~bad)
            col[:first] = col[first]
    return {"t": t, "X": X, "names": names, "fs": float(frame_rate), "warnings": warnings}


def _is_dir_or_csv(path):
    return Path(path).is_dir() or Path(path).suffix.lower() in (".csv", ".txt", ".tsv", "")


def _write_traces(path, t, X, names):
    _write_csv(path, ["time_s"] + list(names), [[repr(float(t[i]))] + [repr(float(v)) for v in X[i]] for i in range(len(t))])


def inspect_recording(path, frame_rate=0.0, time_column="", rois=""):
    p = Path(path)
    if p.suffix.lower() in (".tif", ".tiff"):
        import tifffile

        _check_file(path, "image stack")
        try:
            with tifffile.TiffFile(str(p)) as tf:
                s = tf.series[0]
                shape, axes, dtype = s.shape, s.axes, str(s.dtype)
                ij = tf.imagej_metadata or {}
        except Exception as e:
            _fail("cannot read the TIFF file %s: %s" % (path, e))
        warnings = []
        if len(shape) < 3:
            warnings.append("The file is a single image, not a stack.")
        finterval = ij.get("finterval")
        return {
            "ok": True,
            "summary": "TIFF stack %s, axes %s, %s. %s" % ("x".join(str(s) for s in shape), axes, dtype, ("Frame interval %.4g s in the file." % finterval) if finterval else "No frame interval in the file."),
            "metrics": {"frames": shape[0] if len(shape) >= 3 else 1, "height": shape[-2], "width": shape[-1], "frame_interval_s": float(finterval) if finterval else 0.0},
            "data": {"axes": axes, "dtype": dtype, "warnings": warnings},
        }
    rec = _load_traces(path, frame_rate, time_column, rois)
    X, t = rec["X"], rec["t"]
    rows, warnings = [], list(rec["warnings"])
    for k, nme in enumerate(rec["names"]):
        y = X[:, k]
        rows.append([nme, _num(y.min()), _num(np.median(y)), _num(y.max()), _num(y.std())])
        if y.std() == 0:
            warnings.append("Trace %s is constant." % nme)
    if (X < 0).mean() > 0.01 and abs(np.median(X)) < 0.5 * np.abs(X).max():
        warnings.append("The traces have negative values and a median near zero. They can be dF/F or background-subtracted values already. Do not compute dF/F a second time on them.")
    elif (X <= 0).any():
        warnings.append("Some raw fluorescence values are zero or negative. dF/F divides by the baseline, so a baseline at or below zero fails.")
    n = X.shape[0]
    return {
        "ok": True,
        "summary": "%d trace(s), %d frames, %.4g Hz, %.1f s. %d warning(s)." % (X.shape[1], n, rec["fs"], n / rec["fs"], len(warnings)),
        "metrics": {"n_rois": X.shape[1], "n_frames": n, "frame_rate_hz": rec["fs"], "duration_s": n / rec["fs"]},
        "data": {"warnings": warnings, "roi_names": rec["names"][:50]},
        "table": {"columns": ["roi", "min", "median", "max", "sd"], "rows": rows[:12], "n_rows": len(rows)},
    }


def _roi_masks(roi_file, shape):
    ny, nx = shape
    path = Path(roi_file)
    _check_file(roi_file, "ROI file")
    masks, names = [], []
    suffix = path.suffix.lower()
    if suffix in (".roi", ".zip"):
        import roifile

        try:
            rr = roifile.roiread(str(path))
        except Exception as e:
            _fail("cannot read the ImageJ ROI file %s: %s" % (roi_file, e))
        rr = rr if isinstance(rr, list) else [rr]
        yy, xx = np.mgrid[0:ny, 0:nx]
        from matplotlib.path import Path as MPath

        for i, r in enumerate(rr):
            kind = r.roitype.name
            if kind == "RECT":
                m = (xx >= r.left) & (xx < r.right) & (yy >= r.top) & (yy < r.bottom)
            elif kind == "OVAL":
                cx, cy = (r.left + r.right) / 2.0 - 0.5, (r.top + r.bottom) / 2.0 - 0.5
                a, b = (r.right - r.left) / 2.0, (r.bottom - r.top) / 2.0
                m = ((xx - cx) / a) ** 2 + ((yy - cy) / b) ** 2 <= 1.0
            elif kind in ("POLYGON", "FREEHAND", "TRACED", "FREEROI"):
                m = MPath(r.coordinates()).contains_points(np.c_[xx.ravel() + 0.5, yy.ravel() + 0.5]).reshape(ny, nx)
            else:
                _fail("the ROI %s in %s has type %s. The tool reads rectangle, oval, polygon and freehand ROIs" % (r.name or i, roi_file, kind))
            masks.append(m)
            names.append(r.name or "roi%d" % (i + 1))
    elif suffix in (".tif", ".tiff"):
        import tifffile

        lab = np.squeeze(tifffile.imread(str(path)))
        if lab.shape != (ny, nx):
            _fail("the label image %s is %s but the stack frames are %d by %d" % (roi_file, "x".join(map(str, lab.shape)), nx, ny))
        for v in np.unique(lab[lab > 0]):
            masks.append(lab == v)
            names.append("roi%d" % v)
    elif suffix == ".csv":
        with open(path, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        need = {"name", "x", "y", "radius_px"}
        if not rows or not need <= set(rows[0].keys()):
            _fail("the ROI table %s needs the columns name, x, y and radius_px. It has: %s" % (roi_file, ", ".join(rows[0].keys()) if rows else "no rows"))
        yy, xx = np.mgrid[0:ny, 0:nx]
        for r in rows:
            masks.append((xx - float(r["x"])) ** 2 + (yy - float(r["y"])) ** 2 <= float(r["radius_px"]) ** 2)
            names.append(r["name"])
    else:
        _fail("the ROI file %s has the ending %s. Use an ImageJ .roi or .zip file, a label .tif image or a .csv table" % (roi_file, suffix))
    empty = [n for n, m in zip(names, masks) if not m.any()]
    if empty:
        _fail("the ROI(s) %s cover no pixel of the %d by %d frame" % (", ".join(empty[:5]), nx, ny))
    if not masks:
        _fail("the ROI file %s has no ROI" % roi_file)
    return masks, names


def extract_traces(stack, roi_file, frame_rate=0.0, neuropil_inner_px=0.0, neuropil_outer_px=0.0):
    import tifffile

    _check_file(stack, "image stack")
    try:
        with tifffile.TiffFile(str(stack)) as tf:
            arr = tf.series[0].asarray()
            ij = tf.imagej_metadata or {}
    except Exception as e:
        _fail("cannot read the TIFF file %s: %s" % (stack, e))
    arr = np.squeeze(arr)
    if arr.ndim != 3:
        _fail("the stack %s has the shape %s. The tool needs frames, height, width" % (stack, "x".join(map(str, arr.shape))))
    T, ny, nx = arr.shape
    fs = float(frame_rate) if frame_rate and frame_rate > 0 else (1.0 / float(ij["finterval"]) if ij.get("finterval") else 0.0)
    if fs <= 0:
        _fail("the frame rate is unknown. The stack %s has no frame interval. Give frame_rate in Hz" % stack)
    masks, names = _roi_masks(roi_file, (ny, nx))
    W = np.zeros((ny * nx, len(masks)), dtype=np.float32)
    for k, m in enumerate(masks):
        W[:, k] = m.ravel() / m.sum()
    use_neu = neuropil_outer_px and neuropil_outer_px > neuropil_inner_px
    if neuropil_outer_px and neuropil_outer_px <= neuropil_inner_px:
        _fail("neuropil_outer_px (%g) must be larger than neuropil_inner_px (%g)" % (neuropil_outer_px, neuropil_inner_px))
    if use_neu:
        union = np.any(masks, axis=0)
        WN = np.zeros_like(W)
        for k, m in enumerate(masks):
            d = ndi.distance_transform_edt(~m)
            ring = (d > neuropil_inner_px) & (d <= neuropil_outer_px) & ~union
            if not ring.any():
                _fail("the neuropil ring of %s has no pixel. Lower neuropil_inner_px or raise neuropil_outer_px" % names[k])
            WN[:, k] = ring.ravel() / ring.sum()
    F = np.empty((T, len(masks)))
    FN = np.empty((T, len(masks))) if use_neu else None
    for a in range(0, T, 200):
        chunk = arr[a:a + 200].reshape(min(200, T - a), -1).astype(np.float32)
        F[a:a + 200] = chunk @ W
        if use_neu:
            FN[a:a + 200] = chunk @ WN
    t = np.arange(T) / fs
    base = _stem(stack)
    fpath = os.path.abspath(base + "_F.csv")
    _write_traces(fpath, t, F, names)
    outs = [{"path": fpath, "kind": "table", "name": "ROI mean fluorescence"}]
    if use_neu:
        npath = os.path.abspath(base + "_Fneu.csv")
        _write_traces(npath, t, FN, names)
        outs.append({"path": npath, "kind": "table", "name": "neuropil ring fluorescence"})
    rows = [[n, int(m.sum()), _num(F[:, k].mean())] for k, (n, m) in enumerate(zip(names, masks))]
    return {
        "ok": True,
        "summary": "%d ROI(s) from %d frames at %.4g Hz%s. Mean pixel count %.0f." % (len(masks), T, fs, ", with a neuropil ring" if use_neu else "", np.mean([m.sum() for m in masks])),
        "metrics": {"n_rois": len(masks), "n_frames": T, "frame_rate_hz": fs, "mean_roi_pixels": float(np.mean([m.sum() for m in masks]))},
        "outputs": outs,
        "table": _table(fpath, ["roi", "pixels", "mean_F"], rows),
    }


def _percentile_baseline(X, fs, window_s, percentile):
    n = int(round(window_s * fs))
    n += 1 - n % 2
    n = min(n, X.shape[0] - 1 + X.shape[0] % 2) if n > X.shape[0] else n
    return ndi.percentile_filter(X, percentile, size=(n, 1), mode="nearest")


def compute_dff(traces, baseline_method, frame_rate=0.0, time_column="", rois="", neuropil="", neuropil_coefficient=0.0, baseline_window_s=0.0, baseline_percentile=8.0, baseline_first_s=0.0, fixed_f0=0.0, sort_rois=False):
    rec = _load_traces(traces, frame_rate, time_column, rois)
    X, fs, names = rec["X"], rec["fs"], rec["names"]
    warnings = list(rec["warnings"])
    if neuropil_coefficient and neuropil_coefficient > 0:
        src = neuropil or (traces if Path(traces).is_dir() else "")
        if not src:
            _fail("neuropil_coefficient is %g but neuropil is empty. Give the neuropil trace file or a Suite2p folder" % neuropil_coefficient)
        if Path(src).is_dir():
            NX, _ = _load_suite2p(src, "Fneu", 0.5)
            if Path(traces).is_dir():
                NX, _ = _load_suite2p(src, "Fneu", 0.5)
        else:
            NX = _load_traces(src, fs, "", "all")["X"]
            if neuropil and rois and str(rois).lower() != "all":
                full = _load_traces(src, fs, "", "all")
                NX = full["X"][:, [full["names"].index(n) for n in names]] if all(n in full["names"] for n in names) else NX
        if NX.shape != X.shape:
            _fail("the neuropil trace is %d frames by %d traces but the traces are %d by %d. They must match" % (NX.shape[0], NX.shape[1], X.shape[0], X.shape[1]))
        X = X - neuropil_coefficient * NX
    if baseline_method == "percentile":
        if not baseline_window_s or baseline_window_s <= 0:
            _fail("baseline_window_s is %s. The percentile baseline needs a window in seconds above 0" % baseline_window_s)
        if not 0 <= baseline_percentile <= 100:
            _fail("baseline_percentile is %g. It must be between 0 and 100" % baseline_percentile)
        F0 = _percentile_baseline(X, fs, baseline_window_s, baseline_percentile)
    elif baseline_method == "first_frames":
        if not baseline_first_s or baseline_first_s <= 0:
            _fail("baseline_first_s is %s. The first-frames baseline needs a length in seconds above 0" % baseline_first_s)
        k = max(1, int(round(baseline_first_s * fs)))
        if k >= X.shape[0]:
            _fail("baseline_first_s %g s covers all %d frames. Use a shorter baseline" % (baseline_first_s, X.shape[0]))
        F0 = np.tile(X[:k].mean(axis=0), (X.shape[0], 1))
    elif baseline_method == "fixed":
        if not fixed_f0 or fixed_f0 <= 0:
            _fail("fixed_f0 is %s. The fixed baseline needs F0 above 0, in the units of the traces" % fixed_f0)
        F0 = np.full(X.shape, float(fixed_f0))
    else:
        _fail("baseline_method is %r. Use percentile, first_frames or fixed" % baseline_method)
    bad = (F0 <= 0).any(axis=0)
    if bad.any():
        _fail("the baseline F0 is zero or negative in %s. dF/F is not defined there. Lower neuropil_coefficient, choose a fixed F0, or check the background subtraction" % ", ".join(np.array(names)[bad][:5]))
    dff = (X - F0) / F0
    t = rec["t"]
    base = _stem(traces) if not Path(traces).is_dir() else Path(traces).resolve().parent.name + "_suite2p"
    dpath = os.path.abspath(base + "_dff.csv")
    _write_traces(dpath, t, dff, names)
    order = np.argsort(np.argmax(dff, axis=0)) if sort_rois else np.arange(dff.shape[1])
    fig, ax = plt.subplots(figsize=(7, 0.5 + min(8, 0.12 * dff.shape[1] + 1.5)))
    vmax = float(np.percentile(dff, 99.5))
    im = ax.imshow(dff[:, order].T, aspect="auto", cmap="viridis", vmin=float(np.percentile(dff, 1)), vmax=vmax if vmax > 0 else 1, extent=[t[0], t[-1], dff.shape[1], 0], interpolation="nearest")
    ax.set_xlabel("time (s)")
    ax.set_ylabel("ROI")
    fig.colorbar(im, ax=ax, label="dF/F (fraction)")
    heat = _save_plot(fig, os.path.abspath(base + "_dff_heatmap"))
    show = min(12, dff.shape[1])
    fig, ax = plt.subplots(figsize=(7, 0.5 + 0.45 * show))
    scale = max(float(np.percentile(dff, 99.5)), 1e-9)
    for r in range(show):
        ax.plot(t, dff[:, order[r]] + r * scale * 1.1, color=BLUE, lw=0.6)
    ax.set_yticks([r * scale * 1.1 for r in range(show)])
    ax.set_yticklabels([names[order[r]] for r in range(show)], fontsize=6)
    ax.set_xlabel("time (s)")
    ax.spines[["top", "right"]].set_visible(False)
    trc = _save_plot(fig, os.path.abspath(base + "_dff_traces"))
    rows = [[names[k], _num(F0[:, k].mean()), _num(np.median(dff[:, k])), _num(dff[:, k].max()), _num(dff[:, k].std())] for k in range(dff.shape[1])]
    cols = ["roi", "mean_F0", "median_dff", "max_dff", "sd_dff"]
    if (dff.max(axis=0) < 0.05).all():
        warnings.append("The largest dF/F of every trace is below 0.05. Check the baseline window and the traces.")
    return {
        "ok": True,
        "summary": "dF/F of %d trace(s), %d frames, baseline %s%s. Median dF/F %.4f." % (dff.shape[1], dff.shape[0], baseline_method, (" with neuropil coefficient %g" % neuropil_coefficient) if neuropil_coefficient else "", float(np.median(dff))),
        "metrics": {"n_rois": dff.shape[1], "n_frames": dff.shape[0], "frame_rate_hz": fs, "median_dff": float(np.median(dff)), "mean_f0": float(F0.mean()), "max_dff": float(dff.max())},
        "data": {"warnings": warnings, "dff_path": dpath},
        "outputs": [{"path": dpath, "kind": "table", "name": "dF/F traces"}] + _plot_outputs(heat, "dF/F heatmap") + _plot_outputs(trc, "dF/F traces"),
        "table": _table(dpath, cols, rows),
    }


def _oasis_ar1(y, g, lam):
    T = len(y)
    v = [y[0] - lam * (1 - g)]
    w = [1.0]
    st = [0]
    ln = [1]
    for t in range(1, T):
        v.append(y[t] - lam * (1.0 if t == T - 1 else (1 - g)))
        w.append(1.0)
        st.append(t)
        ln.append(1)
        while len(v) > 1 and v[-2] / w[-2] * g ** ln[-2] > v[-1] / w[-1]:
            lp = ln[-2]
            v[-2] += v[-1] * g ** lp
            w[-2] += w[-1] * g ** (2 * lp)
            ln[-2] += ln[-1]
            v.pop()
            w.pop()
            st.pop()
            ln.pop()
    c = np.empty(T)
    for j in range(len(v)):
        val = v[j] / w[j]
        if j == 0 and val < 0:
            val = 0.0
        c[st[j]:st[j] + ln[j]] = val * g ** np.arange(ln[j])
    s = c.copy()
    s[0] = 0.0
    s[1:] -= g * c[:-1]
    return c, s


def _noise_sd_diff(y):
    d = np.diff(y)
    return MAD_TO_SD * float(np.median(np.abs(d - np.median(d)))) / math.sqrt(2.0)


def _oasis_constrained(y, g, sn):
    target = sn * sn * len(y)
    c, s = _oasis_ar1(y, g, 0.0)
    if float(np.sum((y - c) ** 2)) >= target:
        return c, s, 0.0
    lo, hi = 0.0, max(sn, 1e-9)
    for _ in range(60):
        c, s = _oasis_ar1(y, g, hi)
        if float(np.sum((y - c) ** 2)) > target:
            break
        lo, hi = hi, hi * 2
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        c, s = _oasis_ar1(y, g, mid)
        if float(np.sum((y - c) ** 2)) > target:
            hi = mid
        else:
            lo = mid
    c, s = _oasis_ar1(y, g, lo)
    return c, s, lo


def _cross_up(y, t, level, start, stop):
    for i in range(start + 1, stop + 1):
        if y[i] >= level > y[i - 1]:
            return t[i - 1] + (level - y[i - 1]) / (y[i] - y[i - 1]) * (t[i] - t[i - 1])
        if y[i - 1] >= level and i - 1 == start:
            return t[start]
    return float("nan")


def _cross_down(y, t, level, start, stop):
    for i in range(start + 1, stop + 1):
        if y[i] <= level < y[i - 1]:
            return t[i - 1] + (y[i - 1] - level) / (y[i - 1] - y[i]) * (t[i] - t[i - 1])
    return float("nan")


def _threshold_events(y, t, fs, k, min_frames):
    med = float(np.median(y))
    sd = MAD_TO_SD * float(np.median(np.abs(y - med)))
    thr = med + k * sd
    lab, n_lab = ndi.label(y > med + 0.5 * (thr - med))
    runs = []
    for i in range(1, n_lab + 1):
        idx = np.where(lab == i)[0]
        if (y[idx] > thr).sum() >= min_frames:
            runs.append((int(idx[0]), int(idx[-1]) + 1))
    events, prev_end = [], 0
    search = int(round(2.0 * fs))
    for n, (a, b) in enumerate(runs):
        p = a + int(np.argmax(y[a:b]))
        lo = max(prev_end, a - search)
        s0 = lo + int(np.argmin(y[lo:p + 1]))
        base = float(y[s0])
        amp = float(y[p]) - base
        nxt = runs[n + 1][0] if n + 1 < len(runs) else len(y) - 1
        rise_lo = _cross_up(y, t, base + 0.1 * amp, s0, p)
        rise_hi = _cross_up(y, t, base + 0.9 * amp, s0, p)
        half = _cross_down(y, t, base + 0.5 * amp, p, nxt)
        events.append({
            "onset_s": float(t[a]), "peak_s": float(t[p]), "peak_dff": float(y[p]), "amplitude": amp,
            "area": float(np.trapezoid(y[a:b] - base, t[a:b])) if b - a > 1 else float((y[a] - base) / fs),
            "rise_10_90_s": rise_hi - rise_lo if np.isfinite(rise_lo) and np.isfinite(rise_hi) else float("nan"),
            "decay_half_s": half - t[p] if np.isfinite(half) else float("nan"),
        })
        prev_end = b
    return events, thr, sd


def _read_times(value, label):
    if value is None or value == "":
        return []
    if isinstance(value, (list, tuple)):
        try:
            return [float(v) for v in value]
        except (TypeError, ValueError):
            _fail("%s has a value that is not a number: %r" % (label, value))
    s = str(value)
    if Path(s).is_file():
        with open(s, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.reader(f))
        head = [h.strip().lower() for h in rows[0]] if rows else []
        col = 0
        for nme in ("onset_s", "time_s", "time", "spike_time_s"):
            if nme in head:
                col = head.index(nme)
                break
        out = []
        for r in rows[1:] if head and not re.fullmatch(r"-?[\d.eE+-]+", head[0]) else rows:
            try:
                out.append(float(r[col]))
            except (ValueError, IndexError):
                _fail("%s: the file %s has a value that is not a number in column %d" % (label, s, col + 1))
        return out
    try:
        return [float(v) for v in re.split(r"[,;\s]+", s.strip()) if v]
    except ValueError:
        _fail("%s is %r. Give times in seconds as a list, as text like 10, 40, 70, or the path of a CSV file" % (label, s))


def _match(truth, found, tol):
    found = sorted(found)
    used = set()
    n = 0
    for tt in sorted(truth):
        best, bd = None, tol + 1e-12
        for i, ff in enumerate(found):
            if i in used:
                continue
            dd = abs(ff - tt)
            if dd <= bd:
                best, bd = i, dd
        if best is not None:
            used.add(best)
            n += 1
    return n


def detect_events(traces, method, frame_rate=0.0, time_column="", rois="", threshold_sd=0.0, min_duration_s=0.0, decay_tau_s=0.0, truth_times="", truth_tolerance_s=0.5):
    rec = _load_traces(traces, frame_rate, time_column, rois)
    X, t, fs, names = rec["X"], rec["t"], rec["fs"], rec["names"]
    if not threshold_sd or threshold_sd <= 0:
        _fail("threshold_sd is %s. Give the event threshold in standard deviations of the noise, above 0" % threshold_sd)
    if method not in ("threshold", "oasis"):
        _fail("method is %r. Use threshold or oasis" % method)
    if method == "oasis":
        if not decay_tau_s or decay_tau_s <= 0:
            _fail("decay_tau_s is %s. OASIS needs the decay time constant of the indicator in seconds, above 0" % decay_tau_s)
        g = math.exp(-1.0 / (fs * decay_tau_s))
    min_frames = max(1, int(round(min_duration_s * fs)))
    ev_rows, roi_rows, den = [], [], np.zeros_like(X)
    dur = X.shape[0] / fs
    all_times = []
    for k, nme in enumerate(names):
        y = X[:, k]
        if method == "threshold":
            evs, thr, sd = _threshold_events(y, t, fs, threshold_sd, min_frames)
            for e in evs:
                ev_rows.append([nme, _num(e["onset_s"]), _num(e["peak_s"]), _num(e["peak_dff"]), _num(e["amplitude"]), _num(e["area"]), _num(e["rise_10_90_s"]), _num(e["decay_half_s"])])
            times = [e["onset_s"] for e in evs]
            amps = [e["amplitude"] for e in evs]
            areas = [e["area"] for e in evs]
            rises = [e["rise_10_90_s"] for e in evs if np.isfinite(e["rise_10_90_s"])]
            decs = [e["decay_half_s"] for e in evs if np.isfinite(e["decay_half_s"])]
            noise = sd
        else:
            sn = _noise_sd_diff(y)
            if sn <= 0:
                _fail("the trace %s has no noise estimate (it is constant or steps only). OASIS cannot find a penalty" % nme)
            c, s, lam = _oasis_constrained(y, g, sn)
            den[:, k] = c
            smin = threshold_sd * sn
            idx = np.where(s > smin)[0]
            for i in idx:
                ev_rows.append([nme, _num(t[i]), _num(t[i]), "", _num(s[i]), "", "", ""])
            times = [float(t[i]) for i in idx]
            amps = [float(s[i]) for i in idx]
            areas, rises, decs = [], [], []
            noise = sn
        all_times.append(times)
        roi_rows.append([nme, len(times), _num(len(times) / dur), _num(np.mean(amps)) if amps else "", _num(np.median(amps)) if amps else "", _num(np.mean(areas)) if areas else "", _num(np.mean(rises)) if rises else "", _num(np.mean(decs)) if decs else "", _num(noise)])
    base = _stem(traces) if not Path(traces).is_dir() else Path(traces).resolve().parent.name + "_suite2p"
    suffix = "_events_" + method
    epath, rpath = os.path.abspath(base + suffix + ".csv"), os.path.abspath(base + suffix + "_per_roi.csv")
    ecols = ["roi", "time_s", "peak_s", "peak_dff", "amplitude", "area", "rise_10_90_s", "decay_half_s"]
    rcols = ["roi", "n_events", "event_rate_hz", "mean_amplitude", "median_amplitude", "mean_area", "mean_rise_10_90_s", "mean_decay_half_s", "noise_sd"]
    _write_csv(epath, ecols, ev_rows)
    _write_csv(rpath, rcols, roi_rows)
    fig, ax = plt.subplots(figsize=(7, 0.5 + min(8, 0.12 * len(names) + 1.2)))
    for k, times in enumerate(all_times):
        ax.vlines(times, k + 0.1, k + 0.9, color="black", lw=0.6)
    ax.set_ylim(len(names), 0)
    ax.set_xlim(t[0], t[-1])
    ax.set_xlabel("time (s)")
    ax.set_ylabel("ROI")
    ax.spines[["top", "right"]].set_visible(False)
    raster = _save_plot(fig, os.path.abspath(base + suffix + "_raster"))
    total = len(ev_rows)
    rates = [r[2] for r in roi_rows if r[2] != ""]
    metrics = {"n_rois": len(names), "n_events": total, "duration_s": dur, "mean_event_rate_hz": float(np.mean(rates)) if rates else 0.0, "n_silent_rois": int(sum(1 for r in roi_rows if r[1] == 0))}
    amps_all = [float(r[4]) for r in ev_rows if r[4] != ""]
    if amps_all:
        metrics["mean_amplitude"] = float(np.mean(amps_all))
    if method == "threshold":
        for key, col in (("mean_area", 5), ("mean_rise_10_90_s", 6), ("mean_decay_half_s", 7)):
            vals = [float(r[col]) for r in ev_rows if r[col] != ""]
            if vals:
                metrics[key] = float(np.mean(vals))
    extra = ""
    truth = _read_times(truth_times, "truth_times")
    if truth:
        if len(names) != 1:
            _fail("truth_times compares one trace, but the file has %d traces. Give one name in rois" % len(names))
        matched = _match(truth, all_times[0], truth_tolerance_s)
        metrics.update({"n_truth": len(truth), "n_matched": matched, "sensitivity": matched / len(truth), "precision": matched / len(all_times[0]) if all_times[0] else 0.0})
        extra = " Against %d reference spikes (tolerance %.3g s): sensitivity %.3f, precision %.3f." % (len(truth), truth_tolerance_s, metrics["sensitivity"], metrics["precision"])
    warn = []
    if method == "oasis" and decay_tau_s * fs < 1.5:
        warn.append("The decay time constant is shorter than 1.5 frames. The AR(1) model cannot separate events at this frame rate.")
    if fs < 3 and method == "threshold":
        warn.append("The frame rate is below 3 Hz. Rise times are not resolved.")
    return {
        "ok": True,
        "summary": "%d event(s) in %d trace(s) by %s, %.1f s. Mean rate %.4f Hz.%s" % (total, len(names), method, dur, metrics["mean_event_rate_hz"], extra),
        "metrics": metrics,
        "data": {"warnings": rec["warnings"] + warn, "events_path": epath},
        "outputs": [{"path": epath, "kind": "table", "name": "events"}, {"path": rpath, "kind": "table", "name": "per-ROI event summary"}] + _plot_outputs(raster, "event raster"),
        "table": _table(rpath, rcols, roi_rows),
    }


def find_responsive_cells(traces, stimulus_onsets_s, response_window_s, pre_window_s, z_criterion, frame_rate=0.0, time_column="", rois="", response_delay_s=0.0, direction="increase", min_trial_fraction=0.0):
    rec = _load_traces(traces, frame_rate, time_column, rois)
    X, t, fs, names = rec["X"], rec["t"], rec["fs"], rec["names"]
    onsets = _read_times(stimulus_onsets_s, "stimulus_onsets_s")
    if not onsets:
        _fail("stimulus_onsets_s is empty. Give the stimulus onset times in seconds")
    for nme, v in (("response_window_s", response_window_s), ("pre_window_s", pre_window_s)):
        if not v or v <= 0:
            _fail("%s is %s. Give a window length in seconds, above 0" % (nme, v))
    if direction not in ("increase", "decrease", "either"):
        _fail("direction is %r. Use increase, decrease or either" % direction)
    n_pre, n_resp = max(1, int(round(pre_window_s * fs))), max(1, int(round(response_window_s * fs)))
    pre_idx, resp_idx = [], []
    for o in onsets:
        i0 = int(round((o - t[0]) * fs))
        r0 = int(round((o + response_delay_s - t[0]) * fs))
        if i0 - n_pre >= 0 and r0 + n_resp <= X.shape[0]:
            pre_idx.append(i0 - n_pre)
            resp_idx.append(r0)
    if not pre_idx:
        _fail("no stimulus onset has both a %g s pre-stimulus window and a %g s response window inside the %.1f s recording" % (pre_window_s, response_window_s, X.shape[0] / fs))
    dropped = len(onsets) - len(pre_idx)
    rows, zs = [], []
    for k, nme in enumerate(names):
        y = X[:, k]
        pre = np.array([y[a:a + n_pre] for a in pre_idx])
        resp = np.array([y[a:a + n_resp] for a in resp_idx])
        sd = float(np.std((pre - pre.mean(axis=1, keepdims=True)).ravel(), ddof=1))
        diff_trial = resp.mean(axis=1) - pre.mean(axis=1)
        if sd <= 0:
            z, ztr = float("nan"), np.full(len(diff_trial), np.nan)
        else:
            z, ztr = float(diff_trial.mean() / sd), diff_trial / sd
        zs.append(z)
        sign = {"increase": ztr, "decrease": -ztr, "either": np.abs(ztr)}[direction]
        frac = float(np.mean(sign > z_criterion)) if np.isfinite(sign).all() else float("nan")
        zc = {"increase": z, "decrease": -z, "either": abs(z)}[direction]
        responsive = bool(np.isfinite(zc) and zc > z_criterion and (min_trial_fraction <= 0 or frac >= min_trial_fraction))
        rows.append([nme, _num(z), _num(resp.mean()), _num(pre.mean()), len(pre_idx), _num(frac), int(responsive)])
    cols = ["roi", "z_score", "mean_response_dff", "mean_pre_dff", "trials_used", "fraction_trials_over_criterion", "responsive"]
    base = _stem(traces) if not Path(traces).is_dir() else Path(traces).resolve().parent.name + "_suite2p"
    rpath = os.path.abspath(base + "_responsive.csv")
    _write_csv(rpath, cols, rows)
    n_resp_cells = int(sum(r[6] for r in rows))
    order = np.argsort(-np.nan_to_num(np.array(zs), nan=-1e9))
    span = n_pre + n_resp
    psth = np.array([np.mean([X[a:a + span, k] for a in pre_idx], axis=0) for k in range(len(names))])
    tt = (np.arange(span) - n_pre) / fs
    fig, ax = plt.subplots(figsize=(6, 0.8 + min(8, 0.12 * len(names) + 1.2)))
    im = ax.imshow(psth[order], aspect="auto", cmap="viridis", extent=[tt[0], tt[-1], len(names), 0], interpolation="nearest")
    ax.axvline(0, color="white", lw=0.8)
    ax.set_xlabel("time from stimulus onset (s)")
    ax.set_ylabel("ROI, sorted by z score")
    fig.colorbar(im, ax=ax, label="dF/F (fraction)")
    plot = _save_plot(fig, os.path.abspath(base + "_responsive_psth"))
    frac_resp = n_resp_cells / len(names)
    note = " %d onset(s) left out because a window leaves the recording." % dropped if dropped else ""
    return {
        "ok": True,
        "summary": "%d of %d cells respond (fraction %.4f; z above %g, %s, %d trial(s)).%s" % (n_resp_cells, len(names), frac_resp, z_criterion, direction, len(pre_idx), note),
        "metrics": {"n_rois": len(names), "n_responsive": n_resp_cells, "fraction_responsive": frac_resp, "n_trials_used": len(pre_idx), "n_trials_dropped": dropped},
        "data": {"warnings": rec["warnings"]},
        "outputs": [{"path": rpath, "kind": "table", "name": "responsive cells"}] + _plot_outputs(plot, "stimulus-aligned heatmap"),
        "table": _table(rpath, cols, rows),
    }


def correlate_cells(traces, frame_rate=0.0, time_column="", rois="", bin_s=0.0):
    rec = _load_traces(traces, frame_rate, time_column, rois)
    X, fs, names = rec["X"], rec["fs"], rec["names"]
    if X.shape[1] < 2:
        _fail("pairwise correlation needs at least 2 traces. The file %s gives %d" % (traces, X.shape[1]))
    if bin_s and bin_s > 0:
        nb = int(round(bin_s * fs))
        if nb > 1:
            m = (X.shape[0] // nb) * nb
            X = X[:m].reshape(m // nb, nb, -1).mean(axis=1)
    sd = X.std(axis=0)
    if (sd == 0).any():
        _fail("the trace(s) %s are constant. A correlation is not defined" % ", ".join(np.array(names)[sd == 0][:5]))
    R = np.corrcoef(X.T)
    iu = np.triu_indices(len(names), 1)
    pairs = R[iu]
    base = _stem(traces) if not Path(traces).is_dir() else Path(traces).resolve().parent.name + "_suite2p"
    mpath = os.path.abspath(base + "_correlation.csv")
    _write_csv(mpath, ["roi"] + names, [[names[i]] + [repr(float(v)) for v in R[i]] for i in range(len(names))])
    per = [[names[i], _num((R[i].sum() - 1) / (len(names) - 1))] for i in range(len(names))]
    ppath = os.path.abspath(base + "_correlation_per_roi.csv")
    _write_csv(ppath, ["roi", "mean_correlation_with_others"], per)
    fig, ax = plt.subplots(figsize=(5.5, 4.5))
    im = ax.imshow(R, cmap="viridis", vmin=-1, vmax=1, interpolation="nearest")
    ax.set_xlabel("ROI")
    ax.set_ylabel("ROI")
    fig.colorbar(im, ax=ax, label="Pearson r")
    plot = _save_plot(fig, os.path.abspath(base + "_correlation"))
    return {
        "ok": True,
        "summary": "%d pairs of %d traces. Mean pairwise r %.4f, median %.4f." % (len(pairs), len(names), float(pairs.mean()), float(np.median(pairs))),
        "metrics": {"n_rois": len(names), "n_pairs": len(pairs), "mean_pairwise_r": float(pairs.mean()), "median_pairwise_r": float(np.median(pairs)), "max_pairwise_r": float(pairs.max()), "min_pairwise_r": float(pairs.min()), "bin_frames": int(round(bin_s * fs)) if bin_s else 1},
        "data": {"warnings": rec["warnings"]},
        "outputs": [{"path": mpath, "kind": "table", "name": "correlation matrix"}, {"path": ppath, "kind": "table", "name": "mean correlation of each ROI"}] + _plot_outputs(plot, "correlation matrix"),
        "table": _table(ppath, ["roi", "mean_correlation_with_others"], per),
    }


def _icc1(groups):
    k = [len(g) for g in groups if len(g) > 0]
    n = sum(k)
    a = len(k)
    if a < 2 or n <= a:
        return float("nan"), float("nan")
    allv = np.concatenate([np.asarray(g, float) for g in groups])
    gm = allv.mean()
    ssb = sum(len(g) * (np.mean(g) - gm) ** 2 for g in groups)
    ssw = sum(((np.asarray(g) - np.mean(g)) ** 2).sum() for g in groups)
    msb, msw = ssb / (a - 1), ssw / (n - a)
    n0 = (n - sum(x * x for x in k) / n) / (a - 1)
    icc = (msb - msw) / (msb + (n0 - 1) * msw) if (msb + (n0 - 1) * msw) > 0 else float("nan")
    return float(icc), float(n / a)


def _test(groups, test):
    if len(groups) == 2:
        if test == "rank":
            r = stats.mannwhitneyu(groups[0], groups[1], alternative="two-sided")
            return "Mann-Whitney U", float(r.statistic), float(r.pvalue)
        r = stats.ttest_ind(groups[0], groups[1], equal_var=False)
        return "Welch t", float(r.statistic), float(r.pvalue)
    if test == "rank":
        r = stats.kruskal(*groups)
        return "Kruskal-Wallis H", float(r.statistic), float(r.pvalue)
    return ("Welch ANOVA F",) + _welch_anova(groups)


def _welch_anova(groups):
    g = [np.asarray(x, float) for x in groups]
    k = len(g)
    n = np.array([len(x) for x in g], float)
    m = np.array([x.mean() for x in g])
    w = n / np.array([x.var(ddof=1) for x in g])
    mw = (w * m).sum() / w.sum()
    tmp = (((1 - w / w.sum()) ** 2) / (n - 1)).sum()
    f = ((w * (m - mw) ** 2).sum() / (k - 1)) / (1 + 2 * (k - 2) / (k * k - 1) * tmp)
    return float(f), float(stats.f.sf(f, k - 1, (k * k - 1) / (3 * tmp)))


def compare_groups(table, group_column, animal_column, value_column, field_column="", test="welch"):
    _check_file(table, "table")
    with open(table, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        _fail("the table %s has no rows" % table)
    cols = list(rows[0].keys())
    for c in [group_column, animal_column, value_column] + ([field_column] if field_column else []):
        if c not in cols:
            _fail("the table %s has no column %s. Its columns are: %s" % (table, c, ", ".join(cols)))
    if test not in ("welch", "rank"):
        _fail("test is %r. Use welch or rank" % test)
    cells = []
    skipped = 0
    for r in rows:
        try:
            v = float(r[value_column])
        except (ValueError, TypeError):
            skipped += 1
            continue
        if not math.isfinite(v):
            skipped += 1
            continue
        cells.append((str(r[group_column]), str(r[animal_column]), str(r[field_column]) if field_column else "", v))
    glist = sorted({c[0] for c in cells})
    if len(glist) < 2:
        _fail("the column %s has %d group(s) with a number in %s. A comparison needs at least 2" % (group_column, len(glist), value_column))
    animal_groups = {}
    for g, a, _f, _v in cells:
        animal_groups.setdefault(a, set()).add(g)
    mixed = [a for a, gs in animal_groups.items() if len(gs) > 1]
    if mixed:
        _fail("the animal(s) %s appear in more than one group. The tool compares groups of different animals. Use a paired or mixed model for within-animal designs" % ", ".join(mixed[:5]))
    animal_means = {}
    for g in glist:
        by_a = {}
        for gg, a, fld, v in cells:
            if gg == g:
                by_a.setdefault(a, {}).setdefault(fld, []).append(v)
        animal_means[g] = {a: float(np.mean([np.mean(vs) for vs in flds.values()])) for a, flds in by_a.items()}
    short = [g for g in glist if len(animal_means[g]) < 2]
    if short:
        _fail("the group(s) %s have fewer than 2 animals. The unit of replication is the animal, so a test needs at least 2 animals in each group" % ", ".join(short))
    a_groups = [list(animal_means[g].values()) for g in glist]
    c_groups = [[v for gg, _a, _f, v in cells if gg == g] for g in glist]
    name, stat, p_animal = _test(a_groups, test)
    _, _, p_cell = _test(c_groups, test)
    iccs = []
    for g in glist:
        ga = {}
        for gg, a, _f, v in cells:
            if gg == g:
                ga.setdefault(a, []).append(v)
        iccs.append(_icc1(list(ga.values())))
    icc = float(np.nanmean([i[0] for i in iccs]))
    mcell = float(np.mean([i[1] for i in iccs]))
    deff = 1 + (mcell - 1) * max(icc, 0.0) if math.isfinite(icc) else float("nan")
    out_rows = []
    for g, ag, cg in zip(glist, a_groups, c_groups):
        out_rows.append([g, len(ag), len(cg), _num(np.mean(ag)), _num(np.std(ag, ddof=1)), _num(np.mean(cg)), _num(np.std(cg, ddof=1)) if len(cg) > 1 else ""])
    cols_out = ["group", "n_animals", "n_cells", "mean_of_animal_means", "sd_of_animal_means", "mean_of_cells", "sd_of_cells"]
    base = _stem(table)
    gpath = os.path.abspath(base + "_group_summary.csv")
    _write_csv(gpath, cols_out, out_rows)
    apath = os.path.abspath(base + "_animal_means.csv")
    _write_csv(apath, ["group", "animal", "mean_value"], [[g, a, _num(m)] for g in glist for a, m in animal_means[g].items()])
    fig, ax = plt.subplots(figsize=(1.4 + 1.1 * len(glist), 3.6))
    rng = np.random.default_rng(1)
    for i, g in enumerate(glist):
        ax.scatter(i + rng.uniform(-0.18, 0.18, len(c_groups[i])), c_groups[i], s=6, color=GREY, alpha=0.6, linewidths=0)
        ax.scatter([i] * len(a_groups[i]), a_groups[i], s=36, color=BLUE, zorder=3)
    ax.set_xticks(range(len(glist)))
    ax.set_xticklabels(glist)
    ax.set_ylabel(value_column)
    ax.spines[["top", "right"]].set_visible(False)
    plot = _save_plot(fig, os.path.abspath(base + "_groups"))
    formula = "%s ~ %s + (1 | %s)" % (value_column, group_column, animal_column) + (" with (1 | %s/%s) for fields in animals" % (animal_column, field_column) if field_column else "")
    notes = [
        "Cells in one animal are not independent. The test above uses the mean of each animal (n = %s animals)." % " and ".join(str(len(a)) for a in a_groups),
        "The cell-level p value %.4g treats every cell as independent. Do not report it. It is shown to show the size of the pseudoreplication." % p_cell,
        "For a mixed model that keeps every cell, use the lme4 adapter: %s." % formula,
    ]
    if skipped:
        notes.append("%d row(s) with no number in %s were left out." % (skipped, value_column))
    return {
        "ok": True,
        "summary": "%s on animal means: statistic %.4g, p %.4g (%s animals). Cell-level p %.4g is not valid. ICC %.3f, design effect %.2f." % (name, stat, p_animal, " vs ".join(str(len(a)) for a in a_groups), p_cell, icc, deff),
        "metrics": {"n_groups": len(glist), "p_animal_level": p_animal, "statistic": stat, "p_cell_level_not_valid": p_cell, "icc": icc, "design_effect": deff, "n_animals": sum(len(a) for a in a_groups), "n_cells": sum(len(c) for c in c_groups)},
        "data": {"test": name, "notes": notes, "mixed_model_formula": formula},
        "outputs": [{"path": gpath, "kind": "table", "name": "group summary"}, {"path": apath, "kind": "table", "name": "animal means"}] + _plot_outputs(plot, "groups"),
        "table": _table(gpath, cols_out, out_rows),
    }


SUITE2P_SCRIPT = r"""
import json, sys
import suite2p
args = json.load(open(sys.argv[1]))
settings = suite2p.default_settings()
settings["fs"] = args["fs"]
settings["tau"] = args["tau"]
settings["diameter"] = [args["diameter"], args["diameter"]]
settings["torch_device"] = "cpu"
settings["io"]["delete_bin"] = True
settings["run"]["do_registration"] = 0 if args["registration"] == "none" else 1
settings["registration"]["nonrigid"] = args["registration"] == "nonrigid"
settings["run"]["do_detection"] = 1
db = {"data_path": [args["data_dir"]], "save_path0": args["save_dir"], "nplanes": 1, "nchannels": 1}
suite2p.run_s2p(settings=settings, db=db)
"""


def _find_suite2p_python(explicit):
    cands = [explicit] if explicit else [os.environ.get("CUVETTE_SUITE2P_PYTHON", ""), os.path.expanduser("~/.cuvette/envs/suite2p/bin/python"), os.path.expanduser("~/.cuvette/envs/suite2p/Scripts/python.exe"), os.path.expanduser("~/.guided-analysis/envs/suite2p/bin/python")]
    for c in cands:
        if c and Path(c).is_file():
            return c
    return ""


def run_suite2p(stack="", existing_folder="", frame_rate=0.0, tau_s=0.0, diameter_px=0.0, registration="rigid", iscell_threshold=0.5, suite2p_python=""):
    if existing_folder:
        folder = Path(existing_folder)
        if not folder.exists():
            _fail("existing_folder not found: %s" % existing_folder)
    else:
        if not stack:
            _fail("give stack (a TIFF file) to run Suite2p, or existing_folder to read a finished run")
        _check_file(stack, "image stack")
        for nme, v in (("frame_rate", frame_rate), ("tau_s", tau_s), ("diameter_px", diameter_px)):
            if not v or v <= 0:
                _fail("%s is %s. Suite2p needs a value above 0" % (nme, v))
        if registration not in ("none", "rigid", "nonrigid"):
            _fail("registration is %r. Use none, rigid or nonrigid" % registration)
        py = _find_suite2p_python(suite2p_python)
        if not py:
            _fail("Suite2p is not installed. The tool looks for an interpreter in suite2p_python, in CUVETTE_SUITE2P_PYTHON and in ~/.cuvette/envs/suite2p. Install Suite2p only after you approve it: uv venv ~/.cuvette/envs/suite2p && uv pip install --python ~/.cuvette/envs/suite2p/bin/python suite2p")
        chk = subprocess.run([py, "-I", "-c", "import suite2p"], capture_output=True, text=True)
        if chk.returncode != 0:
            _fail("the interpreter %s cannot import suite2p (exit code %d): %s" % (py, chk.returncode, chk.stderr.strip()[-300:] or "no message"))
        work = Path(tempfile.mkdtemp(prefix="suite2p_", dir=os.getcwd()))
        data_dir = work / "data"
        data_dir.mkdir()
        os.symlink(os.path.abspath(stack), data_dir / Path(stack).name)
        save_dir = work / "out"
        cfg = work / "args.json"
        cfg.write_text(json.dumps({"fs": frame_rate, "tau": tau_s, "diameter": diameter_px, "registration": registration, "data_dir": str(data_dir), "save_dir": str(save_dir)}))
        runp = subprocess.run([py, "-I", "-c", SUITE2P_SCRIPT, str(cfg)], capture_output=True, text=True)
        if runp.returncode != 0:
            _fail("Suite2p stopped on %s with exit code %d: %s" % (stack, runp.returncode, (runp.stderr.strip() or runp.stdout.strip())[-500:] or "no message"))
        folder = save_dir / "suite2p"
    F, names = _load_suite2p(folder, "F", iscell_threshold)
    Fn, _ = _load_suite2p(folder, "Fneu", iscell_threshold)
    plane = folder if (folder / "F.npy").exists() else folder / "plane0"
    ops_fs = 0.0
    ops_file = plane / "ops.npy"
    if ops_file.exists():
        ops = np.load(ops_file, allow_pickle=True).item()
        ops_fs = float(ops.get("fs", ops.get("settings", {}).get("fs", 0.0)) or 0.0)
    fs = float(frame_rate) if frame_rate and frame_rate > 0 else ops_fs
    if fs <= 0:
        _fail("the frame rate is unknown. Give frame_rate in Hz; the folder %s has no ops.npy with fs" % folder)
    t = np.arange(F.shape[0]) / fs
    base = (_stem(stack) if stack else "suite2p_run") + "_suite2p"
    fpath, npath = os.path.abspath(base + "_F.csv"), os.path.abspath(base + "_Fneu.csv")
    _write_traces(fpath, t, F, names)
    _write_traces(npath, t, Fn, names)
    total = np.load(plane / "F.npy", allow_pickle=False).shape[0]
    return {
        "ok": True,
        "summary": "%d of %d detected ROIs kept (cell probability at least %g), %d frames at %.4g Hz." % (F.shape[1], total, iscell_threshold, F.shape[0], fs),
        "metrics": {"n_rois_kept": F.shape[1], "n_rois_detected": total, "n_frames": F.shape[0], "frame_rate_hz": fs},
        "data": {"plane_folder": str(plane)},
        "outputs": [{"path": fpath, "kind": "table", "name": "Suite2p fluorescence"}, {"path": npath, "kind": "table", "name": "Suite2p neuropil"}],
        "table": _table(fpath, ["time_s"] + names[:5], [[_num(t[i])] + [_num(F[i, j]) for j in range(min(5, F.shape[1]))] for i in range(min(12, F.shape[0]))]),
    }
