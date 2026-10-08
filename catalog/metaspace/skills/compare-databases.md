---
name: compare-databases
description: Procedure to compare the annotation count of one dataset between two molecular databases.
---

# Compare two databases

1. Call get_dataset_info. Use only databases that the dataset was processed with.
2. Ask the scientist for the FDR level and for the off-sample decision. Keep them the same for both databases.
3. Call compare_fdr_counts once for each database.
4. Show a table with one row for each database and the counts at FDR 5, 10 and 20 percent.
5. Say that a database with more entries can give more annotations and also more false annotations. The engine corrects this with the FDR, but the lists are not the same.
6. A formula can be in both databases. Do not add the two counts.
