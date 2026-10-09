import os
import sys

import numpy as np
import tifffile

out = sys.argv[1]
fields = int(sys.argv[2]) if len(sys.argv) > 2 else 2
rng = np.random.default_rng(7)
size = 128
yy, xx = np.mgrid[:size, :size]
for group, eat in (("control", 0.2), ("treated", 0.6)):
    os.makedirs(os.path.join(out, group), exist_ok=True)
    for f in range(1, fields + 1):
        bf = rng.normal(170, 6, (size, size))
        red = np.zeros((size, size))
        for _ in range(12):
            cy, cx = rng.integers(12, size - 12, 2)
            cell = (yy - cy) ** 2 + (xx - cx) ** 2 < 64
            bf[cell] -= 50
            if rng.random() < eat:
                red[(yy - cy) ** 2 + (xx - cx) ** 2 < 9] = 220
        red += rng.normal(4, 2, (size, size))
        bf8 = np.clip(bf, 0, 255).astype(np.uint8)
        red8 = np.clip(red, 0, 255).astype(np.uint8)
        rgb_red = np.stack([red8, np.zeros_like(red8), np.zeros_like(red8)], axis=-1)
        overlay = np.stack([np.maximum(bf8, red8), bf8, bf8], axis=-1)
        stem = os.path.join(out, group, "field%d" % f)
        tifffile.imwrite(stem + "_CH1.tif", bf8)
        tifffile.imwrite(stem + "_CH3.tif", rgb_red, photometric="rgb")
        tifffile.imwrite(stem + "_Overlay.tif", overlay, photometric="rgb")
