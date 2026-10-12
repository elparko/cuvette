# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 197/198 | 154/165 | 18 | 1 error |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| andreasson2019-endotoxin-health | 29/30 / 21/21 |
| belenky2003-sleepstudy | 18/18 / 6/6 |
| chure2024-hplc-py | 36/36 / 33/33 |
| desveaux2026-pcrv-ic50 | 27/27 / 24/24 |
| hildyard2021-embryo-refgenes | 54/54 / 48/48 |
| klindworth2013-16s-primers | 33/33 / 22/33 (1 error) |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 18 | 2046 | 159 | 422 | 215744 | 4444480 | 189 | 14 | 0 | 12 | 13 | 65 | 74 | 16 | 22 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.25 for 18 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 0 | 2 | 0 |
| andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 5 | 0 |
| belenky2003-sleepstudy | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 3 | on | 6 | 0 | 0 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 1 | on | 6 | 1 | 0 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 3 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 2 | on | 5 | 0 | 0 | 5 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 1 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 3 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 3 | 0 |

Paths outside the allow list:
- desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 1: /Volumes/T7/guided-analysis/work/pcrv_cytotox_P3D6_30B8.csv

## Details

### andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | run 1

Status: answer. 169 s. 14 requests, 16 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261012-020617-e6f5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261012-020617-e6f5/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261012-020617-e6f5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 55) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 55) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 55) | pass 6.238 via tolerance (n5, claim check 161) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 55) | pass 0.02 via tolerance (n5, claim check 161) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 55) | pass -0.619 via tolerance (n5, claim check 161) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 55) | pass -0.218 via tolerance (n5, claim check 161) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 55) | pass -1.786 via tolerance (n5, claim check 161) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 55) | pass -0.906 via tolerance (n5, claim check 161) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 55) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n4 metrics.p_value, entry 71) | pass 0.0042 via tolerance (n7, claim check 161) |

### andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | run 2

Status: answer. 103 s. 10 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-020907-06d8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261012-020907-06d8/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261012-020907-06d8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 47) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 47) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 47) | pass 6.238 via tolerance (n3, claim check 126) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 47) | pass 0.02 via tolerance (n2, claim check 126) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 47) | pass -0.619 via tolerance (n3, claim check 126) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 47) | pass -0.218 via tolerance (n3, claim check 126) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 47) | pass -1.786 via tolerance (n3, claim check 126) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 47) | pass -0.906 via tolerance (n3, claim check 126) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 47) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | FAIL - | pass 0.0042 via tolerance (n9, claim check 126) |

### andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | run 3

Status: answer. 150 s. 14 requests, 14 tool calls (1 failed), 0 nudges, 1 plan reminders, 5 unsourced.
Session: 20261012-021050-cf8c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261012-021050-cf8c/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261012-021050-cf8c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 47) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 47) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 47) | pass 6.238 via tolerance (n3, claim check 154) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 47) | pass 0.02 via tolerance (n2, claim check 154) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 47) | pass -0.619 via tolerance (n3, claim check 154) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 47) | pass -0.218 via tolerance (n3, claim check 154) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 47) | pass -1.786 via tolerance (n3, claim check 154) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 47) | pass -0.906 via tolerance (n3, claim check 154) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 47) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n5 metrics.p_value, entry 86) | pass 0.004 via tolerance (n5, claim check 154) |

### belenky2003-sleepstudy | claude:claude-haiku-5-5 | run 1

Status: answer. 67 s. 6 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021320-ccda. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run1/home/sessions/20261012-021320-ccda/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run1/home/sessions/20261012-021320-ccda/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 40) | pass 10.47 via tolerance (n4, claim check 78) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 40) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 40) | pass 1.546 via tolerance (n3, claim check 78) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 40) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 40) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 40) | not asked |

### belenky2003-sleepstudy | claude:claude-haiku-5-5 | run 2

Status: answer. 30 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021427-1146. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run2/home/sessions/20261012-021427-1146/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run2/home/sessions/20261012-021427-1146/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 38) | pass 10.47 via tolerance (n2, claim check 58) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 38) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 38) | pass 1.55 via tolerance (n2, claim check 58) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 38) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 38) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 38) | not asked |

### belenky2003-sleepstudy | claude:claude-haiku-5-5 | run 3

Status: answer. 28 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021458-e49b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run3/home/sessions/20261012-021458-e49b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run3/home/sessions/20261012-021458-e49b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 31) | pass 10.47 via tolerance (n2, claim check 50) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 31) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 31) | pass 1.55 via tolerance (n2, claim check 50) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 31) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 31) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 31) | not asked |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 1

