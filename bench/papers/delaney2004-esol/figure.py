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

BLUE, ORANGE, VERM, GREEN, SKY, GREY, PURPLE, YELLOW = "#0072B2", "#E69F00", "#D55E00", "#009E73", "#56B4E9", "#8C8C8C", "#CC79A7", "#F0E442"
PASS_BG, FAIL_BG, NONE_BG = GREEN, VERM, "#C8C8C8"


class NoOutput(Exception):
    pass


class Ctx:
    def __init__(self, session, run, expected):
        self.session = Path(session)
        self.run = run
        self.expected = expected
        self.results = []
        self.calls = {}
        log = self.session / "log.jsonl"
        if log.exists():
            for line in log.read_text(errors="replace").splitlines():
                try:
                    e = json.loads(line)
                except ValueError:
                    continue
                d = e.get("data") or {}
                if e.get("kind") == "tool_call":
                    self.calls[d.get("callId")] = d.get("args") or {}
                if e.get("kind") == "tool_result":
                    r = dict(d)
                    r["entry"] = e.get("id")
                    r["args"] = self.calls.get(d.get("callId"), {})
                    self.results.append(r)

    def ok(self, tool):
        return [r for r in self.results if r.get("tool") == tool and r.get("ok")]

    def last(self, tool):
        found = self.ok(tool)
        return found[-1] if found else None

    def files(self, tool, pattern):
        base = self.session / "work"
        dirs = []
        if base.exists():
            for d in base.iterdir():
                m = re.fullmatch(re.escape(tool) + r"-(\d+)", d.name)
                if m and d.is_dir():
                    dirs.append((int(m.group(1)), d))
        found = []
        for _, d in sorted(dirs, reverse=True):
            found += sorted(p for p in d.rglob(pattern) if p.is_file() and not p.name.startswith("._"))
        return found

    def item(self, *words):
        for it in items_of(self):
            if all(re.search(w, it["description"], re.I) for w in words):
                return it
        return None

    def exp(self, *words):
        it = self.item(*words)
        return it["expected"] if it else None

    def reason(self, what):
        failed = [r for r in self.results if r.get("ok") is False]
        if failed:
            r = failed[-1]
            msg = [x.strip() for x in (r.get("error") or r.get("summary") or "").strip().splitlines() if x.strip()]
            return f"{r.get('tool')} failed: {' '.join(msg[:2]) if msg else 'no message'}"
        used = [r for r in self.results if r.get("tool") not in ("load_skill", "read_file", "plan", "note")]
        if used:
            r = used[-1]
            return f"no {what}. Last tool: {r.get('tool')}: {(r.get('summary') or '').strip()[:90]}"
        return f"no {what}. The run called no tool"


def load_expected(path):
    items = []
    try:
        text = Path(path).read_text()
    except OSError:
        return items
    try:
        import yaml

        data = yaml.safe_load(text)
        for e in data.get("expected", []):
            items.append({"description": str(e["description"]), "expected": e.get("value"), "tolerance": e.get("tolerance")})
        return items
    except Exception:
        pass
    for m in re.finditer(r'^\s*-\s*\{description:\s*"([^"]*)",\s*value:\s*("[^"]*"|[^,}]+)', text, re.M):
        raw = m.group(2).strip().strip('"')
        try:
            val = float(raw)
            val = int(val) if val == int(val) and "." not in raw else val
        except ValueError:
            val = raw
        items.append({"description": m.group(1), "expected": val, "tolerance": None})
    return items


def items_of(ctx):
    if ctx.run.get("items"):
        return [{"description": it.get("description", it.get("key", "")), "expected": it.get("expected"), "computed": it.get("computed"), "reported": it.get("reported")} for it in ctx.run["items"]]
    return [{"description": e["description"], "expected": e["expected"], "computed": None, "reported": None} for e in ctx.expected]


def fmt(v):
    if v is None:
        return "-"
    if isinstance(v, bool):
        return str(v)
    if isinstance(v, (int, float)):
        if float(v) == int(v) and abs(v) < 1e9:
            return str(int(v))
        return (f"{v:.2f}" if abs(v) >= 100 else f"{v:.4f}").rstrip("0").rstrip(".")
    return str(v)[:14]


