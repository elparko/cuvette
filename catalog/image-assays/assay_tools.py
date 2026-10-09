import csv
import math
import os
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
from scipy.special import ndtr
from skimage import color, feature, filters, measure, morphology, segmentation

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

IMAGE_EXT = {".png", ".tif", ".tiff", ".lsm", ".jpg", ".jpeg", ".gif", ".bmp"}
AUTO_METHODS = ["otsu", "li", "triangle", "yen", "isodata", "mean"]
BLUE, ORANGE, SKY, VERMILION, GREEN, PURPLE, YELLOW, GREY = "#0072B2", "#E69F00", "#56B4E9", "#D55E00", "#009E73", "#CC79A7", "#F0E442", "#999999"


def _fail(msg):
    raise ValueError(msg)


def _rgb(hexcolor):
    h = hexcolor.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _check_file(path, what="image"):
    if not path or not Path(path).is_file():
        _fail("%s file not found: %s" % (what, path))


def _read(path):
    _check_file(path)
    p = Path(path)
    ext = p.suffix.lower()
    info = {"pixel_size_um": 0.0, "axes": "", "dtype": ""}
    if ext in (".tif", ".tiff", ".lsm"):
        try:
            with tifffile.TiffFile(str(p)) as t:
                arr = t.series[0].asarray()
                axes = t.series[0].axes
                if t.is_lsm and t.lsm_metadata:
                    vs = t.lsm_metadata.get("VoxelSizeX") or 0
                    info["pixel_size_um"] = float(vs) * 1e6
                elif t.is_imagej and t.imagej_metadata:
                    unit = str(t.imagej_metadata.get("unit", "")).lower()
                    xr = t.pages[0].tags.get("XResolution")
                    if xr and unit in ("micron", "um", "µm", "\\u00b5m"):
                        num, den = xr.value
                        if num:
                            info["pixel_size_um"] = den / num
        except Exception as e:
            _fail("cannot read the TIFF file %s: %s" % (path, e))
    else:
        try:
            with Image.open(p) as im:
                if im.mode in ("RGBA", "LA", "CMYK", "YCbCr"):
                    im = im.convert("RGB")
                arr = np.array(im)
        except Exception as e:
            _fail("cannot read the image file %s: %s" % (path, e))
        axes = "YXS" if arr.ndim == 3 else "YX"
    keep = [i for i, n in enumerate(arr.shape) if n > 1]
    axes = "".join(a for i, a in enumerate(axes) if i in keep) if len(axes) == arr.ndim else ""
    arr = np.squeeze(arr)
    if not axes:
        axes = "YX" if arr.ndim == 2 else ("CYX" if arr.ndim == 3 and arr.shape[0] <= 4 else ("YXS" if arr.ndim == 3 and arr.shape[-1] <= 4 else "ZYX"))
    info["axes"] = axes
    info["dtype"] = str(arr.dtype)
    return arr, info


def _channels(arr, axes):
    cax = next((i for i, a in enumerate(axes) if a in "CS"), None)
    if cax is None:
        return [arr]
    chs = [np.take(arr, i, axis=cax) for i in range(arr.shape[cax])]
    if axes[cax] == "S" and len(chs) == 4 and chs[3].dtype.kind in "ui" and chs[3].min() == chs[3].max():
        chs = chs[:3]
    return chs


def _pick(chs, spec, label):
    if spec is None or spec == "":
        _fail("%s is not set. Give a channel number (0 is the first channel) or a name: gray, red, green, blue, saturation" % label)
    s = str(spec).strip().lower()
    if s.lstrip("-").isdigit():
        i = int(s)
        if i < 0 or i >= len(chs):
            _fail("%s is %s, but the image has %d channel(s), numbered 0 to %d" % (label, spec, len(chs), len(chs) - 1))
        return chs[i].astype(float)
    if s in ("gray", "grey"):
        if len(chs) == 1:
            return chs[0].astype(float)
        if len(chs) >= 3:
            return 0.2125 * chs[0].astype(float) + 0.7154 * chs[1].astype(float) + 0.0721 * chs[2].astype(float)
        return np.mean([c.astype(float) for c in chs], axis=0)
    names = {"red": 0, "green": 1, "blue": 2}
    if s in names:
        if len(chs) < 3:
            _fail("%s is %s, but the image has %d channel(s), not red, green and blue. Use a channel number" % (label, spec, len(chs)))
        return chs[names[s]].astype(float)
    if s == "saturation":
        if len(chs) < 3:
            _fail("%s is saturation, but the image is not RGB" % label)
        rgb = np.dstack(chs[:3]).astype(float)
        rgb = rgb / (np.iinfo(chs[0].dtype).max if chs[0].dtype.kind in "ui" else max(rgb.max(), 1e-9))
        return color.rgb2hsv(rgb)[..., 1]
    _fail("%s is %s. Use a channel number (0 is the first channel) or one of: gray, red, green, blue, saturation" % (label, spec))


def _full_scale(dtype):
    return float(np.iinfo(dtype).max) if np.dtype(dtype).kind in "ui" else 1.0


def _stretch(a, lo_p=0.5, hi_p=99.8):
    a = np.asarray(a, dtype=float)
    lo, hi = np.percentile(a, [lo_p, hi_p])
    return np.clip((a - lo) / max(hi - lo, 1e-12), 0, 1)


def _threshold(values, spec, label):
    if spec is None or str(spec).strip() == "":
        _fail("%s is not set. Give a method name (%s) or a number" % (label, ", ".join(AUTO_METHODS)))
    if isinstance(spec, (int, float)):
        return float(spec)
    method = str(spec).strip().lower()
    try:
        return float(method)
    except ValueError:
        pass
    if method not in AUTO_METHODS:
        _fail("%s is %s. Give a method name (%s) or a number" % (label, spec, ", ".join(AUTO_METHODS)))
    v = np.asarray(values, dtype=float).ravel()
    if v.size == 0 or v.min() == v.max():
        _fail("%s: the region holds no contrast (all values equal), so the %s method cannot find a threshold" % (label, method))
    return float(getattr(filters, "threshold_" + method)(v))


def _out(stem, suffix):
    return os.path.abspath("%s_%s" % (stem, suffix))


def _stem(path):
    return Path(path).stem


