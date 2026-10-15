import json
import os
import re
import sys

try:
    import numpy as np
except ImportError:
    np = None

IMAGE = {".tif", ".tiff", ".png", ".jpg", ".jpeg", ".bmp"}
TABLE = {".csv", ".tsv", ".xlsx", ".xls"}
TOKEN = re.compile(r"(?:^|[_\-. ])(ch\d+|c\d|channel\d+|overlay|merge|merged|composite|dapi|hoechst|gfp|rfp|fitc|tritc|cy5|bf|brightfield|phase|red|green|blue)$", re.I)
COLOR_WORDS = {"dapi": "blue", "hoechst": "blue", "blue": "blue", "gfp": "green", "fitc": "green", "green": "green", "rfp": "red", "tritc": "red", "red": "red", "cy5": "far red"}
OVERLAY = ("overlay", "merge", "merged", "composite")


def plane_list(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in (".tif", ".tiff"):
        import tifffile

        with tifffile.TiffFile(path) as tf:
            s = tf.series[0]
            arr = s.asarray()
            axes = s.axes
            ij = tf.imagej_metadata or {}
            n_series = len(tf.series)
        labels = ij.get("Labels") if isinstance(ij.get("Labels"), list) else None
        warnings = []
        notes = []
        if n_series > 1:
            warnings.append("The file has %d image series. Cuvette read only the first series." % n_series)
        while arr.ndim > 2:
            if arr.ndim == 3 and any(a in "CS" for a in axes):
                break
            z = next((k for k, a in enumerate(axes) if a in "ZTQ"), None)
            if z is not None:
                notes.append("The file has %d planes on the axis %s. Cuvette used the maximum projection of this axis." % (arr.shape[z], axes[z]))
                arr = arr.max(axis=z)
                axes = axes[:z] + axes[z + 1:]
                continue
            if arr.ndim == 3:
                break
            k = next((k for k, a in enumerate(axes) if a not in "CSYX"), 0)
            warnings.append("The file has %d planes on the axis %s. Cuvette read only the first plane of this axis." % (arr.shape[k], axes[k]))
            arr = np.take(arr, 0, axis=k)
            axes = axes[:k] + axes[k + 1:]
        if arr.ndim == 2:
            return [arr], False, labels, str(arr.dtype), warnings, notes
        p = next((k for k, a in enumerate(axes) if a in "CS"), None)
        if p is None:
            p = next(k for k, a in enumerate(axes) if a not in "YX")
        if p == arr.ndim - 1 and arr.shape[-1] <= 4:
            rgb = arr.shape[-1] in (3, 4) and axes[-1] == "S"
            return [arr[..., i] for i in range(3 if rgb else arr.shape[-1])], rgb, labels, str(arr.dtype), warnings, notes
        arr = np.moveaxis(arr, p, 0)
        return [arr[i] for i in range(arr.shape[0])], False, labels, str(arr.dtype), warnings, notes
    from PIL import Image

    im = Image.open(path)
    if im.mode in ("RGB", "RGBA", "P", "CMYK"):
        arr = np.asarray(im.convert("RGB"))
        return [arr[..., i] for i in range(3)], True, None, str(arr.dtype), [], []
    arr = np.asarray(im)
    return [arr], False, None, str(arr.dtype), [], []


def full_range(planes, dtype):
    top = max(float(p.max()) for p in planes)
    if dtype == "uint8":
        return 255.0
    if dtype.startswith("float"):
        return 1.0 if top <= 1.0 else max(top, 1.0)
    for bits in (10, 12, 14, 16):
        if top < 2**bits:
            return float(2**bits - 1)
    return max(top, 1.0)


def stats(p, full):
    q = np.percentile(p, [1, 50, 99])
    return {"min": float(p.min()), "max": float(p.max()), "mean": round(float(p.mean()), 2), "p1": float(q[0]), "median": float(q[1]), "p99": float(q[2]), "full": full}


def brightness_kind(s):
    full, med, p1, p99 = s["full"], s["median"], s["p1"], s["p99"]
    if p99 <= 0:
        return "empty"
    if med / full > 0.2 and (p99 - p1) / max(med, min(1.0, full / 255)) < 1.2:
        return "brightfield"
    if med < 0.25 * p99 or med / full < 0.08:
        return "fluorescence"
    return "unclear"


def channel_kinds(planes, rgb, full):
    st = [stats(p, full) for p in planes]
    if not rgb:
        return [{"stats": s, "kind": brightness_kind(s)} for s in st]
    a = [p.astype(np.float32) for p in planes]
    if float(np.mean(np.abs(a[0] - a[1]) > 0.1 * full) + np.mean(np.abs(a[1] - a[2]) > 0.1 * full)) < 0.001:
        return [{"stats": st[0], "kind": brightness_kind(st[0])}]
    means = [s["mean"] for s in st]
    top = max(means)
    colors = [c for c, m in zip(["red", "green", "blue"], means) if m > 0.25 * top and m > 0.002 * full]
    if brightness_kind(stats(np.mean(a, axis=0), full)) == "brightfield":
        return [{"stats": stats(np.mean(a, axis=0), full), "kind": "brightfield"}]
    return [{"stats": s, "kind": "fluorescence", "color": c} for c, s in zip(["red", "green", "blue"], st) if c in colors]


def preview(planes, rgb, out_dir, name):
    from PIL import Image

    def stretch(p):
        lo, hi = np.percentile(p, [1, 99.5])
        return np.clip((p.astype(np.float32) - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)

    img = np.stack([stretch(p) for p in planes[:3]], axis=-1) if rgb else stretch(planes[0])
    im = Image.fromarray(img)
    im.thumbnail((256, 256))
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "preview_%s.png" % re.sub(r"[^\w.-]+", "_", name))
    im.save(path)
    return path


def describe_image(path, out_dir):
    if np is None:
        raise RuntimeError("numpy is not installed")
    planes, rgb, labels, dtype, warnings, notes = plane_list(path)
    full = full_range(planes, dtype)
    stem = os.path.splitext(os.path.basename(path))[0]
    m = TOKEN.search(stem)
    token = m.group(1) if m else None
    chans = []
    for i, k in enumerate(channel_kinds(planes, rgb, full)):
        color = k.get("color")
        if not color and token and token.lower() in COLOR_WORDS and k["kind"] == "fluorescence":
            color = COLOR_WORDS[token.lower()]
        chans.append({"label": labels[i] if labels and i < len(labels) else None, "kind": k["kind"], "color": color, "stats": k["stats"]})
    overlay = bool(token and token.lower() in OVERLAY) or (rgb and len(chans) > 1)
    h, w = planes[0].shape[:2]
    try:
        prev = preview(planes, rgb, out_dir, stem)
    except Exception:
        prev = None
    return {"path": path, "name": os.path.basename(path), "token": token, "width": int(w), "height": int(h), "dtype": dtype, "bits": np.dtype(dtype).itemsize * 8, "warnings": warnings, "notes": notes, "rgb": rgb, "channels": chans, "overlay": overlay, "preview": prev}


def image_phrase(d):
    if d["overlay"]:
        return "an overlay that combines the channels"
    parts = []
    for c in d["channels"]:
        if c["kind"] == "fluorescence":
            parts.append("%s fluorescence" % c["color"] if c["color"] else "fluorescence (the file does not give the color)")
        elif c["kind"] == "unclear":
            parts.append("unclear (not clearly brightfield or fluorescence)")
        else:
            parts.append(c["kind"])
    return " and ".join(parts)


def walk(root, depth=3):
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if not d.startswith("."))
        if dirpath[len(root):].count(os.sep) >= depth:
            dirs[:] = []
        for f in sorted(files):
            if not f.startswith("."):
                yield os.path.join(dirpath, f)


