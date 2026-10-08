# Run: ~/.guided-analysis/envs/skimage/bin/python check_dice_and_labels.py [data folder]
# numpy, scipy, PIL and tifffile only. No scikit-image: own color deconvolution, own Otsu, scipy labels.
import sys
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image
from scipy import ndimage

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/mahbod2024-nuinsseg/x")

rgb_from_hed = np.array([[0.65, 0.70, 0.29], [0.07, 0.99, 0.11], [0.27, 0.57, 0.78]])
rgb_from_hed /= np.linalg.norm(rgb_from_hed, axis=1, keepdims=True)
hed_from_rgb = np.linalg.inv(rgb_from_hed)


def hematoxylin(img):
    x = np.maximum(img.astype(float) / 255.0, 1e-6)
    od = np.log(x) / np.log(1e-6)
    return np.maximum(od.reshape(-1, 3) @ hed_from_rgb, 0)[:, 0].reshape(img.shape[:2])


def otsu(v, bins=256):
    hist, edges = np.histogram(v.ravel(), bins=bins)
    centers = (edges[:-1] + edges[1:]) / 2
    w1 = np.cumsum(hist)
    w2 = np.cumsum(hist[::-1])[::-1]
    m1 = np.cumsum(hist * centers) / np.maximum(w1, 1)
    m2 = (np.cumsum((hist * centers)[::-1]) / np.maximum(w2[::-1], 1))[::-1]
    between = w1[:-1] * w2[1:] * (m1[:-1] - m2[1:]) ** 2
    return centers[:-1][np.argmax(between)]


dice, n_labels, n_components = [], 0, 0
four = ndimage.generate_binary_structure(2, 1)
for img_path in sorted(root.glob("*/tissue images/*.png")):
    if img_path.name.startswith("."):
        continue
    truth = tifffile.imread(img_path.parent.parent / "label masks" / (img_path.stem + ".tif"))
    ids = np.flatnonzero(np.bincount(truth.ravel()))
    n_labels += int((ids > 0).sum())
    h = hematoxylin(np.array(Image.open(img_path).convert("RGB")))
    mask = h > otsu(h)
    lab, n = ndimage.label(mask, structure=four)
    sizes = np.bincount(lab.ravel())
    keep = sizes >= 30
    keep[0] = False
    mask = keep[lab]
    t = truth > 0
    dice.append(2 * (mask & t).sum() / max(mask.sum() + t.sum(), 1))
print(f"images: {len(dice)}")
print(f"mean_dice_otsu (numpy HED, numpy Otsu, scipy size filter >= 30 px, 4-connected): {np.mean(dice):.4f}")
print(f"nuclei_label_masks (distinct non-zero values by bincount): {n_labels}")