def cell_state(c):
    if not isinstance(c, dict) or c.get("value") is None and c.get("pass") is None:
        return None, "-"
    p = c.get("pass")
    return p, fmt(c.get("value"))


def draw_table(ax, ctx):
    ax.set_axis_off()
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    rows = items_of(ctx)
    n = max(len(rows), 1)
    fs = 9.5 if n <= 8 else 8.5 if n <= 12 else 7.5
    cols = [0.0, 0.46, 0.64, 0.82, 1.0]
    head_h = 0.06
    ax.add_patch(plt.Rectangle((0, 1 - head_h), 1, head_h, color="#222222", lw=0))
    for i, t in enumerate(["Item", "Expected", "Computed", "Reported"]):
        ax.text(cols[i] + 0.012, 1 - head_h / 2, t, va="center", ha="left", color="white", fontsize=fs + 0.5, fontweight="bold")
    h = (1 - head_h - 0.07) / n
    wrap = 34 if fs >= 8.5 else 40
    for k, it in enumerate(rows):
        y1 = 1 - head_h - k * h
        y0 = y1 - h
        if k % 2:
            ax.add_patch(plt.Rectangle((0, y0), cols[2] - 0.0, h, color="#F2F2F2", lw=0, zorder=0))
        desc = "\n".join(textwrap.wrap(it["description"].rstrip("."), wrap)[:2])
        ax.text(0.012, (y0 + y1) / 2, desc, va="center", ha="left", fontsize=fs - 0.5, linespacing=1.2)
        ax.text(cols[1] + 0.012, (y0 + y1) / 2, fmt(it["expected"]), va="center", ha="left", fontsize=fs)
        for j, key in ((2, "computed"), (3, "reported")):
            state, text = cell_state(it[key])
            bg, fg, mark = (PASS_BG, "white", "pass") if state is True else (FAIL_BG, "white", "fail") if state is False else (NONE_BG, "#222222", "")
            if state is None:
                text = "not produced" if key == "computed" else "not stated"
            elif len(text) > 9:
                text = text[:8] + "."
            ax.add_patch(plt.Rectangle((cols[j] + 0.004, y0 + h * 0.08), cols[j + 1] - cols[j] - 0.008, h * 0.84, color=bg, lw=0))
            ax.text(cols[j] + 0.012, (y0 + y1) / 2, text, va="center", ha="left", color=fg, fontsize=fs - (1 if state is None else 0), fontweight="bold" if state is not None else "normal")
            if mark and len(text) <= 7:
                ax.text(cols[j + 1] - 0.012, (y0 + y1) / 2, mark, va="center", ha="right", color=fg, fontsize=fs - 1.5)
    ax.text(0, 0.0, "Green: matches expected. Red: does not match. Grey: no value.", fontsize=8, va="bottom", ha="left", color="#444444")


def verdict_color(item):
    c = item.get("computed") if item else None
    p = c.get("pass") if isinstance(c, dict) else None
    return GREEN if p is True else VERM if p is False else BLUE


def no_output_box(ax, reason):
    ax.set_axis_off()
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.add_patch(plt.Rectangle((0.03, 0.2), 0.94, 0.6, fill=False, ec=GREY, lw=2, ls="--"))
    ax.text(0.5, 0.62, "No output to draw", ha="center", va="center", fontsize=17, fontweight="bold", color="#333333")
    ax.text(0.5, 0.42, "\n".join(textwrap.wrap(reason, 62)[:5]), ha="center", va="center", fontsize=11, color="#333333")


def read_numbers(p):
    import pandas as pd

    return pd.read_csv(p)


def expected_line(ax, value, label, axis="y", color="#222222"):
    if value is None:
        return
    if axis == "y":
        ax.axhline(value, color=color, ls=":", lw=1.6)
        ax.text(ax.get_xlim()[1], value, " " + label, va="bottom", ha="right", fontsize=9, color=color)
    else:
        ax.axvline(value, color=color, ls=":", lw=1.6)
        ax.text(value, ax.get_ylim()[1], label + " ", va="top", ha="right", fontsize=9, color=color, rotation=90)


