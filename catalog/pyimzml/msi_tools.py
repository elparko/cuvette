import os
import struct
import zlib

import numpy as np
from pyimzml.ImzMLParser import ImzMLParser

_parsers = {}

_VIRIDIS = np.array(
    [(68, 1, 84), (71, 44, 122), (59, 81, 139), (44, 113, 142), (33, 144, 141), (39, 173, 129), (92, 200, 99), (170, 220, 50), (253, 231, 37)],
    dtype=float,
)

NORMS = ("none", "tic", "rms")
REDUCERS = ("sum", "max", "mean")


def _parser(path):
    path = os.path.abspath(os.path.expanduser(path))
    if not path.lower().endswith(".imzml"):
        raise ValueError("path must be an .imzML file, got %s" % path)
    ibd = path[:-6] + ".ibd"
    for f in (path, ibd):
        if not os.path.isfile(f):
            raise FileNotFoundError("file not found: %s" % f)
    key = (path, os.path.getmtime(path))
    if key not in _parsers:
        _parsers.clear()
        _parsers[key] = ImzMLParser(path)
    return _parsers[key]


def _grid(p):
    xs = max(c[0] for c in p.coordinates)
    ys = max(c[1] for c in p.coordinates)
    d = p.imzmldict
    return int(max(xs, d.get("max count of pixels x", 0))), int(max(ys, d.get("max count of pixels y", 0)))


def _is_continuous(p):
    return len(set(p.mzOffsets)) == 1


def _read_ints(p, i):
    p.m.seek(p.intensityOffsets[i])
    n = p.intensityLengths[i]
    return np.frombuffer(p.m.read(n * p.sizeDict[p.intensityPrecision]), dtype=p.intensityPrecision).astype(np.float64)


def _read_mz(p, i):
    p.m.seek(p.mzOffsets[i])
    n = p.mzLengths[i]
    return np.frombuffer(p.m.read(n * p.sizeDict[p.mzPrecision]), dtype=p.mzPrecision).astype(np.float64)


def _norm_factor(ints, norm):
    if norm == "tic":
        return ints.sum()
    if norm == "rms":
        return float(np.sqrt(np.mean(ints**2))) if ints.size else 0.0
    return 1.0


def _check_norm(norm):
    if norm not in NORMS:
        raise ValueError("normalization must be one of %s" % ", ".join(NORMS))


def _sample_indices(n, max_pixels):
    if not max_pixels or max_pixels >= n:
        return np.arange(n)
    return np.unique(np.linspace(0, n - 1, int(max_pixels)).round().astype(int))


def _mz_range(p, max_scan=200):
    idx = [0] if _is_continuous(p) else _sample_indices(len(p.coordinates), max_scan)
    lo, hi = np.inf, -np.inf
    for i in idx:
        mz = _read_mz(p, i)
        if mz.size:
            lo, hi = min(lo, mz.min()), max(hi, mz.max())
    return float(lo), float(hi), len(idx)


def _colorize(img, vmin, vmax):
    out = np.zeros(img.shape + (3,), dtype=np.uint8)
    out[:] = 24
    ok = np.isfinite(img)
    span = vmax - vmin if vmax > vmin else 1.0
    t = np.clip((img[ok] - vmin) / span, 0, 1) * (len(_VIRIDIS) - 1)
    lo = np.floor(t).astype(int).clip(0, len(_VIRIDIS) - 2)
    f = (t - lo)[:, None]
    out[ok] = (_VIRIDIS[lo] * (1 - f) + _VIRIDIS[lo + 1] * f).round().astype(np.uint8)
    return out


def _write_png(path, img):
    scale = max(1, 480 // max(img.shape))
    big = np.repeat(np.repeat(img, scale, axis=0), scale, axis=1)
    h, w = big.shape[:2]
    raw = b"".join(b"\x00" + big[r].tobytes() for r in range(h))

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)))
        f.write(chunk(b"IDAT", zlib.compress(raw, 6)))
        f.write(chunk(b"IEND", b""))