Status: answer. 122 s. 10 requests, 13 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-021526-8064. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261012-021526-8064/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261012-021526-8064/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n7 metrics.n_peaks, entry 51) | pass 6 via tolerance (n17, claim check 143) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n7 metrics.retention_time_1, entry 51) | pass 10.9 via tolerance (n7, claim check 143) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n7 metrics.area_1, entry 51) | pass 2805655 via tolerance (n7, claim check 143) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n7 table.rows[0][3], entry 51) | pass 23380.46 via tolerance (n3, claim check 143) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n7 table.rows[0][4], entry 51) | pass 0.15876 via tolerance (n7, claim check 143) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n7 table.rows[0][5], entry 51) | pass 0.6918 via tolerance (n3, claim check 143) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n7 metrics.retention_time_3, entry 51) | pass 14.45 via tolerance (n7, claim check 143) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n7 metrics.area_1, entry 51) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n15 metrics.slope, entry 92) | pass 156586.7 via tolerance (n17, claim check 143) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n15 metrics.intercept, entry 92) | pass 14624.94 via tolerance (n17, claim check 143) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n15 metrics.r_squared, entry 92) | pass 0.998868 via tolerance (n17, claim check 143) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n16 metrics.mean_concentration, entry 100) | pass 1.89941 via tolerance (n16, claim check 143) |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 2

Status: answer. 115 s. 9 requests, 12 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-021728-fa8d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run2/home/sessions/20261012-021728-fa8d/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run2/home/sessions/20261012-021728-fa8d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 46) | pass 6 via tolerance (n14, claim check 132) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 46) | pass 10.9 via tolerance (n6, claim check 132) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 46) | pass 2805655 via tolerance (n6, claim check 132) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n6 table.rows[0][3], entry 46) | pass 23380.46 via tolerance (n2, claim check 132) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 46) | pass 0.15876 via tolerance (n6, claim check 132) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 46) | pass 0.6918 via tolerance (n2, claim check 132) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 46) | pass 14.45 via tolerance (n6, claim check 132) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 46) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n14 metrics.slope, entry 90) | pass 156586.7 via tolerance (n14, claim check 132) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n14 metrics.intercept, entry 90) | pass 14624.94 via tolerance (n14, claim check 132) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n14 metrics.r_squared, entry 90) | pass 0.998868 via tolerance (n14, claim check 132) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n15 metrics.mean_concentration, entry 98) | pass 1.8994 via tolerance (n15, claim check 132) |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 3

Status: answer. 127 s. 10 requests, 13 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-021923-0ce2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run3/home/sessions/20261012-021923-0ce2/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run3/home/sessions/20261012-021923-0ce2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 49) | pass 6 via tolerance (n14, claim check 146) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 49) | pass 10.9 via tolerance (n6, claim check 146) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 49) | pass 2805655 via tolerance (n6, claim check 146) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n6 table.rows[0][3], entry 49) | pass 23380.46 via tolerance (n2, claim check 146) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 49) | pass 0.15876 via tolerance (n6, claim check 146) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 49) | pass 0.6918 via tolerance (n2, claim check 146) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 49) | pass 14.45 via tolerance (n6, claim check 146) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 49) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n14 metrics.slope, entry 90) | pass 156586.7 via tolerance (n16, claim check 146) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n16 stdout, entry 107) | pass 14624.94 via tolerance (n16, claim check 146) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n14 metrics.r_squared, entry 90) | pass 0.998868 via tolerance (n16, claim check 146) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n15 metrics.mean_concentration, entry 98) | pass 1.8994 via tolerance (n16, claim check 146) |

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 1

Status: answer. 154 s. 11 requests, 14 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-022131-b2aa. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261012-022131-b2aa/log.jsonl
Leak check: 6 paths read, 1 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261012-022131-b2aa/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n2 metrics.MEDI3902_ic50, entry 66) | pass 0.1173 via tolerance (n2, claim check 136) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n2 metrics.30_B8_ic50, entry 66) | pass 0.02131 via tolerance (n3, claim check 136) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n2 metrics.P3D6_ic50, entry 66) | pass 3.653 via tolerance (n2, claim check 136) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n4 metrics.P3D6_ic50, entry 79) | pass 11.79 via tolerance (n4, claim check 136) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n3 metrics.V2_ic50, entry 71) | pass 0.01278 via tolerance (n3, claim check 136) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n3 metrics.V3_ic50, entry 71) | pass 0.0112 via tolerance (n3, claim check 136) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n3 metrics.V4_ic50, entry 71) | pass 0.01305 via tolerance (n3, claim check 136) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n3 metrics.V5_ic50, entry 71) | pass 0.01045 via tolerance (n3, claim check 136) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n4 metrics.30_B8_ic50, entry 79) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | match 0.04517791 (n6 metrics.30_B8_ic50, entry 91) | match 0.04518 via tolerance (n6, claim check 136) |

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 2

