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
NAME = "Gramfort 2013 MNE sample"

READER = """
import sys, numpy as np, mne
mne.set_log_level("ERROR")
ev = mne.read_evokeds(sys.argv[1], verbose=False)[0]
out = {"times": ev.times}
g = ev.copy().pick("grad", exclude="bads")
out["grad"] = g.data * 1e13
e = ev.copy().pick("eeg", exclude="bads")
out["eeg"] = e.data * 1e6
out["comment"] = np.array(ev.comment)
out["nave"] = np.array(ev.nave)
np.savez(sys.argv[2], **out)
"""


def read_evoked(path):
    import subprocess
    import tempfile
    import os

    py = [sys.executable]
    try:
        import mne  # noqa: F401
    except ImportError:
        env_py = Path.home() / ".cuvette" / "envs" / "mne" / "bin" / "python"
        if not env_py.exists():
            raise NoOutput("the evoked file needs the mne package, which is not installed")
        py = [str(env_py)]
    with tempfile.TemporaryDirectory() as d:
        dst = os.path.join(d, "ev.npz")
        subprocess.run(py + ["-c", READER, str(path), dst], check=True, capture_output=True)
        z = np.load(dst)
        return {k: z[k] for k in z.files}


def draw_left(fig, spec, ctx):
    evs = ctx.files("compute_evoked", "*-ave.fif")
    counts = ctx.files("make_epochs", "epoch_counts.csv")
    if not evs and not counts:
        raise NoOutput(ctx.reason("evoked file or epoch counts"))
    if not evs:
        df = read_numbers(counts[0])
        ax = fig.add_subplot(spec)
        ax.bar(df.iloc[:, 0], df.iloc[:, 1], color=BLUE)
        for i, v in enumerate(df.iloc[:, 1]):
            ax.text(i, v, str(v), ha="center", va="bottom")
        ax.set_ylabel("Epochs kept")
        ax.set_title("Epochs kept per condition (no evoked response in this run)", fontsize=12, loc="left")
        ax.tick_params(axis="x", labelrotation=25)
        ax.spines[["top", "right"]].set_visible(False)
        return
    d = read_evoked(evs[0])
    t = d["times"] * 1000
    gfp = np.sqrt((d["grad"] ** 2).mean(axis=0))
    gs = spec.subgridspec(2, 1, hspace=0.45)
    ax = fig.add_subplot(gs[0])
    for row in d["grad"][::4]:
        ax.plot(t, row, color="#C9C9C9", lw=0.6)
    ax.plot(t, gfp, color=BLUE, lw=2.5, label="global field power, gradiometers")
    peak = ctx.last("measure_peak")
    lat = ctx.item("latency.*global field|gfp")
    amp = ctx.item("amplitude.*global field|gfp amplitude")
    elat = lat["expected"] * 1000 if lat and lat["expected"] else None
    tol = 7
    if elat:
        ax.axvspan(elat - tol, elat + tol, color=GREEN if verdict_color(lat) == GREEN else (VERM if verdict_color(lat) == VERM else SKY), alpha=0.25, label=f"expected N100 {elat:.0f} ms, plus or minus {tol} ms")
    def peaks(kind):
        return [r for r in ctx.ok("measure_peak") if r["args"].get("ch_type") == kind or (r["args"].get("ch_type") is None and (r.get("summary") or "").startswith(kind))]

    win = peaks("grad")
    if win:
        mt = win[-1]["metrics"]
        if "gfp_latency_s" in mt:
            ax.plot(mt["gfp_latency_s"] * 1000, np.interp(mt["gfp_latency_s"] * 1000, t, gfp), "v", color=VERM, ms=11, label=f"our peak {mt['gfp_latency_s']*1000:.0f} ms")
    ax.axvline(0, color="black", lw=0.8)
    ax.set_xlabel("Time after the sound (ms)")
    ax.set_ylabel("fT/cm")
    ax.set_title(f"Auditory/left evoked response, gradiometers ({int(d['nave'])} epochs)", fontsize=12, loc="left")
    ax.legend(fontsize=8.5, frameon=False, loc="upper right")
    ax.spines[["top", "right"]].set_visible(False)
    ax2 = fig.add_subplot(gs[1])
    if len(d["eeg"]):
        for row in d["eeg"]:
            ax2.plot(t, row, color="#C9C9C9", lw=0.6)
        w = (t >= 80) & (t <= 120)
        best = d["eeg"][np.argmin(d["eeg"][:, w].min(axis=1))]
        ax2.plot(t, best, color=ORANGE, lw=2.2, label="EEG channel with the deepest negative peak")
        ep = peaks("eeg")
        if ep and "peak_latency_s" in ep[-1]["metrics"]:
            mt = ep[-1]["metrics"]
            ax2.plot(mt["peak_latency_s"] * 1000, mt["peak_amplitude"], "v", color=VERM, ms=11, label=f"our peak {mt['peak_latency_s']*1000:.0f} ms, {mt['peak_amplitude']:.1f} uV")
        ee = ctx.item("latency.*eeg")
        if ee and ee["expected"]:
            ax2.axvspan(ee["expected"] * 1000 - tol, ee["expected"] * 1000 + tol, color=SKY, alpha=0.3, label=f"expected EEG N100 {ee['expected']*1000:.0f} ms")
        ax2.axvline(0, color="black", lw=0.8)
        ax2.legend(fontsize=8.5, frameon=False, loc="lower right")
    ax2.set_xlabel("Time after the sound (ms)")
    ax2.set_ylabel("microvolt")
    ax2.set_title("EEG channels", fontsize=12, loc="left")
    ax2.spines[["top", "right"]].set_visible(False)


if __name__ == "__main__":
    sys.exit(main(NAME, draw_left))