def _write_tiff(path, img):
    data = np.nan_to_num(img, nan=0.0).astype("<f4")
    h, w = data.shape
    entries = [
        (256, 4, 1, w),
        (257, 4, 1, h),
        (258, 3, 1, 32),
        (259, 3, 1, 1),
        (262, 3, 1, 1),
        (273, 4, 1, 8 + 2 + 10 * 12 + 4),
        (277, 3, 1, 1),
        (278, 4, 1, h),
        (279, 4, 1, data.nbytes),
        (339, 3, 1, 3),
    ]
    with open(path, "wb") as f:
        f.write(b"II" + struct.pack("<HI", 42, 8))
        f.write(struct.pack("<H", len(entries)))
        for tag, typ, count, val in entries:
            f.write(struct.pack("<HHII", tag, typ, count, val))
        f.write(struct.pack("<I", 0))
        f.write(data.tobytes())


def _write_csv(path, header, rows):
    with open(path, "w", encoding="utf-8") as f:
        f.write(",".join(header) + "\n")
        for r in rows:
            f.write(",".join(repr(float(v)) if isinstance(v, (float, np.floating)) else str(v) for v in r) + "\n")


def _out(name):
    return os.path.join(os.getcwd(), name)


def _files(*paths):
    return [{"path": p, "kind": "image" if p.endswith((".png", ".tif")) else "table", "name": os.path.basename(p)} for p in paths]


def _top_pixels(p, img, n=10):
    flat = np.where(np.isfinite(img), img, -np.inf).ravel()
    order = np.argsort(-flat, kind="stable")[:n]
    rows = []
    for k in order:
        if not np.isfinite(flat[k]):
            continue
        y, x = divmod(int(k), img.shape[1])
        rows.append([x + 1, y + 1, float(flat[k])])
    return rows


def read_file_info(path, max_scan=200, expected_polarity=None):
    p = _parser(path)
    nx, ny = _grid(p)
    n = len(p.coordinates)
    lo, hi, scanned = _mz_range(p, max_scan)
    imzml = os.path.abspath(os.path.expanduser(path))
    ibd = imzml[:-6] + ".ibd"
    storage = "continuous" if _is_continuous(p) else "processed"
    d = p.imzmldict
    pts = p.mzLengths
    metrics = {
        "n_pixels": n,
        "grid_x": nx,
        "grid_y": ny,
        "n_z": int(d["max count of pixels z"]),
        "points_per_spectrum_min": int(min(pts)),
        "points_per_spectrum_max": int(max(pts)),
        "mz_min": lo,
        "mz_max": hi,
        "n_spectra_scanned_for_range": scanned,
        "ibd_bytes": os.path.getsize(ibd),
        "imzml_bytes": os.path.getsize(imzml),
    }
    for k, name in (("pixel size x", "pixel_size_x_um"), ("pixel size y", "pixel_size_y_um")):
        if k in d:
            metrics[name] = float(d[k])
    info = {
        "storage_mode": storage,
        "spectrum_mode": p.spectrum_mode or "unknown",
        "polarity": p.polarity or "unknown",
        "mz_precision": str(p.mzPrecision),
        "intensity_precision": str(p.intensityPrecision),
        "mz_range_basis": "all spectra" if scanned == n or storage == "continuous" else "%d evenly spaced spectra" % scanned,
    }
    warning = ""
    if expected_polarity:
        match = (p.polarity or "unknown") == expected_polarity
        metrics["polarity_matches_decision"] = float(match)
        if not match:
            warning = "The file states polarity %s. The decision polarity is %s." % (info["polarity"], expected_polarity)
    rows = [[k, v] for k, v in {**{k: metrics[k] for k in ("n_pixels", "grid_x", "grid_y", "pixel_size_x_um", "mz_min", "mz_max", "points_per_spectrum_max", "ibd_bytes") if k in metrics}, **info}.items()]
    out = {
        "ok": True,
        "summary": "%d pixels (%d x %d), m/z %.4f to %.4f, %s, %s, %s storage, ibd %d bytes" % (n, nx, ny, lo, hi, info["spectrum_mode"], info["polarity"], storage, metrics["ibd_bytes"]),
        "metrics": metrics,
        "data": info,
        "table": {"columns": ["property", "value"], "rows": rows, "n_rows": len(rows)},
    }
    if warning:
        out["warning"] = warning
    return out


