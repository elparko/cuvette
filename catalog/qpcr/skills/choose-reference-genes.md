---
name: choose-reference-genes
description: Steps to rank candidate reference genes with geNorm and NormFinder and to report the result.
---

# Choose reference genes

1. Read the Cq file. Find the columns for the sample, the gene, the Cq and the group.
2. Ask the scientist for the candidate genes, the excluded wells and the Cq cutoff.
3. Ask the scientist if NormFinder must use groups, such as tissue or treatment.
4. Run rank_reference_genes with method both.
5. Read the geNorm best pair and the average M at each step. Note the genes with M above 0.5.
6. Read the pairwise variation V. Find the smallest number of genes with V below 0.15.
7. Read the NormFinder stability values. Compare the order with the geNorm order.
8. Report the best pair, the M values, the V values and the NormFinder values with the method names.
9. Tell the scientist which genes the methods agree on. The scientist chooses the reference genes.
