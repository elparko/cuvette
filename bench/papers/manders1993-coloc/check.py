# Prints the Coloc 2 assertions for the Manders 1993 image pairs and the same values from plain NumPy (no adapter code).
# Run: python -I check.py > check.out  (numpy, tifffile, imagecodecs)
import re
import sys

import numpy as np
import tifffile

D = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/manders1993-coloc"
R = sys.argv[2] if len(sys.argv) > 2 else "/Volumes/T7/guided-analysis/reference/manders1993-coloc"
for f in ("PearsonsCorrelationTest.java", "MandersColocalizationTest.java"):
    src = open(R + "/" + f).read()
    block = src[src.index("public void mandersPaperImagesTest"):]
    block = block[: block.index("\n\t}\n")]
    pairs = re.findall(r"test (A-[A-I]) combination", block)
    vals = re.findall(r"assertEquals\(([\d.]+)d?, r(?:\.m1)?, ([\d.]+)\);|assertEquals\(([\d.]+)d, r\.m2, ([\d.]+)\);", block)
    print(f, "pairs", pairs)
    print(" asserted:", re.findall(r"assertEquals\(([\d.]+)d, (r(?:\.m[12])?), ([\d.]+)\)", block))
a = tifffile.imread(D + "/mandersA.tiff").astype(float)
for k in "BCD":
    b = tifffile.imread(D + "/manders%s.tiff" % k).astype(float)
    r = np.corrcoef(a.ravel(), b.ravel())[0, 1]
    print("A-%s NumPy Pearson %.4f, M1 %.4f, M2 %.4f" % (k, r, a[b > 0].sum() / a.sum(), b[a > 0].sum() / b.sum()))
