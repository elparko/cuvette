# Andreasson 2019: endotoxin and self-rated health, a placebo-controlled experiment

## Citation
- Andreasson A, Karshikoff B, Lidberg L, Åkerstedt T, Ingvar M, Olgart Höglund C, Axelsson J, Lekander M. The effect of a transient immune activation on subjective health perception in two placebo controlled randomised experiments. PLOS ONE 14(3):e0212313 (2019). DOI: 10.1371/journal.pone.0212313. License CC BY 4.0.
- Data: Dryad DOI 10.5061/dryad.sh00j9s, CC0. Copy on Zenodo, record 4987396.
- I read the full text (PLOS JATS XML). The numbers below come from Table 2 and the Results.

## Data
- One Excel file, two sheets. The benchmark uses the Experiment 2 sheet: 52 subjects, 3 time points, 156 rows.
- Columns: id, timepoint (1 baseline, 2 at 90 minutes, 3 at 270 minutes), TNF, IL-6, IL-8 (pg/ml), current health (1 to 7, 7 excellent), general health (1 to 5, 5 very good, at 90 minutes only), paradigm (1 LPS, 0 placebo), sex (1 woman), sickness questionnaire score.
- 5 current health values are blank. The paper lists 4.
- In the Experiment 1 sheet, general health is coded 1 = very good, opposite to its header. The paper reverses this scale. Experiment 1 is not in the benchmark.
- fetch.sh writes three CSV files. See case.yaml, section data, for the preprocessing.
- Local path: /Volumes/T7/guided-analysis/data/andreasson2019-endotoxin-health/

## Tool
- statsmodels `MixedLM` (random intercept for each subject, ML) and SciPy `mannwhitneyu`. Adapter `catalog/biostats`, tools `fit_mixed_model` and `compare_two_groups`.
- Independent check: R 4.6.1, lme4 2.0.6 (`check.R`, output in `check.out`).

## Method steps
1. Mixed model `current ~ C(lps) * C(time)` with a random intercept for each subject, fitted by ML.
2. Mann-Whitney test of general health at 90 minutes, LPS against placebo.

## Numbers to reproduce
| Quantity | Paper | Computed (ML) |
|---|---|---|
| Intercept | 6.24 (5.77 to 6.70) | 6.238 |
| LPS | 0.02 (-0.39 to 0.43) | 0.020 |
| Time 90 minutes | -0.62 (-1.09 to -0.15) | -0.619, p 0.010 |
| Time 270 minutes | -0.22 (-0.70 to 0.26) | -0.218 |
| LPS by 90 minutes | -1.79 (-2.47 to -1.10) | -1.786 (SE 0.316; model-based CI -2.40 to -1.17) |
| LPS by 270 minutes | -0.91 (-1.56 to -0.25) | -0.906 |
| Mann-Whitney p, general health | 0.004 | 0.00416 |

- The paper intervals are bootstrap intervals (2000 repetitions). They are not items.
- Table 2 calls the last time point 5 h for Experiment 2. Table 1 and the data give 270 minutes.

## Decisions the scientist owns
- The random effects (random intercept only).
- ML or REML (Stata default ML; the coefficients do not change).
- A rank test for the 5-point general health rating.
- Alpha 0.05, two-sided.
