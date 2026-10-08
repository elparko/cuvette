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


def km_curve(t, e):
    t = np.asarray(t, float)
    e = np.asarray(e, int)
    times = np.unique(t[e == 1])
    s, xs, ys = 1.0, [0.0], [1.0]
    for u in times:
        n = (t >= u).sum()
        d = ((t == u) & (e == 1)).sum()
        s *= 1 - d / n
        xs.append(u)
        ys.append(s)
    return np.array(xs), np.array(ys)


def draw(ax, session, run, log):
    import pandas as pd

    call = need(calls(log, "kaplan_meier"), "Kaplan-Meier result", run, log)
    res, args = call["res"], call["args"]
    ax.axis("off")
    cox = calls(log, "fit_cox")
    top = [0.11, 0.42, 0.86, 0.5] if cox else [0.11, 0.1, 0.86, 0.82]
    km = ax.inset_axes(top)
    tab = table_df(session, call)
    src = find_input(session, log, Path(str(args.get("path", "rossi.csv"))).name)
    colors = {0: ORANGE, 1: BLUE}
    names = {0: "no aid", 1: "financial aid"}
    drawn = False
    if src is not None:
        d = pd.read_csv(src)
        dur, ev, grp = args.get("duration", "week"), args.get("event", "arrest"), args.get("group", "fin")
        for g, sub in d.groupby(grp):
            g = int(g)
            x, y = km_curve(sub[dur], sub[ev])
            km.step(x, y, where="post", color=colors.get(g, GREY), lw=2.2, label=f"{names.get(g, g)} (n={len(sub)}, arrests={int(sub[ev].sum())})")
            cens = sub[sub[ev] == 0][dur].values
            if len(cens):
                km.plot(cens, np.interp(cens, x, y), "|", color=colors.get(g, GREY), ms=7, alpha=0.7)
        drawn = True
    elif tab is not None:
        pts = [c for c in tab.columns if str(c).startswith("S(")]
        for _, row in tab.iterrows():
            g = int(row["group"])
            xs = [0] + [float(str(c)[2:-1]) for c in pts]
            ys = [1] + [float(row[c]) for c in pts]
            km.plot(xs, ys, "o-", color=colors.get(g, GREY), lw=2, label=f"{names.get(g, g)} (n={int(row['n'])}, arrests={int(row['events'])})")
        drawn = True
    if not drawn:
        raise NoOutput("no data file and no survival table in the log")
    km.set_ylim(0.5, 1.0)
    km.set_xlabel("weeks since release")
    km.set_ylabel("share not re-arrested")
    km.set_title("Kaplan-Meier curves by financial aid (y axis starts at 0.5)", fontsize=12)
    km.legend(loc="lower left", fontsize=10)
    m = res.get("metrics", {})
    if "logrank_p" in m:
        km.text(0.98, 0.97, f"log-rank chi-square {m['logrank_chi2']:.3f}\np = {m['logrank_p']:.4f}", transform=km.transAxes, ha="right", va="top", fontsize=10, bbox=dict(fc="white", ec="#999999"))
    if src is None:
        km.text(0.5, 0.05, "data file not found: points are the tool's S(t) table", transform=km.transAxes, ha="center", fontsize=9, color=GREY)
    if cox:
        ct = table_df(session, cox[-1])
        if ct is not None and "hazard_ratio" in ct:
            fa = ax.inset_axes([0.22, 0.08, 0.75, 0.25])
            ys = np.arange(len(ct))[::-1]
            for yy, (_, row) in zip(ys, ct.iterrows()):
                c = BLUE if row["term"] == "fin" else GREY
                fa.plot([row["hr_ci_lo"], row["hr_ci_hi"]], [yy, yy], color=c, lw=2)
                fa.plot(row["hazard_ratio"], yy, "s", color=c, ms=6)
            fa.axvline(1, color="#444444", ls="--", lw=1)
            fa.set_xscale("log")
            fa.set_yticks(ys)
            fa.set_yticklabels(list(ct["term"]), fontsize=9)
            fa.set_xlabel("hazard ratio, 95% CI (Cox model)", fontsize=10)
            fa.tick_params(axis="x", labelsize=9)
            fa.xaxis.set_major_formatter(matplotlib.ticker.ScalarFormatter())
            fa.xaxis.set_minor_formatter(matplotlib.ticker.NullFormatter())
            fa.set_xticks([0.5, 1, 2])


if __name__ == "__main__":
    main_figure(draw, "Rossi 1980 recidivism")