Status: answer. 118 s. 11 requests, 16 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-022405-6515. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261012-022405-6515/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261012-022405-6515/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n2 metrics.MEDI3902_ic50, entry 65) | pass 0.1173 via tolerance (n2, claim check 136) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n2 metrics.30_B8_ic50, entry 65) | pass 0.02131 via tolerance (n4, claim check 136) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n2 metrics.P3D6_ic50, entry 65) | pass 3.653 via tolerance (n2, claim check 136) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n3 metrics.P3D6_ic50, entry 68) | pass 11.79 via tolerance (n3, claim check 136) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n4 metrics.V2_ic50, entry 71) | pass 0.01278 via tolerance (n4, claim check 136) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n4 metrics.V3_ic50, entry 71) | pass 0.0112 via tolerance (n4, claim check 136) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n4 metrics.V4_ic50, entry 71) | pass 0.01305 via tolerance (n4, claim check 136) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n4 metrics.V5_ic50, entry 71) | pass 0.01045 via tolerance (n4, claim check 136) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n3 metrics.30_B8_ic50, entry 68) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.06375493 (n4 metrics.V5_rse, entry 71) | differs 0.02645 (n4, claim check 136) |

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 3

Status: answer. 82 s. 8 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-022602-8972. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261012-022602-8972/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261012-022602-8972/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n3 metrics.MEDI3902_ic50, entry 60) | pass 0.1173 via tolerance (n3, claim check 101) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n3 metrics.30_B8_ic50, entry 60) | pass 0.02131 via tolerance (n5, claim check 101) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n3 metrics.P3D6_ic50, entry 60) | pass 3.653 via tolerance (n3, claim check 101) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n4 metrics.P3D6_ic50, entry 63) | pass 11.79 via tolerance (n4, claim check 101) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n5 metrics.V2_ic50, entry 66) | pass 0.01278 via tolerance (n5, claim check 101) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n5 metrics.V3_ic50, entry 66) | pass 0.0112 via tolerance (n5, claim check 101) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n5 metrics.V4_ic50, entry 66) | pass 0.01305 via tolerance (n5, claim check 101) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n5 metrics.V5_ic50, entry 66) | pass 0.01045 via tolerance (n5, claim check 101) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n4 metrics.30_B8_ic50, entry 63) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.06375493 (n5 metrics.V5_rse, entry 66) | differs 0.02645 (n5, claim check 101) |

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 1

Status: answer. 144 s. 10 requests, 10 tool calls (1 failed), 0 nudges, 1 plan reminders, 3 unsourced.
Session: 20261012-022724-1c26. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261012-022724-1c26/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261012-022724-1c26/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 47) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 47) | pass 0.2175 via tolerance (n1, claim check 105) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 47) | pass 0.5275 via tolerance (n1, claim check 105) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 47) | pass 0.441 via tolerance (n1, claim check 105) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 47) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 47) | pass 14 via tolerance (n4, claim check 105) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 47) | pass 0.0686 via tolerance (n1, claim check 105) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n2 metrics.normfinder_AP3D1, entry 55) | pass 0.1348 via tolerance (n2, claim check 105) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n2 metrics.normfinder_HPRT1, entry 55) | pass 0.481 via tolerance (n2, claim check 105) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n1 metrics.normfinder_UBC, entry 47) | pass 0.081 via tolerance (n1, claim check 105) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n1 metrics.normfinder_B2M, entry 47) | pass 0.1805 via tolerance (n1, claim check 105) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n4 metrics.genorm_best_pair_M, entry 68) | pass 0.1142 via tolerance (n4, claim check 105) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n3 metrics.slope_GAPDH, entry 60) | pass -3.4557 via tolerance (n3, claim check 105) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n3 metrics.slope_HTATSF1, entry 60) | pass -3.1799 via tolerance (n3, claim check 105) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n3 metrics.slope_UBC, entry 60) | pass -3.3788 via tolerance (n3, claim check 105) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n3 metrics.efficiency_CYC1, entry 60) | pass 1.945 via tolerance (n3, claim check 105) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n3 metrics.efficiency_PAK1IP1, entry 60) | pass 2.012 via tolerance (n3, claim check 105) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n3 metrics.slope_ACTB, entry 60) | pass -3.2993 via tolerance (n3, claim check 105) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n3 metrics.slope_SDHA, entry 60) | differs -3.2331 (n3, claim check 105) |

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 2

