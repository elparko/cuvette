# Independent check of the colocalization test values with plain NumPy (no adapter code).
# The expected values are the assertions in the Fiji Coloc 2 unit tests (commit 82af2de4):
#   PearsonsCorrelationTest.mandersPaperImagesTest: A-B 0.72, A-C 0.44, A-D 0.16 (tolerance 0.01)
#   PearsonsCorrelationTest.fastPearsonsPositiveCorrTest: colocsample1b 0.75 (tolerance 0.01)
#   MandersColocalizationTest.mandersPaperImagesTest: A-B M1 = M2 = 0.75; A-I M1 0.083, M2 0.75
#   MandersColocalizationTest.mandersRealNoisyImagesTest: thresholds 70 and 53, mask, tM1 0.705665, tM2 0.724752
# Run from the adapter folder after data/fetch.sh: python checks/check_coloc2.py > checks/check_coloc2.out
from pathlib import Path

import numpy as np
import tifffile

D = Path(__file__).resolve().parent.parent / "data" / "coloc2"


def load(name):
    return tifffile.imread(D / name).astype(float)


def pearson(x, y):
    return float(np.corrcoef(x.ravel(), y.ravel())[0, 1])


a = load("mandersA.tiff")
for k in "BCDI":
    b = load("manders%s.tiff" % k)
    m1 = a[b > 0].sum() / a.sum()
    m2 = b[a > 0].sum() / b.sum()
    print("A-%s Pearson %.4f M1 %.4f M2 %.4f" % (k, pearson(a, b), m1, m2))
g, r = load("colocsample1b-green.tif"), load("colocsample1b-red.tif")
mask = load("colocsample1b-mask.tif") > 0
print("colocsample1b Pearson, whole stack %.4f" % pearson(g, r))
x, y = g[mask], r[mask]
tm1 = x[(y > 0) & (y >= 53)].sum() / x.sum()
tm2 = y[(x > 0) & (x >= 70)].sum() / y.sum()
print("colocsample1b in mask, thresholds 70 and 53: tM1 %.6f tM2 %.6f" % (tm1, tm2))
