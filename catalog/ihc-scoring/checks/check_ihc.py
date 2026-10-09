import csv
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pingouin as pg
from PIL import Image
from scipy import stats
from sklearn.metrics import cohen_kappa_score

data = Path(sys.argv[1])


PG = {"ICC1": "ICC(1,1)", "ICC2": "ICC(A,1)", "ICC3": "ICC(C,1)", "ICC1k": "ICC(1,k)", "ICC2k": "ICC(A,k)", "ICC3k": "ICC(C,k)"}


def icc_line(name, icc, t):
    row = icc.loc[PG[t]]
    line("%s_%s" % (name, t), "%.6f [%.2f, %.2f]" % (row["ICC"], row["CI95"][0], row["CI95"][1]))


def line(name, value):
    print("%s = %s" % (name, value))


shrout = np.array([[9, 2, 5, 8], [6, 1, 3, 2], [8, 4, 6, 8], [7, 1, 2, 6], [10, 5, 6, 9], [6, 2, 4, 7]], float)
long = pd.DataFrame({"s": np.repeat(np.arange(6), 4), "j": np.tile(np.arange(4), 6), "y": shrout.ravel()})
icc = pg.intraclass_corr(long, targets="s", raters="j", ratings="y").set_index("Type")
print("Shrout and Fleiss 1979 Table 2, pingouin %s. Published: ICC1 .17, ICC2 .29, ICC3 .71, ICC1k .44, ICC2k .62, ICC3k .91" % pg.__version__)
for t in ["ICC1", "ICC2", "ICC3", "ICC1k", "ICC2k", "ICC3k"]:
    icc_line("shrout", icc, t)

pix = pd.read_csv(data / "pix_h_score_table.csv")
pix["h_from_bins"] = pix.pct_1 + 2 * pix.pct_2 + 3 * pix.pct_3
pix["diff"] = pix.h_from_bins - pix.pathologist_h
line("pix_rows_h_differs_by_more_than_1", "; ".join("%s %s (printed %g, bins %g)" % (r.marker, r.case_id, r.pathologist_h, r.h_from_bins) for r in pix[pix["diff"].abs() > 1].itertuples()))
for m in ["5T4", "P-cadherin", "PD-L1"]:
    g = pix[pix.marker == m]
    rho = stats.spearmanr(g.pathologist_h, g.h_qupath)
    line("spearman_%s_pathologist_qupath" % m, "%.6f p=%.6f n=%d" % (rho.statistic, rho.pvalue, len(g)))
    rho = stats.spearmanr(g.pathologist_h, g.h_halo)
    line("spearman_%s_pathologist_halo" % m, "%.6f" % rho.statistic)

g = pix[pix.marker == "P-cadherin"]
a, b = np.digitize(g.pathologist_h, [100, 200]), np.digitize(g.h_qupath, [100, 200])
for w in ["linear", "quadratic", None]:
    line("kappa_pcad_%s" % w, "%.6f" % cohen_kappa_score(a, b, weights=w, labels=[0, 1, 2]))
line("exact_agreement_pcad", "%.6f" % np.mean(a == b))
two = pd.DataFrame({"s": np.tile(np.arange(len(g)), 2), "j": np.repeat([0, 1], len(g)), "y": np.concatenate([g.pathologist_h, g.h_qupath])})
icc = pg.intraclass_corr(two, targets="s", raters="j", ratings="y").set_index("Type")
for t in ["ICC1", "ICC2", "ICC3", "ICC2k"]:
    icc_line("icc_pcad", icc, t)
d = g.pathologist_h - g.h_qupath
line("pcad_mean_difference", "%.6f sd %.6f" % (d.mean(), d.std(ddof=1)))

g = pix[pix.marker == "5T4"]
three = pd.DataFrame({"s": np.tile(np.arange(len(g)), 3), "j": np.repeat([0, 1, 2], len(g)), "y": np.concatenate([g.pathologist_h, g.h_qupath, g.h_halo])})
icc = pg.intraclass_corr(three, targets="s", raters="j", ratings="y").set_index("Type")
for t in ["ICC3", "ICC3k"]:
    icc_line("icc_5t4_three_raters", icc, t)

