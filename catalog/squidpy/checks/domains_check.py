import sys

import anndata as ad
import numpy as np
from sklearn.metrics import adjusted_rand_score

a = ad.read_h5ad(sys.argv[1])
domain = a.obs["spatial_domain"].astype(str).values
known = a.obs["cluster"].astype(str).values
graph = a.obsp["spatial_connectivities"].tocoo()
print("spots %d, domains %d" % (len(domain), len(set(domain))))
print("domain sizes: " + ", ".join(str(v) for v in sorted(np.unique(domain, return_counts=True)[1], reverse=True)))
print("neighbor pairs in the same domain: %.4f" % (domain[graph.row] == domain[graph.col]).mean())
print("adjusted Rand index with the 15 clusters of the sample (scikit-learn): %.4f" % adjusted_rand_score(known, domain))
print("neighbor pairs in the same known cluster: %.4f" % (known[graph.row] == known[graph.col]).mean())
