# Paper benchmark 2026-10-09

Models: claude:claude-sonnet-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 369/369 | 289/291 | 51 | 0 |

## Matrix

| Paper | claude:claude-sonnet-5-5 |
| --- | --- |
| andreasson2019-endotoxin-health | 30/30 / 21/21 |
| bates2015-lme4-sleepstudy | 27/27 / 21/21 |
| bradley-photutils-100gaussians | 18/18 / 18/18 |
| cooley2020-splitluc-zprime | 57/57 / 57/57 |
| desveaux2026-pcrv-ic50 | 27/27 / 24/24 |
| hackshaw1997-ets-lung-cancer | 12/12 / 9/9 |
| kanetis2022-iqtree-sporocadaceae | 9/9 / 6/6 |
| korsunsky2019-harmony | 15/15 / 15/15 |
| li2009-samtools | 21/21 / 9/9 |
| love2014-deseq2-airway | 15/15 / 12/12 |
| manders1993-coloc | 18/18 / 15/15 |
| oksanen-vegan-dune | 18/18 / 15/15 |
| quinlan2010-bedtools | 12/12 / 9/9 |
| rost2016-openms | 15/15 / 6/6 |
| schramm2012-imzml-pyimzml | 21/21 / 12/12 |
| student1908-sleep | 18/18 / 12/12 |
| white2021-flowkit | 36/36 / 28/30 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 51 | 4494 | 378 | 990 | 231838 | 6149415 | 452 | 29 | 7 | 0 | 41 | 154 | 139 | 42 | 57 | 7 | 7 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-sonnet-5-5: $6.76 for 51 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| andreasson2019-endotoxin-health | claude:claude-sonnet-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| andreasson2019-endotoxin-health | claude:claude-sonnet-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| andreasson2019-endotoxin-health | claude:claude-sonnet-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-sonnet-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 0 | 2 | 0 |
| cooley2020-splitluc-zprime | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 1 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-sonnet-5-5 | 2 | on | 3 | 0 | 1 | 0 | 1 |
| cooley2020-splitluc-zprime | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 1 | 0 | 1 |
| desveaux2026-pcrv-ic50 | claude:claude-sonnet-5-5 | 1 | on | 5 | 0 | 3 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-sonnet-5-5 | 2 | on | 4 | 0 | 1 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-sonnet-5-5 | 3 | on | 5 | 0 | 3 | 2 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 0 | 2 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-sonnet-5-5 | 3 | on | 1 | 0 | 0 | 2 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 0 | 9 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 4 | 0 |
| korsunsky2019-harmony | claude:claude-sonnet-5-5 | 1 | on | 18 | 0 | 0 | 6 | 0 |
| korsunsky2019-harmony | claude:claude-sonnet-5-5 | 2 | on | 13 | 0 | 0 | 5 | 0 |
| korsunsky2019-harmony | claude:claude-sonnet-5-5 | 3 | on | 14 | 0 | 0 | 4 | 0 |
| li2009-samtools | claude:claude-sonnet-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-sonnet-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-sonnet-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| love2014-deseq2-airway | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 13 | 0 |
| love2014-deseq2-airway | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| love2014-deseq2-airway | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-sonnet-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-sonnet-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-sonnet-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 0 | 1 | 0 |
| oksanen-vegan-dune | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 1 | 0 |
| oksanen-vegan-dune | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 1 | 0 |
| quinlan2010-bedtools | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| rost2016-openms | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 0 | 2 | 0 |
| rost2016-openms | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 0 | 1 | 0 |
| rost2016-openms | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 2 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-sonnet-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| white2021-flowkit | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| white2021-flowkit | claude:claude-sonnet-5-5 | 2 | on | 5 | 1 | 1 | 0 | 0 |
| white2021-flowkit | claude:claude-sonnet-5-5 | 3 | on | 6 | 1 | 1 | 0 | 0 |

Paths outside the allow list:
- white2021-flowkit | claude:claude-sonnet-5-5 | run 2: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/work/count_gates-1/gate_counts.csv
- white2021-flowkit | claude:claude-sonnet-5-5 | run 3: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/work/count_gates-1/gate_counts.csv

## Details

### andreasson2019-endotoxin-health | claude:claude-sonnet-5-5 | run 1

Status: answer. 69 s. 9 requests, 10 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-045914-94a6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261009-045914-94a6/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261009-045914-94a6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 39) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 39) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 39) | pass 6.238 via tolerance (n6, claim check 103) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 39) | pass 0.01997 via tolerance (n3, claim check 103) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 39) | pass -0.619 via tolerance (n3, claim check 103) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 39) | pass -0.2181 via tolerance (n3, claim check 103) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 39) | pass -1.786 via tolerance (n3, claim check 103) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 39) | pass -0.9055 via tolerance (n3, claim check 103) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 39) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n4 metrics.p_value, entry 60) | pass 0.004163 via tolerance (n4, claim check 103) |

### andreasson2019-endotoxin-health | claude:claude-sonnet-5-5 | run 2

Status: answer. 96 s. 10 requests, 12 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050023-9e5b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261009-050023-9e5b/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261009-050023-9e5b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 38) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 38) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 38) | pass 6.238 via tolerance (n6, claim check 111) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 38) | pass 0.02 via tolerance (n2, claim check 111) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 38) | pass -0.619 via tolerance (n3, claim check 111) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 38) | pass -0.218 via tolerance (n3, claim check 111) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 38) | pass -1.786 via tolerance (n3, claim check 111) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 38) | pass -0.906 via tolerance (n3, claim check 111) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 38) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n4 metrics.p_value, entry 60) | pass 0.004163 via tolerance (n4, claim check 111) |

### andreasson2019-endotoxin-health | claude:claude-sonnet-5-5 | run 3

