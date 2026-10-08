---
name: compare-samples
description: How to compare conditions across samples without using cells as replicates.
---

# Compare conditions

Cells from one sample are not independent. Use samples, donors or animals as n.

1. Ask which sample belongs to which condition, and which samples come from the same donor.
2. Cluster all samples together. Check that each cluster holds cells from more than one sample.
3. Count the cells of each cluster in each sample. Compare proportions between samples, not between cells.
4. For a gene-level comparison, sum the raw counts (layers['counts']) of each sample in each cluster. This is a pseudobulk table. Test it with a count model such as DESeq2 or edgeR, with samples as n.
5. Do not use find_markers with groupby set to a condition. It treats each cell as one observation.
6. Report the number of samples in each group, the test, the effect size and the confidence interval.
