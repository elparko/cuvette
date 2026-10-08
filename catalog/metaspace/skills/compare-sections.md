---
name: compare-sections
description: Procedure to ask if the annotations agree between serial sections or between two public datasets.
---

# Agreement between datasets

1. Get the ids of the datasets. Use search_datasets if the scientist has none. Only public datasets are available.
2. Call get_dataset_info for each id. Check that polarity, adducts, ppm tolerance and databases are the same. If they differ, say so. The overlap is then not a fair test.
3. Ask for the decisions: FDR level, database with version, off-sample annotations.
4. Call overlap_annotations with the ids. Report n_in_all, n_in_union and the count of each dataset.
5. Report the agreement as n_in_all out of n_in_union. Do not call a section a replicate unless the scientist says so. Serial sections of one animal are technical replicates.
6. If the scientist's own sections are not on METASPACE, say that this adapter cannot upload them. The scientist must upload them on the website and make them public or share the ids.
