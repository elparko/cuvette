import csv
import os
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image
from scipy import ndimage as ndi
from skimage import color, filters, io, measure, morphology, segmentation

METHODS = ["otsu", "li", "triangle", "isodata", "yen", "mean", "minimum", "manual"]
CHANNELS = ["gray", "hematoxylin", "eosin", "red", "green", "blue"]


def _read(path):
    p = Path(path)
    if not p.is_file():
        raise FileNotFoundError("file not found: %s" % path)
    if p.suffix.lower() == ".gif":
        with Image.open(p) as im:
            if im.mode == "P":
                return np.array(im)
            return np.array(im.convert("RGB"))
    img = io.imread(str(p))
    if img.ndim == 4 and img.shape[0] == 1:
        img = img[0]
    if img.ndim == 3 and img.shape[-1] == 4:
        img = img[..., :3]
    return img


def _plane(img, channel):
    if img.ndim == 2:
        return img.astype(float)
    if img.ndim != 3 or img.shape[-1] != 3:
        raise ValueError("expected a gray or RGB image, got shape %s" % (img.shape,))
    if channel == "gray":
        return color.rgb2gray(img)
    if channel in ("hematoxylin", "eosin"):
        return color.rgb2hed(img)[..., 0 if channel == "hematoxylin" else 1]
    return img[..., ["red", "green", "blue"].index(channel)].astype(float)


def _threshold(plane, method, value):
    if method == "manual":
        if value is None:
            raise ValueError("method manual needs threshold_value")
        return float(value)
    return float(getattr(filters, "threshold_" + method)(plane))


def _mask(plane, method, value, objects):
    t = _threshold(plane, method, value)
    return (plane > t if objects == "bright" else plane <= t), t


def _clean(mask, fill_holes):
    return ndi.binary_fill_holes(mask) if fill_holes else mask


def _label(mask, min_size, exclude_border, split_touching, min_distance):
    lab = measure.label(mask, connectivity=2)
    if split_touching:
        dist = ndi.distance_transform_edt(mask)
        peaks = measure.label(morphology.h_maxima(dist, 0.5)) if min_distance <= 0 else None
        if peaks is None:
            from skimage.feature import peak_local_max

            coords = peak_local_max(dist, min_distance=int(min_distance), labels=lab, exclude_border=False)
            peaks = np.zeros(lab.shape, dtype=int)
            peaks[tuple(coords.T)] = np.arange(1, len(coords) + 1)
        lab = segmentation.watershed(-dist, peaks, mask=mask)
    n_small = 0
    if min_size > 0:
        areas = np.bincount(lab.ravel())
        small = np.where(areas < min_size)[0]
        small = small[small > 0]
        n_small = len(small)
        lab[np.isin(lab, small)] = 0
    n_border = 0
    if exclude_border:
        before = len(np.unique(lab)) - 1
        lab = segmentation.clear_border(lab)
        n_border = before - (len(np.unique(lab)) - 1)
    lab, _, _ = segmentation.relabel_sequential(lab)
    return lab, n_small, n_border


def _stats(lab, pixel_size):
    props = measure.regionprops(lab)
    areas = np.array([p.area for p in props], dtype=float)
    scale = pixel_size * pixel_size if pixel_size > 0 else 1.0
    return props, areas, scale


def _write_table(path, columns, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(columns)
        w.writerows(rows)


def _table(path, columns, rows, preview=12):
    return {"columns": columns, "rows": rows[:preview], "n_rows": len(rows), "path": os.path.abspath(path)}


def _outline_png(path, img, lab):
    if img.ndim == 2:
        lo, hi = np.percentile(img, [1, 99.5])
        base = np.clip((img.astype(float) - lo) / max(hi - lo, 1e-9), 0, 1)
        base = np.dstack([base] * 3)
    else:
        base = img.astype(float) / 255.0 if img.dtype == np.uint8 else img / img.max()
    edge = segmentation.find_boundaries(lab, mode="outer")
    base = base.copy()
    base[edge] = [1.0, 0.1, 0.1]
    Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8)).save(path)


def _save_labels(path, lab):
    tifffile.imwrite(path, lab.astype(np.uint16 if lab.max() < 65535 else np.uint32))


def _out(stem, suffix):
    return os.path.abspath("%s_%s" % (stem, suffix))


def _stem(path):
    return Path(path).stem


