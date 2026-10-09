import math
import sys

import numpy as np
from PIL import Image


def ij_round(v):
    return math.floor(v + 0.5)


def ij_median(block):
    hist = np.bincount(block.ravel(), minlength=256)
    half, total, i = block.size / 2.0, 0, -1
    while True:
        i += 1
        total += hist[i]
        if total > half or i >= 255:
            return i


for path in sys.argv[1:]:
    img = Image.open(path)
    a = np.array(img.convert("L") if img.mode not in ("L", "P") else img)
    h, w = a.shape
    bw, bh = ij_round(w * 0.2), ij_round(h * 0.2)
    corners = [(0, 0), (w - bw, 0), (0, h - bh), (w - bw, h - bh), (ij_round((w - bw) / 2), ij_round((h - bh) / 2))]
    meds = [ij_median(a[y:y + bh, x:x + bw]) for x, y in corners]
    spread = max(meds) - min(meds)
    rng = max(1, int(a.max()) - int(a.min()))
    print(path.split("/")[-1], "mode", img.mode, "size", w, h, "min", a.min(), "max", a.max(), "block medians", meds, "spread", spread, "variation %.4f" % (spread / rng))
