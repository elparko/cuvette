import csv
import os
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image
from scipy import ndimage as ndi

MODELS = ["cpsam_v2", "cpsam"]
EIGHT = np.ones((3, 3), dtype=int)
_loaded = {}


def _read(path, notes=None):
    p = Path(path)
    if not p.is_file():
        raise FileNotFoundError("file not found: %s" % path)
    if p.suffix.lower() in (".tif", ".tiff"):
        with tifffile.TiffFile(str(p)) as tf:
            series = tf.series[0]
            img, axes = series.asarray(), series.axes
        keep = [i for i, n in enumerate(img.shape) if n > 1]
        axes = "".join(axes[i] for i in keep) if len(axes) == img.ndim else ""
        img = img.reshape([img.shape[i] for i in keep])
        if img.ndim == 3 and img.shape[0] <= 4 < img.shape[-1]:
            if axes[:1] in ("Z", "T", "R", "L", "H"):
                raise ValueError("%s is a stack of %d planes (axes %s). The tool segments one 2D image with up to 4 channels. Give one plane, or a projection of the stack" % (path, img.shape[0], axes))
            if axes[:1] != "C" and notes is not None:
                notes.append("The file has %d planes and no axes information. The tool read them as %d channels. If they are z planes or time points, give one plane or a projection." % (img.shape[0], img.shape[0]))
            img = np.moveaxis(img, 0, -1)
        if img.ndim > 3 or (img.ndim == 3 and img.shape[-1] > 4):
            raise ValueError("%s has shape %s. The tool segments one 2D image with up to 4 channels. Give one plane, or a projection of the stack" % (path, img.shape))
    else:
        with Image.open(p) as im:
            img = np.array(im if im.mode in ("L", "RGB", "I;16") else im.convert("RGB"))
    return img


def _model(name, use_gpu):
    key = (name, bool(use_gpu))
    if key not in _loaded:
        from cellpose import models

        _loaded[key] = models.CellposeModel(gpu=bool(use_gpu), pretrained_model=name)
    return _loaded[key]


def _label_values(arr):
    out = np.zeros(arr.shape, dtype=np.int64)
    n = 0
    for v in np.unique(arr):
        if v == 0:
            continue
        lab, k = ndi.label(arr == v, structure=EIGHT)
        out[lab > 0] = lab[lab > 0] + n
        n += k
    return out


def _read_truth(path):
    p = Path(path)
    arr = tifffile.imread(str(p)) if p.suffix.lower() in (".tif", ".tiff") else np.array(Image.open(p))
    if arr.ndim == 3:
        arr = arr[..., 0]
    if arr.dtype == np.uint8:
        return _label_values(arr)
    return arr.astype(np.int64)


def _score(pred, truth):
    p, t = pred > 0, truth > 0
    inter = int((p & t).sum())
    dice = 2.0 * inter / max(int(p.sum()) + int(t.sum()), 1)
    iou = inter / max(int((p | t).sum()), 1)
    npred, ntrue = int(np.unique(pred[pred > 0]).size), int(np.unique(truth[truth > 0]).size)
    out = {"dice": dice, "pixel_iou": iou, "n_pred": npred, "n_truth": ntrue}
    pairs = np.stack([pred.ravel(), truth.ravel()], axis=1)
    pairs = pairs[(pairs[:, 0] > 0) & (pairs[:, 1] > 0)]
    if len(pairs):
        uniq, cnt = np.unique(pairs, axis=0, return_counts=True)
        pa = np.bincount(pred.ravel())
        ta = np.bincount(truth.ravel())
        ious = cnt / (pa[uniq[:, 0]] + ta[uniq[:, 1]] - cnt)
    else:
        ious = np.array([])
    f1s = []
    for thr in np.arange(0.5, 0.96, 0.05):
        tp = int((ious >= thr).sum())
        f1s.append(2.0 * tp / max(npred + ntrue, 1))
        if abs(thr - 0.5) < 1e-9:
            out["f1_iou_50"] = f1s[-1]
        if abs(thr - 0.7) < 1e-9:
            out["f1_iou_70"] = f1s[-1]
            out["missed_fraction_iou_70"] = 1.0 - tp / max(ntrue, 1)
    out["average_f1"] = float(np.mean(f1s))
    return out