def inspect_image(path):
    img = _read(path)
    ext = Path(path).suffix.lower()
    channels = 1 if img.ndim == 2 else img.shape[-1]
    maxv = np.iinfo(img.dtype).max if img.dtype.kind in "ui" else float(img.max())
    sat = float((img == maxv).mean()) if img.dtype.kind in "ui" else 0.0
    warnings = []
    if ext in (".jpg", ".jpeg"):
        warnings.append("JPEG files lose pixel values. Do not use them for measurement.")
    if sat > 0.01:
        warnings.append("%.1f percent of the pixels are at the maximum value." % (sat * 100))
    if ext == ".gif" and img.ndim == 2:
        warnings.append("Palette image. The tool reads the palette index values, as ImageJ does.")
    h, w = img.shape[:2]
    return {
        "ok": True,
        "summary": "%d by %d pixels, %d channel(s), %s, min %g, max %g" % (w, h, channels, img.dtype, img.min(), img.max()),
        "metrics": {
            "width": w,
            "height": h,
            "channels": channels,
            "bit_depth": img.dtype.itemsize * 8,
            "min_value": float(img.min()),
            "max_value": float(img.max()),
            "mean_value": float(img.mean()),
            "saturated_fraction": sat,
        },
        "data": {"dtype": str(img.dtype), "warnings": warnings, "calibrated": False},
        "outputs": [],
    }


def threshold_image(path, channel="gray", method="otsu", threshold_value=None, objects="bright", fill_holes=False):
    img = _read(path)
    plane = _plane(img, channel)
    mask, t = _mask(plane, method, threshold_value, objects)
    mask = _clean(mask, fill_holes)
    stem = _stem(path)
    mpath = _out(stem, "mask.tif")
    tifffile.imwrite(mpath, (mask * 255).astype(np.uint8))
    ppath = _out(stem, "mask.png")
    Image.fromarray((mask * 255).astype(np.uint8)).save(ppath)
    frac = float(mask.mean())
    return {
        "ok": True,
        "summary": "%s threshold %.4g on %s; %.1f percent of the pixels are objects" % (method, t, channel, frac * 100),
        "metrics": {"threshold": t, "foreground_fraction": frac, "foreground_pixels": int(mask.sum())},
        "outputs": [{"path": mpath, "kind": "image", "name": "mask"}, {"path": ppath, "kind": "image", "name": "mask preview"}],
        "mask": mpath,
    }


def label_objects(mask, min_size=0, exclude_border=False, split_touching=False, min_distance=0, pixel_size=0.0, intensity_image=None):
    m = _read(mask) > 0
    if m.ndim != 2:
        raise ValueError("the mask must be a 2D image")
    lab, n_small, n_border = _label(m, min_size, exclude_border, split_touching, min_distance)
    props, areas, scale = _stats(lab, pixel_size)
    stem = _stem(mask)
    lpath, cpath, ppath = _out(stem, "labels.tif"), _out(stem, "objects.csv"), _out(stem, "outlines.png")
    _save_labels(lpath, lab)
    base = _read(intensity_image) if intensity_image else m.astype(np.uint8) * 255
    _outline_png(ppath, base, lab)
    cols = ["label", "area_px", "centroid_y", "centroid_x", "perimeter_px", "eccentricity"]
    rows = [[p.label, int(p.area), round(p.centroid[0], 2), round(p.centroid[1], 2), round(p.perimeter, 2), round(p.eccentricity, 4)] for p in props]
    _write_table(cpath, cols, rows)
    return _result(lab, areas, scale, n_small, n_border, lpath, cpath, ppath, rows, cols)


def _result(lab, areas, scale, n_small, n_border, lpath, cpath, ppath, rows, cols):
    n = len(areas)
    metrics = {
        "n_objects": n,
        "mean_area_px": float(areas.mean()) if n else 0.0,
        "median_area_px": float(np.median(areas)) if n else 0.0,
        "removed_small": n_small,
        "removed_border": n_border,
    }
    if scale != 1.0:
        metrics["mean_area_calibrated"] = metrics["mean_area_px"] * scale
    return {
        "ok": True,
        "summary": "%d objects, mean area %.1f px" % (n, metrics["mean_area_px"]),
        "metrics": metrics,
        "outputs": [
            {"path": lpath, "kind": "image", "name": "label image"},
            {"path": ppath, "kind": "image", "name": "outlines"},
            {"path": cpath, "kind": "table", "name": "objects"},
        ],
        "table": _table(cpath, cols, rows),
    }


