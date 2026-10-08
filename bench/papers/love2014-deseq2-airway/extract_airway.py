import sys, warnings
import numpy as np
import pandas as pd
import rdata

warnings.simplefilter("ignore")
src, out = sys.argv[1], sys.argv[2]
a = rdata.read_rda(src)["airway"]
counts = a.assays.data.listData["counts"]
genes = np.asarray(a.rowRanges.partitioning.NAMES)
cd = a.colData
samples = [str(x) for x in cd.rownames]
pd.DataFrame(counts, index=genes, columns=samples).rename_axis("gene_id").to_csv(f"{out}/airway_counts.csv")
meta = pd.DataFrame({k: np.asarray(v) for k, v in cd.listData.items()}, index=samples)
meta.rename_axis("sample").to_csv(f"{out}/airway_coldata.csv")