Status: answer. 40 s. 7 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050159-865f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261009-050159-865f/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261009-050159-865f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 41) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 41) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 41) | pass 6.238 via tolerance (n3, claim check 92) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 41) | pass 0.01997 via tolerance (n3, claim check 92) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 41) | pass -0.619 via tolerance (n3, claim check 92) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 41) | pass -0.2181 via tolerance (n3, claim check 92) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 41) | pass -1.786 via tolerance (n3, claim check 92) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 41) | pass -0.9055 via tolerance (n3, claim check 92) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 41) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n5 metrics.p_value, entry 73) | pass 0.004163 via tolerance (n5, claim check 92) |

### bates2015-lme4-sleepstudy | claude:claude-sonnet-5-5 | run 1

Status: answer. 75 s. 9 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050239-2764. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261009-050239-2764/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261009-050239-2764/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 30) | pass 251.405 via tolerance (n10, claim check 100) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 30) | pass 10.467 via tolerance (n10, claim check 100) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 30) | pass 1743.628 via tolerance (n10, claim check 100) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 30) | pass 24.741 via tolerance (n10, claim check 100) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 30) | pass 5.922 via tolerance (n10, claim check 100) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 30) | pass 25.592 via tolerance (n10, claim check 100) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 30) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 44) | pass 23.537 via tolerance (n5, claim check 100) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 30) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-sonnet-5-5 | run 2

Status: answer. 75 s. 9 requests, 11 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050354-3368. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261009-050354-3368/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261009-050354-3368/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 31) | pass 251.41 via tolerance (n10, claim check 104) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 31) | pass 10.47 via tolerance (n10, claim check 104) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 31) | pass 1743.63 via tolerance (n10, claim check 104) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 31) | pass 24.74 via tolerance (n10, claim check 104) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 31) | pass 5.92 via tolerance (n10, claim check 104) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 31) | pass 25.59 via tolerance (n10, claim check 104) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 31) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 46) | pass 23.54 via tolerance (n5, claim check 104) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 31) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-sonnet-5-5 | run 3

Status: answer. 79 s. 9 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050509-cdc3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261009-050509-cdc3/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261009-050509-cdc3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 31) | pass 251.405 via tolerance (n10, claim check 108) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 31) | pass 10.467 via tolerance (n10, claim check 108) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 31) | pass 1743.63 via tolerance (n10, claim check 108) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 31) | pass 24.74 via tolerance (n10, claim check 108) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 31) | pass 5.92 via tolerance (n10, claim check 108) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 31) | pass 25.59 via tolerance (n10, claim check 108) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 31) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 46) | pass 23.54 via tolerance (n5, claim check 108) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 31) | not asked |

### bradley-photutils-100gaussians | claude:claude-sonnet-5-5 | run 1

Status: answer. 72 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050629-765d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261009-050629-765d/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261009-050629-765d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 35) | pass 5.152 via tolerance (n11, claim check 157) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 35) | pass 2.094 via tolerance (n11, claim check 157) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 108) | pass 82 via tolerance (n20, claim check 157) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 128) | pass 925.2 via tolerance (n21, claim check 157) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 128) | pass 760.2 via tolerance (n21, claim check 157) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 128) | pass 925.2 via tolerance (n21, claim check 157) |

### bradley-photutils-100gaussians | claude:claude-sonnet-5-5 | run 2

Status: answer. 73 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050742-8325. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261009-050742-8325/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261009-050742-8325/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 35) | pass 5.152 via tolerance (n11, claim check 157) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 35) | pass 2.094 via tolerance (n11, claim check 157) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 107) | pass 82 via tolerance (n20, claim check 157) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 128) | pass 925.2 via tolerance (n21, claim check 157) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 128) | pass 760.2 via tolerance (n21, claim check 157) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 128) | pass 925.2 via tolerance (n21, claim check 157) |

### bradley-photutils-100gaussians | claude:claude-sonnet-5-5 | run 3

Status: answer. 89 s. 9 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-050855-7fab. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261009-050855-7fab/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261009-050855-7fab/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 33) | pass 5.152 via tolerance (n11, claim check 156) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 33) | pass 2.094 via tolerance (n11, claim check 156) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 105) | pass 82 via tolerance (n20, claim check 156) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 125) | pass 925.2 via tolerance (n21, claim check 156) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 125) | pass 760.2 via tolerance (n21, claim check 156) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 125) | pass 925.2 via tolerance (n21, claim check 156) |

### cooley2020-splitluc-zprime | claude:claude-sonnet-5-5 | run 1

