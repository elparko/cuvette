# Korsunsky 2019: Harmony, integration of Jurkat and 293T cell line data sets

## Citation
- Korsunsky I, Millard N, Fan J, Slowikowski K, Zhang F, Wei K, Baglaenko Y, Brenner M, Loh P, Raychaudhuri S. Fast, sensitive and accurate integration of single-cell data with Harmony. Nature Methods 16(12):1289-1296 (2019).
- DOI: 10.1038/s41592-019-0619-0
- The numbers below were read in bioRxiv version 2 (10.1101/461954), section "Results" and "Methods". The Nature Methods page could not be read on 2026-10-09.

## Data
- Source: 10x Genomics public data sets "Jurkat", "293T" and "50:50 Jurkat:293T" cells, Cell Ranger 1.1.0, hg19. They come from Zheng et al. 2017 (10.1038/ncomms14049).
- URLs: `https://cf.10xgenomics.com/samples/cell-exp/1.1.0/<name>/<name>_filtered_gene_bc_matrices.tar.gz`, with `<name>` jurkat, 293t and jurkat:293t_50:50 (33.0 MB, 30.8 MB, 36.2 MB).
- License: CC BY 4.0 on the 10x pages of the same series. The pages of these 3 data sets answered HTTP 429 on 2026-10-09, so the license of these 3 is not confirmed.
- Local path: /Volumes/T7/guided-analysis/data/korsunsky2019-harmony/{jurkat,t293,mix}/filtered_matrices_mex/hg19/ (matrix.mtx, genes.tsv, barcodes.tsv). `fetch.sh` makes them.
- Cell lines, no patient identifiers.

## Tool
- scanpy 1.12.4 and harmonypy 2.1.0 (Python 3.13). The scanpy function `scanpy.external.pp.harmony_integrate` fails with harmonypy 2.1.0, so the harmony adapter calls harmonypy directly.

## Method steps, in order (paper, Methods "Preprocessing" and the cell line section)
1. Read the three data sets. Put them together.
2. Remove cells with fewer than 500 genes or more than 20 percent mitochondrial reads.
3. Scale each cell to 10,000 reads and apply log.
4. Take the top 1000 variable genes. Scale the genes across all cells.
5. Principal components: the paper keeps 30 (truncated SVD after an L2 normalization of the cells).
6. Run Harmony on the data set label with theta 2.
7. Compute the local inverse Simpson index (LISI, perplexity 30) with the data set as label (iLISI) and the cell line as label (cLISI), before and after Harmony. Label the cells of the mix as Jurkat or 293T with the pure data sets (Figure S1).

## Numbers to reproduce
| Quantity | Paper | check_lisi.py |
|---|---|---|
| Cells in pure Jurkat data set | 3255 | 3255 |
| Cells in pure 293T data set | 2859 | 2885 (does not reproduce) |
| Jurkat cells in the mix | 1799 | 1773 (does not reproduce) |
| 293T cells in the mix | 1565 | 1615 (does not reproduce) |
| Median iLISI before Harmony | 1.01 | 1.056 |
| Median iLISI after Harmony | 1.59 | 1.657 |
| Median cLISI before and after Harmony | 1.00 and 1.00 | 1.000 and 1.000 |

The paper expects an iLISI of at most 1.8 for Jurkat cells and 1.5 for 293T cells (the share of cells of each cell line in the mixed data). The cell counts of the paper for the pure 293T data set and the mix are lower than the 10x files by 26 and 24 cells. The paper does not say which cells it dropped.

## Decisions the scientist owns (paper choice)
- Minimum genes per cell: 500.
- Maximum percent mitochondrial reads: 20.
- Normalization: 10,000 reads per cell, then log.
- Highly variable genes: top 1000.
- Principal components: 30.
- Harmony theta: 2.
- Batch: the data set.