def main(name, draw_left):
    ap = argparse.ArgumentParser()
    ap.add_argument("--session", required=True)
    ap.add_argument("--run", required=True)
    ap.add_argument("--expected", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    run = json.loads(Path(a.run).read_text())
    ctx = Ctx(a.session, run, load_expected(a.expected))
    fig = plt.figure(figsize=(16, 8), dpi=100)
    gs = fig.add_gridspec(1, 2, width_ratios=[1.12, 1], left=0.15, right=0.985, top=0.85, bottom=0.08, wspace=0.07)
    fig.suptitle(f"{name} | {run.get('model', '?')} | run {run.get('status', '?')}", fontsize=15, fontweight="bold", x=0.02, ha="left", y=0.965)
    left = gs[0, 0]
    try:
        draw_left(fig, left, ctx)
    except NoOutput as e:
        no_output_box(fig.add_subplot(left), str(e))
    except Exception as e:
        for ax in list(fig.axes):
            ax.remove()
        no_output_box(fig.add_subplot(left), f"{type(e).__name__}: {e}")
    draw_table(fig.add_subplot(gs[0, 1]), ctx)
    fig.savefig(a.out, dpi=100)
    return 0
NAME = "Delaney 2004 ESOL"


def draw_left(fig, spec, ctx):
    files = ctx.files("compute_descriptors", "descriptors.csv")
    if not files:
        raise NoOutput(ctx.reason("descriptor table"))
    df = read_numbers(files[0])
    need = {"mw", "logp", "rb", "ap", "measured"}
    if not need <= set(df.columns):
        raise NoOutput("the descriptor table has no column for " + ", ".join(sorted(need - set(df.columns))))
    fit = ctx.last("fit_solubility_model")
    m = (fit or {}).get("metrics") or {}
    c0, cl, cm, cr, ca = (m.get(k, d) for k, d in (("intercept", 0.16), ("coef_logp", -0.63), ("coef_mw", -0.0062), ("coef_rb", 0.066), ("coef_ap", -0.74)))
    pred = c0 + cl * df["logp"] + cm * df["mw"] + cr * df["rb"] + ca * df["ap"]
    meas = df["measured"]
    resid = pred - meas
    rmse = float(np.sqrt(np.mean(resid**2)))
    r2 = float(np.corrcoef(pred, meas)[0, 1] ** 2)
    ax = fig.add_subplot(spec)
    ax.scatter(meas, pred, s=14, color=BLUE, alpha=0.55, lw=0)
    far = np.abs(resid) > 3
    ax.scatter(meas[far], pred[far], s=22, color=VERM, lw=0, label="off by more than 3 log units")
    lo, hi = min(meas.min(), pred.min()) - 0.3, max(meas.max(), pred.max()) + 0.3
    ax.plot([lo, hi], [lo, hi], color="black", lw=1.2, label="perfect prediction")
    ax.set_xlim(lo, hi)
    ax.set_ylim(lo, hi)
    ax.set_aspect("equal")
    ax.set_xlabel("Measured log solubility (mol/L)")
    ax.set_ylabel("ESOL equation, our descriptors")
    src = "equation from fit_solubility_model" if fit else "published equation applied to saved descriptors"
    ax.set_title(f"Predicted against measured, {len(df):,} molecules", fontsize=12, loc="left")
    lines = [f"R squared (correlation) = {r2:.3f}", f"RMSE = {rmse:.2f} log units", src]
    ax.text(0.03, 0.97, "\n".join(lines), transform=ax.transAxes, va="top", fontsize=10, bbox=dict(boxstyle="round", fc="white", ec=GREY))
    ax.legend(loc="lower right", fontsize=9, frameon=False)
    ax.spines[["top", "right"]].set_visible(False)


if __name__ == "__main__":
    sys.exit(main(NAME, draw_left))
