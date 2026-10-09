import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "src-tauri" / "icons"

TILE = "#151515"
RIM = "#f2f2f2"
HOLE = "#1e1e1e"
GLASS = "#dedede"
LIQUID = "#5e5e5e"
FROST = "#9a9a9a"


def pts(points, s, ox, oy, wide):
    return " ".join(f"{ox + (x - 50) * s * wide:.1f},{oy + (y - 6) * s:.1f}" for x, y in points)


def svg(small):
    s = 8.4 if small else 7.0
    ox, oy = 512, 512 - 44 * s
    hole = [(50, 9.8), (59.2, 15.6), (50, 21.0), (40.8, 15.6)] if small else [(50, 8.9), (61.2, 15.6), (50, 22.0), (38.8, 15.6)]
    liquid = [(33.4, 43), (50, 52.5), (50, 94), (33.4, 84.4)] if small else [(35.6, 45.5), (47.8, 52.5), (47.8, 88.4), (35.6, 81.4)]
    stroke = "" if small else f' stroke="{TILE}" stroke-width="7" stroke-linejoin="round"'
    p = lambda pp: pts(pp, s, ox, oy, 1.3 if small else 1.0)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<rect x="100" y="100" width="824" height="824" rx="185" fill="{TILE}"/>
<rect x="101.5" y="101.5" width="821" height="821" rx="183.5" fill="none" stroke="#2c2c2c" stroke-width="3"/>
<g{stroke}>
<polygon fill="{GLASS}" points="{p([(33.4, 84.4), (50, 94), (50, 25.1), (33.4, 15.6)])}"/>
<polygon fill="{FROST}" points="{p([(66.6, 84.4), (50, 94), (50, 25.1), (66.6, 15.6)])}"/>
<polygon fill="{LIQUID}" points="{p(liquid)}"/>
<polygon fill="{RIM}" points="{p([(50, 6), (66.6, 15.6), (50, 25.1), (33.4, 15.6)])}"/>
<polygon fill="{HOLE}" points="{p(hole)}"/>
</g>
</svg>
"""


def render(src, size, dest):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), "-o", str(dest), str(src)], check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    full, small = HERE / "cuvette.svg", HERE / "cuvette-small.svg"
    full.write_text(svg(False))
    small.write_text(svg(True))
    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "icon.iconset"
        iconset.mkdir()
        for base in (16, 32, 128, 256, 512):
            for scale in (1, 2):
                px = base * scale
                name = f"icon_{base}x{base}{'@2x' if scale == 2 else ''}.png"
                render(small if px <= 32 else full, px, iconset / name)
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(OUT / "icon.icns")], check=True)
        shutil.copy(iconset / "icon_32x32.png", OUT / "32x32.png")
        shutil.copy(iconset / "icon_128x128.png", OUT / "128x128.png")
        shutil.copy(iconset / "icon_128x128@2x.png", OUT / "128x128@2x.png")
        shutil.copy(iconset / "icon_512x512@2x.png", OUT / "icon.png")
        if "--preview" in sys.argv:
            for name in ("icon_16x16.png", "icon_32x32.png", "icon_16x16@2x.png", "icon_32x32@2x.png", "icon_128x128.png"):
                shutil.copy(iconset / name, HERE / f"preview-{name}")


main()
