import csv
import sys
from pathlib import Path

import numpy as np
from PIL import Image

out = Path(sys.argv[1])

H = np.array([0.65, 0.70, 0.29])
D = np.array([0.27, 0.57, 0.78])
H, D = H / np.linalg.norm(H), D / np.linalg.norm(D)
DAB_BY_CLASS = [0.05, 0.30, 0.50, 0.80]
img = np.full((300, 400, 3), 255.0)
yy, xx = np.mgrid[0:300, 0:400]
for k in range(12):
    cx, cy = 50 + 100 * (k % 4), 50 + 100 * (k // 4)
    od = 0.6 * H + DAB_BY_CLASS[k // 3] * D
    disc = (xx - cx) ** 2 + (yy - cy) ** 2 <= 14 ** 2
    img[disc] = 255.0 * 10.0 ** (-od)
Image.fromarray(np.round(img).astype(np.uint8)).save(out / "synthetic_ihc.png")

rows = []
VALUES = {1: 0.3, 2: 0.5, 3: 0.7}
for iy in range(5):
    for ix in range(8):
        r = (ix + iy) % 4
        rows.append(["slideA", "Tumor", 105 + 12 * ix, 105 + 20 * iy, 0.1 if r == 0 else VALUES[r]])
for j in range(10):
    for i in range(16):
        pos = (i + j) % 4 == 0
        val = VALUES[1 + (i // 4 + j) % 3] if pos else 0.1
        rows.append(["slideA", "Stroma" if j == 9 else "Tumor", 220 + 20 * i, 20 * j, val])
for j in range(6):
    for i in range(10):
        pos = (i + j) % 5 == 0
        val = VALUES[1 + (i + j) % 3] if pos else 0.1
        rows.append(["slideB", "Tumor", 30 * i, 30 * j, val])
with open(out / "synthetic_cells.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Image", "Class", "Centroid X µm", "Centroid Y µm", "Nucleus: DAB OD mean"])
    w.writerows(rows)
print(len(rows), "cells")
