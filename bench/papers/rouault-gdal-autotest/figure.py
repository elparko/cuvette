import argparse
import json
import re
import sys
import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.ticker
import matplotlib.pyplot as plt
import numpy as np

BLUE = "#1b6aa8"
ORANGE = "#d08a1e"
SKY = "#5aa0cf"
VERMILION = "#c2381f"
GREEN = "#2b8a6e"
PURPLE = "#7a3b9c"
YELLOW = "#e0b83a"
GREY = "#7a8091"
GREEN_BG = "#d6ebe3"
RED_BG = "#f6d5d0"
GREY_BG = "#e8eaf0"


class NoOutput(Exception):
    pass


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--session", required=True)
    ap.add_argument("--run", required=True)
    ap.add_argument("--expected", required=True)
    ap.add_argument("--out", required=True)
    return ap.parse_args()


def load_run(path):
    run = json.loads(Path(path).read_text())
    if isinstance(run, dict) and "runs" in run:
        run = run["runs"][0]
    return run


def load_log(session):
    out = []
    p = Path(session) / "log.jsonl"
    if not p.exists():
        return out
    for line in p.read_text(errors="replace").splitlines():
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def calls(log, tool, ok=True):
    args = {}
    found = []
    for e in log:
        d = e.get("data") or {}
        if e.get("kind") == "tool_call" and d.get("tool") == tool:
            args[d.get("callId")] = d.get("args") or {}
        elif e.get("kind") == "tool_result" and d.get("tool") == tool:
            if ok and not d.get("ok"):
                continue
            try:
                res = json.loads(d.get("text") or "")
            except ValueError:
                res = {}
            found.append({"args": args.get(d.get("callId"), {}), "res": res})
    return found


def local(session, p):
    if not p:
        return None
    s = str(p)
    for tag in ("/work/", "/blobs/"):
        i = s.rfind(tag)
        if i >= 0:
            c = Path(session) / s[i + 1:]
            if c.exists():
                return c
    return Path(s) if Path(s).exists() else None


def out_file(session, res, name_ext):
    for o in res.get("outputs") or []:
        if str(o.get("path", "")).lower().endswith(name_ext):
            f = local(session, o["path"])
            if f:
                return f
    return None


def find_input(session, log, basename):
    c = Path(session) / "input" / basename
    if c.exists():
        return c
    for e in log:
        d = e.get("data") or {}
        if e.get("kind") != "tool_call":
            continue
        for v in (d.get("args") or {}).values():
            if isinstance(v, str) and v.endswith(basename) and Path(v).exists():
                return Path(v)
    return None


def table_df(session, call):
    import pandas as pd

    res = call["res"]
    for o in res.get("outputs") or []:
        if str(o.get("path", "")).endswith(".csv"):
            f = local(session, o["path"])
            if f:
                return pd.read_csv(f)
    t = res.get("table")
    if t and t.get("rows"):
        return pd.DataFrame(t["rows"], columns=t["columns"])
    return None


def fmt(v):
    if v is None:
        return "-"
    if isinstance(v, bool):
        return str(v)
    if isinstance(v, (int, float)):
        if float(v).is_integer() and abs(v) < 1e9:
            return str(int(v))
        if abs(v) < 0.001 and v != 0:
            return f"{v:.3g}"
        return f"{v:.5g}"
    return str(v)[:14]


def table_rows(run, expected_path):
    items = run.get("items")
    if items:
        return [(it.get("description") or it.get("key", ""), it.get("expected"), it.get("computed"), it.get("reported"), it.get("inAnswer", True)) for it in items]
    rows = []
    try:
        for line in Path(expected_path).read_text().splitlines():
            m = re.search(r'description:\s*"([^"]*)".*?value:\s*([-\d.eE+]+)', line)
            if m:
                rows.append((m.group(1), float(m.group(2)), None, None, True))
    except OSError:
        pass
    return rows


def draw_table(ax, rows):
    ax.axis("off")
    if not rows:
        ax.text(0.5, 0.5, "no expected items", ha="center", va="center", fontsize=12)
        return
    cells, colors = [], []
    for desc, exp, comp, rep, in_answer in rows:
        if not comp or comp.get("value") is None:
            c, cc = "none", GREY_BG
        else:
            c, cc = fmt(comp["value"]), GREEN_BG if comp.get("pass") else RED_BG
        if not rep or (rep.get("value") is None and rep.get("pass") is None):
            r, rc = "-", GREY_BG
        elif rep.get("value") is None:
            r, rc = "not stated", RED_BG
        else:
            r, rc = fmt(rep["value"]), GREEN_BG if rep.get("pass") else RED_BG
        cells.append(["\n".join(textwrap.wrap(str(desc), 30)[:2]), fmt(exp), c, r])
        colors.append(["white", "white", cc, rc])
    t = ax.table(
        cellText=cells,
        cellColours=colors,
        colLabels=["item", "expected", "computed", "reported"],
        colColours=["#bbbbbb"] * 4,
        colWidths=[0.46, 0.17, 0.19, 0.18],
        loc="upper center",
        cellLoc="center",
    )
    t.auto_set_font_size(False)
    t.set_fontsize(9)
    t.scale(1, 2.6 if len(rows) < 8 else (2.0 if len(rows) < 12 else 1.55))
    ax.set_title("green = pass, red = fail, grey = not produced", fontsize=10, color="#454b5a")


def no_output(ax, reason):
    ax.clear()
    ax.axis("off")
    ax.add_patch(plt.Rectangle((0.03, 0.2), 0.94, 0.6, fill=False, ec="#888888", lw=2, ls="--", transform=ax.transAxes))
    ax.text(0.5, 0.5, "\n".join(textwrap.wrap("no output to draw: " + reason, 38)), ha="center", va="center", fontsize=12, transform=ax.transAxes)


