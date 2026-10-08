# Love 2014: DESeq2, airway smooth muscle cells with dexamethasone

## Citation
- Love MI, Huber W, Anders S. Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biology 15:550 (2014). DOI: 10.1186/s13059-014-0550-8
- Data paper: Himes BE et al. RNA-Seq transcriptome profiling identifies CRISPLD2 as a glucocorticoid responsive gene that modulates cytokine function in airway smooth muscle cells. PLoS ONE 9(6):e99625 (2014). DOI: 10.1371/journal.pone.0099625. GEO series GSE52778.
- Worked analysis: Love MI et al. "RNA-seq workflow: gene-level exploratory analysis and differential expression" (Bioconductor rnaseqGene workflow, F1000Research 2016; read 2026-10-07 at https://bioconductor.org/packages/release/workflows/vignettes/rnaseqGene/inst/doc/rnaseqGene.html). The numbers below come from this workflow, not from the 2014 paper text. The DESeq2 2014 paper uses other data for its figures.

## Data
- Bioconductor package airway 1.32.0. License LGPL (package DESCRIPTION).
- URL: https://bioconductor.org/packages/release/data/experiment/src/contrib/airway_1.32.0.tar.gz (24.7 MB). Raw reads are in GEO GSE52778 / SRA SRP033351.
- Benchmark input: `data(gse)` of the package, the input of the rnaseqGene workflow. Salmon quantification summarized to GENCODE v29 genes by tximeta: 58294 genes, 8 samples, assays counts (estimated counts, with decimals), abundance and length (average transcript length of each gene in each sample).
- export_gse.R writes `data(gse)` as files that the deseq2 adapter reads. fetch.sh runs it.
  - airway_gse.rds: the SummarizedExperiment, with the columns cell and dex added as in the workflow (dex levels untrt, trt).
  - gse_counts.csv and gse_length.csv: the counts and length assays (genes x samples). gse_coldata.csv: the sample table.
- Reference input: `data(airway)` as airway_counts.csv and airway_coldata.csv (extract_airway.py; needs Python packages pandas, numpy, rdata). Read counts from summarizeOverlaps on Ensembl GRCh37.75 genes, 63677 genes, no lengths. Same experiment, other annotation and other quantification.
- Local files: /Volumes/T7/guided-analysis/data/love2014-deseq2-airway/.
- Cell lines, no patient data.

## Tool
- Original: R package DESeq2. Checked with DESeq2 1.52.0 on R 4.6.1 and airway 1.32.0 (check_workflow.R).
- Adapter route: deseq2 adapter 0.2.0, input type "SummarizedExperiment rds" (or "counts and lengths"). Both use DESeqDataSetFromTximport with the length assay, which is what DESeqDataSet(gse) does for a tximeta object.
- Python route: pydeseq2 0.5.4 (checked). `DeseqDataSet(counts, metadata, design="~cell + dex")`, `DeseqStats(contrast=["dex","trt","untrt"], alpha=0.1)`. Checked only on airway_counts.csv. I did not check if pydeseq2 accepts transcript length offsets, so it is not a route for data(gse).

## Sample design
4 cell lines (N61311, N052611, N080611, N061011), each untreated (untrt) and treated with dexamethasone (trt; dose and time not checked). Paired design: cell line is the pairing unit. Columns in airway_coldata.csv: cell, dex, albut, Run, avgLength, Experiment, Sample, BioSample.

## Method steps (rnaseqGene workflow)
1. Build the DESeqDataSet with design `~ cell + dex`. Reference level of dex is untrt.
1a. The workflow builds the object with `DESeqDataSet(gse, design = ~ cell + dex)`. For a tximeta object this rounds the counts and keeps the length assay as avgTxLength. DESeq2 then uses the lengths as normalization offsets for each gene and sample.
2. Pre-filter: `smallestGroupSize <- 4; keep <- rowSums(counts(dds) >= 10) >= smallestGroupSize`. Workflow result: 58294 genes to 16637 genes.
3. `dds <- DESeq(dds)`: size factors, dispersion estimates, Wald test.
4. `res <- results(dds)` with the default alpha 0.1 and independent filtering.
5. Count genes with padj < 0.1. Also `results(dds, alpha = 0.05)` and `results(dds, lfcThreshold = 1)`.

## Numbers to reproduce
Source of each expected value: the output that the rnaseqGene workflow vignette 1.36.0 prints (Bioconductor 3.23, DESeq2 1.52.0, airway 1.32.0), read 2026-10-07. check_workflow.R reruns the workflow code and prints the same numbers (check_workflow.out).

| Quantity | Vignette output, data(gse) (expected) | Adapter on airway_gse.rds and on the CSV pair | Same experiment, read counts on Ensembl 75 genes (data(airway), reference) | No length offsets (gse counts rounded) |
|---|---|---|---|---|
| Genes after pre-filter | 16637 | 16637 | 16139 | 16637 |
| padj < 0.1 | 4381 (2362 up, 2019 down) | 4381 (2362 up, 2019 down) | 4905 (2607 up, 2298 down) | 4877 (2681 up, 2196 down) |
| padj < 0.05 (alpha 0.05) | 3602 | 3602 (1993 up, 1609 down) | 4081 | 4108 |
| lfcThreshold = 1, padj < 0.1 | 240 | not run | not run | not run |

Other values on data(gse) with the adapter, for the tolerances: filter with at least 3 samples gives 17213 genes and 4406 at padj < 0.1 (2391 up, 2015 down). At least 5 samples gives 16081 and 4364 (2337 up, 2027 down). The design ~ dex gives 3076. pydeseq2 0.5.4 on airway_counts.csv gave 4643 at padj < 0.1 (not run on data(gse)).

Tolerances in bench.yaml: 10 for each count, 3 for the down count. R DESeq2 is deterministic, and a correct run gives the exact numbers. The tolerances reject the filter variants, the run without offsets and the data(airway) numbers.

## Decisions the scientist owns (paper choice)
- Replication unit: 4 cell lines, each with one untreated and one treated sample.
- Batch/pairing term in the design: `cell` (the design is `~ cell + dex`). Without it, power drops.
- Reference level: untrt.
- Low-count filter: at least 10 counts in at least 4 samples.
- FDR cut-off: 0.1 (default); 0.05 as a stricter case.
- Fold-change cut-off: none by default; lfcThreshold 1 as a stricter test.
- Exclusions: none. Gene-level summary of counts, no sample removed.
- Input type: the tximeta object or its counts and lengths. Rounding the estimated counts into a count matrix drops the offsets and changes the result.