Status: answer. 63 s. 6 requests, 6 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051025-5d9e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261009-051025-5d9e/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261009-051025-5d9e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n1 metrics.p01_10ul_z_prime, entry 43) | pass 0.541 via tolerance (n1, claim check 63) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n1 metrics.p02_10ul_z_prime, entry 43) | pass 0.61 via tolerance (n1, claim check 63) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n1 metrics.p03_10ul_z_prime, entry 43) | pass 0.728 via tolerance (n1, claim check 63) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n1 metrics.p04_10ul_z_prime, entry 43) | pass 0.73 via tolerance (n1, claim check 63) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n1 metrics.p05_10ul_z_prime, entry 43) | pass 0.664 via tolerance (n1, claim check 63) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n1 metrics.p06_10ul_z_prime, entry 43) | pass 0.632 via tolerance (n1, claim check 63) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n1 metrics.p07_10ul_z_prime, entry 43) | pass 0.767 via tolerance (n1, claim check 63) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n1 metrics.p08_10ul_z_prime, entry 43) | pass 0.742 via tolerance (n1, claim check 63) |
| z10_p9 | 0.621 ±0.004 | pass 0.6209891 (n1 metrics.p09_10ul_z_prime, entry 43) | pass 0.621 via tolerance (n1, claim check 63) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n1 metrics.p10_10ul_z_prime, entry 43) | pass 0.722 via tolerance (n1, claim check 63) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n1 metrics.p02_20ul_z_prime, entry 43) | pass 0.522 via tolerance (n1, claim check 63) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n1 metrics.p04_20ul_z_prime, entry 43) | pass 0.786 via tolerance (n1, claim check 63) |
| z20_p6 | 0.643 ±0.004 | pass 0.6429603 (n1 metrics.p06_20ul_z_prime, entry 43) | pass 0.643 via tolerance (n1, claim check 63) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n1 metrics.p07_20ul_z_prime, entry 43) | pass 0.671 via tolerance (n1, claim check 63) |
| z20_p8 | 0.685 ±0.004 | pass 0.6850474 (n1 metrics.p08_20ul_z_prime, entry 43) | pass 0.685 via tolerance (n1, claim check 63) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n1 metrics.p09_20ul_z_prime, entry 43) | pass 0.8 via tolerance (n1, claim check 63) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n1 metrics.p10_20ul_z_prime, entry 43) | pass 0.728 via tolerance (n1, claim check 63) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n1 metrics.p01_10ul_mean_high, entry 43) | pass 2471.2 via tolerance (n1, claim check 63) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1216 (n1 metrics.p01_10ul_sd_high, entry 43) | pass 268.1 via tolerance (n1, claim check 63) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.6429603 (n1 metrics.p06_20ul_z_prime, entry 43) | differs 0.643 (n1, claim check 63) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.8524462 (n1 metrics.p05_20ul_z_prime, entry 43) | differs 0.852 (n1, claim check 63) |

### cooley2020-splitluc-zprime | claude:claude-sonnet-5-5 | run 2

Status: answer. 62 s. 7 requests, 10 tool calls (5 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051128-4161. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261009-051128-4161/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261009-051128-4161/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n1 metrics.p1_z_prime, entry 45) | pass 0.541 via tolerance (n1, claim check 79) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n1 metrics.p2_z_prime, entry 45) | pass 0.61 via tolerance (n1, claim check 79) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n1 metrics.p3_z_prime, entry 45) | pass 0.728 via tolerance (n3, claim check 79) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n1 metrics.p4_z_prime, entry 45) | pass 0.73 via tolerance (n1, claim check 79) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n1 metrics.p5_z_prime, entry 45) | pass 0.664 via tolerance (n1, claim check 79) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n1 metrics.p6_z_prime, entry 45) | pass 0.632 via tolerance (n1, claim check 79) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n1 metrics.p7_z_prime, entry 45) | pass 0.767 via tolerance (n1, claim check 79) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n1 metrics.p8_z_prime, entry 45) | pass 0.742 via tolerance (n1, claim check 79) |
| z10_p9 | 0.621 ±0.004 | pass 0.6209891 (n1 metrics.p9_z_prime, entry 45) | pass 0.621 via tolerance (n1, claim check 79) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n1 metrics.p10_z_prime, entry 45) | pass 0.722 via tolerance (n1, claim check 79) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.p2_z_prime, entry 58) | pass 0.522 via tolerance (n3, claim check 79) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.p4_z_prime, entry 58) | pass 0.786 via tolerance (n3, claim check 79) |
| z20_p6 | 0.643 ±0.004 | pass 0.643 (n3 stdout, entry 60) | pass 0.643 via tolerance (n3, claim check 79) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.p7_z_prime, entry 58) | pass 0.671 via tolerance (n3, claim check 79) |
| z20_p8 | 0.685 ±0.004 | pass 0.685 (n3 stdout, entry 60) | pass 0.685 via tolerance (n3, claim check 79) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.p9_z_prime, entry 58) | pass 0.8 via tolerance (n3, claim check 79) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.p10_z_prime, entry 58) | pass 0.728 via tolerance (n3, claim check 79) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n1 metrics.p1_mean_high, entry 45) | pass 2471.2 via tolerance (n1, claim check 79) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1216 (n1 metrics.p1_sd_high, entry 45) | pass 268.1 via tolerance (n1, claim check 79) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.643 (n3 stdout, entry 60) | differs 0.643 (n3, claim check 79) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.852 (n3 stdout, entry 60) | differs 0.852 (n3, claim check 79) |

### cooley2020-splitluc-zprime | claude:claude-sonnet-5-5 | run 3

Status: answer. 64 s. 7 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051230-dd36. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261009-051230-dd36/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261009-051230-dd36/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n3 metrics.p1_z_prime, entry 44) | pass 0.541 via tolerance (n3, claim check 72) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n3 metrics.p2_z_prime, entry 44) | pass 0.61 via tolerance (n3, claim check 72) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n3 metrics.p3_z_prime, entry 44) | pass 0.728 via tolerance (n4, claim check 72) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n3 metrics.p4_z_prime, entry 44) | pass 0.73 via tolerance (n3, claim check 72) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n3 metrics.p5_z_prime, entry 44) | pass 0.664 via tolerance (n3, claim check 72) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n3 metrics.p6_z_prime, entry 44) | pass 0.632 via tolerance (n3, claim check 72) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n3 metrics.p7_z_prime, entry 44) | pass 0.767 via tolerance (n1, claim check 72) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n3 metrics.p8_z_prime, entry 44) | pass 0.742 via tolerance (n3, claim check 72) |
| z10_p9 | 0.621 ±0.004 | pass 0.6209891 (n3 metrics.p9_z_prime, entry 44) | pass 0.621 via tolerance (n3, claim check 72) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n3 metrics.p10_z_prime, entry 44) | pass 0.722 via tolerance (n3, claim check 72) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n4 metrics.p2_z_prime, entry 47) | pass 0.522 via tolerance (n4, claim check 72) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n4 metrics.p4_z_prime, entry 47) | pass 0.786 via tolerance (n4, claim check 72) |
| z20_p6 | 0.643 ±0.004 | pass 0.6429603 (n4 metrics.p6_z_prime, entry 47) | pass 0.643 via tolerance (n4, claim check 72) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n4 metrics.p7_z_prime, entry 47) | pass 0.671 via tolerance (n4, claim check 72) |
| z20_p8 | 0.685 ±0.004 | pass 0.6850474 (n4 metrics.p8_z_prime, entry 47) | pass 0.685 via tolerance (n4, claim check 72) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n4 metrics.p9_z_prime, entry 47) | pass 0.8 via tolerance (n4, claim check 72) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n4 metrics.p10_z_prime, entry 47) | pass 0.728 via tolerance (n4, claim check 72) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n3 metrics.p1_mean_high, entry 44) | pass 2471.2 via tolerance (n3, claim check 72) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1216 (n3 metrics.p1_sd_high, entry 44) | pass 268.1 via tolerance (n3, claim check 72) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.6429603 (n4 metrics.p6_z_prime, entry 47) | differs 0.643 (n4, claim check 72) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.8524462 (n4 metrics.p5_z_prime, entry 47) | differs 0.852 (n4, claim check 72) |

