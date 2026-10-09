# qPCR reporting standards

Follow these rules in each answer. They follow the MIQE guidelines. The review checks look for the same errors.

## Tools

- rank_reference_genes ranks candidate reference genes with geNorm and NormFinder.
- fit_efficiency fits the efficiency of each gene from a dilution series.
- relative_quantification gives the fold change of each target gene and group.
- The input is one row for each well or sample and gene. Reshape a plate export to this form first.

## What to report

- The reference genes and how you chose them, with the geNorm M or the NormFinder value.
- The method (2^-ddCt or Pfaffl) and the efficiency of each gene, with its source.
- The calibrator group, the number of biological samples in each group and the replicate rule.
- For each target and group: ddCt, the fold change, the interval and its type (Welch interval, or plus or minus one SD).
- The Cq cutoff, the number of non-detects and each excluded well with the reason.
- The NormqPCR version and the R version.

## How to read the result

- A lower geNorm M or NormFinder value means a more stable gene. M below 0.5 is a common limit for similar samples.
- A pairwise variation V below 0.15 means that the next reference gene adds little.
- The 2^-ddCt method is valid only when the efficiencies are near 2 and equal. Else use the Pfaffl method.
- The biological sample is the unit of replication. Technical replicate wells are not independent samples.
- A fold change interval from SD values is not a confidence interval. Name the type.

## Do not claim

- Do not call a reference gene stable without a stability analysis on the same samples.
- Do not give a p value from technical replicates.
- Do not report a fold change for a gene with no Cq in most samples of a group.
