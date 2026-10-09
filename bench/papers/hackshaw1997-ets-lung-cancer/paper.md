# Hackshaw 1997: lung cancer and environmental tobacco smoke, a meta-analysis of 37 studies

## Citation
- Hackshaw AK, Law MR, Wald NJ. The accumulated evidence on lung cancer and environmental tobacco smoke. BMJ 315(7114):980-988 (1997). DOI: 10.1136/bmj.315.7114.980. Free to read on PMC (PMC2127653).
- Data: R package metadat, data set dat.hackshaw1998, GPL-2 or later. The metadat help states that the overall estimate of the paper is fully reproduced.
- I read the abstract on PMC and PubMed. The full text on PMC is a page scan. The BMJ site refused the download (HTTP 403).

## Data
- 37 studies, 11 columns: study, author, year, country, design, cases, or, or.lb, or.ub, yi, vi.
- yi and vi are back-calculated from the printed odds ratio and interval: yi = log(or), vi = ((log(or.ub) - log(or.lb)) / 3.92)^2.
- The case counts add to 4626, the number in the abstract.
- fetch.sh writes ets_lung_cancer.csv. Local path: /Volumes/T7/guided-analysis/data/hackshaw1997-ets-lung-cancer/

## Tool
- metafor 5.2.1 `rma(yi, vi, method = "DL")`. Adapter `catalog/metafor`, tool `fit_meta_analysis` with measure GEN.
- Independent check: Python statsmodels `combine_effects` (`check.py`, output in `check.out`).

## Method steps
1. Take the log odds ratio and its variance of each study.
2. Pool with a random-effects model, DerSimonian-Laird estimator, 95% interval with the normal distribution.
3. Back-transform the pooled log odds ratio and its interval with exp().

## Numbers to reproduce
| Value | Paper | Computed |
|---|---|---|
| Studies | 37 | 37 |
| Pooled relative risk | 1.24 (excess risk 24%) | 1.2385 |
| 95% CI | 1.13 to 1.36 (13% to 36%) | 1.1292 to 1.3583 |

## Not reproduced or not items
- The adjusted excess risk 26% (7% to 47%) uses adjustments for misclassification bias and diet that are not in the data.
- The paper does not print Q, I2 or tau2. The computed values are Q 47.50 on 36 df, I2 24.2%, tau2 0.0170. They are not items.
- Fixed effect gives 1.2041 (1.1192 to 1.2955). It is a trap item.