def _write_csv(path, columns, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(columns)
        w.writerows(rows)


def _table(path, columns, rows, preview=12):
    return {"columns": columns, "rows": rows[:preview], "n_rows": len(rows), "path": os.path.abspath(path)}


def _font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def _overlay(path, base, layers, legend, title="", max_size=1600):
    rgb = base if base.ndim == 3 else np.dstack([base] * 3)
    rgb = (np.clip(rgb, 0, 1) * 255).astype(np.uint8)
    h, w = rgb.shape[:2]
    up = int(math.ceil(600.0 / max(h, w))) if max(h, w) < 600 else 1
    if up > 1:
        rgb = np.repeat(np.repeat(rgb, up, axis=0), up, axis=1)
        layers = [(None if m is None else np.repeat(np.repeat(m, up, axis=0), up, axis=1), c) for m, c in layers]
        h, w = rgb.shape[:2]
    scale = min(1.0, max_size / float(max(h, w)))
    thick = max(1, int(round(1.0 / scale))) + (1 if max(h, w) > 900 else 0)
    for mask, col in layers:
        if mask is None or not np.any(mask):
            continue
        m = ndi.binary_dilation(mask, iterations=thick - 1) if thick > 1 else mask
        rgb[m] = _rgb(col)
    im = Image.fromarray(rgb)
    if scale < 1:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    font = _font(15)
    line = 22
    top = line + 6 if title else 0
    width = max(im.width, 520)
    canvas = Image.new("RGB", (width, im.height + top + 10 + line * len(legend)), "white")
    canvas.paste(im, (0, top))
    d = ImageDraw.Draw(canvas)
    if title:
        d.text((6, 4), title, fill=(0, 0, 0), font=font)
    y = im.height + top + 6
    for col, text in legend:
        d.rectangle([8, y + 3, 24, y + 17], fill=_rgb(col), outline=(0, 0, 0))
        d.text((32, y + 1), text, fill=(0, 0, 0), font=font)
        y += line
    canvas.save(path)
    return path


def _save_plot(fig, stem):
    png, svg = stem + ".png", stem + ".svg"
    fig.savefig(png, dpi=150, bbox_inches="tight")
    with matplotlib.rc_context({"svg.fonttype": "none"}):
        fig.savefig(svg, format="svg", bbox_inches="tight")
    plt.close(fig)
    return [png, svg]


def _plot_outputs(paths, name):
    return [{"path": p, "kind": "image" if p.endswith(".png") else "file", "name": "%s (%s)" % (name, p.rsplit(".", 1)[-1].upper())} for p in paths]


def _list_images(folder, pattern):
    root = Path(folder)
    files = sorted(p for p in root.glob(pattern or "*") if p.is_file() and p.suffix.lower() in IMAGE_EXT and not p.name.startswith("."))
    if not files:
        _fail("no image files match the pattern %r in the folder %s" % (pattern, folder))
    return files


def _read_hand_counts(path, needed):
    _check_file(path, "hand count")
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        _fail("the hand count file %s has no rows" % path)
    cols = {c.strip().lower(): c for c in rows[0].keys() if c}
    img_col = next((cols[c] for c in ("image", "file", "filename", "name") if c in cols), None)
    if img_col is None:
        _fail("the hand count file %s needs an image column (image, file or name). Its columns are: %s" % (path, ", ".join(cols.values())))
    for n in needed:
        if n not in cols:
            _fail("the hand count file %s needs the column %s. Its columns are: %s" % (path, n, ", ".join(cols.values())))
    out = {}
    for r in rows:
        key = Path(str(r[img_col]).strip()).stem.lower()
        try:
            out[key] = {n: float(r[cols[n]]) for n in needed}
        except ValueError:
            _fail("the hand count file %s has a value that is not a number in the row for %s" % (path, r[img_col]))
    return out


def _agreement(auto, hand):
    a, h = np.asarray(auto, float), np.asarray(hand, float)
    d = a - h
    r = float(np.corrcoef(a, h)[0, 1]) if len(a) > 2 and a.std() > 0 and h.std() > 0 else float("nan")
    pct = float(np.mean(np.abs(d) / np.maximum(h, 1))) if len(a) else float("nan")
    return {"mean_difference": float(d.mean()), "mean_abs_difference": float(np.abs(d).mean()), "mean_abs_percent_difference": pct * 100, "pearson_r": r, "n_compared": int(len(a))}


def _compare_plot(stem, names, auto, hand, label):
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    ax.scatter(hand, auto, color=BLUE, s=28, zorder=3)
    hi = max(max(auto), max(hand), 1) * 1.08
    ax.plot([0, hi], [0, hi], color=GREY, lw=1, ls="--", label="tool = hand count")
    ax.set_xlim(0, hi)
    ax.set_ylim(0, hi)
    ax.set_xlabel("%s, hand count" % label)
    ax.set_ylabel("%s, tool" % label)
    ax.legend(frameon=False, loc="upper left")
    ax.spines[["top", "right"]].set_visible(False)
    return _save_plot(fig, stem)


def _describe_folder(path):
    root = Path(path)
    groups = {}
    for p in sorted(root.rglob("*")):
        if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in IMAGE_EXT:
            parts = p.relative_to(root).parts
            key = "/".join(list(parts[:-1]) + ["*" + p.suffix])
            g = groups.setdefault(key, {"n_files": 0, "example": str(Path(*parts))})
            g["n_files"] += 1
    total = sum(g["n_files"] for g in groups.values())
    lines = ["%s: %d files, for example %s" % (k, g["n_files"], g["example"]) for k, g in groups.items()]
    return {
        "ok": True,
        "summary": "Folder with %d image files in %d pattern(s). %s" % (total, len(groups), "; ".join(lines[:6])),
        "metrics": {"n_files": total, "n_patterns": len(groups)},
        "data": {"patterns": groups},
        "outputs": [],
    }


def inspect_image(path):
    if Path(path).is_dir():
        return _describe_folder(path)
    arr, info = _read(path)
    chs = _channels(arr, info["axes"])
    ext = Path(path).suffix.lower()
    shape = chs[0].shape
    full = _full_scale(arr.dtype)
    rows, warnings = [], []
    for i, c in enumerate(chs):
        sat = float((c >= full).mean()) if arr.dtype.kind in "ui" else 0.0
        rows.append([i, float(c.min()), float(c.max()), round(float(c.mean()), 4), round(sat, 6)])
        if sat > 0.001:
            warnings.append("Channel %d: %.2f percent of the pixels are at the maximum value %g. Saturated pixels make intensity sums too low." % (i, sat * 100, full))
    if ext in (".jpg", ".jpeg"):
        warnings.append("JPEG files change pixel values. Counts can work; intensity measurements are not reliable.")
    if len(shape) == 3:
        warnings.append("The file is a stack of %d planes. Colocalization reads the whole stack; the counting tools need one plane." % shape[0])
    if arr.dtype == np.uint8 and ext in (".tif", ".tiff") and len(chs) >= 3:
        warnings.append("8-bit color TIFF. Blot and fluorescence exports in this form are often display copies with changed contrast.")
    h, w = shape[-2], shape[-1]
    return {
        "ok": True,
        "summary": "%d by %d pixels%s, %d channel(s), %s, pixel size %s" % (w, h, (", %d planes" % shape[0]) if len(shape) == 3 else "", len(chs), arr.dtype, ("%.4g micrometers" % info["pixel_size_um"]) if info["pixel_size_um"] else "not in the file"),
        "metrics": {"width": w, "height": h, "planes": shape[0] if len(shape) == 3 else 1, "channels": len(chs), "bit_depth": arr.dtype.itemsize * 8, "pixel_size_um": info["pixel_size_um"], "max_saturated_fraction": max(r[4] for r in rows)},
        "data": {"dtype": str(arr.dtype), "axes": info["axes"], "warnings": warnings, "channel_names": "0 is the first channel"},
        "table": {"columns": ["channel", "min", "max", "mean", "saturated_fraction"], "rows": rows, "n_rows": len(rows)},
        "outputs": [],
    }


def _jround(v):
    return math.floor(v + 0.5)


def _pearson_sums(sx, sy, sxx, sxy, syy, n):
    with np.errstate(divide="ignore", invalid="ignore"):
        num = sxy - sx * sy / n
        den = np.sqrt((sxx - sx * sx / n) * (syy - sy * sy / n))
        r = num / den
    return np.where(np.isfinite(r), r, np.nan)


def _pearson(x, y):
    n = x.size
    if n < 2:
        return float("nan")
    return float(_pearson_sums(x.sum(), y.sum(), (x * x).sum(), (x * y).sum(), (y * y).sum(), n))


def _regression(x, y):
    n = x.size
    mx, my = x.mean(), y.mean()
    vx = ((x - mx) ** 2).sum() / (n - 1)
    vy = ((y - my) ** 2).sum() / (n - 1)
    vc = (((x + y) - (mx + my)) ** 2).sum() / (n - 1)
    cov = 0.5 * (vc - (vx + vy))
    if cov == 0:
        _fail("the two channels have no covariance in the region, so the Costes regression line is not defined. Use threshold_method manual or none")
    m = (vy - vx + math.sqrt((vy - vx) ** 2 + 4 * cov * cov)) / (2 * cov)
    return m, my - m * mx


def _auto_threshold(x, y, method, lo, hi):
    m, b = _regression(x, y)
    clamp = lambda v: min(max(v, lo), hi)
    if -1 < m < 1:
        f1, f2, vmin, vmax = (lambda t: t), (lambda t: t * m + b), float(x.min()), float(x.max())
    else:
        f1, f2, vmin, vmax = (lambda t: (t - b) / m), (lambda t: t), float(y.min()), float(y.max())

    def below(t):
        t1, t2 = clamp(_jround(f1(t))), clamp(_jround(f2(t)))
        sel = (x < t1) | (y < t2)
        n = int(sel.sum())
        r = _pearson(x[sel], y[sel]) if n >= 2 else float("nan")
        return t1, t2, r

    steps = 0
    if method == "bisection":
        th, diff = abs(vmax + vmin) * 0.5, abs(abs(vmax + vmin) * 0.5 - vmax)
        t1 = t2 = None
        while not (steps > 100 or diff < 1.0):
            t1, t2, r = below(th)
            prev = th
            if r < 0:
                th = th + diff * 0.5
            elif r > 0:
                th = th - diff * 0.5
            diff = abs(th - prev)
            steps += 1
        if t1 is None:
            t1, t2, _ = below(th)
    else:
        t1, t2, r = _costes_steps(x, y, f1, f2, vmax, clamp, m)
        steps = -1
    return t1, t2, m, b, steps


def _costes_steps(x, y, f1, f2, vmax, clamp, m):
    ts = np.arange(vmax, 0.0, -1.0)
    if ts.size == 0:
        ts = np.array([vmax])
    t1s = np.array([clamp(_jround(f1(t))) for t in ts], dtype=float)
    t2s = np.array([clamp(_jround(f2(t))) for t in ts], dtype=float)
    mono = np.all(np.diff(t1s) <= 0) and np.all(np.diff(t2s) <= 0)
    if mono:
        k1 = np.searchsorted(-t1s, -x, side="left")
        k2 = np.searchsorted(-t2s, -y, side="left")
        kex = np.maximum(k1, k2)
        K = ts.size
        def cum(w):
            return np.cumsum(np.bincount(np.minimum(kex, K), weights=w, minlength=K + 1)[:K])
        n_ex, sx, sy = cum(np.ones_like(x)), cum(x), cum(y)
        sxx, sxy, syy = cum(x * x), cum(x * y), cum(y * y)
        n = x.size - n_ex
        rs = _pearson_sums(x.sum() - sx, y.sum() - sy, (x * x).sum() - sxx, (x * y).sum() - sxy, (y * y).sum() - syy, np.where(n > 0, n, np.nan))
        rs = np.where(n >= 2, rs, np.nan)
    else:
        rs = None
    cur, last = 1.0, float("inf")
    for k, t in enumerate(ts):
        if rs is not None:
            r = float(rs[k])
        else:
            sel = (x < t1s[k]) | (y < t2s[k])
            r = _pearson(x[sel], y[sel]) if sel.sum() >= 2 else float("nan")
        last, cur = cur, r
        nxt = t - 1.0
        if nxt < 1 or r < 0.0001 or r > last:
            return t1s[k], t2s[k], r
    return t1s[-1], t2s[-1], cur


def _costes_p(a, b, mask, r_obs, n_rand, psf, seed):
    rng = np.random.default_rng(seed)
    idx = np.nonzero(mask)
    lo = [int(i.min()) for i in idx]
    hi = [int(i.max()) + 1 for i in idx]
    box = tuple(slice(l, h) for l, h in zip(lo, hi))
    sub = a[box].astype(float)
    nb = [int(math.ceil(s / psf)) for s in sub.shape]
    pad = [(0, n * psf - s) for n, s in zip(nb, sub.shape)]
    padded = np.pad(sub, pad, mode="symmetric")
    nd = padded.ndim
    shp = []
    for n in nb:
        shp += [n, psf]
    blocks = padded.reshape(shp).transpose(list(range(0, 2 * nd, 2)) + list(range(1, 2 * nd, 2))).reshape([-1] + [psf] * nd)
    yv = b[mask].astype(float)
    vals = []
    for _ in range(int(n_rand)):
        shuffled = blocks[rng.permutation(blocks.shape[0])]
        back = shuffled.reshape(nb + [psf] * nd).transpose([j for i in range(nd) for j in (i, i + nd)]).reshape([n * psf for n in nb])
        full = np.zeros(a.shape, dtype=float)
        full[box] = back[tuple(slice(0, s) for s in sub.shape)]
        sm = ndi.gaussian_filter(full, sigma=psf, mode="nearest")
        vals.append(_pearson(sm[mask], yv))
    vals = np.array([v for v in vals if np.isfinite(v)])
    if vals.size < 2:
        return float("nan"), float("nan"), float("nan")
    mean, sd = float(vals.mean()), float(vals.std(ddof=1))
    p = float(ndtr((r_obs - mean) / sd)) if sd > 0 else (1.0 if r_obs > mean else 0.0)
    return min(max(p, 0.0), 1.0), mean, sd


def _single_channel(path, spec, label):
    arr, info = _read(path)
    chs = _channels(arr, info["axes"])
    if len(chs) == 1:
        return chs[0], arr.dtype
    return _pick(chs, spec, label).astype(chs[0].dtype if chs[0].dtype.kind == "f" else float), arr.dtype


def measure_colocalization(path, channel1=0, channel2=1, path2=None, mask=None, threshold_method="costes", threshold1=None, threshold2=None, costes_randomizations=10, psf_size=3, seed=1):
    if path2:
        a, dt = _single_channel(path, channel1, "channel1")
        b, dt2 = _single_channel(path2, channel2, "channel2")
    else:
        arr, info = _read(path)
        chs = _channels(arr, info["axes"])
        if len(chs) < 2:
            _fail("the file %s has one channel. Give the second channel as path2, or a file with two or more channels" % path)
        a, b, dt = _pick(chs, channel1, "channel1"), _pick(chs, channel2, "channel2"), arr.dtype
        if str(channel1) == str(channel2):
            _fail("channel1 and channel2 are both %s. Give two different channels" % channel1)
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    if a.shape != b.shape:
        _fail("the two channels have different sizes: %s and %s" % (a.shape, b.shape))
    if mask:
        mk, _ = _read(mask)
        mk = np.asarray(mk) > 0
        if mk.ndim == 3 and mk.shape[-1] in (3, 4) and a.ndim == 2:
            mk = mk.any(axis=-1)
        if mk.ndim < a.ndim:
            mk = np.broadcast_to(mk, a.shape)
        if mk.shape != a.shape:
            _fail("the mask %s has size %s, but the channels have size %s" % (mask, mk.shape, a.shape))
        if not mk.any():
            _fail("the mask %s holds no pixel above zero" % mask)
    else:
        mk = np.ones(a.shape, dtype=bool)
    if threshold_method not in ("costes", "bisection", "manual", "none"):
        _fail("threshold_method is %s. Use costes, bisection, manual or none" % threshold_method)
    x, y = a[mk], b[mk]
    lo, hi = (float(np.iinfo(dt).min), float(np.iinfo(dt).max)) if np.dtype(dt).kind in "ui" else (-float("inf"), float("inf"))
    r = _pearson(x, y)
    m1 = float(x[y > 0].sum() / x.sum()) if x.sum() > 0 else float("nan")
    m2 = float(y[x > 0].sum() / y.sum()) if y.sum() > 0 else float("nan")
    metrics = {"pearson_r": r, "manders_m1": m1, "manders_m2": m2, "n_pixels": int(x.size)}
    slope = icpt = float("nan")
    warnings = []
    if threshold_method in ("costes", "bisection"):
        t1, t2, slope, icpt, steps = _auto_threshold(x, y, threshold_method, lo, hi)
        if t1 > x.mean() or t2 > y.mean():
            warnings.append("A threshold is above the channel mean, so few pixels are in the thresholded values.")
        if abs(icpt / y.mean()) > 0.05 if y.mean() else False:
            warnings.append("The regression line crosses far from zero (intercept %.3g). Subtract the background or use a mask." % icpt)
    elif threshold_method == "manual":
        if threshold1 is None or threshold2 is None:
            _fail("threshold_method is manual, so give threshold1 and threshold2 in raw intensity units")
        t1, t2 = float(threshold1), float(threshold2)
    else:
        t1 = t2 = None
    if t1 is not None:
        sel1 = (y > 0) & (y >= t2)
        sel2 = (x > 0) & (x >= t1)
        metrics.update({
            "threshold1": float(t1),
            "threshold2": float(t2),
            "manders_tm1": float(x[sel1].sum() / x.sum()) if x.sum() > 0 else float("nan"),
            "manders_tm2": float(y[sel2].sum() / y.sum()) if y.sum() > 0 else float("nan"),
            "pearson_r_above": _pearson(x[(x > t1) | (y > t2)], y[(x > t1) | (y > t2)]),
            "pearson_r_below": _pearson(x[(x < t1) | (y < t2)], y[(x < t1) | (y < t2)]),
            "fraction_above_both": float(((x >= t1) & (y >= t2)).mean()),
        })
        if threshold_method in ("costes", "bisection"):
            metrics["regression_slope"] = float(slope)
            metrics["regression_intercept"] = float(icpt)
    n_rand = int(costes_randomizations or 0)
    if n_rand > 0:
        if psf_size < 1:
            _fail("psf_size is %s. Give the size of the blur spot in pixels, 1 or more" % psf_size)
        p, smean, ssd = _costes_p(a, b, mk, r, n_rand, int(psf_size), seed)
        metrics.update({"costes_p": p, "costes_shuffled_mean": smean, "costes_shuffled_sd": ssd, "costes_randomizations": n_rand})
    sat1 = float((x >= hi).mean()) if np.isfinite(hi) else 0.0
    sat2 = float((y >= hi).mean()) if np.isfinite(hi) else 0.0
    if max(sat1, sat2) > 0.001:
        warnings.append("Saturated pixels: %.2f percent in channel 1 and %.2f percent in channel 2. Saturation lowers the correlation." % (sat1 * 100, sat2 * 100))
    metrics["saturated_fraction_1"], metrics["saturated_fraction_2"] = sat1, sat2

    stem = _stem(path) + ("_" + _stem(path2) if path2 else "")
    outputs = []
    fig, ax = plt.subplots(figsize=(5, 4.6))
    xs, ys = x, y
    if xs.size > 400000:
        pick = np.random.default_rng(0).choice(xs.size, 400000, replace=False)
        xs, ys = xs[pick], ys[pick]
    hb = ax.hexbin(xs, ys, gridsize=80, bins="log", cmap="Greys", mincnt=1)
    fig.colorbar(hb, ax=ax, label="pixels (log scale)")
    if t1 is not None:
        ax.axvline(t1, color=ORANGE, lw=1.2, label="threshold 1 = %.4g" % t1)
        ax.axhline(t2, color=BLUE, lw=1.2, label="threshold 2 = %.4g" % t2)
    if np.isfinite(slope):
        xx = np.array([0, x.max()])
        ax.plot(xx, slope * xx + icpt, color=VERMILION, lw=1, ls="--", label="regression line")
    ax.set_xlabel("channel 1 intensity")
    ax.set_ylabel("channel 2 intensity")
    ax.set_title("Pearson r = %.3f" % r)
    if ax.get_legend_handles_labels()[0]:
        ax.legend(frameon=False, fontsize=8, loc="upper left")
    outputs += _plot_outputs(_save_plot(fig, _out(stem, "coloc_scatter")), "intensity scatter plot")

    proj = (lambda v: v.max(axis=0)) if a.ndim == 3 else (lambda v: v)
    ga, gb = _stretch(proj(a)), _stretch(proj(b))
    base = np.dstack([gb, ga, gb]) * 0.85
    layers = []
    legend = [(GREEN, "Channel 1 signal (green)"), (PURPLE, "Channel 2 signal (magenta); white where both are bright")]
    if t1 is not None:
        both = proj(((a >= t1) & (b >= t2) & mk).astype(np.uint8)) > 0
        layers.append((segmentation.find_boundaries(measure.label(both), mode="outer"), YELLOW))
        legend.append((YELLOW, "Outline: pixels above both thresholds (%.1f percent of the region)" % (metrics["fraction_above_both"] * 100)))
    if mask:
        layers.append((segmentation.find_boundaries(proj(mk.astype(np.uint8)) > 0, mode="inner"), SKY))
        legend.append((SKY, "Outline: the mask; pixels outside it are left out"))
    ov = _overlay(_out(stem, "coloc_overlay.png"), base, layers, legend, title="Colocalization, %s" % ("maximum projection" if a.ndim == 3 else "single plane"))
    outputs.insert(0, {"path": ov, "kind": "image", "name": "QC overlay"})
    cpath = _out(stem, "coloc.csv")
    cols = sorted(metrics)
    _write_csv(cpath, ["metric", "value"], [[k, metrics[k]] for k in cols])
    outputs.append({"path": cpath, "kind": "table", "name": "colocalization values"})
    parts = ["Pearson r %.3f" % r, "M1 %.3f, M2 %.3f (above zero)" % (m1, m2)]
    if t1 is not None:
        parts.append("thresholds %.4g and %.4g (%s), tM1 %.3f, tM2 %.3f" % (t1, t2, threshold_method, metrics["manders_tm1"], metrics["manders_tm2"]))
    if n_rand > 0:
        parts.append("Costes p %.3f from %d randomizations" % (metrics["costes_p"], n_rand))
    parts.append("%d pixels%s" % (x.size, " in the mask" if mask else ""))
    return {"ok": True, "summary": "; ".join(parts), "metrics": metrics, "data": {"warnings": warnings, "overlay": ov}, "outputs": outputs}


CELL_MODES = ["expand", "membrane", "threshold", "texture", "labels"]
RULES = ["spots", "area", "area_fraction", "intensity"]


def _area_limits(min_d, max_d):
    return (math.pi * (min_d / 2.0) ** 2 if min_d else 0.0), (math.pi * (max_d / 2.0) ** 2 if max_d else float("inf"))


def _size_filter(lab, min_d, max_d):
    amin, amax = _area_limits(min_d, max_d)
    areas = np.bincount(lab.ravel())
    bad = (areas < amin) | (areas > amax)
    bad[0] = False
    n_bad = int(bad[1:][areas[1:] > 0].sum())
    lab = np.where(bad[lab], 0, lab)
    return segmentation.relabel_sequential(lab)[0], n_bad


def _split_by_peaks(intensity, mask, sigma, min_distance):
    lab0 = measure.label(mask)
    sm = filters.gaussian(intensity, sigma, preserve_range=True) if sigma > 0 else intensity
    pk = feature.peak_local_max(sm, min_distance=max(1, int(min_distance)), labels=lab0, exclude_border=False)
    mk = np.zeros(mask.shape, dtype=np.int32)
    mk[tuple(pk.T)] = np.arange(1, len(pk) + 1)
    missing = np.setdiff1d(np.unique(lab0[lab0 > 0]), np.unique(lab0[mk > 0]))
    if missing.size:
        extra = np.isin(lab0, missing)
        mk[extra] = lab0[extra] + len(pk)
    return segmentation.watershed(-sm, mk, mask=mask)


def _split_by_distance(mask, hmax):
    dist = ndi.distance_transform_edt(mask)
    markers = measure.label(morphology.h_maxima(filters.gaussian(dist, 1, preserve_range=True), max(1.0, hmax)))
    lab0 = measure.label(mask)
    missing = np.setdiff1d(np.unique(lab0[lab0 > 0]), np.unique(lab0[markers > 0]))
    if missing.size:
        extra = np.isin(lab0, missing)
        markers[extra] = lab0[extra] + markers.max()
    return segmentation.watershed(-dist, markers, mask=mask)


def _local_sd(plane, radius):
    size = 2 * int(radius) + 1
    m = ndi.uniform_filter(plane, size)
    m2 = ndi.uniform_filter(plane * plane, size)
    return np.sqrt(np.clip(m2 - m * m, 0, None))


def _uptake_one(path, s):
    arr, info = _read(path)
    chs = _channels(arr, info["axes"])
    if chs[0].ndim != 2:
        _fail("the file %s is a stack. Give one plane" % path)
    cargo = _pick(chs, s["cargo_channel"], "cargo_channel")
    nuc = _pick(chs, s["nucleus_channel"], "nucleus_channel") if s["nucleus_channel"] not in (None, "") else None
    cellc = _pick(chs, s["cell_channel"], "cell_channel") if s["cell_channel"] not in (None, "") else None
    mode = s["cell_mode"]
    h, w = cargo.shape
    nl, nt, n_nuc_size = None, None, 0
    if nuc is not None:
        ns = filters.gaussian(nuc, 1, preserve_range=True)
        nt = _threshold(ns, s["nucleus_threshold"], "nucleus_threshold")
        nm = ndi.binary_fill_holes(ns > nt)
        dmin = s["nucleus_min_diameter"]
        sigma = s["nucleus_smoothing"] or (max(1.0, dmin / 4.0) if dmin else 3.0)
        mdist = s["nucleus_min_distance"] or (max(3.0, dmin / 2.0) if dmin else 7.0)
        nl = _split_by_peaks(nuc, nm, sigma, mdist) if s["split_nuclei"] else measure.label(nm)
        nl, n_nuc_size = _size_filter(nl, s["nucleus_min_diameter"], s["nucleus_max_diameter"])
        if s["exclude_border_cells"]:
            nl = segmentation.relabel_sequential(segmentation.clear_border(nl))[0]
    if mode in ("expand", "membrane") and nl is None:
        _fail("cell_mode %s grows cells from nuclei, so it needs nucleus_channel. For a brightfield image without a nuclear stain use cell_mode texture, or labels with a Cellpose label image" % mode)
    if mode in ("membrane", "threshold", "texture") and cellc is None:
        _fail("cell_mode %s needs cell_channel, the channel that shows the cells" % mode)
    ct = None
    if mode == "expand":
        if s["cell_expand"] <= 0:
            _fail("cell_mode expand needs cell_expand, the distance in pixels by which each nucleus grows into a cell. It is 0")
        cl = segmentation.expand_labels(nl, distance=float(s["cell_expand"]))
    elif mode == "membrane":
        ms = filters.gaussian(cellc, 1, preserve_range=True)
        ct = _threshold(ms, s["cell_threshold"], "cell_threshold")
        cm = (ms > ct) | (nl > 0)
        if s["cell_expand"] and s["cell_expand"] > 0:
            cm &= ndi.distance_transform_edt(nl == 0) <= float(s["cell_expand"])
        cl = segmentation.watershed(-ms, nl, mask=cm)
    elif mode in ("threshold", "texture"):
        src = _local_sd(cellc, 3) if mode == "texture" else filters.gaussian(cellc, 1, preserve_range=True)
        if mode == "texture":
            src = filters.gaussian(src, 2, preserve_range=True)
        ct = _threshold(src, s["cell_threshold"], "cell_threshold")
        cm = src > ct if s["cell_polarity"] == "bright" else src < ct
        cm = ndi.binary_fill_holes(morphology.opening(cm, morphology.disk(2)))
        if nl is not None:
            cl = segmentation.watershed(-src, np.where(cm, nl, 0), mask=cm | (nl > 0))
        else:
            cl = _split_by_distance(cm, 0.25 * float(s["cell_min_diameter"] or 8)) if s["split_cells"] else measure.label(cm)
    elif mode == "labels":
        if not s["cell_labels"]:
            _fail("cell_mode labels needs cell_labels, the path of a label image, such as the label_image from the cellpose segment_cells tool")
        cl, _ = _read(s["cell_labels"])
        cl = np.asarray(cl)
        if cl.ndim == 3:
            cl = cl[..., 0] if cl.shape[-1] in (3, 4) else cl[0]
        if cl.shape != (h, w):
            _fail("the label image %s has size %s, but the image has size %s" % (s["cell_labels"], cl.shape, (h, w)))
        cl = measure.label(cl > 0) if cl.dtype == np.uint8 and cl.max() <= 1 else cl.astype(np.int64)
    else:
        _fail("cell_mode is %s. Use one of: %s" % (mode, ", ".join(CELL_MODES)))
    cl = segmentation.relabel_sequential(np.asarray(cl, dtype=np.int64))[0]
    excluded = np.zeros_like(cl)
    n_border = 0
    if s["exclude_border_cells"]:
        kept = segmentation.clear_border(cl)
        border_ids = np.setdiff1d(np.unique(cl[cl > 0]), np.unique(kept[kept > 0]))
        n_border = int(border_ids.size)
        excluded = np.where(np.isin(cl, border_ids), cl, 0)
        cl = kept
    cl, n_cell_size = _size_filter(cl, s["cell_min_diameter"], 0)
    ids = np.unique(cl[cl > 0])
    cs = filters.gaussian(cargo, s["cargo_smoothing"], preserve_range=True) if s["cargo_smoothing"] > 0 else cargo
    qt = _threshold(cs, s["cargo_threshold"], "cargo_threshold")
    qm = cs > qt
    ql = measure.label(qm)
    if s["cargo_min_area"] > 0:
        ql = segmentation.relabel_sequential(morphology.remove_small_objects(ql, max_size=int(s["cargo_min_area"]) - 1) if s["cargo_min_area"] > 1 else ql)[0]
        qm = ql > 0
    props = measure.regionprops(ql)
    parent = np.array([cl[min(h - 1, int(round(p.centroid[0]))), min(w - 1, int(round(p.centroid[1])))] for p in props], dtype=np.int64)
    nmax = int(cl.max()) + 1
    spots = np.bincount(parent[parent > 0], minlength=nmax)
    carea = np.bincount(cl[qm], minlength=nmax)
    area = np.bincount(cl.ravel(), minlength=nmax)
    csum = np.bincount(cl.ravel(), weights=cargo.ravel(), minlength=nmax)
    rule, pmin = s["positivity_rule"], float(s["positivity_min"])
    rows, pos_ids, neg_ids = [], [], []
    for i in ids:
        mean_int = csum[i] / max(area[i], 1)
        frac = carea[i] / max(area[i], 1)
        val = {"spots": spots[i], "area": carea[i], "area_fraction": frac, "intensity": mean_int}[rule]
        positive = val >= pmin
        (pos_ids if positive else neg_ids).append(int(i))
        rows.append([int(i), int(area[i]), int(spots[i]), int(carea[i]), round(float(frac), 5), round(float(mean_int), 3), "positive" if positive else "negative"])
    n = len(ids)
    n_pos = len(pos_ids)
    in_cells = int(spots[1:].sum()) if nmax > 1 else 0
    metrics = {
        "n_cells": n,
        "n_positive": n_pos,
        "fraction_positive": n_pos / n if n else 0.0,
        "n_cargo_objects": int(ql.max()),
        "n_cargo_in_cells": in_cells,
        "mean_cargo_per_cell": in_cells / n if n else 0.0,
        "mean_cargo_per_positive_cell": float(np.mean([spots[i] for i in pos_ids])) if pos_ids else 0.0,
        "phagocytic_index": 100.0 * in_cells / n if n else 0.0,
        "mean_cargo_area_per_cell_px": float(np.mean([carea[i] for i in ids])) if n else 0.0,
        "cargo_threshold": qt,
        "n_excluded_border": n_border,
        "n_excluded_small": n_cell_size,
    }
    if nl is not None:
        metrics["n_nuclei"] = int(nl.max())
        metrics["nucleus_threshold"] = nt
        metrics["n_nuclei_excluded_size"] = n_nuc_size
    if ct is not None:
        metrics["cell_threshold"] = ct
    if s["pixel_size"] > 0 and n:
        metrics["mean_cell_area_um2"] = float(np.mean([area[i] for i in ids])) * s["pixel_size"] ** 2
    stem = _stem(path)
    cols = ["cell", "area_px", "cargo_objects", "cargo_area_px", "cargo_area_fraction", "mean_cargo_intensity", "call"]
    cpath = _out(stem, "cells.csv")
    _write_csv(cpath, cols, rows)
    gray = _stretch(cellc if cellc is not None else (nuc if nuc is not None else cargo))
    red = _stretch(cargo, 50, 99.9)
    base = np.dstack([np.maximum(gray * 0.75, red), gray * 0.75 * (1 - red * 0.6), gray * 0.75 * (1 - red * 0.6)])
    if nl is not None and cellc is None:
        base[..., 2] = np.maximum(base[..., 2], _stretch(nuc) * 0.6)

    def edge(lab, ids_):
        return segmentation.find_boundaries(np.where(np.isin(lab, ids_), lab, 0), mode="inner") if len(ids_) else None

    layers = [(segmentation.find_boundaries(nl, mode="inner") if nl is not None else None, SKY), (edge(excluded, np.unique(excluded[excluded > 0])), GREY), (edge(cl, neg_ids), GREEN), (edge(cl, pos_ids), PURPLE), (segmentation.find_boundaries(ql, mode="outer"), YELLOW)]
    rule_txt = {"spots": "%g or more cargo objects" % pmin, "area": "%g or more cargo pixels" % pmin, "area_fraction": "cargo covers %g or more of the cell" % pmin, "intensity": "mean cargo intensity %g or more" % pmin}[rule]
    legend = [
        (PURPLE, "Positive cell (%s): %d" % (rule_txt, n_pos)),
        (GREEN, "Negative cell: %d" % (n - n_pos)),
        (YELLOW, "Cargo object above threshold %.4g: %d (%d inside counted cells)" % (qt, int(ql.max()), in_cells)),
        (GREY, "Left out, cell touches the image edge: %d" % n_border),
    ]
    if nl is not None:
        legend.append((SKY, "Nucleus: %d (left out for size: %d)" % (int(nl.max()), n_nuc_size)))
    ov = _overlay(_out(stem, "uptake_overlay.png"), base, layers, legend, title="%s: %d of %d cells positive" % (Path(path).name, n_pos, n))
    fig, ax = plt.subplots(figsize=(5, 3.4))
    if n:
        vals = np.array([spots[i] for i in ids])
        ax.hist(vals, bins=np.arange(-0.5, max(vals.max(), 1) + 1.5, 1), color=BLUE)
    ax.set_xlabel("cargo objects in the cell (count)")
    ax.set_ylabel("cells (count)")
    ax.spines[["top", "right"]].set_visible(False)
    plots = _save_plot(fig, _out(stem, "cargo_per_cell"))
    outputs = [{"path": ov, "kind": "image", "name": "QC overlay"}] + _plot_outputs(plots, "cargo per cell histogram") + [{"path": cpath, "kind": "table", "name": "cells"}]
    return metrics, outputs, _table(cpath, cols, rows)


def count_cell_uptake(path, cargo_channel, nucleus_channel=None, cell_channel=None, cell_mode="expand", cell_labels=None, pattern="*", hand_counts=None,
                      nucleus_threshold="otsu", nucleus_min_diameter=0, nucleus_max_diameter=0, split_nuclei=True, nucleus_smoothing=0.0, nucleus_min_distance=0,
                      cell_expand=0, cell_threshold="otsu", cell_polarity="bright", cell_min_diameter=0, split_cells=True,
                      cargo_threshold="otsu", cargo_smoothing=0.0, cargo_min_area=0,
                      positivity_rule="spots", positivity_min=1, exclude_border_cells=True, pixel_size=0.0):
    if positivity_rule not in RULES:
        _fail("positivity_rule is %s. Use one of: %s" % (positivity_rule, ", ".join(RULES)))
    if cell_mode not in CELL_MODES:
        _fail("cell_mode is %s. Use one of: %s" % (cell_mode, ", ".join(CELL_MODES)))
    if cell_polarity not in ("bright", "dark"):
        _fail("cell_polarity is %s. Use bright or dark" % cell_polarity)
    s = dict(cargo_channel=cargo_channel, nucleus_channel=nucleus_channel, cell_channel=cell_channel, cell_mode=cell_mode, cell_labels=cell_labels,
             nucleus_threshold=nucleus_threshold, nucleus_min_diameter=float(nucleus_min_diameter or 0), nucleus_max_diameter=float(nucleus_max_diameter or 0),
             split_nuclei=bool(split_nuclei), nucleus_smoothing=float(nucleus_smoothing or 0), nucleus_min_distance=float(nucleus_min_distance or 0), cell_expand=float(cell_expand or 0),
             cell_threshold=cell_threshold, cell_polarity=cell_polarity, cell_min_diameter=float(cell_min_diameter or 0), split_cells=bool(split_cells),
             cargo_threshold=cargo_threshold, cargo_smoothing=float(cargo_smoothing or 0), cargo_min_area=float(cargo_min_area or 0),
             positivity_rule=positivity_rule, positivity_min=float(positivity_min), exclude_border_cells=bool(exclude_border_cells), pixel_size=float(pixel_size or 0))
    if not Path(path).is_dir():
        if hand_counts:
            _fail("hand_counts works with a folder of images. Give the folder as path")
        m, outputs, table = _uptake_one(path, s)
        summary = "%d of %d cells positive (%.1f percent, rule: %s %g); %d cargo objects in cells, %.3f for each cell; cargo threshold %.4g" % (m["n_positive"], m["n_cells"], 100 * m["fraction_positive"], positivity_rule, float(positivity_min), m["n_cargo_in_cells"], m["mean_cargo_per_cell"], m["cargo_threshold"])
        if "n_nuclei" in m:
            summary += "; %d nuclei" % m["n_nuclei"]
        return {"ok": True, "summary": summary, "metrics": m, "outputs": outputs, "table": table}
    if cell_labels:
        _fail("cell_labels works with one image. For a folder, run the tool once for each image with its label image")
    files = _list_images(path, pattern)
    hand = None
    if hand_counts:
        _check_file(hand_counts, "hand count")
        with open(hand_counts, newline="", encoding="utf-8-sig") as f:
            header = [c.strip().lower() for c in next(csv.reader(f), [])]
        hand = _read_hand_counts(hand_counts, [c for c in ("total", "positive") if c in header] or ["total"])
    rows, outputs, comp = [], [], {"total": ([], []), "positive": ([], [])}
    tot_cells = tot_pos = tot_cargo = 0
    for f in files:
        m, outs, _ = _uptake_one(str(f), s)
        outputs.append(outs[0])
        tot_cells += m["n_cells"]
        tot_pos += m["n_positive"]
        tot_cargo += m["n_cargo_in_cells"]
        row = [f.name, m["n_cells"], m["n_positive"], round(m["fraction_positive"], 5), m["n_cargo_in_cells"], round(m["mean_cargo_per_cell"], 5), m.get("n_nuclei", "")]
        if hand is not None:
            hv = hand.get(f.stem.lower())
            row += [hv.get("total", "") if hv else "", hv.get("positive", "") if hv else ""]
            if hv:
                for k, auto in (("total", m["n_cells"]), ("positive", m["n_positive"])):
                    if k in hv:
                        comp[k][0].append(auto)
                        comp[k][1].append(hv[k])
        rows.append(row)
    cols = ["image", "cells", "positive", "fraction_positive", "cargo_in_cells", "cargo_per_cell", "nuclei"] + (["hand_total", "hand_positive"] if hand is not None else [])
    cpath = os.path.abspath("uptake_counts.csv")
    _write_csv(cpath, cols, rows)
    fr = [r_[3] for r_ in rows]
    metrics = {"n_images": len(rows), "total_cells": tot_cells, "total_positive": tot_pos, "pooled_fraction_positive": tot_pos / tot_cells if tot_cells else 0.0,
               "mean_fraction_positive": float(np.mean(fr)), "sd_fraction_positive": float(np.std(fr, ddof=1)) if len(fr) > 1 else 0.0, "total_cargo_in_cells": tot_cargo,
               "mean_cargo_per_cell": tot_cargo / tot_cells if tot_cells else 0.0}
    summary = "%d images: %d of %d cells positive (pooled %.1f percent; mean of images %.1f percent); %.3f cargo objects for each cell" % (len(rows), tot_pos, tot_cells, 100 * metrics["pooled_fraction_positive"], 100 * metrics["mean_fraction_positive"], metrics["mean_cargo_per_cell"])
    if hand is not None:
        if not any(comp[k][0] for k in comp):
            _fail("no image name in the hand count file %s matches an image in the folder %s" % (hand_counts, path))
        for k, (a_, h_) in comp.items():
            if a_:
                ag = _agreement(a_, h_)
                for kk, vv in ag.items():
                    metrics["%s_%s" % (k, kk)] = vv
                outputs = _plot_outputs(_compare_plot(os.path.abspath("%s_vs_hand" % k), None, a_, h_, "%s cells" % ("all" if k == "total" else "positive")), "tool against hand count, %s cells" % k) + outputs
                summary += "; %s cells against hand counts: mean difference %.2f, mean absolute difference %.2f" % (k, ag["mean_difference"], ag["mean_abs_difference"])
    outputs.insert(0, {"path": cpath, "kind": "table", "name": "counts for each image"})
    return {"ok": True, "summary": summary, "metrics": metrics, "outputs": outputs, "table": _table(cpath, cols, rows, preview=30)}


def _find_dish(chs):
    from skimage.transform import hough_circle, hough_circle_peaks

    full = _full_scale(chs[0].dtype)
    gray = np.mean([c.astype(float) / full for c in chs[:3]], axis=0)
    h, w = gray.shape
    f = max(1, int(math.ceil(max(h, w) / 400.0)))
    small = gray[::f, ::f]
    edges = feature.canny(small, sigma=2)
    if edges.sum() < 50:
        _fail("no dish found: the image has almost no edges. Set find_dish to false")
    m = min(small.shape)
    radii = np.arange(int(0.25 * m), int(0.62 * m), 2)
    acc = hough_circle(edges, radii)
    score, cx, cy, rad = hough_circle_peaks(acc, radii, total_num_peaks=1)
    if not len(score) or score[0] < 0.15:
        _fail("no dish found: no circle with a radius of 25 to 62 percent of the image width fits the edges. Set find_dish to false, or crop the image to the dish")
    return float(cy[0] * f), float(cx[0] * f), float(rad[0] * f)


def _count_colonies_one(path, channel, colony_polarity, find_dish, rim_margin, background_radius, threshold, min_diameter, max_diameter, min_circularity, split_touching, pixel_size):
    if colony_polarity not in ("bright", "dark"):
        _fail("colony_polarity is %s. Use bright or dark" % colony_polarity)
    arr, info = _read(path)
    chs = _channels(arr, info["axes"])
    if chs[0].ndim != 2:
        _fail("the file %s is a stack. Give one plane of the plate" % path)
    plane = _pick(chs, channel, "channel") / _full_scale(chs[0].dtype)
    h, w = plane.shape
    yy, xx = np.ogrid[:h, :w]
    if find_dish:
        cy, cx, r = _find_dish(chs)
        inner = (yy - cy) ** 2 + (xx - cx) ** 2 <= (r * (1 - rim_margin)) ** 2
    else:
        cy, cx, r = h / 2.0, w / 2.0, 0.0
        inner = np.ones((h, w), dtype=bool)
    sig = plane if colony_polarity == "bright" else 1.0 - plane
    if background_radius > 0:
        sig = sig - filters.gaussian(sig, background_radius)
    t = _threshold(sig[inner], threshold, "threshold")
    mask = (sig > t) & inner
    mask = morphology.opening(mask, morphology.disk(1))
    mask = ndi.binary_fill_holes(mask)
    if split_touching:
        lab = _split_by_distance(mask, 0.25 * min_diameter if min_diameter else 2.0)
    else:
        lab = measure.label(mask)
    amin = math.pi * (min_diameter / 2.0) ** 2 if min_diameter else 0.0
    amax = math.pi * (max_diameter / 2.0) ** 2 if max_diameter else float("inf")
    rows, kept, small, large, notround = [], [], [], [], []
    for p in measure.regionprops(lab):
        a = float(p.area)
        per = float(p.perimeter) or 1.0
        circ = min(1.0, 4 * math.pi * a / (per * per))
        if a < amin:
            cls = "too small"
            small.append(p.label)
        elif a > amax:
            cls = "too large"
            large.append(p.label)
        elif circ < min_circularity:
            cls = "not round"
            notround.append(p.label)
        else:
            cls = "counted"
            kept.append(p.label)
        rows.append([p.label, cls, int(a), round(float(p.equivalent_diameter_area), 2), round(circ, 3), round(p.centroid[0], 1), round(p.centroid[1], 1)])
    n = len(kept)
    diam = np.array([r_[3] for r_ in rows if r_[1] == "counted"], dtype=float)
    metrics = {
        "n_colonies": n,
        "n_too_small": len(small),
        "n_too_large": len(large),
        "n_not_round": len(notround),
        "n_objects_found": len(rows),
        "threshold": t,
        "mean_diameter_px": float(diam.mean()) if n else 0.0,
        "dish_radius_px": float(r),
        "analysis_area_px": int(inner.sum()),
    }
    if pixel_size > 0 and n:
        metrics["mean_diameter_um"] = metrics["mean_diameter_px"] * pixel_size
    stem = _stem(path)
    cols = ["object", "class", "area_px", "diameter_px", "circularity", "centroid_y", "centroid_x"]
    cpath = _out(stem, "colonies.csv")
    _write_csv(cpath, cols, rows)
    base = np.dstack([c.astype(float) / _full_scale(chs[0].dtype) for c in chs[:3]]) if len(chs) >= 3 else _stretch(chs[0])

    def edge(ids):
        return segmentation.find_boundaries(np.where(np.isin(lab, ids), lab, 0), mode="outer") if ids else None

    layers = [(edge(kept), GREEN), (edge(small), YELLOW), (edge(large), ORANGE), (edge(notround), PURPLE)]
    legend = [
        (GREEN, "Counted colony: %d" % n),
        (YELLOW, "Left out, less than %g pixels across: %d" % (min_diameter, len(small))),
        (ORANGE, "Left out, more than %s pixels across: %d" % (("%g" % max_diameter) if max_diameter else "no limit", len(large))),
        (PURPLE, "Left out, roundness below %g: %d" % (min_circularity, len(notround))),
    ]
    if find_dish:
        rr = r * (1 - rim_margin)
        ring = np.abs(np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2) - rr) < max(1.0, max(h, w) / 800.0)
        layers.append((ring, SKY))
        legend.append((SKY, "Edge of the counted area: dish minus a rim of %g percent of the radius" % (rim_margin * 100)))
    ov = _overlay(_out(stem, "colonies_overlay.png"), base, layers, legend, title="%s: %d colonies" % (Path(path).name, n))
    fig, ax = plt.subplots(figsize=(5, 3.4))
    alld = np.array([r_[3] for r_ in rows], dtype=float)
    if alld.size:
        ax.hist(alld, bins=min(40, max(5, alld.size // 2)), color=BLUE)
    if min_diameter:
        ax.axvline(min_diameter, color=ORANGE, lw=1.5, ls="--", label="smallest colony")
    if max_diameter:
        ax.axvline(max_diameter, color=VERMILION, lw=1.5, label="largest colony")
    ax.set_xlabel("object diameter (pixels)")
    ax.set_ylabel("objects (count)")
    if ax.get_legend_handles_labels()[0]:
        ax.legend(frameon=False)
    ax.spines[["top", "right"]].set_visible(False)
    plots = _save_plot(fig, _out(stem, "colony_sizes"))
    outputs = [{"path": ov, "kind": "image", "name": "QC overlay"}] + _plot_outputs(plots, "colony size histogram") + [{"path": cpath, "kind": "table", "name": "objects"}]
    return metrics, outputs, _table(cpath, cols, rows)


def count_colonies(path, pattern="*", hand_counts=None, channel="gray", colony_polarity="bright", find_dish=True, rim_margin=0.05, background_radius=0, threshold="otsu", min_diameter=0, max_diameter=0, min_circularity=0.0, split_touching=False, pixel_size=0.0):
    if not 0 <= float(rim_margin) < 1:
        _fail("rim_margin is %s. Give a fraction of the dish radius from 0 to below 1" % rim_margin)
    args = (channel, colony_polarity, bool(find_dish), float(rim_margin), float(background_radius or 0), threshold, float(min_diameter or 0), float(max_diameter or 0), float(min_circularity or 0), bool(split_touching), float(pixel_size or 0))
    if not Path(path).is_dir():
        if hand_counts:
            _fail("hand_counts works with a folder of images. Give the folder as path")
        m, outputs, table = _count_colonies_one(path, *args)
        summary = "%d colonies in %s (%s threshold %.4g); left out: %d too small, %d too large, %d not round" % (m["n_colonies"], Path(path).name, threshold, m["threshold"], m["n_too_small"], m["n_too_large"], m["n_not_round"])
        return {"ok": True, "summary": summary, "metrics": m, "outputs": outputs, "table": table}
    files = _list_images(path, pattern)
    hand = _read_hand_counts(hand_counts, ["count"]) if hand_counts else None
    rows, outputs, auto_v, hand_v, names = [], [], [], [], []
    for f in files:
        m, outs, _ = _count_colonies_one(str(f), *args)
        outputs.append(outs[0])
        row = [f.name, m["n_colonies"], m["n_too_small"], m["n_too_large"], m["n_not_round"], round(m["threshold"], 5)]
        if hand is not None:
            hv = hand.get(f.stem.lower())
            row += [hv["count"] if hv else "", (m["n_colonies"] - hv["count"]) if hv else ""]
            if hv:
                auto_v.append(m["n_colonies"])
                hand_v.append(hv["count"])
                names.append(f.name)
        rows.append(row)
    cols = ["image", "colonies", "too_small", "too_large", "not_round", "threshold"] + (["hand_count", "difference"] if hand is not None else [])
    cpath = os.path.abspath("colony_counts.csv")
    _write_csv(cpath, cols, rows)
    counts = [r_[1] for r_ in rows]
    metrics = {"n_images": len(rows), "total_colonies": int(sum(counts)), "mean_colonies_per_image": float(np.mean(counts))}
    summary = "%d images, %d colonies in total, mean %.1f for each image" % (len(rows), metrics["total_colonies"], metrics["mean_colonies_per_image"])
    if hand is not None:
        if not auto_v:
            _fail("no image name in the hand count file %s matches an image in the folder %s" % (hand_counts, path))
        ag = _agreement(auto_v, hand_v)
        metrics.update(ag)
        metrics["total_hand_count"] = float(sum(hand_v))
        outputs = _plot_outputs(_compare_plot(os.path.abspath("colonies_vs_hand"), names, auto_v, hand_v, "colonies"), "tool against hand count") + outputs
        summary += "; against %d hand counts: mean difference %.2f, mean absolute difference %.2f colonies" % (ag["n_compared"], ag["mean_difference"], ag["mean_abs_difference"])
    outputs.insert(0, {"path": cpath, "kind": "table", "name": "counts for each image"})
    return {"ok": True, "summary": summary, "metrics": metrics, "outputs": outputs, "table": _table(cpath, cols, rows, preview=30)}


def clonogenic_survival(table, control, condition_column="condition", colonies_column="colonies", seeded_column="cells_seeded", dose_column=""):
    _check_file(table, "table")
    with open(table, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        _fail("the table %s has no rows" % table)
    cols = list(rows[0].keys())
    for c in [condition_column, colonies_column, seeded_column] + ([dose_column] if dose_column else []):
        if c not in cols:
            _fail("the table %s has no column %s. Its columns are: %s" % (table, c, ", ".join(cols)))
    data = []
    for r_ in rows:
        try:
            col_n, seed_n = float(r_[colonies_column]), float(r_[seeded_column])
            dose = float(r_[dose_column]) if dose_column else None
        except ValueError:
            _fail("the table %s has a value that is not a number in the row for %s" % (table, r_[condition_column]))
        if seed_n <= 0:
            _fail("the table %s has %g cells seeded for %s. The number of cells seeded must be above zero" % (table, seed_n, r_[condition_column]))
        data.append((str(r_[condition_column]), col_n, seed_n, dose))
    ctrl = [d for d in data if d[0] == str(control)]
    if not ctrl:
        _fail("the control condition %r is not in the column %s. The conditions are: %s" % (control, condition_column, ", ".join(sorted({d[0] for d in data}))))
    pe = float(np.mean([d[1] / d[2] for d in ctrl]))
    if pe <= 0:
        _fail("the plating efficiency of the control %s is zero, so the surviving fraction is not defined" % control)
    groups = {}
    for d in data:
        groups.setdefault(d[0], []).append(d)
    out_rows, metrics = [], {"plating_efficiency_control": pe}
    for g, ds in groups.items():
        pes = [d[1] / d[2] for d in ds]
        sfs = [p / pe for p in pes]
        sd = float(np.std(sfs, ddof=1)) if len(sfs) > 1 else float("nan")
        out_rows.append([g, ds[0][3] if dose_column else "", len(ds), round(float(np.mean(pes)), 6), round(float(np.mean(sfs)), 6), round(sd, 6) if np.isfinite(sd) else ""])
        key = "".join(ch if ch.isalnum() else "_" for ch in g).strip("_").lower()
        metrics["plating_efficiency_" + key] = float(np.mean(pes))
        metrics["surviving_fraction_" + key] = float(np.mean(sfs))
    ocols = ["condition", "dose", "n_replicates", "plating_efficiency", "surviving_fraction", "sd_surviving_fraction"]
    cpath = os.path.abspath(_stem(table) + "_survival.csv")
    _write_csv(cpath, ocols, out_rows)
    fig, ax = plt.subplots(figsize=(5, 3.6))
    if dose_column:
        ax.scatter([d[3] for d in data], [(d[1] / d[2]) / pe for d in data], color=GREY, s=14, label="replicate")
        means = sorted((r_[1], r_[4]) for r_ in out_rows)
        ax.plot([m_[0] for m_ in means], [m_[1] for m_ in means], color=BLUE, marker="o", label="mean")
        ax.set_yscale("log")
        ax.set_xlabel("dose (%s)" % dose_column)
        ax.legend(frameon=False)
    else:
        ax.bar([r_[0] for r_ in out_rows], [r_[4] for r_ in out_rows], color=BLUE)
        ax.set_xlabel("condition")
    ax.set_ylabel("surviving fraction")
    ax.spines[["top", "right"]].set_visible(False)
    plots = _save_plot(fig, os.path.abspath(_stem(table) + "_survival"))
    summary = "Plating efficiency of %s: %.4f. Surviving fraction: %s" % (control, pe, "; ".join("%s %.4f" % (r_[0], r_[4]) for r_ in out_rows))
    return {"ok": True, "summary": summary, "metrics": metrics, "outputs": [{"path": cpath, "kind": "table", "name": "survival"}] + _plot_outputs(plots, "survival plot"), "table": _table(cpath, ocols, out_rows)}