def _ion_image(p, mz, ppm, norm, reduce):
    nx, ny = _grid(p)
    tol = mz * ppm * 1e-6
    lo_mz, hi_mz = mz - tol, mz + tol
    raw = np.full((ny, nx), np.nan)
    nrm = np.full((ny, nx), np.nan)
    shared = _read_mz(p, 0) if _is_continuous(p) else None
    npts = []
    for i, (x, y, z) in enumerate(p.coordinates):
        if z != 1:
            continue
        mzs = shared if shared is not None else _read_mz(p, i)
        ints = _read_ints(p, i)
        a, b = np.searchsorted(mzs, lo_mz, "left"), np.searchsorted(mzs, hi_mz, "right")
        w = ints[a:b]
        npts.append(len(w))
        raw[y - 1, x - 1] = (w.sum() if reduce == "sum" else w.max() if reduce == "max" else w.mean()) if len(w) else 0.0
        nrm[y - 1, x - 1] = _norm_factor(ints, norm)
    return raw, nrm, npts, lo_mz, hi_mz


def get_ion_image(path, mz, ppm=None, normalization="none", reduce="sum", name="ion_image"):
    if ppm is None:
        raise ValueError("ppm is not set. The decision ion_ppm sets it.")
    _check_norm(normalization)
    if reduce not in REDUCERS:
        raise ValueError("reduce must be one of %s" % ", ".join(REDUCERS))
    p = _parser(path)
    raw, nrm, npts, lo_mz, hi_mz = _ion_image(p, float(mz), float(ppm), normalization, reduce)
    if normalization == "none":
        img = raw
    else:
        scale = np.nanmean(nrm)
        with np.errstate(divide="ignore", invalid="ignore"):
            img = np.where(nrm > 0, raw / nrm * scale, 0.0)
        img = np.where(np.isnan(raw), np.nan, img)
    vals = img[np.isfinite(img)]
    vmax = float(vals.max()) if vals.size else 0.0
    png, tif, csv = _out(name + ".png"), _out(name + ".tif"), _out(name + "_top_pixels.csv")
    _write_png(png, _colorize(img, 0.0, vmax))
    _write_tiff(tif, img)
    rows = _top_pixels(p, img)
    _write_csv(csv, ["x", "y", "value"], rows)
    peak = rows[0] if rows else [0, 0, 0.0]
    metrics = {
        "mz": float(mz),
        "ppm": float(ppm),
        "window_lo": lo_mz,
        "window_hi": hi_mz,
        "max_intensity": vmax,
        "mean_intensity": float(vals.mean()) if vals.size else 0.0,
        "frac_pixels_with_signal": float((vals > 0).mean()) if vals.size else 0.0,
        "frac_pixels_above_half_max": float((vals > vmax / 2).mean()) if vals.size and vmax > 0 else 0.0,
        "peak_pixel_x": peak[0],
        "peak_pixel_y": peak[1],
        "mean_points_in_window": float(np.mean(npts)) if npts else 0.0,
    }
    out = {
        "ok": True,
        "summary": "Ion image at m/z %.4f +/- %g ppm (%.4f to %.4f), normalization %s, reduce %s: max %.6g at pixel (%d, %d)" % (mz, ppm, lo_mz, hi_mz, normalization, reduce, vmax, peak[0], peak[1]),
        "metrics": metrics,
        "data": {"normalization": normalization, "reduce": reduce, "coordinates": "1-based, as in imzML"},
        "outputs": _files(png, tif, csv),
        "table": {"columns": ["x", "y", "value"], "rows": rows, "n_rows": len(rows), "path": csv},
    }
    if metrics["mean_points_in_window"] == 0:
        out["warning"] = "No data point fell inside the m/z window in any pixel. Check the m/z, the tolerance and the polarity."
    return out


