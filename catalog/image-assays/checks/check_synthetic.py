# Independent check of the synthetic test images with NumPy and SciPy only (no adapter code).
# Run from the adapter folder: python checks/check_synthetic.py > checks/check_synthetic.out
import csv
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image
from scipy import ndimage as ndi

D = Path(__file__).resolve().parent.parent / "data"

img = np.asarray(Image.open(D / "synthetic_plate.png")).astype(float)
yy, xx = np.indices(img.shape[:2])
inner = (yy - 200) ** 2 + (xx - 200) ** 2 <= (0.88 * 182) ** 2
pale = (img[..., 1] > 110) & inner
lab, n = ndi.label(pale, structure=np.ones((3, 3)))
areas = ndi.sum(pale, lab, range(1, n + 1))
sl = ndi.find_objects(lab)
elong = [i for i, s in enumerate(sl) if max(s[0].stop - s[0].start, s[1].stop - s[1].start) > 3 * min(s[0].stop - s[0].start, s[1].stop - s[1].start)]
print("plate: pale objects inside 88 percent of the agar radius:", n)
print("plate: specks (area < 30 px):", int((areas < 30).sum()))
print("plate: streaks (long and thin):", len(elong))
big = (areas >= 150) & ~np.isin(np.arange(n), elong)
pairs = int((areas[big] > 300).sum())
print("plate: round objects (area 150 px or more):", int(big.sum()), "; touching pairs (area above 300 px):", pairs, "; colonies =", int(big.sum()) + pairs)

stack = tifffile.imread(D / "synthetic_uptake.tif").astype(float)
nuc, mem, cargo = stack
nl, nn = ndi.label(nuc > 10000)
cl, nc = ndi.label(mem > 4000)
ql, nq = ndi.label(cargo > 15000)
touch = set(np.unique(np.concatenate([cl[0], cl[-1], cl[:, 0], cl[:, -1]]))) - {0}
cent = ndi.center_of_mass(cargo > 15000, ql, range(1, nq + 1))
parents = [cl[int(round(cy)), int(round(cx))] for cy, cx in cent]
whole = [c for c in range(1, nc + 1) if c not in touch]
per = [sum(1 for p in parents if p == c) for c in whole]
print("uptake: nuclei", nn, "cells", nc, "cells touching the edge", len(touch), "whole cells", len(whole))
print("uptake: cargo objects", nq, "in whole cells", sum(per), "positive whole cells", sum(1 for k in per if k >= 1), "spots per whole cell", per)

bf = tifffile.imread(D / "synthetic_brightfield_red.tif").astype(float)
red = bf[1] > 100
rl, nr = ndi.label(red)
centers = [(60 + 90 * i, 60 + 90 * j) for i in range(3) for j in range(3)][:8]
cells = np.zeros(red.shape, int)
for k, (cy, cx) in enumerate(centers, 1):
    cells[(yy[:300, :300] - cy) ** 2 + (xx[:300, :300] - cx) ** 2 <= 32 ** 2] = k
rc = ndi.center_of_mass(red, rl, range(1, nr + 1))
rp = [cells[int(round(cy)), int(round(cx))] for cy, cx in rc]
print("brightfield: red objects", nr, "inside cells", sum(1 for p in rp if p), "positive cells", len({p for p in rp if p}), "of", len(centers))

with open(D / "synthetic_clonogenic.csv") as f:
    rows = list(csv.DictReader(f))
ctrl = [int(r["colonies"]) / int(r["cells_seeded"]) for r in rows if r["condition"] == "control"]
pe = sum(ctrl) / len(ctrl)
print("clonogenic: control plating efficiency", pe)
for cond in ("2 Gy", "4 Gy"):
    sf = [int(r["colonies"]) / int(r["cells_seeded"]) / pe for r in rows if r["condition"] == cond]
    print("clonogenic:", cond, "surviving fractions", [round(v, 6) for v in sf], "mean", round(sum(sf) / len(sf), 6))
