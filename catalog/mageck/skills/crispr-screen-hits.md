---
name: crispr-screen-hits
description: Steps to call hit genes from a pooled CRISPR screen with a table of sgRNA counts.
---

# Hit genes of a CRISPR screen

1. Read the count table. Find the sgRNA column, the gene column and the sample columns.
2. Ask the scientist which samples are the treatment, which are the control, and which are replicates of each other.
3. Ask which comparison answers the question. It is the end point against the plasmid or day 0, or treated against untreated at the same time.
4. Ask for the normalization and for the false discovery rate cutoff. Ask about control sgRNAs. Ask for the direction.
5. For one treatment and one control, run test_screen with the sample labels. For several conditions or a time course, ask for a design matrix and run fit_screen_model.
6. Read the number of genes that pass the cutoff in each direction. Read the top genes with their log2 fold change and the number of good sgRNAs.
7. Check the positive controls. Ribosomal protein genes must rank among the most depleted genes in an end point screen.
8. Report the cutoff, the direction, the normalization, the groups and the number of replicates. Name a hit only with its score, false discovery rate and good sgRNAs.