Status: answer. 202 s. 12 requests, 14 tool calls (1 failed), 0 nudges, 1 plan reminders, 5 unsourced.
Session: 20261012-022948-0982. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261012-022948-0982/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261012-022948-0982/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 46) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 46) | pass 0.2175 via tolerance (n1, claim check 137) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 46) | pass 0.5275 via tolerance (n1, claim check 137) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 46) | pass 0.441 via tolerance (n1, claim check 137) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 46) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 46) | pass 14 via tolerance (n5, claim check 137) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 46) | pass 0.0686 via tolerance (n1, claim check 137) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 46) | pass 0.1348 via tolerance (n1, claim check 137) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 46) | pass 0.481 via tolerance (n1, claim check 137) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 65) | pass 0.08103 via tolerance (n2, claim check 137) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 65) | pass 0.1805 via tolerance (n2, claim check 137) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n3 metrics.genorm_best_pair_M, entry 77) | pass 0.1142 via tolerance (n3, claim check 137) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n4 metrics.slope_GAPDH, entry 85) | pass -3.4557 via tolerance (n4, claim check 137) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n4 metrics.slope_HTATSF1, entry 85) | pass -3.1799 via tolerance (n4, claim check 137) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n4 metrics.slope_UBC, entry 85) | pass -3.3788 via tolerance (n4, claim check 137) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n4 metrics.efficiency_CYC1, entry 85) | pass 1.945 via tolerance (n4, claim check 137) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n4 metrics.efficiency_PAK1IP1, entry 85) | pass 2.012 via tolerance (n4, claim check 137) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n4 metrics.slope_ACTB, entry 85) | pass -3.2993 via tolerance (n4, claim check 137) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n4 metrics.slope_SDHA, entry 85) | differs -3.2331 (n4, claim check 137) |

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 3

Status: answer. 181 s. 10 requests, 13 tool calls (1 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261012-023310-cc65. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261012-023310-cc65/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261012-023310-cc65/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 46) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 46) | pass 0.2175 via tolerance (n1, claim check 122) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 46) | pass 0.5275 via tolerance (n5, claim check 122) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 46) | pass 0.441 via tolerance (n1, claim check 122) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 46) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 46) | pass 14 via tolerance (n4, claim check 122) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 46) | pass 0.0686 via tolerance (n1, claim check 122) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 46) | pass 0.1348 via tolerance (n1, claim check 122) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 46) | pass 0.481 via tolerance (n1, claim check 122) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 54) | pass 0.081 via tolerance (n2, claim check 122) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 54) | pass 0.1805 via tolerance (n2, claim check 122) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n4 metrics.genorm_best_pair_M, entry 67) | pass 0.1142 via tolerance (n4, claim check 122) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n3 metrics.slope_GAPDH, entry 59) | pass -3.4557 via tolerance (n3, claim check 122) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n3 metrics.slope_HTATSF1, entry 59) | pass -3.1799 via tolerance (n3, claim check 122) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n3 metrics.slope_UBC, entry 59) | pass -3.3788 via tolerance (n3, claim check 122) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n3 metrics.efficiency_CYC1, entry 59) | pass 1.945 via tolerance (n3, claim check 122) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n3 metrics.efficiency_PAK1IP1, entry 59) | pass 2.012 via tolerance (n3, claim check 122) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n3 metrics.slope_ACTB, entry 59) | pass -3.2993 via tolerance (n3, claim check 122) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n3 metrics.slope_SDHA, entry 59) | differs -3.2331 (n3, claim check 122) |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 1

