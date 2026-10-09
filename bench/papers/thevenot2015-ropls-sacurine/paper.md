# Thevenot 2015: ropls, urine metabolome of 183 adults

## Citation
- Thevenot EA, Roux A, Xu Y, Ezan E, Junot C. Analysis of the human adult urinary metabolome variations with age, body mass index, and gender by implementing a comprehensive workflow for univariate and OPLS statistical analyses. Journal of Proteome Research 14(8):3322-3335 (2015). DOI: 10.1021/acs.jproteome.5b00354
- Package vignette (ropls 1.44.0, read 2026-10-09 from the installed package, Bioconductor). The numbers below come from the vignette, not from the paper text.
- Data: MetaboLights MTBLS404 (sacurine).

## Data
- R package ropls 1.44.0, data sacurine. CeCILL license. Urine of 183 adults measured by liquid chromatography with high-resolution mass spectrometry (negative mode). 109 metabolites at identification level 1 or 2. The intensities were corrected for drift and batch, normalized to osmolality and log10 transformed.
- fetch.sh copies catalog/metabolomics-stats/data/sacurine.csv (made by make_fixtures.R) to the data folder and checks its SHA-256 sum.
- Local file: /Volumes/T7/guided-analysis/data/thevenot2015-ropls-sacurine/sacurine.csv

## Tool
- Original: R package ropls, function opls (PCA, PLS-DA, OPLS-DA), getVipVn, and R t.test with p.adjust.
- Adapter route: metabolomics-stats adapter, tools fit_multivariate_model and test_features.

## Sample design
183 adults, 100 men and 83 women. Age, body mass index and gender are recorded. No missing values.

## Method steps
1. PCA with unit-variance scaling. ropls keeps components while they explain variance above a limit.
2. PLS-DA of gender. ropls picks 3 components by cross-validated Q2 (7 segments). 20 permutations give the p values.
3. OPLS-DA of gender with 1 predictive component. ropls picks 2 orthogonal components.
4. OPLS-DA trained on the odd-numbered rows. The even-numbered rows are the test set (91 samples).
5. OPLS regression of age with 1 predictive component.
6. Welch test of each metabolite between men and women, Benjamini-Hochberg adjustment.

## Numbers to reproduce
| Quantity | Vignette 1.44.0 | check.R / check_metab.py |
|---|---|---|
| Samples | 183 | 183 |
| PCA R2X(cum), components | 0.501, 8 | 0.501, 8 (NumPy SVD 0.5009) |
| PLS-DA R2X, R2Y, Q2, RMSEE, components | 0.275, 0.73, 0.584, 0.262, 3 | same (NumPy R2X 0.2752, R2Y 0.7298) |
| PLS-DA pR2Y, pQ2 | 0.05, 0.05 | 0.05, 0.05 |
| OPLS-DA Q2, components | 0.602, 1 + 2 | same |
| OPLS-DA odd rows R2Y, Q2, RMSEP | 0.825, 0.608, 0.341 | same |
| Test set | 43 and 34 correct of 91 (85%) | same |
| OPLS of age R2X, R2Y, Q2, RMSEE | 0.212, 0.476, 0.31, 7.53 | same |
| Welch test, BH 0.05 | not in the vignette | 42 significant (11 up, 31 down) |
