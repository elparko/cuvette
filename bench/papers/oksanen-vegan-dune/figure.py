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
    import pandas as pd

    runs = [c for c in calls(log, "run_nmds") if int(c["res"].get("metrics", {}).get("k", 2)) == 2]
    call = need(runs, "two-axis NMDS result", run, log)
    sc = table_df(session, call)
    if sc is None or "NMDS2" not in sc:
        raise NoOutput("the NMDS result has no scores")
    sc["site"] = sc["site"].astype(str)
    args = call["args"]
    envname = Path(str(args.get("environment") or "dune_env.csv")).name
    src = find_input(session, log, envname)
    colname = args.get("color_by") or "Management"
    groups = None
    if src is not None:
        env = pd.read_csv(src)
        env["site"] = env.iloc[:, 0].astype(str)
        if colname in env:
            sc = sc.merge(env[["site", colname]], on="site", how="left")
            groups = colname
    palette = {"BF": BLUE, "HF": ORANGE, "NM": GREEN, "SF": VERMILION}
    marks = {"BF": "o", "HF": "s", "NM": "^", "SF": "D"}
    if groups:
        from scipy.spatial import ConvexHull

        for g, sub in sc.groupby(groups):
            c = palette.get(g, PURPLE)
            pts = sub[["NMDS1", "NMDS2"]].values
            if len(pts) >= 3:
                try:
                    hull = ConvexHull(pts)
                    ax.fill(pts[hull.vertices, 0], pts[hull.vertices, 1], color=c, alpha=0.12)
                except Exception:
                    pass
            ax.scatter(sub["NMDS1"], sub["NMDS2"], color=c, marker=marks.get(g, "o"), s=90, edgecolor="black", linewidth=0.6, label=f"{g} (n={len(sub)})", zorder=3)
    else:
        ax.scatter(sc["NMDS1"], sc["NMDS2"], color=GREY, s=90, edgecolor="black", linewidth=0.6, zorder=3)
        ax.text(0.5, 0.02, "site table not found: groups are not coloured", transform=ax.transAxes, ha="center", fontsize=9, color=GREY)
    for _, row in sc.iterrows():
        ax.annotate(row["site"], (row["NMDS1"], row["NMDS2"]), xytext=(5, 4), textcoords="offset points", fontsize=8)
    ax.axhline(0, color="#cccccc", lw=0.8, zorder=0)
    ax.axvline(0, color="#cccccc", lw=0.8, zorder=0)
    ax.set_xlabel("NMDS1")
    ax.set_ylabel("NMDS2")
    m = call["res"].get("metrics", {})
    ax.set_title("NMDS of dune meadow sites by management (vegan, Bray-Curtis)", fontsize=12)
    lines = [f"stress {m['stress']:.4f}"] if "stress" in m else []
    perm = calls(log, "run_permanova")
    if perm:
        pm = perm[-1]["res"].get("metrics", {})
        if "r2" in pm:
            lines.append(f"PERMANOVA R2 {pm['r2']:.3f}, F {pm['f']:.2f}, p {pm['p']:.3f}")
    disp = calls(log, "test_dispersion")
    if disp:
        dm = disp[-1]["res"].get("metrics", {})
        if "p" in dm:
            lines.append(f"dispersion test p {dm['p']:.3f}")
    ax.text(0.02, 0.03, "\n".join(lines), transform=ax.transAxes, va="bottom", fontsize=10, bbox=dict(fc="white", ec="#999999", alpha=0.9))
    if groups:
        ax.legend(loc="upper right", fontsize=10, title=groups)


if __name__ == "__main__":
    main_figure(draw, "vegan dune meadows")