def get_tic_image(path, name="tic_image"):
    p = _parser(path)
    nx, ny = _grid(p)
    img = np.full((ny, nx), np.nan)
    for i, (x, y, z) in enumerate(p.coordinates):
        if z == 1:
            img[y - 1, x - 1] = _read_ints(p, i).sum()
    other_z = sum(1 for c in p.coordinates if c[2] != 1)
    vals = img[np.isfinite(img)]
    if not vals.size:
        raise ValueError("no pixel has z = 1, so the TIC image is empty. The file has %d pixels in other z planes." % other_z)
    vmax = float(vals.max())
    png, tif, csv = _out(name + ".png"), _out(name + ".tif"), _out(name + "_top_pixels.csv")
    _write_png(png, _colorize(img, 0.0, vmax))
    _write_tiff(tif, img)
    rows = _top_pixels(p, img)
    _write_csv(csv, ["x", "y", "tic"], rows)
    metrics = {
        "n_pixels": int(vals.size),
        "tic_mean": float(vals.mean()),
        "tic_median": float(np.median(vals)),
        "tic_max": vmax,
        "tic_min": float(vals.min()),
        "tic_max_x": rows[0][0],
        "tic_max_y": rows[0][1],
        "tic_cv": float(vals.std() / vals.mean()) if vals.mean() else 0.0,
        "n_pixels_other_z": other_z,
    }
    return {
        "ok": True,
        "summary": "Total ion current (sum of intensities per pixel): mean %.6g, max %.6g at pixel (%d, %d)%s" % (metrics["tic_mean"], vmax, rows[0][0], rows[0][1],
            ". The image shows the z = 1 plane only; %d pixels in other z planes are not in it" % other_z if other_z else ""),
        "metrics": metrics,
        "data": {"coordinates": "1-based, as in imzML"},
        "outputs": _files(png, tif, csv),
        "table": {"columns": ["x", "y", "tic"], "rows": rows, "n_rows": len(rows), "path": csv},
    }


def _mean_spectrum(p, normalization, bin_width, max_pixels):
    n = len(p.coordinates)
    idx = _sample_indices(n, max_pixels)
    cont = _is_continuous(p)
    if cont and not bin_width:
        mz_axis = _read_mz(p, 0)
        acc = np.zeros(len(mz_axis))
        outside = 0
        for i in idx:
            ints = _read_ints(p, i)
            f = _norm_factor(ints, normalization)
            if f > 0:
                acc += ints / f
        return mz_axis, acc / len(idx), len(idx), outside
    bw = float(bin_width or 0.01)
    lo, hi, _ = _mz_range(p)
    lo = np.floor(lo)
    nb = int(np.ceil((hi - lo) / bw)) + 1
    acc = np.zeros(nb)
    wmz = np.zeros(nb)
    outside = 0
    shared = _read_mz(p, 0) if cont else None
    for i in idx:
        mzs = shared if shared is not None else _read_mz(p, i)
        ints = _read_ints(p, i)
        f = _norm_factor(ints, normalization)
        if f <= 0:
            continue
        b = np.floor((mzs - lo) / bw).astype(int)
        ok = (b >= 0) & (b < nb)
        outside += int((~ok).sum())
        w = (ints / f)[ok]
        acc += np.bincount(b[ok], weights=w, minlength=nb)
        wmz += np.bincount(b[ok], weights=w * mzs[ok], minlength=nb)
    centers = lo + (np.arange(nb) + 0.5) * bw
    axis = np.where(acc > 0, wmz / np.where(acc > 0, acc, 1.0), centers)
    return axis, acc / len(idx), len(idx), outside


def get_mean_spectrum(path, normalization="none", bin_width=0.0, max_pixels=500, name="mean_spectrum"):
    _check_norm(normalization)
    p = _parser(path)
    mz, y, used, outside = _mean_spectrum(p, normalization, float(bin_width), int(max_pixels))
    csv = _out(name + ".csv")
    _write_csv(csv, ["mz", "mean_intensity"], zip(mz, y))
    top = np.argsort(y)[::-1][:10]
    rows = [[float(mz[k]), float(y[k])] for k in top]
    n = len(p.coordinates)
    metrics = {
        "n_points": int(len(mz)),
        "n_pixels_used": int(used),
        "n_pixels_total": n,
        "max_mean_intensity": float(y.max()),
        "mz_at_max": float(mz[int(np.argmax(y))]),
        "sum_mean_intensity": float(y.sum()),
        "bin_width": float(bin_width) if bin_width else (0.0 if _is_continuous(p) else 0.01),
        "n_points_outside_range": outside,
    }
    return {
        "ok": True,
        "summary": "Mean spectrum of %d of %d pixels, normalization %s: %d points, strongest at m/z %.4f" % (used, n, normalization, len(mz), metrics["mz_at_max"]),
        "metrics": metrics,
        "data": {"normalization": normalization, "all_pixels_used": used == n},
        "outputs": _files(csv),
        "table": {"columns": ["mz", "mean_intensity"], "rows": rows, "n_rows": len(rows), "path": csv},
    }