def count_objects(
    path,
    channel="gray",
    method="otsu",
    threshold_value=None,
    objects="bright",
    fill_holes=False,
    min_size=0,
    exclude_border=False,
    split_touching=False,
    min_distance=0,
    pixel_size=0.0,
):
    img = _read(path)
    plane = _plane(img, channel)
    mask, t = _mask(plane, method, threshold_value, objects)
    mask = _clean(mask, fill_holes)
    lab, n_small, n_border = _label(mask, min_size, exclude_border, split_touching, min_distance)
    props, areas, scale = _stats(lab, pixel_size)
    stem = _stem(path)
    lpath, cpath, ppath = _out(stem, "labels.tif"), _out(stem, "objects.csv"), _out(stem, "outlines.png")
    _save_labels(lpath, lab)
    _outline_png(ppath, img, lab)
    cols = ["label", "area_px", "centroid_y", "centroid_x", "perimeter_px", "eccentricity"]
    rows = [[p.label, int(p.area), round(p.centroid[0], 2), round(p.centroid[1], 2), round(p.perimeter, 2), round(p.eccentricity, 4)] for p in props]
    _write_table(cpath, cols, rows)
    r = _result(lab, areas, scale, n_small, n_border, lpath, cpath, ppath, rows, cols)
    r["metrics"]["threshold"] = t
    r["metrics"]["foreground_fraction"] = float(mask.mean())
    r["summary"] = "%d objects with %s threshold %.4g on %s; mean area %.1f px" % (r["metrics"]["n_objects"], method, t, channel, r["metrics"]["mean_area_px"])
    r["data"] = {"area_unit": "pixel" if scale == 1.0 else "calibrated unit squared", "calibrated": scale != 1.0}
    return r


def _read_truth(path):
    p = Path(path)
    if p.suffix.lower() in (".tif", ".tiff"):
        arr = tifffile.imread(str(p))
    else:
        arr = io.imread(str(p))
    if arr.ndim == 3:
        arr = arr[..., 0]
    if arr.dtype == np.uint8:
        return measure.label(arr)
    return arr.astype(np.int64)


def _score(pred, truth):
    p, t = pred > 0, truth > 0
    inter = int((p & t).sum())
    dice = 2.0 * inter / max(int(p.sum()) + int(t.sum()), 1)
    iou = inter / max(int((p | t).sum()), 1)
    npred, ntrue = len(np.unique(pred)) - 1, len(np.unique(truth)) - 1
    out = {"dice": dice, "pixel_iou": iou, "n_pred": npred, "n_truth": ntrue}
    pairs = np.stack([pred.ravel(), truth.ravel()], axis=1)
    pairs = pairs[(pairs[:, 0] > 0) & (pairs[:, 1] > 0)]
    f1s = []
    if len(pairs):
        uniq, cnt = np.unique(pairs, axis=0, return_counts=True)
        pa = np.bincount(pred.ravel())
        ta = np.bincount(truth.ravel())
        ious = cnt / (pa[uniq[:, 0]] + ta[uniq[:, 1]] - cnt)
    else:
        ious = np.array([])
    for thr in np.arange(0.5, 0.96, 0.05):
        tp = int((ious >= thr).sum())
        f1s.append(2.0 * tp / max(npred + ntrue, 1))
        if abs(thr - 0.5) < 1e-9:
            out["f1_iou_0.5"] = f1s[-1]
        if abs(thr - 0.7) < 1e-9:
            out["f1_iou_0.7"] = f1s[-1]
            out["missed_fraction_iou_0.7"] = 1.0 - tp / max(ntrue, 1)
    out["average_f1"] = float(np.mean(f1s))
    return out


def compare_masks(prediction, truth):
    pred = _read(prediction)
    if pred.ndim == 3:
        pred = pred[..., 0]
    pred = pred.astype(np.int64)
    tr = _read_truth(truth)
    if pred.shape != tr.shape:
        raise ValueError("the shapes differ: %s and %s" % (pred.shape, tr.shape))
    s = _score(pred, tr)
    return {
        "ok": True,
        "summary": "Dice %.3f, F1 at IoU 0.5 %.3f, average F1 %.3f; %d objects found, %d true objects" % (s["dice"], s["f1_iou_0.5"], s["average_f1"], s["n_pred"], s["n_truth"]),
        "metrics": s,
        "outputs": [],
    }


