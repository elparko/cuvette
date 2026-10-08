import gzip
import sys
from pathlib import Path

import numpy as np
import scipy.io

root = Path(sys.argv[1])
for sample in ("pulse", "chase"):
    d = root / sample
    m = scipy.io.mmread(str(d / "matrix.mtx.gz")).tocsc()
    with gzip.open(d / "features.tsv.gz", "rt") as f:
        names = [line.rstrip("\n").split("\t")[1] for line in f]
    mt = np.array([n.startswith("mt-") for n in names])
    genes = np.asarray((m > 0).sum(axis=0)).ravel()
    total = np.asarray(m.sum(axis=0)).ravel()
    mito = np.asarray(m[mt, :].sum(axis=0)).ravel()
    pct = 100 * mito / np.maximum(total, 1)
    print(f"{sample}: genes {m.shape[0]}, cells {m.shape[1]}, mitochondrial genes {mt.sum()}")
    for label, keep in [
        ("200 <= genes <= 6000, mito <= 10", (genes >= 200) & (genes <= 6000) & (pct <= 10)),
        ("200 <= genes < 6000, mito < 10", (genes >= 200) & (genes < 6000) & (pct < 10)),
        ("200 < genes < 6000, mito < 10", (genes > 200) & (genes < 6000) & (pct < 10)),
    ]:
        print(f"  kept with {label}: {keep.sum()}")
    print(f"  removed: fewer than 200 genes {(genes < 200).sum()}, more than 6000 genes {(genes > 6000).sum()}, more than 10% mito {(pct > 10).sum()}")
