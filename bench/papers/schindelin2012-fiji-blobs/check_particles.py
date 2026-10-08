# Run: ~/.guided-analysis/envs/skimage/bin/python check_particles.py [blobs.gif]
# PIL and scipy only. Uses the range 126 to 255 that ImageJ 1.53 Default picked, 8-connected labels like Analyze Particles.
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

path = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/schindelin2012-fiji-blobs/blobs.gif"
img = np.array(Image.open(path))
print(f"shape {img.shape}, raw values {img.min()} to {img.max()}")
lab, n = ndimage.label(img >= 126, structure=np.ones((3, 3)))
edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
print(f"particles_edges_included: {n}")
print(f"particles_edges_excluded: {n - len(edge[edge > 0])}")