### desveaux2026-pcrv-ic50 | claude:claude-sonnet-5-5 | run 1

Status: answer. 83 s. 8 requests, 10 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051334-5554. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-051334-5554/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 3 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-051334-5554/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n1 metrics.MEDI3902_ic50, entry 45) | pass 0.1173 via tolerance (n1, claim check 95) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n1 metrics.30_B8_ic50, entry 45) | pass 0.02131 via tolerance (n4, claim check 95) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n1 metrics.P3D6_ic50, entry 45) | pass 3.653 via tolerance (n1, claim check 95) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n3 metrics.P3D6_ic50, entry 61) | pass 11.79 via tolerance (n3, claim check 95) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n4 metrics.V2_ic50, entry 64) | pass 0.01278 via tolerance (n4, claim check 95) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n4 metrics.V3_ic50, entry 64) | pass 0.0112 via tolerance (n4, claim check 95) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n4 metrics.V4_ic50, entry 64) | pass 0.01305 via tolerance (n4, claim check 95) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n4 metrics.V5_ic50, entry 64) | pass 0.01045 via tolerance (n4, claim check 95) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n3 metrics.30_B8_ic50, entry 61) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.0563 (n5 stdout, entry 79) | differs 0.0563 (n5, claim check 95) |

### desveaux2026-pcrv-ic50 | claude:claude-sonnet-5-5 | run 2

Status: answer. 85 s. 7 requests, 8 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051457-35ac. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261009-051457-35ac/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261009-051457-35ac/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n2 metrics.MEDI3902_ic50, entry 47) | pass 0.1173 via tolerance (n2, claim check 78) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n2 metrics.30_B8_ic50, entry 47) | pass 0.02131 via tolerance (n4, claim check 78) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n2 metrics.P3D6_ic50, entry 47) | pass 3.653 via tolerance (n2, claim check 78) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n3 metrics.P3D6_ic50, entry 50) | pass 11.79 via tolerance (n3, claim check 78) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n4 metrics.V2_ic50, entry 53) | pass 0.01278 via tolerance (n4, claim check 78) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n4 metrics.V3_ic50, entry 53) | pass 0.0112 via tolerance (n4, claim check 78) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n4 metrics.V4_ic50, entry 53) | pass 0.01305 via tolerance (n4, claim check 78) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n4 metrics.V5_ic50, entry 53) | pass 0.01045 via tolerance (n4, claim check 78) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n3 metrics.30_B8_ic50, entry 50) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.06375493 (n4 metrics.V5_rse, entry 53) | differs 0.02645 (n4, claim check 78) |

### desveaux2026-pcrv-ic50 | claude:claude-sonnet-5-5 | run 3

Status: answer. 77 s. 7 requests, 9 tool calls (3 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-051622-60b0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261009-051622-60b0/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 3 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261009-051622-60b0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n1 metrics.MEDI3902_ic50, entry 44) | pass 0.1173 via tolerance (n1, claim check 91) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n1 metrics.30_B8_ic50, entry 44) | pass 0.02131 via tolerance (n4, claim check 91) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n1 metrics.P3D6_ic50, entry 44) | pass 3.653 via tolerance (n1, claim check 91) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n3 metrics.P3D6_ic50, entry 59) | pass 11.79 via tolerance (n3, claim check 91) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n4 metrics.V2_ic50, entry 62) | pass 0.01278 via tolerance (n4, claim check 91) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n4 metrics.V3_ic50, entry 62) | pass 0.0112 via tolerance (n4, claim check 91) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n4 metrics.V4_ic50, entry 62) | pass 0.01305 via tolerance (n4, claim check 91) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n4 metrics.V5_ic50, entry 62) | pass 0.01045 via tolerance (n4, claim check 91) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n3 metrics.30_B8_ic50, entry 59) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.06375493 (n4 metrics.V5_rse, entry 62) | differs 0.02645 (n4, claim check 91) |

### hackshaw1997-ets-lung-cancer | claude:claude-sonnet-5-5 | run 1

Status: answer. 61 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-051739-de8e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261009-051739-de8e/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261009-051739-de8e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 11) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n8 metrics.effect, entry 55) | pass 1.238 via tolerance (n8, claim check 89) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n8 metrics.effect_ci_lo, entry 55) | pass 1.129 via tolerance (n8, claim check 89) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n8 metrics.effect_ci_hi, entry 55) | pass 1.358 via tolerance (n8, claim check 89) |

### hackshaw1997-ets-lung-cancer | claude:claude-sonnet-5-5 | run 2

