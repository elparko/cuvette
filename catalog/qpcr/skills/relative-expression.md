---
name: relative-expression
description: Steps to get the fold change of target genes by the 2^-ddCt or the Pfaffl method.
---

# Relative expression

1. Read the Cq file. Find the columns for the sample, the group, the gene, the Cq and the well.
2. Ask the scientist for the reference genes and the calibrator group.
3. If there is a dilution series, run fit_efficiency. Read the efficiency of each gene.
4. Ask the scientist for the method. Use pfaffl if an efficiency is far from 2.
5. Ask the scientist for the error type, the excluded wells and the Cq cutoff.
6. Run relative_quantification. Read ddCt, the fold change and the interval of each target and group.
7. Read the number of non-detects and the samples that the tool left out.
8. Report the method, the reference genes, the calibrator, n for each group and each fold change with its interval.