def field_of(path):
    stem = os.path.splitext(os.path.basename(path))[0]
    m = TOKEN.search(stem)
    return (os.path.dirname(path), stem[: m.start()] if m else stem), (m.group(1) if m else None)


def inspect_folder(root, out_dir):
    files = list(walk(root))
    subs = sorted(d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d)) and not d.startswith("."))
    groups = []
    for g in subs or ["."]:
        base = os.path.join(root, g) if g != "." else root
        mine = [f for f in files if (os.path.dirname(f) == root if g == "." else f.startswith(base + os.sep))]
        if not mine:
            continue
        types = {}
        for f in mine:
            e = os.path.splitext(f)[1].lower() or "(none)"
            types[e] = types.get(e, 0) + 1
        fields = {field_of(f)[0] for f in mine if os.path.splitext(f)[1].lower() in IMAGE}
        groups.append({"name": os.path.basename(root.rstrip(os.sep)) if g == "." else g, "files": len(mine), "types": types, "fields": len(fields), "samples": [os.path.relpath(f, root) for f in mine[:3]]})
    images = [f for f in files if os.path.splitext(f)[1].lower() in IMAGE]
    tables = [f for f in files if os.path.splitext(f)[1].lower() in TABLE]
    by_field = {}
    for f in images:
        key, tok = field_of(f)
        by_field.setdefault(key, []).append((tok or "", f))
    tokens = sorted({t for v in by_field.values() for t, _ in v if t}, key=str.lower)
    sample = []
    unreadable = []
    if by_field:
        first = sorted(by_field)[0]
        for _, f in sorted(by_field[first], key=lambda x: x[0].lower())[:4]:
            try:
                sample.append(describe_image(f, out_dir))
            except Exception as e:
                unreadable.append("Cuvette could not read the image %s: %s" % (os.path.basename(f), e))
    return {"kind": "folder", "warnings": unreadable, "groups": groups, "n_files": len(files), "n_images": len(images), "n_fields": len(by_field), "tokens": tokens, "sample": sample, "tables": [os.path.relpath(t, root) for t in tables[:10]], "n_tables": len(tables)}


