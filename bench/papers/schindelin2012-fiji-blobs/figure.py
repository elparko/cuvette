import argparse
import json
import re
import sys
import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

BLUE = "#1b6aa8"
ORANGE = "#d08a1e"
SKY = "#5aa0cf"
VERMILION = "#c2381f"
GREEN_BG = "#d6ebe3"
RED_BG = "#f6d5d0"
GREY_BG = "#e8eaf0"


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


def find_files(session, *patterns):
    s = Path(session)
    found = []
    for pat in patterns:
        found += sorted(p for p in s.glob(pat) if p.is_file())
    return found


def fmt(v):
    if v is None:
        return "-"
    if isinstance(v, bool):
        return str(v)
    if isinstance(v, (int, float)):
        if float(v).is_integer() and abs(v) < 1e9:
            return str(int(v))
        return f"{v:.4g}"
    return str(v)[:14]


def table_rows(run, expected_path):
    items = run.get("items")
    if items:
        return [
            (
                it.get("key") or it.get("description", ""),
                it.get("expected"),
                it.get("computed"),
                it.get("reported"),
            )
            for it in items
        ]
    rows = []
    try:
        text = Path(expected_path).read_text()
        for m in re.finditer(r"description:\s*\"?([^\"\n,}]+)\"?\s*,?\s*(?:\n\s*)?value:\s*([-\d.eE]+)", text):
            rows.append((m.group(1).strip(), float(m.group(2)), None, None))
    except OSError:
        pass
    return rows


def draw_table(ax, rows):
    ax.axis("off")
    if not rows:
        ax.text(0.5, 0.5, "no expected items", ha="center", va="center", fontsize=12)
        return
    cells, colors = [], []
    for key, exp, comp, rep in rows:
        def cell(x):
            if not x:
                return "none", GREY_BG
            v = fmt(x.get("value"))
            return v, GREEN_BG if x.get("pass") else RED_BG

        c, cc = cell(comp)
        r, rc = cell(rep)
        cells.append(["\n".join(textwrap.wrap(str(key), 22)[:2]), fmt(exp), c, r])
        colors.append(["white", "white", cc, rc])
    t = ax.table(
        cellText=cells,
        cellColours=colors,
        colLabels=["item", "expected", "computed", "reported"],
        colColours=["#bbbbbb"] * 4,
        colWidths=[0.40, 0.19, 0.20, 0.20],
        loc="upper center",
        cellLoc="center",
    )
    t.auto_set_font_size(False)
    t.set_fontsize(9)
    t.scale(1, 2.0 if len(rows) < 8 else 1.6)
    ax.set_title("green = pass, red = fail, grey = not produced", fontsize=9, color="#454b5a")


def no_output(ax, reason):
    ax.axis("off")
    ax.add_patch(plt.Rectangle((0.03, 0.2), 0.94, 0.6, fill=False, ec="#888888", lw=2, ls="--", transform=ax.transAxes))
    ax.text(0.5, 0.5, "\n".join(textwrap.wrap("no output to draw: " + reason, 38)), ha="center", va="center", fontsize=12, transform=ax.transAxes)


def last_error(log):
    for e in reversed(log):
        s = json.dumps(e)[:4000]
        m = re.search(r'"(?:error|message)":\s*"([^"]{5,200})', s)
        if m and ("rror" in s or "fail" in s):
            return m.group(1)
    return "the run wrote no usable result"


def main_figure(draw_left, title):
    a = parse_args()
    run = load_run(a.run)
    log = load_log(a.session)
    fig = plt.figure(figsize=(16, 8), dpi=100)
    gs = fig.add_gridspec(1, 2, width_ratios=[1.1, 1], left=0.06, right=0.98, top=0.88, bottom=0.08, wspace=0.12)
    axl = fig.add_subplot(gs[0])
    axr = fig.add_subplot(gs[1])
    try:
        draw_left(axl, a.session, run, log)
    except Exception as exc:
        axl.clear()
        no_output(axl, f"{type(exc).__name__}: {exc}" if not isinstance(exc, NoOutput) else str(exc))
    draw_table(axr, table_rows(run, a.expected))
    fig.suptitle(f"{title} | {run.get('model', '?')} | run {run.get('status', '?')}", fontsize=15, y=0.97)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(a.out, dpi=100)


class NoOutput(Exception):
    pass


def draw(ax, session, run, log):
    import csv

    from PIL import Image

    pngs = find_files(session, "work/count_objects-*/blobs_outlines.png")
    if not pngs:
        raise NoOutput(last_error(log))
    pngs.sort(key=lambda p: int(re.search(r"count_objects-(\d+)", str(p)).group(1)))
    png = pngs[-1]
    ax.imshow(Image.open(png).convert("RGB"), interpolation="nearest")
    ax.axis("off")
    n = None
    table = png.parent / "blobs_objects.csv"
    if table.exists():
        n = len(list(csv.DictReader(table.open())))
    ax.set_title(
        f"blobs.gif: {n} objects outlined in red" if n is not None else "blobs.gif: objects outlined in red",
        fontsize=12,
    )


if __name__ == "__main__":
    main_figure(draw, "Blobs count")
