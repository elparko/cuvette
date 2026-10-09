# MAGeCK reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- test_screen ranks genes for one treatment group against one control group. It uses rank aggregation (RRA).
- fit_screen_model fits beta scores for several conditions with a design matrix.
- The input is a table of read counts. Column 1 is the sgRNA, column 2 is the gene, and each other column is a sample.
- Start from the count table. These tools do not align FASTQ files.
- If Excel opened the count table, gene symbols such as SEPT1 and MARCH1 can become dates. The tools refuse such a table.

## What to report

- The library, the cell line, the number of genes and sgRNAs, and the sample labels of each group.
- The normalization, the treatment of zero counts, and the version of MAGeCK.
- The method (rank aggregation or beta score model) and the direction (depleted or enriched).
- The false discovery rate cutoff and the number of genes that pass it, in each direction.
- For each hit that you name: the score or beta, the false discovery rate and the rank. Add the log2 fold change and the number of good sgRNAs.
- Each sample or gene that the scientist removed, and the reason.

## How to read the result

- A negative log2 fold change and a low neg|score mean depletion. A positive log2 fold change and a low pos|score mean enrichment.
- A negative beta score means depletion. A positive beta score means enrichment. A beta near zero means no selection.
- The rank aggregation p values come from a permutation test. Two runs differ in the third digit. Do not report more than two significant digits.
- A gene with one good sgRNA is a weak hit. Name the number of good sgRNAs for each hit.
- An end point against the plasmid or day 0 mainly finds essential genes. Treated cells against untreated cells at the same time find genes that change the response to the treatment.
- A screen with one sample in a group has no replicate. The variance comes from a model across all sgRNAs. Say so.
- Ribosomal protein genes are a positive control for a depletion screen. Check that they rank high.

## Do not claim

- Do not call a gene a validated target. A screen hit needs a second guide, a rescue or another assay.
- Do not report a false discovery rate below 0.001 as exact. The permutation test has a floor.
- Do not compare the beta scores of two screens without a shared normalization.