Status: answer. 76 s. 11 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051840-3057. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261009-051840-3057/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261009-051840-3057/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 11) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n9 metrics.effect, entry 64) | pass 1.238 via tolerance (n14, claim check 136) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n9 metrics.effect_ci_lo, entry 64) | pass 1.129 via tolerance (n14, claim check 136) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n9 metrics.effect_ci_hi, entry 64) | pass 1.358 via tolerance (n14, claim check 136) |

### hackshaw1997-ets-lung-cancer | claude:claude-sonnet-5-5 | run 3

Status: answer. 57 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-051956-bc09. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261009-051956-bc09/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261009-051956-bc09/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 11) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n8 metrics.effect, entry 55) | pass 1.238 via tolerance (n8, claim check 78) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n8 metrics.effect_ci_lo, entry 55) | pass 1.129 via tolerance (n8, claim check 78) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n8 metrics.effect_ci_hi, entry 55) | pass 1.358 via tolerance (n8, claim check 78) |

### kanetis2022-iqtree-sporocadaceae | claude:claude-sonnet-5-5 | run 1

Status: answer. 109 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-052053-b22d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261009-052053-b22d/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261009-052053-b22d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 18) | pass -15895.48 via tolerance (n2, claim check 62) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 11) | pass 2375 via tolerance (n2, claim check 62) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 11) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 18) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-sonnet-5-5 | run 2

Status: answer. 121 s. 7 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 9 unsourced.
Session: 20261009-052242-ed9b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261009-052242-ed9b/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 9 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261009-052242-ed9b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 20) | pass -15895.48 via tolerance (n4, claim check 67) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 11) | pass 2375 via tolerance (n2, claim check 67) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 11) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 20) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-sonnet-5-5 | run 3

Status: answer. 127 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-052443-3ce6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261009-052443-3ce6/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261009-052443-3ce6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 18) | pass -15895.48 via tolerance (n2, claim check 64) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 11) | pass 2375 via tolerance (n2, claim check 64) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 11) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 18) | not asked |

### korsunsky2019-harmony | claude:claude-sonnet-5-5 | run 1

Status: answer. 475 s. 27 requests, 31 tool calls (4 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-052650-1af5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/korsunsky2019-harmony/run1/home/sessions/20261009-052650-1af5/log.jsonl
Leak check: 18 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/korsunsky2019-harmony/run1/home/sessions/20261009-052650-1af5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.006729 (n14 table.rows[3][3], entry 157) | pass 1.06 via tolerance (n13, claim check 282) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n13 table.rows[2][3], entry 154) | pass 1.64 via tolerance (n21, claim check 282) |
| clisi_before | 1 ±0.02 | pass 1 (n14 metrics.median, entry 157) | pass 1 via tolerance (n30, claim check 282) |
| clisi_after | 1 ±0.02 | pass 1 (n14 metrics.median, entry 157) | pass 1 via tolerance (n30, claim check 282) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n7 table.rows[0][1], entry 92) | pass 3255 via tolerance (n21, claim check 282) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n7 table.rows[2][1], entry 92) | differs 2885 (n21, claim check 282) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1673 (n30 table.rows[12][2], entry 259) | differs 1773 (n12, claim check 282) |
| mix_t293_cells (reference) | 1565 exact | differs 1673 (n30 table.rows[12][2], entry 259) | differs 1615 (n12, claim check 282) |

### korsunsky2019-harmony | claude:claude-sonnet-5-5 | run 2

Status: answer. 294 s. 18 requests, 22 tool calls (0 failed), 0 nudges, 0 plan reminders, 5 unsourced.
Session: 20261009-053453-8a89. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/korsunsky2019-harmony/run2/home/sessions/20261009-053453-8a89/log.jsonl
Leak check: 13 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/korsunsky2019-harmony/run2/home/sessions/20261009-053453-8a89/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.002393 (n14 metrics.mean, entry 126) | pass 1.06 via tolerance (n13, claim check 197) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n13 table.rows[2][3], entry 123) | pass 1.64 via tolerance (n22, claim check 197) |
| clisi_before | 1 ±0.02 | pass 1 (n14 metrics.median, entry 126) | pass 1 via tolerance (n22, claim check 197) |
| clisi_after | 1 ±0.02 | pass 1 (n14 metrics.median, entry 126) | pass 1 via tolerance (n22, claim check 197) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n7 table.rows[0][1], entry 72) | pass 3255 via tolerance (n12, claim check 197) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n7 table.rows[2][1], entry 72) | differs 2885 (n18, claim check 197) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n12 table.rows[1][1], entry 116) | differs 1773 (n12, claim check 197) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n12 table.rows[1][2], entry 116) | differs 1615 (n12, claim check 197) |

### korsunsky2019-harmony | claude:claude-sonnet-5-5 | run 3

Status: answer. 338 s. 21 requests, 24 tool calls (3 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-053951-3f53. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/korsunsky2019-harmony/run3/home/sessions/20261009-053951-3f53/log.jsonl
Leak check: 14 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/korsunsky2019-harmony/run3/home/sessions/20261009-053951-3f53/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.002393 (n13 metrics.mean, entry 150) | pass 1.0024 via tolerance (n13, claim check 214) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n12 table.rows[2][3], entry 147) | pass 1.64 via tolerance (n20, claim check 214) |
| clisi_before | 1 ±0.02 | pass 1 (n13 metrics.median, entry 150) | pass 1 via tolerance (n20, claim check 214) |
| clisi_after | 1 ±0.02 | pass 1 (n13 metrics.median, entry 150) | pass 1 via tolerance (n20, claim check 214) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n6 table.rows[0][1], entry 86) | pass 3255 via tolerance (n11, claim check 214) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n6 table.rows[2][1], entry 86) | differs 2885 (n17, claim check 214) |
| mix_jurkat_cells (reference) | 1799 exact | differs 2885 (n6 table.rows[2][1], entry 86) | differs 1773 (n11, claim check 214) |
| mix_t293_cells (reference) | 1565 exact | differs 2885 (n6 table.rows[2][1], entry 86) | differs 1615 (n11, claim check 214) |