def _write_table(path, columns, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(columns)
        w.writerows(rows)


def _table(path, columns, rows, preview=12):
    return {"columns": columns, "rows": rows[:preview], "n_rows": len(rows), "path": os.path.abspath(path)}


def _drop_border(lab):
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    edge = edge[edge > 0]
    out = lab.copy()
    out[np.isin(out, edge)] = 0
    return out, len(edge)


def _run(img, model_type, cell_diameter, flow_threshold, cellprob_threshold, min_cell_size, exclude_border_cells, use_gpu):
    mk, _, _ = _model(model_type, use_gpu).eval(
        img,
        diameter=cell_diameter or None,
        flow_threshold=flow_threshold,
        cellprob_threshold=cellprob_threshold,
        min_size=int(min_cell_size),
        channel_axis=2 if img.ndim == 3 else None,
    )
    mk = mk.astype(np.int64)
    n_border = 0
    if exclude_border_cells:
        mk, n_border = _drop_border(mk)
    return mk, n_border


def _save_labels(path, lab):
    tifffile.imwrite(path, lab.astype(np.uint16 if lab.max() <= np.iinfo(np.uint16).max else np.uint32))


def _outline_png(path, img, lab):
    from scipy.ndimage import binary_dilation

    gray = img if img.ndim == 2 else img.mean(axis=2)
    lo, hi = np.percentile(gray, [1, 99.5])
    base = np.clip((gray.astype(float) - lo) / max(hi - lo, 1e-9), 0, 1)
    rgb = np.dstack([base] * 3)
    edge = (binary_dilation(lab > 0, structure=EIGHT) & ~(lab > 0)) | ((lab > 0) & (ndi.grey_erosion(lab, footprint=EIGHT) != lab))
    rgb[edge] = [1.0, 0.1, 0.1]
    Image.fromarray((rgb * 255).astype(np.uint8)).save(path)


def _areas(lab):
    return np.bincount(lab.ravel())[1:][np.bincount(lab.ravel())[1:] > 0]


IMAGE_EXT = {".png", ".tif", ".tiff", ".jpg", ".jpeg", ".gif", ".bmp"}


def _describe_folder(path):
    root = Path(path)
    groups = {}
    for p in sorted(root.rglob("*")):
        if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in IMAGE_EXT:
            parts = p.relative_to(root).parts
            key = "/".join((["*"] if len(parts) > 2 else []) + list(parts[1:-1] if len(parts) > 2 else parts[:-1]) + ["*" + p.suffix])
            g = groups.setdefault(key, {"n_files": 0, "example": str(Path(*parts))})
            g["n_files"] += 1
    total = sum(g["n_files"] for g in groups.values())
    lines = ["%s: %d files, for example %s" % (k, g["n_files"], g["example"]) for k, g in groups.items()]
    return {
        "ok": True,
        "summary": "Folder with %d image files in %d pattern(s). %s" % (total, len(groups), "; ".join(lines[:6])),
        "metrics": {"n_files": total, "n_patterns": len(groups)},
        "data": {"patterns": groups, "note": "Give the folder as the path and one pattern to the segmentation tool. Give the folder of the hand-drawn masks as truth_folder and a part of its path as truth_match."},
        "outputs": [],
    }


def inspect_image(path):
    if Path(path).is_dir():
        return _describe_folder(path)
    warnings = []
    img = _read(path, warnings)
    ext = Path(path).suffix.lower()
    channels = 1 if img.ndim == 2 else img.shape[-1]
    sat = float((img == img.max()).mean()) if img.dtype.kind in "ui" and img.max() > img.min() else 0.0
    if ext in (".jpg", ".jpeg"):
        warnings.append("JPEG files lose pixel values. Do not use them for measurement.")
    if sat > 0.01:
        warnings.append("%.1f percent of the pixels are at the maximum value." % (sat * 100))
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


def segment_cells(
    path,
    model_type="cpsam_v2",
    cell_diameter=None,
    flow_threshold=0.4,
    cellprob_threshold=0.0,
    min_cell_size=15,
    exclude_border_cells=False,
    pixel_size=0.0,
    use_gpu=True,
    pattern="*",
    only_listed_in=None,
    truth_folder=None,
    truth_match="",
):
    if Path(path).is_dir():
        return _segment_folder(path, pattern, only_listed_in, truth_folder, truth_match, model_type, cell_diameter, flow_threshold, cellprob_threshold, min_cell_size, exclude_border_cells, use_gpu)
    notes = []
    img = _read(path, notes)
    lab, n_border = _run(img, model_type, cell_diameter, flow_threshold, cellprob_threshold, min_cell_size, exclude_border_cells, use_gpu)
    from scipy.ndimage import center_of_mass

    ids = np.unique(lab)
    ids = ids[ids > 0]
    areas = np.bincount(lab.ravel())[ids]
    cents = center_of_mass(lab > 0, lab, ids) if len(ids) else []
    stem = Path(path).stem
    lpath, cpath, ppath = os.path.abspath(stem + "_masks.tif"), os.path.abspath(stem + "_cells.csv"), os.path.abspath(stem + "_outlines.png")
    _save_labels(lpath, lab)
    _outline_png(ppath, img, lab)
    cols = ["label", "area_px", "centroid_y", "centroid_x"]
    rows = [[int(i), int(a), round(float(c[0]), 2), round(float(c[1]), 2)] for i, a, c in zip(ids, areas, cents)]
    _write_table(cpath, cols, rows)
    n = len(ids)
    calibrated = pixel_size > 0
    scale = pixel_size * pixel_size if calibrated else 1.0
    metrics = {
        "n_cells": n,
        "mean_area_px": float(areas.mean()) if n else 0.0,
        "median_area_px": float(np.median(areas)) if n else 0.0,
        "removed_border": n_border,
    }
    if calibrated:
        metrics["mean_area_calibrated"] = metrics["mean_area_px"] * scale
    return {
        "ok": True,
        "summary": "%d cells with the %s model; mean area %.1f px%s" % (n, model_type, metrics["mean_area_px"], "".join(". " + note for note in notes)),
        "metrics": metrics,
        "outputs": [
            {"path": lpath, "kind": "image", "name": "label image"},
            {"path": ppath, "kind": "image", "name": "outlines"},
            {"path": cpath, "kind": "table", "name": "cells"},
        ],
        "table": _table(cpath, cols, rows),
        "label_image": lpath,
        "data": {"area_unit": "calibrated unit squared" if calibrated else "pixel", "calibrated": calibrated, "model": model_type, "warnings": notes},
    }


def _listed(path):
    if not path:
        return None
    with open(path, encoding="utf-8") as f:
        return {Path(line.strip()).stem for line in f if line.strip()}


def _truth_index(folder, match):
    match = (match or "").strip("*")
    idx = {}
    for p in Path(folder).rglob("*"):
        if p.is_file() and not p.name.startswith(".") and (not match or match in str(p.parent)):
            idx.setdefault(p.stem, p)
    return idx


def _segment_folder(folder, pattern, only_listed_in, truth_folder, truth_match, model_type, cell_diameter, flow_threshold, cellprob_threshold, min_cell_size, exclude_border_cells, use_gpu):
    root = Path(folder)
    files = sorted(p for p in root.glob(pattern) if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in IMAGE_EXT)
    listed = _listed(only_listed_in)
    if listed is not None:
        files = [p for p in files if p.stem in listed]
    if not files:
        raise FileNotFoundError("no files match %s in %s" % (pattern, folder))
    if truth_folder and not Path(truth_folder).is_dir():
        name = Path(str(truth_folder).strip("*/")).name
        if name and any(d.is_dir() and d.name == name for d in root.rglob("*")):
            truth_folder, truth_match = str(root), truth_match or name
        else:
            raise FileNotFoundError("truth folder not found: %s. Give a real folder path." % truth_folder)
    truth = _truth_index(truth_folder, truth_match) if truth_folder else {}
    if truth_folder and not any(p.stem in truth for p in files):
        raise FileNotFoundError("no truth file in %s (with %r in its path) has the same name stem as the images" % (truth_folder, truth_match))
    cols = ["image", "group", "n_cells", "mean_area_px", "n_truth", "dice", "f1_iou_50", "average_f1", "missed_fraction_iou_70"]
    rows = []
    for p in files:
        lab, _ = _run(_read(p), model_type, cell_diameter, flow_threshold, cellprob_threshold, min_cell_size, exclude_border_cells, use_gpu)
        areas = _areas(lab)
        rel = p.relative_to(root)
        row = [str(rel), rel.parts[0] if len(rel.parts) > 1 else "all", int(len(areas)), round(float(areas.mean()), 2) if len(areas) else 0.0, "", "", "", "", ""]
        if p.stem in truth:
            s = _score(lab, _read_truth(truth[p.stem]))
            row[4:] = [s["n_truth"], round(s["dice"], 4), round(s["f1_iou_50"], 4), round(s["average_f1"], 4), round(s["missed_fraction_iou_70"], 4)]
        rows.append(row)
    ipath = os.path.abspath("per_image.csv")
    _write_table(ipath, cols, rows)
    scored = [r for r in rows if r[5] != ""]
    metrics = {"n_images": len(rows), "n_cells": sum(r[2] for r in rows), "mean_cells_per_image": sum(r[2] for r in rows) / len(rows)}
    if scored:
        metrics.update(
            {
                "n_scored": len(scored),
                "total_truth": sum(r[4] for r in scored),
                "mean_dice": float(np.mean([r[5] for r in scored])),
                "mean_f1_iou_50": float(np.mean([r[6] for r in scored])),
                "mean_average_f1": float(np.mean([r[7] for r in scored])),
                "mean_missed_fraction_iou_70": float(np.mean([r[8] for r in scored])),
            }
        )
    text = "%d images, %d cells" % (len(rows), metrics["n_cells"])
    if scored:
        text += "; %d true cells; mean Dice %.3f, average F1 %.3f, missed at IoU 0.7 %.3f" % (
            metrics["total_truth"],
            metrics["mean_dice"],
            metrics["mean_average_f1"],
            metrics["mean_missed_fraction_iou_70"],
        )
    return {
        "ok": True,
        "summary": text,
        "metrics": metrics,
        "outputs": [{"path": ipath, "kind": "table", "name": "per image"}],
        "table": _table(ipath, cols, rows, preview=15),
    }


def score_masks(prediction, truth):
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
        "summary": "Dice %.3f, average F1 %.3f, missed %.3f at IoU 0.7; %d cells found, %d true cells" % (s["dice"], s["average_f1"], s["missed_fraction_iou_70"], s["n_pred"], s["n_truth"]),
        "metrics": s,
        "outputs": [],
    }
