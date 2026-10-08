# Run: ~/.guided-analysis/envs/astropy/bin/python check_sky_sources_flux.py [fits] [params.ecsv]
# Uses astropy.io.fits only to read the file. All statistics use numpy and scipy, not astropy.stats or photutils.
import sys
from pathlib import Path

import numpy as np
from astropy.io import fits
from scipy import ndimage

fits_path = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/bradley-photutils-100gaussians/gaussians_noisy.fits"
params_path = sys.argv[2] if len(sys.argv) > 2 else str(next(Path.home().glob(".guided-analysis/envs/astropy/lib/python*/site-packages/photutils/datasets/data/100gaussians_params.ecsv")))

data = fits.getdata(fits_path).astype(float)


def clip(values, sigma=3.0, maxiters=5):
    v = values.ravel()
    for _ in range(maxiters):
        med, std = np.median(v), np.std(v)
        keep = np.abs(v - med) <= sigma * std
        if keep.all():
            break
        v = v[keep]
    return np.mean(v), np.median(v), np.std(v)


mean, med, std = clip(data)
print(f"sky_level (numpy 3-sigma clip, median): {med:.4f}")
print(f"sky_noise (numpy 3-sigma clip, std): {std:.4f}")

fwhm = 3.0
s = fwhm / (2 * np.sqrt(2 * np.log(2)))
for size in (13, 5):
    r = np.arange(size) - size // 2
    g = np.exp(-(r[:, None] ** 2 + r[None, :] ** 2) / (2 * s * s))
    g /= g.sum()
    smooth = ndimage.convolve(data - med, g, mode="constant", cval=0.0)
    labels, n = ndimage.label(smooth > 3 * std, structure=np.ones((3, 3)))
    sizes = np.bincount(labels.ravel())[1:]
    print(f"sources_detected (scipy.ndimage, {size}x{size} Gaussian FWHM 3, > 3 std, 8-connected, >= 10 pixels): {(sizes >= 10).sum()}")

rows = [l.split() for l in Path(params_path).read_text().splitlines() if l and not l.startswith("#")]
cols, rows = rows[0], [list(map(float, r)) for r in rows[1:]]
tab = {c: np.array([r[i] for r in rows]) for i, c in enumerate(cols)}

sub = 10
yy, xx = np.mgrid[0:data.shape[0] * sub, 0:data.shape[1] * sub]
xs = (xx + 0.5) / sub - 0.5
ys = (yy + 0.5) / sub - 0.5
for x0, y0 in [(48.70, 200.33), (145.05, 168.52), (355.56, 252.20)]:
    i = int(np.argmin((tab["x_mean"] - x0) ** 2 + (tab["y_mean"] - y0) ** 2))
    y1, y2, x1, x2 = int(y0) - 22, int(y0) + 23, int(x0) - 22, int(x0) + 23
    cut = data[y1:y2, x1:x2]
    cx, cy = xs[y1 * sub:y2 * sub, x1 * sub:x2 * sub], ys[y1 * sub:y2 * sub, x1 * sub:x2 * sub]
    d = np.hypot(cx - x0, cy - y0)
    frac = (d <= 10).reshape(cut.shape[0], sub, cut.shape[1], sub).mean(axis=(1, 3))
    dc = np.hypot(np.arange(x1, x2)[None, :] - x0, np.arange(y1, y2)[:, None] - y0)
    _, sky, _ = clip(cut[(dc >= 15) & (dc <= 20)])
    net = (cut * frac).sum() - sky * frac.sum()
    print(f"source ({x0}, {y0}): injected flux {tab['flux'][i]:.1f}; numpy aperture r=10 minus clipped-median annulus 15-20: {net:.1f}")