### li2009-samtools | claude:claude-sonnet-5-5 | run 1

Status: answer. 27 s. 7 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-054533-b936. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/li2009-samtools/run1/home/sessions/20261009-054533-b936/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/li2009-samtools/run1/home/sessions/20261009-054533-b936/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 19) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 38) | pass 3271 via tolerance (n5, claim check 79) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 38) | pass 3144 via tolerance (n4, claim check 79) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 38) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 41) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 41) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 68) | pass 79 via tolerance (n10, claim check 79) |

### li2009-samtools | claude:claude-sonnet-5-5 | run 2

Status: answer. 84 s. 13 requests, 10 tool calls (0 failed), 4 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-054600-06fc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/li2009-samtools/run2/home/sessions/20261009-054600-06fc/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/li2009-samtools/run2/home/sessions/20261009-054600-06fc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 19) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 39) | pass 3271 via tolerance (n5, claim check 118) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 39) | pass 3144 via tolerance (n4, claim check 118) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 39) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 42) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 42) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 70) | pass 79 via tolerance (n10, claim check 118) |

### li2009-samtools | claude:claude-sonnet-5-5 | run 3

Status: answer. 51 s. 9 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-054724-2149. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/li2009-samtools/run3/home/sessions/20261009-054724-2149/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/li2009-samtools/run3/home/sessions/20261009-054724-2149/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 19) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 39) | pass 3271 via tolerance (n5, claim check 103) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 39) | pass 3144 via tolerance (n4, claim check 103) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 39) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 42) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 42) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 69) | pass 79 via tolerance (n10, claim check 103) |

### love2014-deseq2-airway | claude:claude-sonnet-5-5 | run 1

Status: answer. 131 s. 7 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 13 unsourced.
Session: 20261009-054814-2537. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/love2014-deseq2-airway/run1/home/sessions/20261009-054814-2537/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 13 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/love2014-deseq2-airway/run1/home/sessions/20261009-054814-2537/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 49) | pass 16637 via tolerance (n9, claim check 90) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 49) | pass 4381 via tolerance (n9, claim check 90) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 49) | pass 2362 via tolerance (n9, claim check 90) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 49) | pass 2019 via tolerance (n9, claim check 90) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 40) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 49) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 49) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 55) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 49) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 49) | not asked |

### love2014-deseq2-airway | claude:claude-sonnet-5-5 | run 2

Status: answer. 122 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-055025-c89e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/love2014-deseq2-airway/run2/home/sessions/20261009-055025-c89e/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/love2014-deseq2-airway/run2/home/sessions/20261009-055025-c89e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 49) | pass 16637 via tolerance (n7, claim check 76) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 49) | pass 4381 via tolerance (n7, claim check 76) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 49) | pass 2362 via tolerance (n7, claim check 76) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 49) | pass 2019 via tolerance (n7, claim check 76) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 40) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 49) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 49) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 57) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 49) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 49) | not asked |

### love2014-deseq2-airway | claude:claude-sonnet-5-5 | run 3

Status: answer. 134 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-055227-3054. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/love2014-deseq2-airway/run3/home/sessions/20261009-055227-3054/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/love2014-deseq2-airway/run3/home/sessions/20261009-055227-3054/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 49) | pass 16637 via tolerance (n7, claim check 75) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 49) | pass 4381 via tolerance (n7, claim check 75) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 49) | pass 2362 via tolerance (n7, claim check 75) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 49) | pass 2019 via tolerance (n7, claim check 75) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 40) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 49) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 49) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 55) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 49) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 49) | not asked |

### manders1993-coloc | claude:claude-sonnet-5-5 | run 1

Status: answer. 41 s. 4 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-055441-caa4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/manders1993-coloc/run1/home/sessions/20261009-055441-caa4/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/manders1993-coloc/run1/home/sessions/20261009-055441-caa4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 38) | pass 0.721 via tolerance (n5, claim check 62) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 41) | pass 0.443 via tolerance (n6, claim check 62) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 44) | pass 0.164 via tolerance (n7, claim check 62) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 38) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 41) | pass 0.5 via tolerance (n6, claim check 62) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 44) | pass 0.25 via tolerance (n7, claim check 62) |

### manders1993-coloc | claude:claude-sonnet-5-5 | run 2

Status: answer. 43 s. 4 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-055523-3692. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/manders1993-coloc/run2/home/sessions/20261009-055523-3692/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/manders1993-coloc/run2/home/sessions/20261009-055523-3692/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 38) | pass 0.721 via tolerance (n8, claim check 75) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 41) | pass 0.443 via tolerance (n9, claim check 75) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 44) | pass 0.164 via tolerance (n10, claim check 75) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 38) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 41) | pass 0.5 via tolerance (n9, claim check 75) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 44) | pass 0.25 via tolerance (n10, claim check 75) |

### manders1993-coloc | claude:claude-sonnet-5-5 | run 3

Status: answer. 25 s. 3 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-055607-027b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/manders1993-coloc/run3/home/sessions/20261009-055607-027b/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/manders1993-coloc/run3/home/sessions/20261009-055607-027b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 38) | pass 0.721 via tolerance (n5, claim check 55) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 41) | pass 0.443 via tolerance (n6, claim check 55) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 44) | pass 0.164 via tolerance (n7, claim check 55) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 38) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 41) | pass 0.5 via tolerance (n6, claim check 55) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 44) | pass 0.25 via tolerance (n7, claim check 55) |