def inspect_table_plain(path):
    import csv

    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f, delimiter="\t" if path.lower().endswith(".tsv") else ","))
    head = rows[0] if rows else []
    body = rows[1:]
    cols = []
    for i, name in enumerate(head):
        vals = [r[i] for r in body if i < len(r)]
        filled = [v for v in vals if v.strip()]
        try:
            nums = [float(v) for v in filled]
        except ValueError:
            nums = None
        col = {"name": name, "type": "number" if nums is not None and filled else "text", "n_missing": len(vals) - len(filled)}
        if nums:
            col["range"] = [min(nums), max(nums)]
        elif 1 < len(set(filled)) <= 12:
            col["values"] = {k: filled.count(k) for k in dict.fromkeys(filled)}
        cols.append(col)
    return {"kind": "table", "rows": len(body), "columns": cols, "read_table": None, "head": [r[: len(head)] for r in body[:5]]}


def inspect_table(path, out_dir):
    try:
        import pandas as pd
    except ImportError:
        if path.lower().endswith((".csv", ".tsv")):
            return inspect_table_plain(path)
        raise

    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "catalog", "tables"))
    os.environ.setdefault("CUVETTE_OUTPUT_DIR", out_dir)
    try:
        from ga_tables import read_table, text_encoding
    except Exception as e:
        read_table, text_encoding = None, None
        r = {"ok": False, "error": str(e)}
    if read_table:
        try:
            r = read_table(path)
        except Exception as e:
            r = {"ok": False, "error": str(e)}
    if r.get("ok") and r.get("path"):
        frame = pd.read_csv(r["path"])
    elif path.lower().endswith((".csv", ".tsv")):
        frame = pd.read_csv(path, sep=None, engine="python", encoding=text_encoding(path) if text_encoding else "utf-8-sig", encoding_errors="replace")
    else:
        frame = pd.read_excel(path)
    cols = []
    for c in frame.columns:
        s = frame[c]
        num = pd.api.types.is_numeric_dtype(s)
        col = {"name": str(c), "type": "number" if num else "text", "n_missing": int(s.isna().sum())}
        if not num and 1 < s.nunique() <= 12:
            col["values"] = {str(k): int(v) for k, v in s.value_counts().items()}
        if num and s.notna().any():
            finite = s.astype(float)
            finite = finite[np.isfinite(finite)]
            if len(finite):
                col["range"] = [float(finite.min()), float(finite.max())]
        cols.append(col)
    return {"kind": "table", "rows": int(len(frame)), "columns": cols, "read_table": r.get("summary"), "head": frame.head(5).astype(str).values.tolist()}


def depth(d):
    if d["dtype"].startswith("float"):
        return "%d-bit floating point" % d["bits"]
    return "%d-bit" % d["bits"]


def count(n, one, many):
    return "%d %s" % (n, one if n == 1 else many)