def find_top_peaks(path, snr=None, n_peaks=20, normalization="none", bin_width=0.0, max_pixels=500, name="top_peaks"):
    if snr is None:
        raise ValueError("snr is not set. The decision snr sets it.")
    _check_norm(normalization)
    p = _parser(path)
    mz, y, used, outside = _mean_spectrum(p, normalization, float(bin_width), int(max_pixels))
    nz = y[y > 0]
    if nz.size == 0:
        return {"ok": False, "error": "The mean spectrum is empty."}
    if nz.size > 0.5 * len(y):
        med = float(np.median(nz))
        sigma = float(1.4826 * np.median(np.abs(nz - med))) or float(nz.std()) or 1.0
        noise_method = "median and 1.4826 x median absolute deviation of the non-zero mean-spectrum points"
    else:
        med, sigma = 0.0, float(np.median(nz))
        noise_method = "sparse spectrum: noise unit is the median of the non-zero points, so S/N is intensity divided by that median"
    is_peak = np.zeros(len(y), dtype=bool)
    is_peak[1:-1] = (y[1:-1] > y[:-2]) & (y[1:-1] >= y[2:])
    s = (y - med) / sigma
    keep = np.flatnonzero(is_peak & (s >= snr))
    keep = keep[np.argsort(y[keep])[::-1]]
    top = keep[: int(n_peaks)]
    rows = [[float(mz[k]), float(y[k]), float(s[k]), float(100 * y[k] / y.max())] for k in top]
    csv = _out(name + ".csv")
    _write_csv(csv, ["mz", "intensity", "snr", "relative_percent"], rows)
    metrics = {
        "n_peaks_found": int(len(keep)),
        "n_peaks_returned": len(rows),
        "noise_median": med,
        "noise_sigma": sigma,
        "snr_cutoff": float(snr),
        "n_pixels_used": int(used),
        "top_mz": rows[0][0] if rows else 0.0,
    }
    return {
        "ok": True,
        "summary": "%d peaks at S/N >= %g in the mean spectrum of %d pixels; strongest at m/z %.4f" % (len(keep), snr, used, metrics["top_mz"]),
        "metrics": metrics,
        "data": {"normalization": normalization, "noise_method": noise_method},
        "outputs": _files(csv),
        "table": {"columns": ["mz", "intensity", "snr", "relative_percent"], "rows": rows, "n_rows": len(rows), "path": csv},
    }


def compare_files(path_a, path_b, max_pixels=0):
    a, b = _parser(path_a), _parser(path_b)
    ia = os.path.abspath(os.path.expanduser(path_a))[:-6] + ".ibd"
    ib = os.path.abspath(os.path.expanduser(path_b))[:-6] + ".ibd"
    n = min(len(a.coordinates), len(b.coordinates))
    same_coords = a.coordinates == b.coordinates
    idx = _sample_indices(n, int(max_pixels))
    max_mz = max_int = 0.0
    n_diff = n_len = 0
    for i in idx:
        mza, mzb = _read_mz(a, i), _read_mz(b, i)
        ina, inb = _read_ints(a, i), _read_ints(b, i)
        if len(mza) != len(mzb):
            n_len += 1
            n_diff += 1
            continue
        dm = float(np.abs(mza - mzb).max()) if len(mza) else 0.0
        di = float(np.abs(ina - inb).max()) if len(ina) else 0.0
        max_mz, max_int = max(max_mz, dm), max(max_int, di)
        if dm > 0 or di > 0:
            n_diff += 1
    identical = bool(same_coords and len(a.coordinates) == len(b.coordinates) and n_diff == 0)
    metrics = {
        "n_pixels_a": len(a.coordinates),
        "n_pixels_b": len(b.coordinates),
        "n_pixels_compared": int(len(idx)),
        "coordinates_equal": float(same_coords),
        "n_pixels_different": n_diff,
        "n_pixels_different_length": n_len,
        "max_abs_mz_difference": max_mz,
        "max_abs_intensity_difference": max_int,
        "identical": float(identical),
        "ibd_bytes_a": os.path.getsize(ia),
        "ibd_bytes_b": os.path.getsize(ib),
    }
    storage = lambda p: "continuous" if _is_continuous(p) else "processed"
    return {
        "ok": True,
        "summary": "%s: %d pixels compared, %d differ, max m/z difference %g, max intensity difference %g (A is %s, B is %s)"
        % ("Identical spectra" if identical else "Spectra differ", len(idx), n_diff, max_mz, max_int, storage(a), storage(b)),
        "metrics": metrics,
        "data": {"storage_a": storage(a), "storage_b": storage(b)},
    }
