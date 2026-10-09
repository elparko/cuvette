import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "src-tauri" / "icons"

TILE = "#151515"
EDGE = "#2c2c2c"
GLASS = "#ecebe7"
BEAM = "#f06a8e"


def svg(small):
    # A cuvette from the front. The beam comes out weaker on the far side.
    wall, beam = (56, 110) if small else (42, 80)
    x0, x1, top, bottom = (402, 622, 170, 854) if small else (420, 604, 178, 846)
    inset = wall // 2 + 21
    by = 588 - beam // 2
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<rect x="100" y="100" width="824" height="824" rx="185" fill="{TILE}"/>
<rect x="101.5" y="101.5" width="821" height="821" rx="183.5" fill="none" stroke="{EDGE}" stroke-width="3"/>
<rect x="150" y="{by}" width="{x0 - 150 - wall // 2}" height="{beam}" fill="{BEAM}"/>
<rect x="{x1 + wall // 2}" y="{by}" width="{874 - x1 - wall // 2}" height="{beam}" fill="{BEAM}" opacity=".35"/>
<rect x="{x0}" y="{top}" width="{x1 - x0}" height="{bottom - top}" rx="26" fill="none" stroke="{GLASS}" stroke-width="{wall}"/>
<rect x="{x0 + inset}" y="380" width="{x1 - x0 - 2 * inset}" height="{bottom - inset - 380}" rx="8" fill="{GLASS}"/>
<rect x="{x0 + inset}" y="{by}" width="{x1 - x0 - 2 * inset}" height="{beam}" fill="{BEAM}" opacity=".7"/>
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
