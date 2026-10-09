import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "src-tauri" / "icons"
DOCS = HERE.parent.parent / "docs" / "images"

TILE = "#151515"
EDGE = "#2c2c2c"
LIGHT = dict(glass="#1c1c1c", beam="#c2183f", liquid="#fbe4ea", surface="#f2bccb", wall=3)
DARK = dict(glass="#ecebe7", beam="#f06a8e", liquid="#4f1e2d", surface="#73304a")


def mark(glass, beam, liquid, surface, wall=3.5):
    # A square cuvette in oblique view, on a 64-unit grid. The beam gets
    # narrower and paler as it goes through the sample: absorbance.
    x0, x1, top, bottom, dx, dy, level = 18, 38, 12, 60, 8, -6, 27
    return f"""<path d="M{x0} {level}H{x1}V{bottom}H{x0}Z" fill="{liquid}"/>
<path d="M{x1} {level}L{x1 + dx} {level + dy}V{bottom + dy}L{x1} {bottom}Z" fill="{surface}"/>
<path d="M{x0} {level}H{x1}L{x1 + dx} {level + dy}H{x0 + dx}Z" fill="{surface}"/>
<linearGradient id="beam" x1="{x0}" x2="{x1 + dx}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{beam}"/><stop offset="1" stop-color="{beam}" stop-opacity=".55"/></linearGradient>
<path d="M2 31H{x0}V39H2Z" fill="{beam}"/>
<path d="M{x0} 31L{x1 + dx} 35V36.5L{x0} 39Z" fill="url(#beam)"/>
<path d="M{x1 + dx} 35H62V36.5H{x1 + dx}Z" fill="{beam}" opacity=".55"/>
<path d="M{x0} {top}H{x1}V{bottom}H{x0}Z M{x1} {top}L{x1 + dx} {top + dy}V{bottom + dy}L{x1} {bottom} M{x0} {top}L{x0 + dx} {top + dy}H{x1 + dx}" fill="none" stroke="{glass}" stroke-width="{wall}" stroke-linejoin="round" stroke-linecap="round"/>"""


def icon(small):
    scale = 12 if small else 11
    tx, ty = 512 - 32 * scale, 512 - 36 * scale
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<rect x="100" y="100" width="824" height="824" rx="185" fill="{TILE}"/>
<rect x="101.5" y="101.5" width="821" height="821" rx="183.5" fill="none" stroke="{EDGE}" stroke-width="3"/>
<g transform="translate({tx} {ty}) scale({scale})">
{mark(**DARK | dict(wall=5 if small else 3.5))}
</g>
</svg>
"""


def docs():
    for name, colors in (("logo.svg", LIGHT), ("logo-dark.svg", DARK)):
        path = DOCS / name
        text = path.read_text()
        start = text.index("</title>\n") + len("</title>\n")
        end = text.index('<g fill="')
        path.write_text(text[:start] + mark(**colors) + "\n" + text[end:])
    (DOCS / "mark.svg").write_text(f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<title>Cuvette</title>
{mark(**LIGHT)}
</svg>
""")


def render(src, size, dest):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), "-o", str(dest), str(src)], check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    docs()
    full, small = HERE / "cuvette.svg", HERE / "cuvette-small.svg"
    full.write_text(icon(False))
    small.write_text(icon(True))
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
