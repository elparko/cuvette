# Thaqi 2026: bovine corpus luteum proteomics

## Citation
- Thaqi G, Chiang DM, Wudy SI, Ludwig C, Berisha B, Pfaffl MW. Bovine Corpus Luteum Proteomics during Different Reproductive and Physiological Stages. Scientific Data 13: 826 (2026). DOI: 10.1038/s41597-026-07515-6. CC BY 4.0.
- Data: PRIDE PXD069851. Zenodo 10.5281/zenodo.18680101 (CC BY 4.0) holds the raw proteinGroups.txt and the R code of the authors.
- I read the full text on PubMed Central (PMC13233828).

## Data
- The table has 4034 protein groups and 80 LFQ intensity columns, named LFQ intensity I-1 to X-8. The stages I to X are T1 to T10 in the paper (days 1 to 2 of the cycle, days 3 to 4, 5 to 7, 8 to 12, 13 to 17, more than 18, months 1 to 2 of pregnancy, 3 to 4, 5 to 6, more than 7). Each stage has 8 samples.
- The columns of the table are in alphabetical order of the stage name, so the stage IX comes after IV. A tool must read the stage from the column name.

## Tool
- limma-proteomics adapter: prepare_protein_table and test_differential_proteins.
- Independent check: `check.R` writes out the processing steps of the authors with limma only (`check.out`).

## Method steps
1. Remove the rows that MaxQuant flags as Only identified by site, Reverse or Potential contaminant.
2. Keep proteins with more than one peptide.
3. Set zero to missing and take log2.
4. Keep proteins with at least 70% valid values (6 of 8) in at least one stage.
5. Compute the mean correlation of each sample. Remove samples below 0.60 (none).
6. Impute missing values from a normal distribution with a down shift of 1.8 and a width of 0.3, using all values, seed 1.
7. Apply quantile normalization.
8. limma with the design ~0 + group, eBayes with robust = TRUE, Benjamini-Hochberg adjusted p below 0.05 and an absolute log2 fold change above 1.

## Numbers to reproduce
| Quantity | Paper | Computed |
|---|---|---|
| Protein groups after the flags | 3783 | 3783 |
| Higher in I / higher in IV | 282 / 268 | 282 / 268 |
| Higher in III / higher in V | 240 / 240 | 240 / 240 |
| Higher in IV / higher in VI | 98 / 131 | 98 / 131 |
| Higher in V / higher in VI | 74 / 109 | 74 / 109 |
| Higher in VI / higher in VII | 219 / 240 | 219 / 240 |
| Higher in VII / higher in X | 138 / 125 | 138 / 125 |

## Numbers that do not reproduce
None.
