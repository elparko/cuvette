# Run: uv run --no-project --with numpy python -I check_spectra.py /Volumes/T7/guided-analysis/data/schramm2012-imzml-pyimzml
# Reads imzML with the standard library XML parser and the ibd file with numpy. No pyimzML.
import os
import sys
import xml.etree.ElementTree as ET

import numpy as np

MZ = "{http://psi.hupo.org/ms/mzml}"
D = sys.argv[1]


def spectra(name):
    root = ET.parse(os.path.join(D, name + ".imzML")).getroot()
    ibd = open(os.path.join(D, name + ".ibd"), "rb").read()
    out = []
    for s in root.iter(MZ + "spectrum"):
        tic_meta = None
        for p in s.findall(MZ + "cvParam"):
            if p.get("accession") == "MS:1000285":
                tic_meta = float(p.get("value"))
        x = y = None
        for p in s.iter(MZ + "cvParam"):
            if p.get("accession") == "IMS:1000050":
                x = int(p.get("value"))
            if p.get("accession") == "IMS:1000051":
                y = int(p.get("value"))
        a = {}
        for b in s.iter(MZ + "binaryDataArray"):
            ref = b.find(MZ + "referenceableParamGroupRef").get("ref")
            vals = {p.get("accession"): p.get("value") for p in b.findall(MZ + "cvParam")}
            off, n = int(vals["IMS:1000102"]), int(vals["IMS:1000103"])
            a[ref] = np.frombuffer(ibd, dtype="<f4", count=n, offset=off)
        out.append(((x, y), a["mzArray"], a["intensityArray"], tic_meta))
    return out


for name in ("Example_Continuous", "Example_Processed"):
    sp = spectra(name)
    mz_all = np.concatenate([m for _, m, _, _ in sp])
    tic = np.array([i.sum(dtype=np.float32) for _, _, i, _ in sp], dtype=np.float32)
    tic64 = np.array([i.astype(np.float64).sum() for _, _, i, _ in sp])
    k = int(np.argmax(tic))
    print(name)
    print("  spectra", len(sp))
    print("  mz_min %.6f mz_max %.6f" % (mz_all.min(), mz_all.max()))
    print("  max_pixel_tic float32 %.4f float64 %.4f at pixel %s" % (tic[k], tic64[k], sp[k][0]))
    print("  mean_tic float32 sums %.4f float64 %.4f" % (tic.astype(np.float64).mean(), tic64.mean()))
    print("  tic in imzML metadata (MS:1000285):", [t for *_, t in sp])
    print("  ibd bytes on disk", os.path.getsize(os.path.join(D, name + ".ibd")))

c, p = spectra("Example_Continuous"), spectra("Example_Processed")
n = len(c[0][1])
print("ibd bytes from the layout: continuous 16 + 4*%d + 9*4*%d = %d; processed 16 + 9*2*4*%d = %d" % (n, n, 16 + 4 * n + 9 * 4 * n, n, 16 + 9 * 2 * 4 * n))
print("identical spectra:", all(np.array_equal(a[1], b[1]) and np.array_equal(a[2], b[2]) and a[0] == b[0] for a, b in zip(c, p)))