def last_error(run, log):
    if run.get("error"):
        return str(run["error"])[:160]
    for e in reversed(log):
        d = e.get("data") or {}
        if e.get("kind") == "tool_result" and not d.get("ok"):
            try:
                msg = json.loads(d.get("text") or "").get("error")
            except ValueError:
                msg = None
            return str(msg or d.get("summary") or "a tool failed")[:160]
    return "the log has no usable result"


ARGS = None


def main_figure(draw_left, title):
    global ARGS
    a = parse_args()
    ARGS = a
    run = load_run(a.run)
    log = load_log(a.session)
    fig = plt.figure(figsize=(16, 8), dpi=100)
    gs = fig.add_gridspec(1, 2, width_ratios=[1.05, 1], left=0.05, right=0.985, top=0.88, bottom=0.07, wspace=0.1)
    axl = fig.add_subplot(gs[0])
    axr = fig.add_subplot(gs[1])
    try:
        draw_left(axl, a.session, run, log)
    except NoOutput as exc:
        no_output(axl, str(exc) if str(exc) != "-" else last_error(run, log))
    except Exception as exc:
        no_output(axl, f"{type(exc).__name__}: {exc}")
    draw_table(axr, table_rows(run, a.expected))
    fig.suptitle(f"{title} | {run.get('model', '?')} | run {run.get('status', '?')}", fontsize=15, y=0.96)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(a.out, dpi=100)


def need(found, what, run, log):
    if not found:
        raise NoOutput(f"no {what} in the log. {last_error(run, log)}")
    return found[-1]


def draw(ax, session, run, log):
    from matplotlib.path import Path as MPath
    from PIL import Image

    info = calls(log, "raster_info")
    zon = calls(log, "zonal_stats")
    if not info and not zon:
        raise NoOutput("-")
    first = (info or zon)[0]["args"]
    rname = Path(str(first.get("path") or first.get("raster") or "byte.tif")).name
    src = find_input(session, log, rname)
    m = info[-1]["res"].get("metrics", {}) if info else {}
    if src is None:
        plots = calls(log, "plot_map")
        png = out_file(session, plots[-1]["res"], ".png") if plots else None
        if png is None:
            raise NoOutput("the raster file and the map plot are not in the session")
        ax.imshow(plt.imread(png))
        ax.axis("off")
        ax.set_title("Map written by the run (raster file not found)", fontsize=12)
        return
    a = np.array(Image.open(src)).astype(float)
    h, w = a.shape[:2]
    px, py = float(m.get("pixel_x", 60)), float(m.get("pixel_y", 60))
    ox, oy = float(m.get("origin_x", 440720)), float(m.get("origin_y", 3751320))
    ext = [ox, ox + w * px, oy - h * py, oy]
    im = ax.imshow(a, extent=ext, cmap="gray", interpolation="nearest")
    plt.colorbar(im, ax=ax, fraction=0.04, pad=0.02, label="pixel value")
    zfile = None
    for z in zon:
        zfile = find_input(session, log, Path(str(z["args"].get("zones", "zones.geojson"))).name)
        if zfile:
            break
    if zfile is None:
        zfile = find_input(session, log, "zones.geojson")
    colors = [ORANGE, SKY, PURPLE, GREEN]
    cx = ox + (np.arange(w) + 0.5) * px
    cy = oy - (np.arange(h) + 0.5) * py
    gx, gy = np.meshgrid(cx, cy)
    centers = np.c_[gx.ravel(), gy.ravel()]
    if zfile is not None:
        feats = json.loads(Path(zfile).read_text())["features"]
        field = "id"
        for z in zon:
            field = z["args"].get("id_field") or field
        for i, f in enumerate(feats):
            ring = np.array(f["geometry"]["coordinates"][0])
            name = f["properties"].get(field, i + 1)
            col = colors[i % len(colors)]
            ax.plot(ring[:, 0], ring[:, 1], color=col, lw=3)
            inside = MPath(ring).contains_points(centers)
            ax.plot(centers[inside, 0], centers[inside, 1], ".", color=col, ms=5)
            ax.text(ring[:, 0].min() + 8, ring[:, 1].max() - 8, f"zone {name}", color=col, fontsize=12, fontweight="bold", va="top", bbox=dict(fc="black", alpha=0.6, ec="none", pad=1.5))
    ax.ticklabel_format(useOffset=False, style="plain")
    ax.set_xlabel("easting (m)")
    ax.set_ylabel("northing (m)")
    ax.tick_params(labelsize=8)
    ax.set_title("byte.tif with the two zones (dots: pixel centres inside a zone)", fontsize=12)
    lines = []
    if m:
        lines.append(f"raster {int(m['width'])} x {int(m['height'])} px, EPSG:{int(m['epsg'])}, pixel {px:g} m")
    warp = calls(log, "reproject_raster")
    if warp:
        wm = warp[-1]["res"].get("metrics", {})
        lines.append(f"after warp: {int(wm['width'])} x {int(wm['height'])} px (EPSG:{int(wm['epsg'])})")
    for z in zon:
        d = z["res"].get("data", {})
        rule = "all touched" if d.get("pixels") == "all_touched" else "centres"
        for zz in d.get("zones", []):
            lines.append(f"zone {zz['zone']}, {rule}: {zz['count']} px, mean {zz['mean']:.2f}")
    ax.text(0.5, -0.17, "\n".join(lines), transform=ax.transAxes, ha="center", va="top", fontsize=10)


if __name__ == "__main__":
    main_figure(draw, "GDAL byte.tif zones")
