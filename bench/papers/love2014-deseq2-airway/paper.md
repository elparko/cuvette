# Love 2014: DESeq2, airway smooth muscle cells with dexamethasone

## Citation
- Love MI, Huber W, Anders S. Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biology 15:550 (2014). DOI: 10.1186/s13059-014-0550-8
- Data paper: Himes BE et al. RNA-Seq transcriptome profiling identifies CRISPLD2 as a glucocorticoid responsive gene that modulates cytokine function in airway smooth muscle cells. PLoS ONE 9(6):e99625 (2014). DOI: 10.1371/journal.pone.0099625. GEO series GSE52778.
- Worked analysis: Love MI et al. "RNA-seq workflow: gene-level exploratory analysis and differential expression" (Bioconductor rnaseqGene workflow, F1000Research 2016; read 2026-10-07 at https://bioconductor.org/packages/release/workflows/vignettes/rnaseqGene/inst/doc/rnaseqGene.html). The numbers below come from this workflow, not from the 2014 paper text. The DESeq2 2014 paper uses other data for its figures.

## Data
- Bioconductor package airway 1.32.0: 8 samples, 63677 genes, raw counts. License LGPL (package DESCRIPTION).
- URL: https://bioconductor.org/packages/release/data/experiment/src/contrib/airway_1.32.0.tar.gz (24.7 MB). Raw reads are in GEO GSE52778 / SRA SRP033351. GEO has no raw count matrix, only FPKM and Cuffdiff output, so fetch.sh converts the package counts to CSV with extract_airway.py (needs Python packages pandas, numpy, rdata).
- Local files: /Volumes/T7/guided-analysis/data/love2014-deseq2-airway/airway_counts.csv (genes x samples), airway_coldata.csv (sample metadata).
- Cell lines, no patient data.

## Tool
- Original: R package DESeq2 (R is not installed here, so give the data and prompts only for this route).
- Python route: pydeseq2 0.5.4 (checked). `DeseqDataSet(counts, metadata, design="~cell + dex")`, `DeseqStats(contrast=["dex","trt","untrt"], alpha=0.1)`.

## Sample design
4 cell lines (N61311, N052611, N080611, N061011), each untreated (untrt) and treated with dexamethasone (trt; dose and time not checked). Paired design: cell line is the pairing unit. Columns in airway_coldata.csv: cell, dex, albut, Run, avgLength, Experiment, Sample, BioSample.

## Method steps (rnaseqGene workflow)
1. Build the DESeqDataSet with design `~ cell + dex`. Reference level of dex is untrt.
2. Pre-filter: `smallestGroupSize <- 4; keep <- rowSums(counts(dds) >= 10) >= smallestGroupSize`. Workflow result: 58294 genes to 16637 genes.
3. `dds <- DESeq(dds)`: size factors, dispersion estimates, Wald test.
4. `res <- results(dds)` with the default alpha 0.1 and independent filtering.
5. Count genes with padj < 0.1. Also `results(dds, alpha = 0.05)` and `results(dds, lfcThreshold = 1)`.

## Numbers to reproduce
| Quantity | Workflow value (annotation of the workflow, 58294 genes) | Check run (pydeseq2, this CSV, 63677 genes) |
|---|---|---|
| Genes after pre-filter | 16637 | 16139 |
| padj < 0.1 | 4381 (2362 up, 2019 down) | 4643 (2478 up, 2165 down) |
| padj < 0.05 (alpha 0.05) | 3602 | 3872 |
| lfcThreshold = 1, padj < 0.1 | 240 | not run |
| Top gene | not read | ENSG00000152583, log2FC 4.57, padj 4.4e-159 |

The two columns differ because the workflow uses a newer gene annotation and read counting. Allow a wide tolerance.

## Decisions the scientist owns (paper choice)
- Replication unit: 4 cell lines, each with one untreated and one treated sample.
- Batch/pairing term in the design: `cell` (the design is `~ cell + dex`). Without it, power drops.
- Reference level: untrt.
- Low-count filter: at least 10 counts in at least 4 samples.
- FDR cut-off: 0.1 (default); 0.05 as a stricter case.
- Fold-change cut-off: none by default; lfcThreshold 1 as a stricter test.
- Exclusions: none. Gene-level summary of counts, no sample removed.
