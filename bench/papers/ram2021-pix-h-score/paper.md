# Ram 2021: pixelwise H-score, pathologist and digital H-scores

## Citation
- Ram S, Vizcarra P, Whalen P, Deng S, Painter CL, Jackson-Fisher A, Pirie-Shepherd S, Xia X, Powell EL. Pixelwise H-score: A novel digital image analysis-based metric to quantify membrane biomarker expression from immunohistochemistry images. PLOS ONE 16(9): e0245638 (2021). DOI: 10.1371/journal.pone.0245638. CC BY 4.0.
- I read the full text through Europe PMC (PMC8475990) and the supplement S1 Table (XLSX).

## Data
- S1 Table has three sheets (5T4, P-cadherin, PD-L1) with 21, 30 and 24 cases. Each row has the pathologist percent of cells at 0, 1+, 2+ and 3+, the pathologist H-score, the mRNA level, and the digital scores (HALO H-score, QuPath H-score, ATM score, Visiopharm and HALO pixelwise H-score).
- The whole slide images are on Zenodo (record 4900103). The benchmark does not use them.

## Tool
- ihc-scoring adapter: score_h_score with bin_columns, and compare_scorers.
- Independent check: `catalog/ihc-scoring/checks/check_ihc.py` (SciPy, scikit-learn, pingouin) and `check_ihc.out`.

## Method steps
1. H-score = 1 x percent 1+ + 2 x percent 2+ + 3 x percent 3+, from the pathologist percents.
2. Spearman correlation of the pathologist H-score with each digital H-score.
3. The benchmark adds the weighted kappa and the ICC of the pathologist and QuPath H-scores for P-cadherin.

## Numbers to reproduce
| Quantity | Paper | Computed |
|---|---|---|
| Cases: P-cadherin, PD-L1, 5T4 | 30, 24, 21 | 30, 24, 21 |
| Spearman rho, pathologist and QuPath: P-cadherin, PD-L1, 5T4 | 0.39, 0.74, 0.79 | 0.392, 0.739, 0.789 |
| Spearman rho, pathologist and HALO: P-cadherin, PD-L1, 5T4 | 0.50, 0.69, 0.75 | 0.495, 0.701, 0.750 |
| H-score of PD-L1 case 1 | 185 | 185 |

## Numbers that do not reproduce
- PD-L1, HALO: the paper text prints 0.69 and the table gives 0.701.
- Four cases have a printed pathologist H-score that the printed percents do not give (see expected.yaml).
- The paper prints no kappa and no ICC. The two items are independent computations.
