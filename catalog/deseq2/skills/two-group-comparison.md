---
name: two-group-comparison
description: Steps to find the genes that differ between two conditions in an RNA-seq count table with DESeq2.
---

# Compare two conditions

1. Run inspect_counts. Read the detected input type, the sample table columns and the levels of each column.
2. Ask the scientist for the design, the variable, the reference level and the test level.
3. Ask the scientist what the replicates are. If one donor has several samples, the design must have a donor term.
4. Ask the scientist for the filter and the cutoff for padj.
5. Run run_deseq. Read the number of tested genes, the number of significant genes, up and down.
6. Run top_genes for the table of the best genes. Give the reference level and the test level with the table.
7. Report the design, the filter, the cutoff and the counts. Say which genes are up in the test level.
8. Offer to run the test again with another filter or cutoff. Show how the counts change.
