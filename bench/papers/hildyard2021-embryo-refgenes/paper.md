# Hildyard 2021: qPCR reference genes for the developing mouse embryo

## Citation
- Hildyard JCW, Wells DJ, Piercy RJ. Identification of qPCR reference genes suitable for normalising gene expression in the developing mouse embryo. Wellcome Open Research 6: 197 (2021, version 2). DOI 10.12688/wellcomeopenres.16972.2. License CC BY 4.0.
- Data: figshare collection 10.6084/m9.figshare.c.3136658 (raw data 14755803, analysis 14756484, extended data 14763024), CC BY 4.0.
- I read the full text (JATS XML of version 2). The tables print rankings. The numbers come from the Underlying and Extended data workbooks.

## Data
- Raw data workbook, sheet "Mean Cq and RQ Refgenes": mean Cq of the technical duplicates for 15 genes in 44 samples (24 whole embryos, 11 heads, 9 forelimbs), after the between-plate correction of the authors.
- Efficiency workbook, sheet "Efficiency data": a ten-fold dilution series from 2e9 to 200 molecules, one Cq for each gene and point; 14 genes (B2M was assessed from the amplification curve).
- fetch.sh writes `embryo_cq.csv` and `embryo_dilution.csv`, and keeps the workbooks in the reference folder.

## Tool
- qpcr adapter: `rank_reference_genes` (NormqPCR geNorm and NormFinder) and `fit_efficiency` (base R lm).
- Independent check: numpy (`check.py`, output in `check.out`) for geNorm and the slopes; the Excel add-in outputs in the analysis workbook for NormFinder.

## Method steps
1. geNorm on all samples: the stepwise average M and the pairwise variation V.
2. NormFinder on all samples, with no groups and grouped by tissue.
3. geNorm on the head samples.
4. A straight line of Cq against log10 molecules for each gene: slope and efficiency 10^(-1/slope).

## Numbers to reproduce
| Quantity | Published | Computed |
|---|---|---|
| geNorm best pair, all samples | HTATSF1 and CDC40, M 0.217549 | 0.217549 |
| geNorm average M, 15 and 13 genes | 0.527538, 0.440995 | same |
| Genes with M below 0.5 | 14 of 15 (text) | 14 |
| V2/3 | 0.06864 | 0.068640 |
| NormFinder ungrouped, AP3D1 and HPRT1 | 0.134827, 0.480987 | same |
| NormFinder by tissue, UBC and B2M | 0.081032, 0.180476 | same |
| geNorm best pair, heads | M 0.114216 | 0.114216 |
| Slopes GAPDH, HTATSF1, UBC | -3.4557, -3.1799, -3.3788 | same |

## Numbers that do not reproduce
- ACTB slope: printed -3.2293, the data give -3.2993 (two digits in the wrong order). The printed efficiency 2.040 must be 2.010.
- NormFinder grouped by age: GAPDH, ACTB and CDC40 differ in the third decimal. Not an item.

## Decisions the scientist owns
- The candidate genes and the efficiency (2, as in the relative quantities of the authors).
- The NormFinder groups (none, tissue or age).
- The subset (all samples, or one tissue).