### oksanen-vegan-dune | claude:claude-sonnet-5-5 | run 1

Status: answer. 67 s. 5 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-055633-277f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oksanen-vegan-dune/run1/home/sessions/20261009-055633-277f/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oksanen-vegan-dune/run1/home/sessions/20261009-055633-277f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 50) | pass 1.4405 via tolerance (n2, claim check 101) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n7 metrics.stress, entry 76) | pass 0.1183 via tolerance (n7, claim check 101) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n3 metrics.r2, entry 60) | pass 0.3416 via tolerance (n3, claim check 101) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n3 metrics.f, entry 60) | pass 2.767 via tolerance (n3, claim check 101) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n3 metrics.p, entry 60) | pass 0.002 via tolerance (n3, claim check 101) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n4 metrics.f, entry 63) | not asked |

### oksanen-vegan-dune | claude:claude-sonnet-5-5 | run 2

Status: answer. 61 s. 5 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-055740-d706. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oksanen-vegan-dune/run2/home/sessions/20261009-055740-d706/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oksanen-vegan-dune/run2/home/sessions/20261009-055740-d706/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 51) | pass 1.4405 via tolerance (n2, claim check 100) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n7 metrics.stress, entry 77) | pass 0.1183 via tolerance (n7, claim check 100) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n3 metrics.r2, entry 61) | pass 0.3416 via tolerance (n3, claim check 100) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n3 metrics.f, entry 61) | pass 2.767 via tolerance (n3, claim check 100) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n3 metrics.p, entry 61) | pass 0.002 via tolerance (n3, claim check 100) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n4 metrics.f, entry 64) | not asked |

### oksanen-vegan-dune | claude:claude-sonnet-5-5 | run 3

Status: answer. 64 s. 5 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-055841-2260. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oksanen-vegan-dune/run3/home/sessions/20261009-055841-2260/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oksanen-vegan-dune/run3/home/sessions/20261009-055841-2260/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 50) | pass 1.4405 via tolerance (n2, claim check 99) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n7 metrics.stress, entry 76) | pass 0.1183 via tolerance (n7, claim check 99) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n3 metrics.r2, entry 60) | pass 0.3416 via tolerance (n3, claim check 99) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n3 metrics.f, entry 60) | pass 2.767 via tolerance (n3, claim check 99) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n3 metrics.p, entry 60) | pass 0.002 via tolerance (n3, claim check 99) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n4 metrics.f, entry 63) | not asked |

### quinlan2010-bedtools | claude:claude-sonnet-5-5 | run 1

Status: answer. 21 s. 2 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-055945-14b1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/quinlan2010-bedtools/run1/home/sessions/20261009-055945-14b1/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/quinlan2010-bedtools/run1/home/sessions/20261009-055945-14b1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_result, entry 11) | pass 126 via tolerance (n2, claim check 25) |
| overlapping_pairs | 129 exact | pass 129 (n2 metrics.n_result, entry 14) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n2 metrics.overlap_bases, entry 14) | pass 33713 via tolerance (n2, claim check 25) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 17) | pass 11270 via tolerance (n3, claim check 25) |

### quinlan2010-bedtools | claude:claude-sonnet-5-5 | run 2

Status: answer. 43 s. 6 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-060006-1709. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/quinlan2010-bedtools/run2/home/sessions/20261009-060006-1709/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/quinlan2010-bedtools/run2/home/sessions/20261009-060006-1709/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 18) | pass 126 via tolerance (n2, claim check 64) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 18) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 18) | pass 33713 via tolerance (n1, claim check 64) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 24) | pass 11270 via tolerance (n5, claim check 64) |

### quinlan2010-bedtools | claude:claude-sonnet-5-5 | run 3

Status: answer. 36 s. 6 requests, 5 tool calls (0 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-060049-6b44. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/quinlan2010-bedtools/run3/home/sessions/20261009-060049-6b44/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/quinlan2010-bedtools/run3/home/sessions/20261009-060049-6b44/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 18) | pass 126 via tolerance (n2, claim check 47) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 18) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 18) | pass 33713 via tolerance (n1, claim check 47) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 24) | pass 11270 via tolerance (n3, claim check 47) |

### rost2016-openms | claude:claude-sonnet-5-5 | run 1

Status: answer. 107 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-060126-4a30. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rost2016-openms/run1/home/sessions/20261009-060126-4a30/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rost2016-openms/run1/home/sessions/20261009-060126-4a30/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | pass 7173 via tolerance (n1, claim check 84) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 56) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 56) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 56) | pass 1887 via tolerance (n9, claim check 84) |

### rost2016-openms | claude:claude-sonnet-5-5 | run 2

Status: answer. 165 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-060314-19fe. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rost2016-openms/run2/home/sessions/20261009-060314-19fe/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rost2016-openms/run2/home/sessions/20261009-060314-19fe/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | pass 7173 via tolerance (n1, claim check 114) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 56) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 56) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 56) | pass 1887 via tolerance (n9, claim check 114) |

### rost2016-openms | claude:claude-sonnet-5-5 | run 3

Status: answer. 174 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-060600-ba7e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rost2016-openms/run3/home/sessions/20261009-060600-ba7e/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rost2016-openms/run3/home/sessions/20261009-060600-ba7e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | pass 7173 via tolerance (n1, claim check 111) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 56) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 56) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 56) | pass 1887 via tolerance (n9, claim check 111) |

### schramm2012-imzml-pyimzml | claude:claude-sonnet-5-5 | run 1

Status: answer. 28 s. 5 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-060854-79d1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261009-060854-79d1/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261009-060854-79d1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 16) | pass 9 via tolerance (n5, claim check 47) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 16) | pass 100.083 via rounding (n2, claim check 47) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 16) | pass 799.917 via rounding (n2, claim check 47) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 26) | pass 243.54 via tolerance (n4, claim check 47) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 26) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 16) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 19) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-sonnet-5-5 | run 2

