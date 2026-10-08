# Run: ~/.guided-analysis/envs/skimage/bin/python check_true_nuclei_test.py [data folder]
# Counts the nuclei in the truth masks of the test split with skimage.measure.label, one label pass per mask color.
import sys
from pathlib import Path

import imageio.v3 as iio
import numpy as np
from skimage.measure import label

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/caicedo2019-bbbc039/x")
names = [l.strip() for l in (root / "metadata/metadata/test.txt").read_text().splitlines() if l.strip()]
total = 0
for name in names:
    a = iio.imread(root / "masks/masks" / name)[..., :3].reshape(-1, 3)
    colors, inv = np.unique(a, axis=0, return_inverse=True)
    inv = inv.reshape(520, 696)
    for c in range(len(colors)):
        if colors[c].any():
            total += label(inv == c, connectivity=2).max()
print(f"test images: {len(names)}")
print(f"true_nuclei_test (skimage.measure.label per color, 8-connected): {total}")
