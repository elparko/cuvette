# Lackey 2015: risk factors for tuberculosis treatment default in Lima, Peru

## Citation
- Lackey B, Seas C, Van der Stuyft P, Otero L. Patient characteristics associated with tuberculosis treatment default: a cohort study in a high-incidence area of Lima, Peru. PLOS ONE 10(6):e0128541 (2015). DOI: 10.1371/journal.pone.0128541. License CC BY 4.0.
- Data: Dryad, CC0. Copy on Zenodo, record 4992464.
- I read the full text (PLOS XML). The numbers below come from the abstract and Table 2.

## Data
- One Excel sheet, 1293 patients, 18 columns, all categorical (age in four groups).
- 15 patients have no outcome. 45 more have a missing value in a variable of the original model. 1233 remain, 127 defaulted. These counts match Fig 1.
- fetch.sh writes tb_default.csv. Local path: /Volumes/T7/guided-analysis/data/lackey2015-tb-default/

## Tool
- SciPy `chi2_contingency(correction=False)` and statsmodels `Logit` with Wald intervals. Adapter `catalog/biostats`, tools `chi_square_test` and `fit_logistic`.
- Independent check: R 4.6.1 `chisq.test` and `glm` with `confint.default` (`check.R`, output in `check.out`).

## Method steps
1. Pearson chi-square test, no continuity correction, of each risk factor by default.
2. Logistic regression of default (against all other outcomes) on the six covariates of the final model, with the reference levels of Table 2.
3. Odds ratios with Wald 95% intervals.

## Numbers to reproduce
| Value | Paper | Computed |
|---|---|---|
| Chi-square p: age, sex, marital, poverty | .006, < .001, .681, .034 | 0.00604, 0.0000395, 0.68145, 0.03436 |
| Drug use | 4.78 (3.05-7.49) | 4.7816 (3.0522-7.4907) |
| Underweight | 2.08 (1.21-3.56) | 2.0795 (1.2137-3.5629) |
| Overweight/obese | 0.88 (0.44-1.73) | 0.8777 (0.4445-1.7333) |
| MDR treatment | 3.04 (1.58-5.85) | 3.0385 (1.5780-5.8507) |
| Weekly alcohol | 2.22 (1.40-3.52) | 2.2220 (1.4008-3.5246) |
| HIV test not done | 2.30 (1.50-3.54) | 2.3031 (1.5000-3.5363) |
| HIV positive | 1.39 (0.42-4.65) | 1.3925 (0.4167-4.6534) |
| Secondary school not completed | 1.55 (1.03-2.33) | 1.5499 (1.0317-2.3286) |

## Not items
- The joint multivariable p of BMI (.020) and HIV status (< .001) come from Wald tests in Stata. The tool gives likelihood-ratio tests (.026 and .0009).
- The bivariate odds ratios of Table 2 also reproduce (male 2.42 against 2.4153 computed) but are not items.
- Trap: the Yates correction gives p 0.0465 for poverty.