rows = list(csv.DictReader(open(data / "synthetic_cells.csv", encoding="utf-8")))
V = "Nucleus: DAB OD mean"


def cls(v):
    return 0 if v < 0.2 else 1 if v < 0.4 else 2 if v < 0.6 else 3


def allred_ps(f):
    return 0 if f == 0 else 1 if f < 0.01 else 2 if f <= 0.1 else 3 if f <= 1 / 3 else 4 if f <= 2 / 3 else 5


for img in ["slideA", "slideB"]:
    for region in ["whole", "Tumor"]:
        cells = [r for r in rows if r["Image"] == img and (region == "whole" or r["Class"] == region)]
        c = [cls(float(r[V])) for r in cells]
        n = len(c)
        counts = [c.count(i) for i in range(4)]
        h = 100 * (counts[1] + 2 * counts[2] + 3 * counts[3]) / n
        pos = n - counts[0]
        ps = allred_ps(pos / n)
        pred = max(i for i in (1, 2, 3) if counts[i] == max(counts[1:]))
        avg = int((sum(i * counts[i] for i in (1, 2, 3)) / pos) + 0.5)
        line("cells_%s_%s" % (img, region), "n=%d counts=%s H=%.6f positive=%.6f ki67=%.6f allred_predominant=%d allred_average=%d" % (n, counts, h, 100 * pos / n, 100 * pos / n, ps + pred, ps + avg))

cells = [r for r in rows if r["Image"] == "slideA" and r["Class"] == "Tumor"]
xs = [float(r["Centroid X µm"]) for r in cells]
ys = [float(r["Centroid Y µm"]) for r in cells]
best = None
for x0 in sorted({min(xs) + 50 * k for k in range(-1, 12)}):
    for y0 in sorted({min(ys) + 50 * k for k in range(-1, 12)}):
        inside = [float(r[V]) >= 0.2 for r, x, y in zip(cells, xs, ys) if x0 <= x < x0 + 100 and y0 <= y < y0 + 100]
        if len(inside) >= 40:
            idx = sum(inside) / len(inside)
            if best is None or (idx, len(inside)) > best[:2]:
                best = (idx, len(inside), x0, y0)
line("hotspot_slideA_tumor_side100_min40", "index=%.6f n=%d x0=%g y0=%g" % (100 * best[0], best[1], best[2], best[3]))

Hn, Dn = np.array([0.65, 0.70, 0.29]), np.array([0.27, 0.57, 0.78])
Hn, Dn = Hn / np.linalg.norm(Hn), Dn / np.linalg.norm(Dn)
Rn = np.cross(Hn, Dn)
Rn = Rn / np.linalg.norm(Rn)
inv = np.linalg.inv(np.vstack([Hn, Dn, Rn]))


def od_stains(rgb8):
    od = -np.log10(np.maximum(rgb8 / 255.0, 1e-6))
    return np.maximum(od @ inv, 0)


im = np.array(Image.open(data / "synthetic_ihc.png").convert("RGB"), float)
st = od_stains(im)
yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
means = []
for k in range(12):
    cx, cy = 50 + 100 * (k % 4), 50 + 100 * (k // 4)
    disc = (xx - cx) ** 2 + (yy - cy) ** 2 <= 14 ** 2
    means.append(st[..., 1][disc].mean())
for c in range(4):
    line("synthetic_image_mean_dab_class_%d" % c, "%.6f (design %.2f)" % (np.mean(means[3 * c:3 * c + 3]), [0.05, 0.3, 0.5, 0.8][c]))
line("synthetic_image_region_mean_dab", "%.6f" % st[..., 1].mean())
line("synthetic_image_region_mean_hematoxylin", "%.6f" % st[..., 0].mean())

ihc = np.array(Image.open(data / "skimage_immunohistochemistry.png").convert("RGB"), float)
st = od_stains(ihc)
line("skimage_ihc_shape", ihc.shape)
line("skimage_ihc_region_mean_dab", "%.6f" % st[..., 1].mean())
line("skimage_ihc_region_mean_hematoxylin", "%.6f" % st[..., 0].mean())
line("skimage_ihc_fraction_dab_od_at_least_0.2", "%.6f" % (st[..., 1] >= 0.2).mean())
