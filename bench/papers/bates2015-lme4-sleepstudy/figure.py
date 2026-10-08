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

BLUE = "#0072B2"
ORANGE = "#E69F00"
SKY = "#56B4E9"
VERMILION = "#D55E00"
GREEN = "#009E73"
PURPLE = "#CC79A7"
YELLOW = "#F0E442"
GREY = "#6b6b6b"
GREEN_BG = "#c8e6c9"
RED_BG = "#f4c7c3"
GREY_BG = "#e0e0e0"


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
    ax.set_title("green = pass, red = fail, grey = not produced", fontsize=10, color="#444444")


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
    import pandas as pd

    fits = calls(log, "fit_mixed_model")
    fit = need(fits, "mixed model fit", run, log)
    m = fit["res"].get("metrics", {})
    b0, b1 = float(m["estimate_Intercept"]), float(m["estimate_Days"])
    src = find_input(session, log, Path(str(fit["args"].get("data") or "sleepstudy.csv")).name)
    if src is None:
        plots = calls(log, "plot_model")
        img = out_file(session, plots[-1]["res"], ".png") if plots else None
        if img is None:
            img = next(iter(sorted((Path(session) / "work").glob("plot_model-*/*.png"))), None)
        if img is None:
            raise NoOutput("the data file and the model plot are not in the session")
        ax.imshow(plt.imread(img))
        ax.axis("off")
        ax.set_title("Plot written by the run (data file not found)", fontsize=12)
        return
    d = pd.read_csv(src)
    col = "Subject"
    stats = {}
    for s, sub in d.groupby(col):
        k, c = np.polyfit(sub["Days"], sub["Reaction"], 1)
        stats[s] = (c, k)
    order = sorted(stats, key=lambda s: stats[s][0])
    ax.axis("off")
    ncol = 6
    nrow = int(np.ceil(len(order) / ncol))
    w, h = 0.9 / ncol, 0.84 / nrow
    ylo, yhi = d["Reaction"].min() - 10, d["Reaction"].max() + 10
    days = np.array([0, 9])
    for i, s in enumerate(order):
        r, c = divmod(i, ncol)
        a = ax.inset_axes([0.08 + c * w, 0.9 - (r + 1) * h + 0.02, w * 0.95, h * 0.92])
        sub = d[d[col] == s]
        a.plot(sub["Days"], sub["Reaction"], "o", color=BLUE, ms=3.5)
        ic, sl = stats[s]
        a.plot(days, ic + sl * days, color=ORANGE, lw=1.6)
        a.plot(days, b0 + b1 * days, color=VERMILION, lw=1.4, ls="--")
        a.set_ylim(ylo, yhi)
        a.set_xlim(-0.5, 9.5)
        a.set_xticks([0, 3, 6, 9])
        a.tick_params(labelsize=7, length=2)
        if c != 0:
            a.set_yticklabels([])
        if r != nrow - 1:
            a.set_xticklabels([])
        a.text(0.04, 0.95, str(s), transform=a.transAxes, fontsize=8, va="top")
    ax.text(0.5, 0.97, "Reaction time by days for each subject (lme4 sleepstudy)", ha="center", va="top", fontsize=12, transform=ax.transAxes)
    ax.text(0.5, 0.925, "orange: subject's own line   dashed red: model line (fixed effects)", ha="center", va="top", fontsize=10, transform=ax.transAxes)
    ax.text(0.5, 0.0, f"x: days, y: reaction time (ms). Model: {b0:.1f} + {b1:.2f} x days. Panels ordered by each subject's start.", ha="center", va="bottom", fontsize=9, color=GREY, transform=ax.transAxes)


if __name__ == "__main__":
    main_figure(draw, "lme4 sleepstudy (Bates 2015)")