def _listed(path):
    if not path:
        return None
    with open(path, encoding="utf-8") as f:
        return {Path(line.strip()).name for line in f if line.strip()}


def _truth_index(folder, match):
    idx = {}
    for p in Path(folder).rglob("*"):
        if p.is_file() and not p.name.startswith(".") and (not match or match in str(p.parent)):
            idx.setdefault(p.stem, p)
    return idx


def batch_count(
    folder,
    pattern="*.tif",
    only_listed_in=None,
    truth_folder=None,
    truth_match="",
    channel="gray",
    method="otsu",
    threshold_value=None,
    objects="bright",
    fill_holes=False,
    min_size=0,
    exclude_border=False,
    split_touching=False,
    min_distance=0,
):
    root = Path(folder)
    files = sorted(p for p in root.glob(pattern) if p.is_file() and not p.name.startswith("."))
    listed = _listed(only_listed_in)
    if listed is not None:
        files = [p for p in files if p.name in listed or p.stem in {Path(n).stem for n in listed}]
    if not files:
        raise FileNotFoundError("no files match %s in %s" % (pattern, folder))
    truth = _truth_index(truth_folder, truth_match) if truth_folder else {}
    cols = ["image", "group", "n_objects", "mean_area_px", "n_truth", "dice", "f1_iou_0.5", "average_f1"]
    rows = []
    for p in files:
        img = _read(p)
        plane = _plane(img, channel)
        mask, _ = _mask(plane, method, threshold_value, objects)
        lab, _, _ = _label(_clean(mask, fill_holes), min_size, exclude_border, split_touching, min_distance)
        areas = np.bincount(lab.ravel())[1:]
        rel = p.relative_to(root)
        group = rel.parts[0] if len(rel.parts) > 1 else "all"
        row = [str(rel), group, int(len(areas)), round(float(areas.mean()), 2) if len(areas) else 0.0, "", "", "", ""]
        if p.stem in truth:
            s = _score(lab.astype(np.int64), _read_truth(truth[p.stem]))
            row[4:] = [s["n_truth"], round(s["dice"], 4), round(s["f1_iou_0.5"], 4), round(s["average_f1"], 4)]
        rows.append(row)
    ipath, gpath = os.path.abspath("per_image.csv"), os.path.abspath("per_group.csv")
    _write_table(ipath, cols, rows)
    groups = {}
    for r in rows:
        groups.setdefault(r[1], []).append(r)
    gcols = ["group", "n_images", "total_objects", "objects_per_image", "total_truth", "mean_dice"]
    grows = []
    for g, rs in sorted(groups.items()):
        scored = [r for r in rs if r[5] != ""]
        grows.append([
            g,
            len(rs),
            sum(r[2] for r in rs),
            round(sum(r[2] for r in rs) / len(rs), 2),
            sum(r[4] for r in scored) if scored else "",
            round(float(np.mean([r[5] for r in scored])), 4) if scored else "",
        ])
    _write_table(gpath, gcols, grows)
    scored = [r for r in rows if r[5] != ""]
    metrics = {"n_images": len(rows), "total_objects": sum(r[2] for r in rows), "mean_objects_per_image": sum(r[2] for r in rows) / len(rows), "n_groups": len(groups)}
    if scored:
        metrics.update(
            {
                "n_scored": len(scored),
                "total_truth": sum(r[4] for r in scored),
                "mean_dice": float(np.mean([r[5] for r in scored])),
                "mean_f1_iou_0.5": float(np.mean([r[6] for r in scored])),
                "mean_average_f1": float(np.mean([r[7] for r in scored])),
            }
        )
    text = "%d images in %d group(s), %d objects" % (len(rows), len(groups), metrics["total_objects"])
    if scored:
        text += "; mean Dice %.3f over %d scored images" % (metrics["mean_dice"], len(scored))
    return {
        "ok": True,
        "summary": text,
        "metrics": metrics,
        "outputs": [{"path": ipath, "kind": "table", "name": "per image"}, {"path": gpath, "kind": "table", "name": "per group"}],
        "table": _table(gpath, gcols, grows, preview=40),
    }
