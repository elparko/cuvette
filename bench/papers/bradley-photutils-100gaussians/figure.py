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


def read_fits(path):
    raw = Path(path).read_bytes()
    hdr, pos = {}, 0
    while True:
        card = raw[pos:pos + 80].decode("ascii", "replace")
        pos += 80
        key = card[:8].strip()
        if key == "END":
            break
        if card[8:10] == "= ":
            hdr[key] = card[10:].split("/")[0].strip()
        if pos > len(raw):
            raise NoOutput("the FITS file has no END card")
    start = ((pos + 2879) // 2880) * 2880
    bitpix = int(hdr["BITPIX"])
    n1, n2 = int(hdr["NAXIS1"]), int(hdr["NAXIS2"])
    dt = {8: "u1", 16: ">i2", 32: ">i4", -32: ">f4", -64: ">f8"}[bitpix]
    arr = np.frombuffer(raw, dtype=dt, count=n1 * n2, offset=start).reshape(n2, n1).astype(float)
    return arr * float(hdr.get("BSCALE", 1)) + float(hdr.get("BZERO", 0))


def draw(ax, session, run, log):
    det = need(calls(log, "detect_sources"), "source detection", run, log)
    dt = table_df(session, det)
    apc = calls(log, "measure_apertures")
    ph = table_df(session, apc[-1]) if apc else None
    fits = local(session, det["args"].get("path"))
    img = None
    if fits is not None and str(fits).lower().endswith(".fits"):
        img = read_fits(fits)
    if img is None:
        tool_png = out_file(session, apc[-1]["res"], ".png") if apc else out_file(session, det["res"], ".png")
        if tool_png is None:
            raise NoOutput("the image file and the tool plots are not in the session")
        ax.imshow(plt.imread(tool_png))
        ax.axis("off")
        ax.set_title("Plot written by the run (image file not found)", fontsize=12)
        return
    from matplotlib.colors import AsinhNorm

    ax.imshow(img, origin="lower", cmap="gray", norm=AsinhNorm(linear_width=4, vmin=-4, vmax=max(float(img.max()), 20)), interpolation="nearest")
    summary = str(det["res"].get("summary", ""))
    m = det["res"].get("metrics", {})
    if dt is not None and "x_centroid" in dt:
        ax.scatter(dt["x_centroid"], dt["y_centroid"], s=60, facecolors="none", edgecolors=ORANGE, linewidths=1.0, label=f"detected sources ({len(dt)})")
    radius = None
    if apc:
        mm = re.search(r"radius (?:of )?([\d.]+)", str(apc[-1]["res"].get("summary", "")))
        radius = float(mm.group(1)) if mm else float(apc[-1]["args"].get("radius", 5))
    if ph is not None and radius:
        from matplotlib.patches import Circle

        for _, row in ph.iterrows():
            ax.add_patch(Circle((row["x"], row["y"]), radius, fill=False, ec=SKY, lw=0.6, alpha=0.9))
        ax.plot([], [], color=SKY, lw=1.5, label=f"apertures, radius {radius:g} px")
    targets = []
    for desc, exp, comp, rep, _ in table_rows(run, ARGS.expected):
        mt = re.search(r"net flux.*\(([\d.]+),\s*([\d.]+)\)", str(desc), re.I)
        if mt:
            targets.append((float(mt.group(1)), float(mt.group(2)), exp))
    for i, (x, y, exp) in enumerate(targets):
        ax.plot(x, y, "x", color=YELLOW, ms=12, mew=2.5, label="requested position" if i == 0 else None)
        txt = f"P{i + 1}"
        if ph is not None:
            dist = np.hypot(ph["x"] - x, ph["y"] - y)
            j = int(dist.idxmin())
            if dist[j] <= 3:
                txt += f": {ph.loc[j, 'net_flux']:.0f} (exp. {exp:.0f})"
        ax.annotate(txt, (x, y), xytext=(8, 10), textcoords="offset points", color="white", fontsize=10, fontweight="bold", bbox=dict(fc="black", alpha=0.55, ec="none", pad=1.5))
    ax.set_xlim(-0.5, img.shape[1] - 0.5)
    ax.set_ylim(-0.5, img.shape[0] - 0.5)
    ax.set_xlabel("x (pixels)")
    ax.set_ylabel("y (pixels)")
    sig = re.search(r"above ([\d.]+) sigma", summary)
    ax.set_title(f"100 Gaussians image (sky removed): {m.get('n_sources', len(dt) if dt is not None else '?')} sources{' above ' + sig.group(1) + ' sigma' if sig else ''}", fontsize=12)
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.12), ncol=3, fontsize=9, framealpha=0.95)


if __name__ == "__main__":
    main_figure(draw, "photutils 100 Gaussians")
