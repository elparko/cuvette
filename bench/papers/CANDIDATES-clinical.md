# Clinical paper candidates

Clinical papers with open patient-level data, checked for the paper benchmark on 2026-10-08.
A candidate passes if the published numbers reproduce from the shared data with the biostats adapter.

Checks used Python (lifelines 0.30.3, statsmodels 0.15.0, SciPy 1.18.1) and R 4.6.1 (survival 3.8.6, lme4 2.0.6).

## Built

| Folder | Paper | Data | Method | Result |
|---|---|---|---|---|
| `kasurinen2018-mmp14-gastric` | Kasurinen A et al. High serum MMP-14 predicts worse survival in gastric cancer. PLOS ONE 2018. DOI 10.1371/journal.pone.0208800 | Dryad 10.5061/dryad.hb62394, CC0. Zenodo 4945997 | Kaplan-Meier, log-rank, Cox | All MMP-14 numbers in the abstract, Table 2 (adjusted) and Table 3 reproduce. |
| `sriphoosanaphan2021-vitd-hcv` | Sriphoosanaphan S et al. Vitamin D after antiviral treatment of chronic hepatitis C, randomized trial. PeerJ 2021. DOI 10.7717/peerj.10709 | Dryad 10.5061/dryad.573n5tb4h, CC0. Zenodo 4404285 | Student t-test on the change from baseline | All numbers in Table 3 reproduce. |

Notes:
- MMP-14: the raw column "Disease specific censor" is 1 for a censored patient. The event is 1 minus this value.
- MMP-14: the unadjusted age and Lauren hazard ratios in Table 2 match all 301 patients, not the 240 with MMP-14. The unadjusted stage hazard ratios match neither set. They are not items.
- Vitamin D: the readme does not name the arms. Group A is vitamin D. The group sizes, sex counts and means match Tables 2 and 3.
- Vitamin D: the Welch test gives 26.5 for the 25(OH)D upper bound. The paper prints 26.4, so the paper used the Student test (the Stata default).
- Vitamin D: Table 3 prints the ALT interval as -7.5 to 15. The computed upper bound is 1.57.

## Checked, ready to build

Andreasson A et al. The effect of a transient immune activation on subjective health perception in two placebo controlled randomised experiments. PLOS ONE 2019. DOI 10.1371/journal.pone.0212313.
- Data: Dryad 10.5061/dryad.sh00j9s, CC0. Zenodo 4987396. One Excel file with one sheet for each experiment, in long format.
- Experiment 2, current health (52 subjects, 3 time points): a mixed model `current ~ C(lps) * C(time)` with a random intercept for each subject reproduces all six coefficients in Table 2. Intercept 6.238, LPS 0.020, time 1.5 h -0.619, time 5 h -0.218, LPS by 1.5 h -1.786, LPS by 5 h -0.906. ML and REML give the same coefficients. R lme4 agrees.
- The main effect of time at 1.5 h has p 0.010. The paper prints p = 0.01.
- Table 2 gives bootstrap confidence intervals (2000 repetitions). The model-based interval for LPS by 1.5 h is -2.40 to -1.17. The paper prints -2.47 to -1.10. Use the coefficients as items. Give the intervals as reference items only.
- Experiment 2, general health at 1.5 h: the Mann-Whitney test gives p 0.0042 (20 placebo, 28 LPS). The paper prints p = 0.004.
- Experiment 1 (8 subjects, cross-over): the coefficients reproduce. The general health column is coded 1 = very good, opposite to its header. The paper reverses the scale, so its signs are opposite to the raw data.
- The logistic regression in the paper cannot run in the adapter. The path model needs Mplus.
- Preprocessing for fetch.sh: write one CSV for each experiment, and one CSV for each outcome without the blank rows, because `fit_mixed_model` fails on a blank outcome.

## Rejected

| Paper | Reason |
|---|---|
| CKD-ROUTE chronic kidney disease cohort, PLOS ONE 2018 | Unadjusted and Model 1 hazard ratios reproduce. Model 2 does not (0.115 against 0.20 printed). One interval bound differs. The data have 926 patients, the paper 927. |
| Antibiotics with bevacizumab in colorectal cancer, PLOS ONE 2019 | Covariates were chosen by a 10% change rule in commercial software. The covariates are coded inconsistently. |
| Music listening after stroke, randomized trial, 2024 | The full text is not open. The abstract gives p-values only. |
| Atrial fibrillation ablation, Zenodo 7624429 | The record holds result tables, not patient-level data. |
| Antithrombin during ECMO (extracorporeal membrane oxygenation), randomized trial | 8 patients. The paper is not open. |
| Vitamin K1 and K2 in hemodialysis | The Dryad record links to a different paper. |
| Acupuncture and metformin in PCOS (polycystic ovary syndrome), Human Reproduction 2021 | The analysis uses multiple imputation. The adapter cannot do it. |
| TENS (transcutaneous electrical nerve stimulation) in multiple sclerosis, Brain Communications 2025 | The OSF (Open Science Framework) project has no license. |

## Data access

- Dryad file downloads return HTTP 401 without an API token. Dryad records from before about 2022 have a copy on Zenodo, where downloads need no token. Each fetch.sh uses the Zenodo URL.
- The biostats Python environment has no openpyxl and no xlrd. Each fetch.sh converts Excel to CSV with `uv run --with pandas --with openpyxl`.

## Adapter gaps

These limit which clinical papers can enter the benchmark. No adapter change was made.

- No logistic regression, chi-square test or Fisher exact test. Many clinical papers report binary outcomes.
- `fit_cox` reads numeric columns only. It does not expand a categorical covariate into indicator columns. fetch.sh must add them.
- `fit_cox` and `kaplan_meier` cannot select rows. A subgroup analysis needs its own CSV file.
- The harness applies one value of a decision to every call. A paper with an unadjusted and an adjusted Cox model needs `cox_covariates` left empty, so the scientist does not fix the covariates.
- `fit_mixed_model` stops with a patsy error ("factor contains missing values") if the outcome column has a blank cell. The error is a traceback, not a tool error message.
- `compare_two_groups` reads one outcome column. A change from baseline must exist as a column in the CSV file.
- The adapter reads CSV files only.
