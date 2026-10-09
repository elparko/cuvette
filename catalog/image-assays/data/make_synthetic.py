# Makes the synthetic test images. The known answers come from the design, not from a tool run.
# Run: python make_synthetic.py  (numpy, Pillow, tifffile)
import csv
import json
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

HERE = Path(__file__).resolve().parent
rng = np.random.default_rng(20261008)


def disk(shape, cy, cx, r):
    yy, xx = np.ogrid[: shape[0], : shape[1]]
    return (yy - cy) ** 2 + (xx - cx) ** 2 <= r * r


def plate():
    n = 400
    img = np.zeros((n, n, 3)) + [25, 25, 25]
    c = n / 2
    img[disk((n, n), c, c, 190)] = [200, 120, 120]
    img[disk((n, n), c, c, 182)] = [170, 35, 35]
    colonies = [(120, 130), (150, 260), (200, 200), (230, 120), (260, 280), (290, 190), (140, 190), (250, 230), (180, 300), (300, 250)]
    pair = [(210, 140), (210, 156)]
    for cy, cx in colonies + pair:
        img[disk((n, n), cy, cx, 8)] = [225, 190, 185]
    specks = [(160, 160), (270, 150), (190, 250)]
    for cy, cx in specks:
        img[disk((n, n), cy, cx, 1.5)] = [225, 190, 185]
    img[118:121, 220:262] = [225, 190, 185]
    img[disk((n, n), c, c - 176, 7)] = [225, 190, 185]
    img = img + rng.normal(0, 3, img.shape)
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(HERE / "synthetic_plate.png")
    return {"n_colonies": len(colonies) + len(pair), "n_too_small": len(specks), "n_not_round": 1, "rim_colony_left_out": 1}


def uptake():
    n = 420
    nuc = np.full((n, n), 500.0)
    mem = np.full((n, n), 400.0)
    cargo = np.full((n, n), 300.0)
    centers = [(80 + 130 * i, 80 + 130 * j) for i in range(3) for j in range(3)]
    spots = [0, 1, 2, 0, 3, 1, 0, 0, 1]
    offsets = [(-18, 20), (20, -18), (22, 18)]
    for (cy, cx), k in zip(centers, spots):
        mem[disk((n, n), cy, cx, 45)] = 8000
        nuc[disk((n, n), cy, cx, 14)] = 20000
        for dy, dx in offsets[:k]:
            cargo[disk((n, n), cy + dy, cx + dx, 3)] = 30000
    by, bx = 400, 145
    mem[disk((n, n), by, bx, 25)] = 8000
    nuc[disk((n, n), by, bx, 10)] = 20000
    cargo[disk((n, n), by - 10, bx + 5, 3)] = 30000
    cargo[disk((n, n), 15, 145, 3)] = 30000
    stack = np.stack([nuc, mem, cargo]) + rng.normal(0, 100, (3, n, n))
    tifffile.imwrite(HERE / "synthetic_uptake.tif", np.clip(stack, 0, 65535).astype(np.uint16), photometric="minisblack", compression="zlib", metadata={"axes": "CYX"})
    return {"n_nuclei": 10, "n_cells": 9, "n_positive": 5, "fraction_positive": 5 / 9, "n_cargo_objects": 10, "n_cargo_in_cells": 8, "mean_cargo_per_cell": 8 / 9, "n_excluded_border": 1}


def brightfield_red():
    n = 300
    bf = np.full((n, n), 180.0) + rng.normal(0, 3, (n, n))
    red = np.full((n, n), 10.0) + rng.normal(0, 2, (n, n))
    centers = [(60 + 90 * i, 60 + 90 * j) for i in range(3) for j in range(3)][:8]
    eaten = {1: [(0, 0)], 4: [(-8, 8), (10, -6)], 6: [(5, 5)]}
    for k, (cy, cx) in enumerate(centers):
        m = disk((n, n), cy, cx, 32)
        bf[m] = 150 + rng.normal(0, 25, m.sum())
        for dy, dx in eaten.get(k, []):
            red[disk((n, n), cy + dy, cx + dx, 6)] = 200
    red[disk((n, n), 240, 240, 6)] = 200
    stack = np.stack([np.clip(bf, 0, 255), np.clip(red, 0, 255)]).astype(np.uint8)
    tifffile.imwrite(HERE / "synthetic_brightfield_red.tif", stack, photometric="minisblack", metadata={"axes": "CYX"})
    return {"n_cells": 8, "n_positive": 3, "fraction_positive": 3 / 8, "n_cargo_objects": 5, "n_cargo_in_cells": 4}


def clonogenic():
    rows = [("control", 0, 100, 52), ("control", 0, 100, 48), ("control", 0, 100, 50),
            ("2 Gy", 2, 200, 60), ("2 Gy", 2, 200, 50), ("2 Gy", 2, 200, 70),
            ("4 Gy", 4, 1000, 100), ("4 Gy", 4, 1000, 120), ("4 Gy", 4, 1000, 80)]
    with open(HERE / "synthetic_clonogenic.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["condition", "dose_gy", "cells_seeded", "colonies"])
        w.writerows(rows)
    return {"plating_efficiency_control": 0.5, "surviving_fraction_2_gy": 0.6, "surviving_fraction_4_gy": 0.2}


if __name__ == "__main__":
    answers = {"synthetic_plate.png": plate(), "synthetic_uptake.tif": uptake(), "synthetic_brightfield_red.tif": brightfield_red(), "synthetic_clonogenic.csv": clonogenic()}
    print(json.dumps(answers, indent=2))
