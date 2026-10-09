import sys

import anndata as ad
import harmonypy
import numpy as np

a = ad.read_h5ad(sys.argv[1])
x = np.asarray(a.obsm["X_pca"], dtype=np.float64)
ref = np.asarray(a.obsm["X_pca_harmony_reference"], dtype=np.float64)
donor = a.obs["donor"].astype(str).values


def shift(m):
    sd = m.std(axis=0)
    means = np.vstack([m[donor == d].mean(axis=0) for d in np.unique(donor)])
    return float(np.mean((means.max(axis=0) - means.min(axis=0)) / sd))


out = harmonypy.run_harmony(x, a.obs[["donor"]], "donor", theta=2.0, random_state=0)
z = np.asarray(out.Z_corr)
r = np.array([np.corrcoef(z[:, i], ref[:, i])[0, 1] for i in range(z.shape[1])])
print("cells %d dimensions %d donors %s" % (x.shape[0], x.shape[1], ", ".join(np.unique(donor))))
print("batch shift before %.4f | R harmony2 reference %.4f | harmonypy %.4f" % (shift(x), shift(ref), shift(z)))
print("Pearson r with the R reference per dimension: min %.4f mean %.4f" % (r.min(), r.mean()))
