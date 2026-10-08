import argparse
import json
import sys


def shrink(path, width):
    try:
        from PIL import Image
    except ImportError:
        return
    img = Image.open(path)
    if img.width > width:
        img.resize((width, round(img.height * width / img.width)), Image.LANCZOS).save(path)


def draw(run, out):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    items = run["items"]
    n = max(len(items), 1)
    fig, axes = plt.subplots(n, 1, figsize=(9, 0.9 * n + 1.2), squeeze=False)
    green, red, grey = "#1a7f4b", "#c62828", "#8a8f98"
    for ax, it in zip(axes[:, 0], items):
        exp = it["expected"]
        tol = 0 if it["tolerance"] == "exact" else it["tolerance"]
        half = max(tol * 3, abs(exp) * 0.1, 1e-9) if tol == 0 else max(tol * 3, 1e-12)
        ax.axvspan(-tol, tol, color="#cfe8d9", zorder=0)
        ax.axvline(0, color=grey, lw=1, zorder=1)
        for row, (name, side, mark) in enumerate([("computed", it["computed"], "o"), ("reported", it["reported"], "D")]):
            v = side.get("value")
            ok = side.get("pass")
            if v is None:
                continue
            if it.get("abs"):
                v = abs(v)
            d = v - exp
            clipped = abs(d) > half
            x = max(-half, min(half, d))
            color = grey if ok is None else (green if ok else red)
            y = 0.25 if name == "computed" else -0.25
            ax.plot([x], [y], mark, color=color, ms=8, zorder=3, clip_on=False)
            if clipped:
                ax.annotate(f"{v:.4g}", (x, y), xytext=(-6 if x > 0 else 6, 0), textcoords="offset points", ha="right" if x > 0 else "left", va="center", fontsize=7, color=color)
        ax.set_xlim(-half * 1.05, half * 1.05)
        ax.set_ylim(-0.6, 0.6)
        ax.set_yticks([])
        ax.tick_params(labelsize=7)
        ax.set_title(f"{it['key']}   expected {exp:.6g}", loc="left", fontsize=8)
        for s in ("top", "right", "left"):
            ax.spines[s].set_visible(False)
    fig.suptitle(f"{run['paper']}  {run['model']}   circle: computed, diamond: reported", fontsize=9, x=0.01, ha="left")
    fig.text(0.01, 0.005, "Axis: value minus expected. Green band: tolerance. Green dot: pass. Red dot: fail. Grey dot: not asked.", fontsize=7, color=grey)
    fig.tight_layout(rect=(0, 0.02, 1, 0.97))
    fig.savefig(out, dpi=110, facecolor="white")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--run")
    p.add_argument("--out", required=True)
    p.add_argument("--shrink", type=int)
    a = p.parse_args()
    if a.shrink:
        shrink(a.out, a.shrink)
        return
    with open(a.run) as f:
        draw(json.load(f), a.out)


sys.exit(main())
