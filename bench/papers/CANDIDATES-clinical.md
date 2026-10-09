# Clinical paper candidates

Clinical papers with open patient-level data, checked for the paper benchmark on 2026-10-08.
A candidate passes if the published numbers reproduce from the shared data with the biostats adapter.

Checks used Python (lifelines 0.30.3, statsmodels 0.15.0, SciPy 1.18.1) and R 4.6.1 (survival 3.8.6, lme4 2.0.6, metafor 5.2.1, pROC 1.19.1, pwr 1.3.0).

## Built

| Folder | Paper | Data | Method | Result |
|---|---|---|---|---|
| `kasurinen2018-mmp14-gastric` | Kasurinen A et al. High serum MMP-14 predicts worse survival in gastric cancer. PLOS ONE 2018. DOI 10.1371/journal.pone.0208800 | Dryad 10.5061/dryad.hb62394, CC0. Zenodo 4945997 | Kaplan-Meier, log-rank, Cox | All MMP-14 numbers in the abstract, Table 2 (adjusted) and Table 3 reproduce. |
| `sriphoosanaphan2021-vitd-hcv` | Sriphoosanaphan S et al. Vitamin D after antiviral treatment of chronic hepatitis C, randomized trial. PeerJ 2021. DOI 10.7717/peerj.10709 | Dryad 10.5061/dryad.573n5tb4h, CC0. Zenodo 4404285 | Student t-test on the change from baseline | All numbers in Table 3 reproduce. |
| `andreasson2019-endotoxin-health` | Andreasson A et al. The effect of a transient immune activation on subjective health perception in two placebo controlled randomised experiments. PLOS ONE 2019. DOI 10.1371/journal.pone.0212313 | Dryad 10.5061/dryad.sh00j9s, CC0. Zenodo 4987396 | Linear mixed model, Mann-Whitney | All six Experiment 2 coefficients for current health in Table 2 and the Mann-Whitney p reproduce. |
| `lackey2015-tb-default` | Lackey B et al. Patient characteristics associated with tuberculosis treatment default: a cohort study in Lima, Peru. PLOS ONE 2015. DOI 10.1371/journal.pone.0128541 | Dryad, CC0. Zenodo 4992464 | Chi-square, multivariable logistic regression (biostats) | All eight adjusted odds ratios with their intervals in Table 2 and four bivariate chi-square p-values reproduce. Haiku 5.5 (blind mode off): 30/30 computed, 28/28 reported. |
| `jang2016-hcc-biomarkers` | Jang ES et al. Diagnostic performance of AFP, PIVKA-II, osteopontin, Dickkopf-1 and its combinations for hepatocellular carcinoma. PLOS ONE 2016. DOI 10.1371/journal.pone.0151069 | Dryad, CC0. Zenodo 4952129 | ROC, AUC with DeLong interval, sensitivity and specificity (proc) | All four AUCs with their intervals and the sensitivity and specificity at the four cut-offs reproduce. Haiku 5.5: 22/22 computed, 20/20 reported. |
| `hackshaw1997-ets-lung-cancer` | Hackshaw AK, Law MR, Wald NJ. The accumulated evidence on lung cancer and environmental tobacco smoke. BMJ 1997. DOI 10.1136/bmj.315.7114.980 | metadat dat.hackshaw1998 (GPL-2), the study results printed in the paper | Random-effects meta-analysis, DerSimonian-Laird (metafor) | The pooled relative risk 1.24 (1.13 to 1.36) reproduces. Haiku 5.5: 4/4 computed, 3/3 reported. |
| `sriphoosanaphan2021-sample-size` | The sample size section of the vitamin D trial above. PeerJ 2021. DOI 10.7717/peerj.10709 | No data: the inputs are in the paper | Two-sample t-test sample size (pwr) | 30 patients per arm reproduces (29.94 before rounding). Haiku 5.5: 3/3 computed, 2/2 reported. |

Notes:
- MMP-14: the raw column "Disease specific censor" is 1 for a censored patient. The event is 1 minus this value.
- MMP-14: the unadjusted age and Lauren hazard ratios in Table 2 match all 301 patients, not the 240 with MMP-14. The unadjusted stage hazard ratios match neither set. They are not items.
- Vitamin D: the readme does not name the arms. Group A is vitamin D. The group sizes, sex counts and means match Tables 2 and 3.
- Vitamin D: the Welch test gives 26.5 for the 25(OH)D upper bound. The paper prints 26.4, so the paper used the Student test (the Stata default).
- Vitamin D: Table 3 prints the ALT interval as -7.5 to 15. The computed upper bound is 1.57.
- Endotoxin: Table 2 gives bootstrap confidence intervals (2000 repetitions). They are not items. The model-based interval for LPS by 90 minutes is -2.40 to -1.17. The paper prints -2.47 to -1.10.
- Endotoxin: the Mann-Whitney p is 0.00416 (SciPy), 0.00402 (Stata ranksum method) or 0.00383 (R exact). All round to the printed 0.004.
- Endotoxin: Experiment 1 (8 subjects, cross-over) also reproduces, but its general health column is coded opposite to its header. It is not in the benchmark. The logistic regression and the path model (Mplus) cannot run in the adapter.

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

- Fixed on 2026-10-09: biostats has fit_logistic, chi_square_test, fisher_exact and mcnemar_test. fit_cox and fit_logistic turn text columns (and the numeric columns in categorical) into indicator columns. fit_cox, kaplan_meier, fit_logistic and the table tests take a row subset.
- New adapters on 2026-10-09: metafor (meta-analysis), proc (ROC and diagnostic accuracy) and pwr (power and sample size).
- A blind benchmark run started from a worktree of the repository could not start the biostats Python worker: the program check failed and the sandbox refused src/tools/inspect_data.py. The R adapters ran blind. The lackey2015 Haiku run used --no-blind. Check blind mode for Python adapters in a worktree.
- fit_logistic gives Wald intervals (as Stata and SPSS). It has no profile-likelihood interval (R confint) and no exact logistic regression. The diabetes odds ratio of Lackey 2015 needs exact logistic regression.
- The harness applies one value of a decision to every call. A paper with an unadjusted and an adjusted Cox model needs `cox_covariates` left empty, so the scientist does not fix the covariates.
- Fixed: an empty answer replaced the agent's argument in the held call and in the comparison runs (`src/core/session.ts`). The first qwen3:8b run of the MMP-14 paper hit this. An empty covariate list in `fit_cox` now gives a clear error.
- Fixed: `fit_mixed_model` stopped with a patsy error trace if the outcome column had a blank cell. It now drops rows with a missing value in a model column and reports `n_dropped`.
- `compare_two_groups` reads one outcome column. A change from baseline must exist as a column in the CSV file.
- The adapter reads CSV files only.