Status: answer. 115 s. 6 requests, 7 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-023611-5a40. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261012-023611-5a40/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261012-023611-5a40/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n3 metrics.n_products, entry 26) | pass 1 via tolerance (n9, claim check 103) |
| pair1_start | 1608 exact | pass 1608 (n3 metrics.start_1based, entry 26) | pass 1608 via tolerance (n9, claim check 103) |
| pair1_end | 2072 exact | pass 2072 (n3 metrics.end_1based, entry 26) | pass 2072 via tolerance (n9, claim check 103) |
| pair1_length | 465 exact | pass 465 (n3 metrics.product_bp, entry 26) | pass 465 via tolerance (n9, claim check 103) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_fwd_gene_pos, entry 70) | pass 341 via tolerance (n7, claim check 103) |
| pair2_products | 1 exact | pass 1 (n3 metrics.n_products, entry 26) | pass 1 via tolerance (n9, claim check 103) |
| pair2_start | 1275 exact | pass 1275 (n4 metrics.start_1based, entry 30) | pass 1275 via tolerance (n8, claim check 103) |
| pair2_end | 2193 exact | pass 2193 (n4 metrics.end_1based, entry 30) | pass 2193 via tolerance (n8, claim check 103) |
| pair2_length | 919 exact | pass 919 (n4 metrics.product_bp, entry 30) | pass 919 via tolerance (n8, claim check 103) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_fwd_gene_pos, entry 70) | pass 8 via tolerance (n7, claim check 103) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n5 metrics.tm_c_1, entry 52) | pass 61.39 via tolerance (n5, claim check 103) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n3 metrics.product_bp, entry 26) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 2

Status: answer. 84 s. 4 requests, 4 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261012-023806-66e7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run2/home/sessions/20261012-023806-66e7/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run2/home/sessions/20261012-023806-66e7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n3 metrics.n_products, entry 26) | pass 1 via tolerance (n5, claim check 79) |
| pair1_start | 1608 exact | pass 1608 (n3 metrics.start_1based, entry 26) | pass 1608 via tolerance (n3, claim check 79) |
| pair1_end | 2072 exact | pass 2072 (n3 metrics.end_1based, entry 26) | pass 2072 via tolerance (n3, claim check 79) |
| pair1_length | 465 exact | pass 465 (n3 metrics.product_bp, entry 26) | pass 465 via tolerance (n3, claim check 79) |
| pair1_ecoli_position | 341 exact | pass 341 (n6 metrics.pair1_forward_gene_pos, entry 59) | pass 341 via tolerance (n6, claim check 79) |
| pair2_products | 1 exact | pass 1 (n3 metrics.n_products, entry 26) | pass 1 via tolerance (n5, claim check 79) |
| pair2_start | 1275 exact | pass 1275 (n4 metrics.start_1based, entry 29) | pass 1275 via tolerance (n4, claim check 79) |
| pair2_end | 2193 exact | pass 2193 (n4 metrics.end_1based, entry 29) | pass 2193 via tolerance (n4, claim check 79) |
| pair2_length | 919 exact | pass 919 (n4 metrics.product_bp, entry 29) | pass 919 via tolerance (n4, claim check 79) |
| pair2_ecoli_position | 8 exact | pass 8 (n6 metrics.pair2_forward_gene_pos, entry 59) | pass 8 via tolerance (n6, claim check 79) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n5 metrics.tm_c_1, entry 51) | pass 61.39 via tolerance (n5, claim check 79) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n3 metrics.product_bp, entry 26) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 3

Status: error (ENOSPC: no space left on device, write). 56 s. 5 requests, 6 tool calls (3 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261012-023930-25b3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run3/home/sessions/20261012-023930-25b3/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run3/home/sessions/20261012-023930-25b3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n3 metrics.n_products, entry 27) | FAIL - |
| pair1_start | 1608 exact | pass 1608 (n3 metrics.start_1based, entry 27) | FAIL - |
| pair1_end | 2072 exact | pass 2072 (n3 metrics.end_1based, entry 27) | FAIL - |
| pair1_length | 465 exact | pass 465 (n3 metrics.product_bp, entry 27) | FAIL - |
| pair1_ecoli_position | 341 exact | pass 341 (n6 metrics.pair1_forward_pos_in_16S, entry 60) | FAIL - |
| pair2_products | 1 exact | pass 1 (n3 metrics.n_products, entry 27) | FAIL - |
| pair2_start | 1275 exact | pass 1275 (n4 metrics.start_1based, entry 30) | FAIL - |
| pair2_end | 2193 exact | pass 2193 (n4 metrics.end_1based, entry 30) | FAIL - |
| pair2_length | 919 exact | pass 919 (n4 metrics.product_bp, entry 30) | FAIL - |
| pair2_ecoli_position | 8 exact | pass 8 (n6 metrics.pair2_forward_pos_in_16S, entry 60) | FAIL - |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n5 metrics.tm_c_1, entry 52) | FAIL - |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n3 metrics.product_bp, entry 27) | not asked |

