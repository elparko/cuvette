---
name: count-annotations
description: Procedure to count the annotations of one public METASPACE dataset and show how the count depends on FDR, database and off-sample annotations.
---

# Count annotations in one dataset

1. If you have no dataset id, call search_datasets with filters. Show the scientist the id, name, polarity and group of each hit.
2. Call get_dataset_info with the id. Note the databases, adducts, ppm tolerance and resolving power.
3. Ask for the decisions: FDR level, database, database version, adducts, off-sample annotations. Use only databases that get_dataset_info lists for this dataset.
4. Call compare_fdr_counts for the chosen database. Show the counts at FDR 5, 10 and 20 percent. Tell the scientist how much the count changes.
5. Call list_annotations with the chosen FDR level. Report n_annotations and n_off_sample_in_fdr_set.
6. Repeat steps 4 and 5 for a second database if the scientist asks how the database changes the count.
7. Report: dataset id, database and version, FDR level (a maximum), the count, the number of off-sample annotations, the adducts and the date.
8. Call the annotations putative. Do not call them identifications.