Status: answer. 41 s. 6 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-060922-aec0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261009-060922-aec0/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261009-060922-aec0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 16) | pass 9 via tolerance (n5, claim check 54) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 16) | pass 100.083 via rounding (n2, claim check 54) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 16) | pass 799.917 via rounding (n2, claim check 54) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 26) | pass 243.54 via tolerance (n4, claim check 54) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 26) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 16) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 19) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-sonnet-5-5 | run 3

Status: answer. 47 s. 7 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061003-7a81. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261009-061003-7a81/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261009-061003-7a81/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 16) | pass 9 via tolerance (n5, claim check 57) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 16) | pass 100.083 via rounding (n2, claim check 57) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 16) | pass 799.917 via rounding (n2, claim check 57) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 25) | pass 243.54 via tolerance (n4, claim check 57) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 25) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 16) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 19) | not asked |

### student1908-sleep | claude:claude-sonnet-5-5 | run 1

Status: answer. 18 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061051-b1ea. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/student1908-sleep/run1/home/sessions/20261009-061051-b1ea/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/student1908-sleep/run1/home/sessions/20261009-061051-b1ea/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 31) | pass 1.58 via tolerance (n2, claim check 39) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 31) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 31) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 31) | pass 0.0028 via tolerance (n2, claim check 39) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 31) | pass 0.7 via tolerance (n2, claim check 39) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 31) | pass 2.46 via tolerance (n2, claim check 39) |

### student1908-sleep | claude:claude-sonnet-5-5 | run 2

Status: answer. 15 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061108-20de. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/student1908-sleep/run2/home/sessions/20261009-061108-20de/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/student1908-sleep/run2/home/sessions/20261009-061108-20de/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 32) | pass 1.58 via tolerance (n2, claim check 39) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 32) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 32) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 32) | pass 0.0028 via tolerance (n2, claim check 39) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 32) | pass 0.7 via tolerance (n2, claim check 39) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 32) | pass 2.46 via tolerance (n2, claim check 39) |

### student1908-sleep | claude:claude-sonnet-5-5 | run 3

Status: answer. 15 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061123-cc04. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/student1908-sleep/run3/home/sessions/20261009-061123-cc04/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/student1908-sleep/run3/home/sessions/20261009-061123-cc04/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 32) | pass 1.58 via tolerance (n2, claim check 39) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 32) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 32) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 32) | pass 0.002833 via tolerance (n2, claim check 39) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 32) | pass 0.7 via tolerance (n2, claim check 39) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 32) | pass 2.46 via tolerance (n2, claim check 39) |

### white2021-flowkit | claude:claude-sonnet-5-5 | run 1

Status: answer. 50 s. 5 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061138-2c8b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/white2021-flowkit/run1/home/sessions/20261009-061138-2c8b/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/white2021-flowkit/run1/home/sessions/20261009-061138-2c8b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 11) | pass 290172 via tolerance (n5, claim check 60) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 28) | pass 133670 via tolerance (n5, claim check 60) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 28) | FAIL 133670 (n5, claim check 60) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 28) | pass 82484 via tolerance (n5, claim check 60) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 28) | pass 82636 via tolerance (n5, claim check 60) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 28) | pass 47165 via tolerance (n5, claim check 60) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 28) | pass 47241 via tolerance (n5, claim check 60) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 28) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 31) | pass 135381 via tolerance (n5, claim check 60) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 31) | pass 85369 via tolerance (n5, claim check 60) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 31) | pass 47694 via tolerance (n5, claim check 60) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 31) | not asked |

### white2021-flowkit | claude:claude-sonnet-5-5 | run 2

Status: answer. 63 s. 7 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061231-4af5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/white2021-flowkit/run2/home/sessions/20261009-061231-4af5/log.jsonl
Leak check: 5 paths read, 1 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/white2021-flowkit/run2/home/sessions/20261009-061231-4af5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 11) | pass 290172 via tolerance (n4, claim check 71) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 28) | pass 133670 via tolerance (n4, claim check 71) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 28) | pass 133860 via tolerance (n3, claim check 71) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 28) | pass 82484 via tolerance (n4, claim check 71) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 28) | pass 82636 via tolerance (n3, claim check 71) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 28) | pass 47165 via tolerance (n4, claim check 71) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 28) | pass 47241 via tolerance (n3, claim check 71) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 28) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 31) | pass 135381 via tolerance (n4, claim check 71) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 31) | pass 85369 via tolerance (n4, claim check 71) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 31) | pass 47694 via tolerance (n4, claim check 71) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 31) | not asked |

### white2021-flowkit | claude:claude-sonnet-5-5 | run 3

Status: answer. 64 s. 6 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061336-9071. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/white2021-flowkit/run3/home/sessions/20261009-061336-9071/log.jsonl
Leak check: 6 paths read, 1 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/white2021-flowkit/run3/home/sessions/20261009-061336-9071/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 11) | pass 290172 via tolerance (n4, claim check 68) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 28) | pass 133670 via tolerance (n4, claim check 68) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 28) | FAIL 133670 (n4, claim check 68) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 28) | pass 82484 via tolerance (n4, claim check 68) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 28) | pass 82636 via tolerance (n3, claim check 68) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 28) | pass 47165 via tolerance (n4, claim check 68) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 28) | pass 47241 via tolerance (n3, claim check 68) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 28) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 31) | pass 135381 via tolerance (n4, claim check 68) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 31) | pass 85369 via tolerance (n4, claim check 68) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 31) | pass 47694 via tolerance (n4, claim check 68) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 31) | not asked |