def summary(d, path):
    name = os.path.basename(path.rstrip(os.sep)) or path
    out = []
    if d["kind"] == "folder":
        gs = d["groups"]
        if gs:
            out.append("%s has %s: %s." % (name, count(len(gs), "group", "groups"), "; ".join("%s (%s%s)" % (g["name"], count(g["files"], "file", "files"), ", " + count(g["fields"], "field", "fields") if g["fields"] else "") for g in gs[:12])))
        imgs = d["sample"]
        if imgs:
            if len(imgs) > 1 and all(i["token"] for i in imgs):
                desc = ["%s is %s" % (i["token"], image_phrase(i)) for i in imgs]
                out.append("Each field has %d images: %s." % (len(imgs), ", ".join(desc[:-1]) + ", and " + desc[-1]))
            else:
                i = imgs[0]
                out.append("Each image (for example %s) has %s: %s." % (i["name"], count(len(i["channels"]), "channel", "channels"), image_phrase(i)))
            out.append("Image size %d x %d, %s." % (imgs[0]["width"], imgs[0]["height"], depth(imgs[0])))
        if d["n_tables"]:
            out.append("Tables: %s." % ", ".join(d["tables"][:5]))
    elif d["kind"] == "image":
        out.append("%s has %s: %s. Size %d x %d, %s." % (d["name"], count(len(d["channels"]), "channel", "channels"), image_phrase(d), d["width"], d["height"], depth(d)))
    elif d["kind"] == "table":
        out.append("%s: %s, %s: %s." % (name, count(d["rows"], "row", "rows"), count(len(d["columns"]), "column", "columns"), ", ".join("%s (%s)" % (c["name"], c["type"]) for c in d["columns"][:20])))
        for c in d["columns"]:
            if c.get("values"):
                out.append("Column %s has the values %s." % (c["name"], ", ".join("%s (%d)" % kv for kv in list(c["values"].items())[:12])))
    else:
        out.append("%s is a file of %d bytes." % (name, d["size"]))
    for w in dict.fromkeys(w for i in (d["sample"] + [d] if d["kind"] == "folder" else [d]) for k in ("warnings", "notes") for w in i.get(k, [])):
        out.append(w)
    if d["images_seen"] and not d["dropped"] and "blue" not in d["colors"] and (d["colors"] or "fluorescence" not in d["kinds"]):
        out.append("There is no nuclear stain (no blue channel, and no DAPI or Hoechst in the names).")
    return " ".join(out)


def clean(x):
    if isinstance(x, float):
        return x if np.isfinite(x) else None
    if isinstance(x, dict):
        return {k: clean(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [clean(v) for v in x]
    return x


def main():
    path = os.path.abspath(os.path.expanduser(sys.argv[1]))
    out_dir = os.path.abspath(sys.argv[2])
    os.makedirs(out_dir, exist_ok=True)
    os.chdir(out_dir)
    if not os.path.exists(path):
        print(json.dumps({"ok": False, "error": "No file or folder at %s." % path}))
        return
    ext = os.path.splitext(path)[1].lower()
    if os.path.isdir(path):
        d = inspect_folder(path, out_dir)
        imgs = d["sample"]
    elif ext in IMAGE:
        try:
            d = {"kind": "image", **describe_image(path, out_dir)}
            imgs = [d]
        except Exception as e:
            print(json.dumps({"ok": False, "error": "The image %s could not be read: %s" % (os.path.basename(path), e)}))
            return
    elif ext in TABLE:
        d = inspect_table(path, out_dir)
        imgs = []
    else:
        d = {"kind": "file", "size": os.path.getsize(path)}
        imgs = []
    tokens = d.get("tokens") or ([d["token"]] if d.get("token") else [])
    d["colors"] = sorted({c["color"] for i in imgs for c in i["channels"] if c.get("color")} | {COLOR_WORDS[t.lower()] for t in tokens if t.lower() in COLOR_WORDS})
    d["kinds"] = sorted({c["kind"] for i in imgs for c in i["channels"]})
    d["images_seen"] = bool(imgs)
    d["dropped"] = any(i.get("warnings") for i in imgs) or bool(d.get("warnings"))
    d["previews"] = [i["preview"] for i in imgs if i.get("preview")]
    d["summary"] = summary(d, path)
    d["ok"] = True
    print(json.dumps(clean(d), default=str))


main()
