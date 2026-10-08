# Kasurinen 2018: serum MMP-14 and disease-specific survival in gastric cancer

## Citation
- Kasurinen A, Tervahartiala T, Laitinen A, Kokkola A, Sorsa T, Böckelman C, Haglund C. High serum MMP-14 predicts worse survival in gastric cancer. PLOS ONE 13(12):e0208800 (2018). DOI: 10.1371/journal.pone.0208800. License CC BY 4.0.
- Data: Dryad DOI 10.5061/dryad.hb62394, CC0. Copy on Zenodo, record 4945997.
- I read the full text (PLOS JATS XML). The numbers below come from Table 2, Table 3, the abstract and the Survival analyses section.

## Data
- One Excel sheet. 301 gastric cancer patients and 48 controls. 240 cancer patients have a serum MMP-14 value. The paper analyzes these 240.
- Raw columns: ID, gender (1 male, 2 female), age at surgery, survival in years, "Disease specific censor", pT, pN, pM, stage (8 TNM 7 codes), Lauren type (1 intestinal, 2 diffuse), serum MMP-14 (ng/ml), MMP-14 high (1 if 0.0729 ng/ml or more).
- "Disease specific censor" is 1 for a censored patient. The event is 1 minus this value. With this coding the hazard ratios and the 5-year survival match the paper.
- pN is blank for 9 patients with stage IV disease.
- fetch.sh writes three CSV files. See case.yaml, section data, for the preprocessing.
- Local path: /Volumes/T7/guided-analysis/data/kasurinen2018-mmp14-gastric/

## Tool
- lifelines `KaplanMeierFitter` and `logrank_test`; statsmodels `PHReg` with Breslow ties, or lifelines `CoxPHFitter` with Efron ties. Adapter `catalog/biostats`.
- Independent check: R 4.6.1, survival 3.8.6 (`check.R`, output in `check.out`). Stage enters R as a factor, not as the indicator columns.

## Method steps
1. Kaplan-Meier curves of disease-specific survival by MMP-14 group. Log-rank test. Survival at 5 years.
2. Cox model with mmp14_high only.
3. Cox model with age_ge67, stage2, stage3, stage4, diffuse and mmp14_high.
4. Cox model with mmp14_high only in the intestinal type, then in the diffuse type.

## Numbers to reproduce
| Quantity | Paper | Computed (Breslow) |
|---|---|---|
| Patients, deaths from gastric cancer | 240 | 240, 138 |
| 5-year survival, low and high MMP-14 | 49.2%, 22.1% | 0.4923, 0.2211 |
| Log-rank p | 0.001 | 0.00138 (chi-square 10.23) |
| HR high MMP-14, unadjusted | 1.92 (1.28 to 2.88), p 0.002 | 1.918 (1.278 to 2.879), p 0.00167 |
| HR high MMP-14, adjusted | 1.55 (1.02 to 2.35), p 0.040 | 1.549 (1.020 to 2.350), p 0.0399 |
| Adjusted HR age 67 or more | 2.52 (1.76 to 3.60) | 2.516 |
| Adjusted HR stage II, III, IV | 6.88, 22.0, 74.5 | 6.875, 22.01, 74.45 |
| Adjusted HR diffuse type | 2.23 (1.50 to 3.32) | 2.232 |
| HR high MMP-14, intestinal type | 3.54 (1.51 to 8.33), p 0.004 | 3.542 (1.507 to 8.329), p 0.00374 |
| HR high MMP-14, diffuse type | 1.54 (0.96 to 2.45), p 0.071 | 1.536 (0.964 to 2.446), p 0.0711 |
| HR high MMP-14, men | 2.74 (1.54 to 4.87), p 0.001 | 2.739 (1.54 to 4.87), p 0.0006 |

Efron ties change these hazard ratios in the third or fourth digit only.

## Numbers that do not reproduce
- Table 2, unadjusted column: age 1.44 and Lauren type 1.45 match the 301 patients, not the 240 with MMP-14. The unadjusted stage hazard ratios (4.98, 14.8, 41.5) match neither set (240 patients: 6.33, 18.4, 52.2; 301 patients: 4.27, 12.6, 35.3). These are not benchmark items.

## Decisions the scientist owns
- The cut-off for a high MMP-14 (0.073 ng/ml, from the ROC analysis in the paper).
- The covariates of the adjusted model, and the age split at 67 years.
- Stage as a category with stage I as the reference.
- Ties method (the paper used SPSS, which uses Breslow).
- Alpha 0.05.
