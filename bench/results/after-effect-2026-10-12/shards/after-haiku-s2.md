# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 437/441 | 363/366 | 39 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| andreasson2019-endotoxin-health | 29/30 / 21/21 |
| belenky2003-sleepstudy | 18/18 / 6/6 |
| chure2024-hplc-py | 36/36 / 33/33 |
| desveaux2026-pcrv-ic50 | 27/27 / 24/24 |
| hildyard2021-embryo-refgenes | 54/54 / 48/48 |
| klindworth2013-16s-primers | 33/33 / 33/33 |
| li2009-samtools | 21/21 / 9/9 |
| mahbod2024-nuinsseg | 6/9 / 2/3 |
| nair2024-plasmid-growth | 60/60 / 51/51 |
| quinlan2010-bedtools | 12/12 / 9/9 |
| rouault-gdal-autotest | 42/42 / 42/42 |
| sriphoosanaphan2021-vitd-hcv | 63/63 / 57/57 |
| white2021-flowkit | 36/36 / 28/30 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 39 | 5493 | 363 | 934 | 440950 | 8885895 | 414 | 22 | 1 | 17 | 30 | 125 | 159 | 33 | 40 | 25 | 25 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.49 for 39 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | 1 | on | 8 | 0 | 0 | 0 | 0 |
| andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | 3 | on | 7 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 0 | 1 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 1 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 3 | on | 6 | 0 | 0 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 2 | on | 5 | 1 | 0 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 6 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 2 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 3 | on | 7 | 0 | 0 | 4 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 3 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 3 | 0 |
| li2009-samtools | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-haiku-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-haiku-5-5 | 1 | on | 9 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 0 | 2 | 0 |
| mahbod2024-nuinsseg | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 7 | 0 |
| nair2024-plasmid-growth | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-haiku-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-haiku-5-5 | 3 | on | 7 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 5 | 0 |
| rouault-gdal-autotest | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 2 | 0 |
| rouault-gdal-autotest | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 3 | 0 |
| white2021-flowkit | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| white2021-flowkit | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 1 | 0 |
| white2021-flowkit | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |

Paths outside the allow list:
- desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 2: /Volumes/T7/guided-analysis/work/cytotox_P3D6_30B8.csv

## Details

### andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | run 1

Status: answer. 155 s. 14 requests, 17 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-234259-7028. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261011-234259-7028/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261011-234259-7028/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n4 metrics.n, entry 57) | not asked |
| n_subjects | 52 exact | pass 52 (n4 metrics.n_groups, entry 57) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n4 metrics.coef_Intercept, entry 57) | pass 6.238 via tolerance (n5, claim check 162) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n4 metrics.coef_C_lps_T_1, entry 57) | pass 0.02 via tolerance (n2, claim check 162) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n4 metrics.coef_C_time_T_2, entry 57) | pass -0.619 via tolerance (n4, claim check 162) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n4 metrics.coef_C_time_T_3, entry 57) | pass -0.218 via tolerance (n5, claim check 162) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n4 metrics.coef_C_lps_T_1_C_time_T_2, entry 57) | pass -1.786 via tolerance (n4, claim check 162) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n4 metrics.coef_C_lps_T_1_C_time_T_3, entry 57) | pass -0.906 via tolerance (n5, claim check 162) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n4 metrics.se_C_lps_T_1_C_time_T_2, entry 57) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n7 metrics.p_value, entry 96) | pass 0.0042 via tolerance (n9, claim check 162) |

### andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | run 2

Status: answer. 117 s. 10 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-234534-a10e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261011-234534-a10e/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261011-234534-a10e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 47) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 47) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 47) | pass 6.238 via tolerance (n6, claim check 135) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 47) | pass 0.02 via tolerance (n6, claim check 135) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 47) | pass -0.619 via tolerance (n6, claim check 135) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 47) | pass -0.218 via tolerance (n6, claim check 135) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 47) | pass -1.786 via tolerance (n6, claim check 135) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 47) | pass -0.906 via tolerance (n6, claim check 135) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 47) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | FAIL - | pass 0.0042 via tolerance (n9, claim check 135) |

### andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | run 3

Status: answer. 185 s. 10 requests, 12 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-234732-cba3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261011-234732-cba3/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261011-234732-cba3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 44) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 44) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 44) | pass 6.238 via tolerance (n3, claim check 127) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 44) | pass 0.02 via tolerance (n2, claim check 127) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 44) | pass -0.619 via tolerance (n3, claim check 127) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 44) | pass -0.218 via tolerance (n3, claim check 127) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 44) | pass -1.786 via tolerance (n3, claim check 127) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 44) | pass -0.906 via tolerance (n3, claim check 127) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 44) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n4 metrics.p_value, entry 75) | pass 0.0042 via tolerance (n4, claim check 127) |

### belenky2003-sleepstudy | claude:claude-haiku-5-5 | run 1

Status: answer. 65 s. 8 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-235037-20ad. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run1/home/sessions/20261011-235037-20ad/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run1/home/sessions/20261011-235037-20ad/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 45) | pass 10.47 via tolerance (n4, claim check 86) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 45) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 45) | pass 1.546 via tolerance (n3, claim check 86) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 45) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 45) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 45) | not asked |

### belenky2003-sleepstudy | claude:claude-haiku-5-5 | run 2

Status: answer. 88 s. 10 requests, 9 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-235143-dd8f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run2/home/sessions/20261011-235143-dd8f/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run2/home/sessions/20261011-235143-dd8f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 41) | pass 10.47 via tolerance (n4, claim check 100) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 41) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 41) | pass 1.55 via tolerance (n3, claim check 100) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 41) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 41) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 41) | not asked |

### belenky2003-sleepstudy | claude:claude-haiku-5-5 | run 3

Status: answer. 56 s. 6 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-235311-6185. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run3/home/sessions/20261011-235311-6185/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/belenky2003-sleepstudy/run3/home/sessions/20261011-235311-6185/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 41) | pass 10.47 via tolerance (n3, claim check 72) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 41) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 41) | pass 1.546 via tolerance (n3, claim check 72) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 41) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 41) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 41) | not asked |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 1

Status: answer. 147 s. 8 requests, 15 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261011-235407-05c9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261011-235407-05c9/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261011-235407-05c9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 46) | pass 6 via tolerance (n17, claim check 149) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 46) | pass 10.9 via tolerance (n17, claim check 149) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 46) | pass 2805655 via tolerance (n17, claim check 149) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n6 table.rows[0][3], entry 46) | pass 23380.46 via tolerance (n20, claim check 149) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 46) | pass 0.15876 via tolerance (n19, claim check 149) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 46) | pass 0.6918 via tolerance (n20, claim check 149) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 46) | pass 14.45 via tolerance (n17, claim check 149) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 46) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n16 metrics.slope, entry 94) | pass 156586.7 via tolerance (n16, claim check 149) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n16 metrics.intercept, entry 94) | pass 14624.94 via tolerance (n16, claim check 149) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n16 metrics.r_squared, entry 94) | pass 0.998868 via tolerance (n16, claim check 149) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n18 metrics.mean_concentration, entry 106) | pass 1.89941 via tolerance (n18, claim check 149) |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 2

Status: answer. 133 s. 8 requests, 11 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261011-235635-4b9a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run2/home/sessions/20261011-235635-4b9a/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run2/home/sessions/20261011-235635-4b9a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 46) | pass 6 via tolerance (n14, claim check 125) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 46) | pass 10.9 via tolerance (n6, claim check 125) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 46) | pass 2805655 via tolerance (n2, claim check 125) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n6 table.rows[0][3], entry 46) | pass 23380.46 via tolerance (n2, claim check 125) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 46) | pass 0.158762 via tolerance (n2, claim check 125) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 46) | pass 0.6918 via tolerance (n2, claim check 125) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 46) | pass 14.45 via tolerance (n6, claim check 125) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 46) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n14 metrics.slope, entry 87) | pass 156586.7 via tolerance (n14, claim check 125) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n14 metrics.intercept, entry 87) | pass 14624.94 via tolerance (n14, claim check 125) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n14 metrics.r_squared, entry 87) | pass 0.998868 via tolerance (n14, claim check 125) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n15 metrics.mean_concentration, entry 95) | pass 1.8994 via tolerance (n15, claim check 125) |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 3

Status: answer. 132 s. 11 requests, 14 tool calls (6 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-235848-5364. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run3/home/sessions/20261011-235848-5364/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/chure2024-hplc-py/run3/home/sessions/20261011-235848-5364/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n2 metrics.n_peaks, entry 52) | pass 6 via tolerance (n10, claim check 145) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n2 metrics.retention_time_1, entry 52) | pass 10.9 via tolerance (n2, claim check 145) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n2 metrics.area_1, entry 52) | pass 2805655 via tolerance (n2, claim check 145) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n2 table.rows[0][3], entry 52) | pass 23380.46 via tolerance (n2, claim check 145) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n2 table.rows[0][4], entry 52) | pass 0.158762 via tolerance (n2, claim check 145) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n2 table.rows[0][5], entry 52) | pass 0.6918 via tolerance (n2, claim check 145) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n2 metrics.retention_time_3, entry 52) | pass 14.45 via tolerance (n2, claim check 145) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n2 metrics.area_1, entry 52) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n10 metrics.slope, entry 93) | pass 156586.7 via tolerance (n10, claim check 145) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n10 metrics.intercept, entry 93) | pass 14624.94 via tolerance (n10, claim check 145) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n10 metrics.r_squared, entry 93) | pass 0.998868 via tolerance (n10, claim check 145) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n11 metrics.mean_concentration, entry 101) | pass 1.8994 via tolerance (n11, claim check 145) |

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 1

Status: answer. 125 s. 10 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-000100-7cce. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261012-000100-7cce/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261012-000100-7cce/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n1 metrics.MEDI3902_ic50, entry 56) | pass 0.1173 via tolerance (n1, claim check 120) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n1 metrics.30_B8_ic50, entry 56) | pass 0.02131 via tolerance (n3, claim check 120) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n1 metrics.P3D6_ic50, entry 56) | pass 3.653 via tolerance (n1, claim check 120) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n4 metrics.P3D6_ic50, entry 77) | pass 11.79 via tolerance (n4, claim check 120) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n3 metrics.V2_ic50, entry 69) | pass 0.01278 via tolerance (n3, claim check 120) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n3 metrics.V3_ic50, entry 69) | pass 0.0112 via tolerance (n3, claim check 120) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n3 metrics.V4_ic50, entry 69) | pass 0.01305 via tolerance (n3, claim check 120) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n3 metrics.V5_ic50, entry 69) | pass 0.01045 via tolerance (n3, claim check 120) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n4 metrics.30_B8_ic50, entry 77) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.06375493 (n3 metrics.V5_rse, entry 69) | differs 0.02645 (n3, claim check 120) |

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 2

Status: answer. 181 s. 13 requests, 13 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-000305-b8fd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261012-000305-b8fd/log.jsonl
Leak check: 5 paths read, 1 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261012-000305-b8fd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n3 metrics.MEDI3902_ic50, entry 62) | pass 0.1173 via tolerance (n3, claim check 143) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n3 metrics.30_B8_ic50, entry 62) | pass 0.0213 via tolerance (n4, claim check 143) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n3 metrics.P3D6_ic50, entry 62) | pass 3.653 via tolerance (n3, claim check 143) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n6 metrics.P3D6_ic50, entry 90) | pass 11.79 via tolerance (n6, claim check 143) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n4 metrics.V2_ic50, entry 72) | pass 0.0128 via tolerance (n4, claim check 143) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n4 metrics.V3_ic50, entry 72) | pass 0.0112 via tolerance (n4, claim check 143) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n4 metrics.V4_ic50, entry 72) | pass 0.013 via tolerance (n4, claim check 143) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n4 metrics.V5_ic50, entry 72) | pass 0.0105 via tolerance (n4, claim check 143) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n6 metrics.30_B8_ic50, entry 90) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | match 0.04517791 (n7 metrics.30_B8_ic50, entry 98) | match 0.0452 via tolerance (n7, claim check 143) |

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 3

Status: answer. 145 s. 10 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-000607-bbed. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261012-000607-bbed/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261012-000607-bbed/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n1 metrics.MEDI3902_ic50, entry 52) | pass 0.1173 via tolerance (n1, claim check 123) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n1 metrics.30_B8_ic50, entry 52) | pass 0.02131 via tolerance (n5, claim check 123) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n1 metrics.P3D6_ic50, entry 52) | pass 3.653 via tolerance (n1, claim check 123) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n3 metrics.P3D6_ic50, entry 68) | pass 11.79 via tolerance (n3, claim check 123) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n5 metrics.V2_ic50, entry 90) | pass 0.01278 via tolerance (n5, claim check 123) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n5 metrics.V3_ic50, entry 90) | pass 0.0112 via tolerance (n5, claim check 123) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n5 metrics.V4_ic50, entry 90) | pass 0.01305 via tolerance (n5, claim check 123) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n5 metrics.V5_ic50, entry 90) | pass 0.01045 via tolerance (n5, claim check 123) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n3 metrics.30_B8_ic50, entry 68) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | match 0.04517791 (n4 metrics.30_B8_ic50, entry 76) | match 0.04518 via tolerance (n4, claim check 123) |

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 1

Status: answer. 128 s. 6 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261012-000832-8eea. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261012-000832-8eea/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261012-000832-8eea/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 43) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 43) | pass 0.2175 via tolerance (n1, claim check 86) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 43) | pass 0.5275 via tolerance (n1, claim check 86) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 43) | pass 0.441 via tolerance (n1, claim check 86) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 43) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 43) | pass 14 via tolerance (n4, claim check 86) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 43) | pass 0.0686 via tolerance (n1, claim check 86) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 43) | pass 0.1348 via tolerance (n1, claim check 86) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 43) | pass 0.481 via tolerance (n1, claim check 86) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 51) | pass 0.081 via tolerance (n2, claim check 86) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 51) | pass 0.1805 via tolerance (n2, claim check 86) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n3 metrics.genorm_best_pair_M, entry 54) | pass 0.1142 via tolerance (n3, claim check 86) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n4 metrics.slope_GAPDH, entry 57) | pass -3.4557 via tolerance (n4, claim check 86) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n4 metrics.slope_HTATSF1, entry 57) | pass -3.1799 via tolerance (n4, claim check 86) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n4 metrics.slope_UBC, entry 57) | pass -3.3788 via tolerance (n4, claim check 86) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n4 metrics.efficiency_CYC1, entry 57) | pass 1.945 via tolerance (n4, claim check 86) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n4 metrics.efficiency_PAK1IP1, entry 57) | pass 2.012 via tolerance (n4, claim check 86) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n4 metrics.slope_ACTB, entry 57) | pass -3.2993 via tolerance (n4, claim check 86) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n4 metrics.slope_SDHA, entry 57) | differs -3.2331 (n4, claim check 86) |

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 2

Status: answer. 231 s. 14 requests, 15 tool calls (1 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261012-001040-dc87. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261012-001040-dc87/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261012-001040-dc87/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n2 metrics.n_samples, entry 53) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n2 metrics.genorm_best_pair_M, entry 53) | pass 0.2175 via tolerance (n2, claim check 145) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n2 metrics.genorm_average_M_HPRT1, entry 53) | pass 0.5275 via tolerance (n2, claim check 145) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n2 metrics.genorm_average_M_GAPDH, entry 53) | pass 0.441 via tolerance (n2, claim check 145) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n2 metrics.genorm_average_M_ActB, entry 53) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.n_genes, entry 35) | pass 14 via tolerance (n4, claim check 145) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n2 metrics.genorm_V2_3, entry 53) | pass 0.0686 via tolerance (n2, claim check 145) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n2 metrics.normfinder_AP3D1, entry 53) | pass 0.1348 via tolerance (n2, claim check 145) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n2 metrics.normfinder_HPRT1, entry 53) | pass 0.481 via tolerance (n2, claim check 145) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n3 metrics.normfinder_UBC, entry 70) | pass 0.081 via tolerance (n3, claim check 145) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n3 metrics.normfinder_B2M, entry 70) | pass 0.1805 via tolerance (n3, claim check 145) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n4 metrics.genorm_best_pair_M, entry 80) | pass 0.1142 via tolerance (n4, claim check 145) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.4557 (n6 stdout, entry 99) | pass -3.4557 via tolerance (n7, claim check 145) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.1799 (n6 stdout, entry 99) | pass -3.1799 via tolerance (n7, claim check 145) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.3788 (n6 stdout, entry 99) | pass -3.3788 via tolerance (n7, claim check 145) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n1 metrics.efficiency_CYC1, entry 35) | pass 1.945 via tolerance (n7, claim check 145) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.012 (n6 stdout, entry 99) | pass 2.012 via tolerance (n7, claim check 145) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.2993 (n6 stdout, entry 99) | pass -3.2993 via tolerance (n7, claim check 145) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.2274 (n6 stdout, entry 99) | differs -3.2274 (n7, claim check 145) |

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 3

Status: answer. 187 s. 12 requests, 16 tool calls (1 failed), 0 nudges, 1 plan reminders, 4 unsourced.
Session: 20261012-001431-61d9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261012-001431-61d9/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261012-001431-61d9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 46) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 46) | pass 0.2175 via tolerance (n1, claim check 135) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 46) | pass 0.5275 via tolerance (n1, claim check 135) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 46) | pass 0.441 via tolerance (n1, claim check 135) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 46) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 46) | pass 14 via tolerance (n4, claim check 135) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 46) | pass 0.0686 via tolerance (n1, claim check 135) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 46) | pass 0.1348 via tolerance (n1, claim check 135) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 46) | pass 0.481 via tolerance (n1, claim check 135) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 63) | pass 0.081 via tolerance (n2, claim check 135) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 63) | pass 0.1805 via tolerance (n2, claim check 135) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n4 metrics.genorm_best_pair_M, entry 76) | pass 0.1142 via tolerance (n4, claim check 135) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n3 metrics.slope_GAPDH, entry 68) | pass -3.4557 via tolerance (n3, claim check 135) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n3 metrics.slope_HTATSF1, entry 68) | pass -3.1799 via tolerance (n3, claim check 135) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n3 metrics.slope_UBC, entry 68) | pass -3.3788 via tolerance (n3, claim check 135) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n3 metrics.efficiency_CYC1, entry 68) | pass 1.945 via tolerance (n3, claim check 135) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n3 metrics.efficiency_PAK1IP1, entry 68) | pass 2.012 via tolerance (n3, claim check 135) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n3 metrics.slope_ACTB, entry 68) | pass -3.2993 via tolerance (n3, claim check 135) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n3 metrics.slope_SDHA, entry 68) | differs -3.2331 (n3, claim check 135) |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 1

Status: answer. 74 s. 5 requests, 6 tool calls (2 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261012-001739-e3c9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261012-001739-e3c9/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261012-001739-e3c9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n7, claim check 90) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 29) | pass 1608 via tolerance (n4, claim check 90) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 29) | pass 2072 via tolerance (n4, claim check 90) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 29) | pass 465 via tolerance (n6, claim check 90) |
| pair1_ecoli_position | 341 exact | pass 341 (n6 metrics.pair1_fwd_gene_pos, entry 61) | pass 341 via tolerance (n6, claim check 90) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n7, claim check 90) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 32) | pass 1275 via tolerance (n5, claim check 90) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 32) | pass 2193 via tolerance (n5, claim check 90) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 32) | pass 919 via tolerance (n6, claim check 90) |
| pair2_ecoli_position | 8 exact | pass 8 (n6 metrics.pair2_fwd_gene_pos, entry 61) | pass 8 via tolerance (n6, claim check 90) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n7 metrics.tm_c_1, entry 69) | pass 61.39 via tolerance (n7, claim check 90) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 29) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 2

Status: answer. 73 s. 5 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-001853-d2a8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run2/home/sessions/20261012-001853-d2a8/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run2/home/sessions/20261012-001853-d2a8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n8, claim check 91) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 29) | pass 1608 via tolerance (n8, claim check 91) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 29) | pass 2072 via tolerance (n8, claim check 91) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 29) | pass 465 via tolerance (n8, claim check 91) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1 forward 16S position, entry 62) | pass 341 via tolerance (n7, claim check 91) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n8, claim check 91) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 32) | pass 1275 via tolerance (n5, claim check 91) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 32) | pass 2193 via tolerance (n5, claim check 91) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 32) | pass 919 via tolerance (n7, claim check 91) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2 forward 16S position, entry 62) | pass 8 via tolerance (n7, claim check 91) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 54) | pass 61.39 via tolerance (n6, claim check 91) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 29) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 3

Status: answer. 76 s. 4 requests, 6 tool calls (2 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261012-002006-b3fc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run3/home/sessions/20261012-002006-b3fc/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/klindworth2013-16s-primers/run3/home/sessions/20261012-002006-b3fc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n6, claim check 93) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 29) | pass 1608 via tolerance (n4, claim check 93) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 29) | pass 2072 via tolerance (n4, claim check 93) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 29) | pass 465 via tolerance (n4, claim check 93) |
| pair1_ecoli_position | 341 exact | pass 341 (n8 metrics.pair1_fwd_gene_start, entry 69) | pass 341 via tolerance (n8, claim check 93) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n6, claim check 93) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 33) | pass 1275 via tolerance (n5, claim check 93) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 33) | pass 2193 via tolerance (n5, claim check 93) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 33) | pass 919 via tolerance (n5, claim check 93) |
| pair2_ecoli_position | 8 exact | pass 8 (n8 metrics.pair2_fwd_gene_start, entry 69) | pass 8 via tolerance (n8, claim check 93) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 55) | pass 61.39 via tolerance (n6, claim check 93) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 29) | not asked |

### li2009-samtools | claude:claude-haiku-5-5 | run 1

Status: answer. 53 s. 10 requests, 8 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-002123-f470. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/li2009-samtools/run1/home/sessions/20261012-002123-f470/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/li2009-samtools/run1/home/sessions/20261012-002123-f470/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 19) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 40) | pass 3271 via tolerance (n5, claim check 99) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 40) | pass 3144 via tolerance (n4, claim check 99) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 40) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 47) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 47) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 75) | pass 79 via tolerance (n10, claim check 99) |

### li2009-samtools | claude:claude-haiku-5-5 | run 2

Status: answer. 34 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-002216-67d5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/li2009-samtools/run2/home/sessions/20261012-002216-67d5/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/li2009-samtools/run2/home/sessions/20261012-002216-67d5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 12) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 34) | pass 3271 via tolerance (n5, claim check 79) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 34) | pass 3144 via tolerance (n4, claim check 79) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 34) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 37) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 37) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 65) | pass 79 via tolerance (n10, claim check 79) |

### li2009-samtools | claude:claude-haiku-5-5 | run 3

Status: answer. 61 s. 7 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-002250-2891. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/li2009-samtools/run3/home/sessions/20261012-002250-2891/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/li2009-samtools/run3/home/sessions/20261012-002250-2891/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 12) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 33) | pass 3271 via tolerance (n5, claim check 82) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 33) | pass 3144 via tolerance (n4, claim check 82) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 33) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 36) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 36) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 64) | pass 79 via tolerance (n10, claim check 82) |

### mahbod2024-nuinsseg | claude:claude-haiku-5-5 | run 1

Status: answer. 868 s. 22 requests, 26 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-002351-accf. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261012-002351-accf/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261012-002351-accf/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n12 metrics.mean_dice, entry 90) | pass 0.538 via tolerance (n23, claim check 254) |
| image_patches | 665 exact | pass 665 (n12 metrics.n_images, entry 90) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n12 metrics.total_truth, entry 90) | not asked |

### mahbod2024-nuinsseg | claude:claude-haiku-5-5 | run 2

Status: answer. 550 s. 18 requests, 23 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-003819-dd8e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261012-003819-dd8e/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261012-003819-dd8e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n12 metrics.mean_dice, entry 105) | pass 0.538 via tolerance (n22, claim check 223) |
| image_patches | 665 exact | pass 665 (n2 stdout, entry 55) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n12 metrics.total_truth, entry 105) | not asked |

### mahbod2024-nuinsseg | claude:claude-haiku-5-5 | run 3

Status: answer. 145 s. 19 requests, 18 tool calls (0 failed), 1 nudges, 1 plan reminders, 7 unsourced.
Session: 20261012-004729-dd92. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261012-004729-dd92/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 7 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261012-004729-dd92/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | FAIL 0.5916 (n14 stdout, entry 178) | FAIL 0.5 (n14, claim check 205) |
| image_patches | 665 exact | FAIL 680.5 (n14 stdout, entry 178) | not asked |
| nuclei_label_masks | 35138 exact | FAIL 30953 (n14 stdout, entry 178) | not asked |

### nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 1

Status: answer. 160 s. 15 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-004954-4445. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/nair2024-plasmid-growth/run1/home/sessions/20261012-004954-4445/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/nair2024-plasmid-growth/run1/home/sessions/20261012-004954-4445/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 66) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 66) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 66) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_P1, entry 100) | pass 1.0053 via tolerance (n5, claim check 159) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_P2, entry 100) | pass 1.0278 via tolerance (n5, claim check 159) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_P3, entry 100) | pass 1.0329 via tolerance (n5, claim check 159) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_P4, entry 100) | pass 0.9657 via tolerance (n5, claim check 159) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_P5, entry 100) | pass 1.0725 via tolerance (n5, claim check 159) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_P6, entry 100) | pass 1.0083 via tolerance (n5, claim check 159) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_P7, entry 100) | pass 0.9612 via tolerance (n5, claim check 159) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_P8, entry 100) | pass 0.9754 via tolerance (n5, claim check 159) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_P9, entry 100) | pass 1.0426 via tolerance (n5, claim check 159) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_P10, entry 100) | pass 0.9902 via tolerance (n5, claim check 159) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_P11, entry 100) | pass 0.9466 via tolerance (n5, claim check 159) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_P14, entry 100) | pass 1.0821 via tolerance (n5, claim check 159) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][8], entry 100) | pass 0.7424 via tolerance (n5, claim check 159) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][9], entry 100) | pass 1.1507 via tolerance (n5, claim check 159) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_P5, entry 100) | pass 0.243 via tolerance (n5, claim check 159) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_P11, entry 100) | pass 0.508 via tolerance (n4, claim check 159) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.0092 (n5 stdout, entry 109) | pass 1.0092 via tolerance (n5, claim check 159) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_Host, entry 100) | differs 0.9902 (n5, claim check 159) |

### nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 2

Status: answer. 138 s. 12 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-005234-fb2b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/nair2024-plasmid-growth/run2/home/sessions/20261012-005234-fb2b/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/nair2024-plasmid-growth/run2/home/sessions/20261012-005234-fb2b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 55) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 55) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 55) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_P1, entry 81) | pass 1.0053 via tolerance (n4, claim check 140) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_P2, entry 81) | pass 1.0278 via tolerance (n4, claim check 140) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_P3, entry 81) | pass 1.0329 via tolerance (n4, claim check 140) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_P4, entry 81) | pass 0.9657 via tolerance (n4, claim check 140) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_P5, entry 81) | pass 1.0725 via tolerance (n4, claim check 140) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_P6, entry 81) | pass 1.0083 via tolerance (n4, claim check 140) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_P7, entry 81) | pass 0.9612 via tolerance (n4, claim check 140) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_P8, entry 81) | pass 0.9754 via tolerance (n4, claim check 140) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_P9, entry 81) | pass 1.0426 via tolerance (n4, claim check 140) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_P10, entry 81) | pass 0.9902 via tolerance (n4, claim check 140) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_P11, entry 81) | pass 0.9466 via tolerance (n4, claim check 140) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_P14, entry 81) | pass 1.0821 via tolerance (n4, claim check 140) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][8], entry 81) | pass 0.7424 via tolerance (n4, claim check 140) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][9], entry 81) | pass 1.1507 via tolerance (n4, claim check 140) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_P5, entry 81) | pass 0.243 via tolerance (n4, claim check 140) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_P11, entry 81) | pass 0.508 via tolerance (n4, claim check 140) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n5 metrics.mean_of_12_plasmid_means, entry 89) | pass 1.0092 via tolerance (n5, claim check 140) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_Host, entry 81) | differs 0.9902 (n4, claim check 140) |

### nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 3

Status: answer. 133 s. 11 requests, 12 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005452-1fff. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/nair2024-plasmid-growth/run3/home/sessions/20261012-005452-1fff/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/nair2024-plasmid-growth/run3/home/sessions/20261012-005452-1fff/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 52) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 52) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 52) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n5 stdout, entry 93) | pass 1.0053 via tolerance (n4, claim check 134) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n5 stdout, entry 93) | pass 1.0278 via tolerance (n4, claim check 134) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n5 stdout, entry 93) | pass 1.0329 via tolerance (n5, claim check 134) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.965689 (n5 stdout, entry 93) | pass 0.9657 via tolerance (n4, claim check 134) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n5 stdout, entry 93) | pass 1.0725 via tolerance (n5, claim check 134) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n5 stdout, entry 93) | pass 1.0083 via tolerance (n5, claim check 134) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.961198 (n5 stdout, entry 93) | pass 0.9612 via tolerance (n5, claim check 134) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.97545 (n5 stdout, entry 93) | pass 0.9754 via tolerance (n4, claim check 134) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n5 stdout, entry 93) | pass 1.0426 via tolerance (n4, claim check 134) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.990162 (n5 stdout, entry 93) | pass 0.9902 via tolerance (n4, claim check 134) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.946554 (n5 stdout, entry 93) | pass 0.9466 via tolerance (n5, claim check 134) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n5 stdout, entry 93) | pass 1.0821 via tolerance (n4, claim check 134) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.742365 (n5 stdout, entry 93) | pass 0.7424 via tolerance (n5, claim check 134) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n5 stdout, entry 93) | pass 1.1507 via tolerance (n5, claim check 134) |
| p_p5 | 0.243208 ±0.0005 | pass 0.243208 (n5 stdout, entry 93) | pass 0.243 via tolerance (n5, claim check 134) |
| p_p11 | 0.507637 ±0.0005 | pass 0.507637 (n5 stdout, entry 93) | pass 0.508 via tolerance (n5, claim check 134) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n6 metrics.mean_of_12_plasmid_means, entry 102) | pass 1.0092 via tolerance (n6, claim check 134) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_Host, entry 84) | differs 0.9902 (n4, claim check 134) |

### quinlan2010-bedtools | claude:claude-haiku-5-5 | run 1

Status: answer. 23 s. 2 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005706-02da. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/quinlan2010-bedtools/run1/home/sessions/20261012-005706-02da/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/quinlan2010-bedtools/run1/home/sessions/20261012-005706-02da/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 12) | pass 126 via tolerance (n2, claim check 27) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 12) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 12) | pass 33713 via tolerance (n1, claim check 27) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 18) | pass 11270 via tolerance (n3, claim check 27) |

### quinlan2010-bedtools | claude:claude-haiku-5-5 | run 2

Status: answer. 30 s. 3 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005728-3bd9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/quinlan2010-bedtools/run2/home/sessions/20261012-005728-3bd9/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/quinlan2010-bedtools/run2/home/sessions/20261012-005728-3bd9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 12) | pass 126 via tolerance (n4, claim check 37) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 12) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 12) | pass 33713 via tolerance (n4, claim check 37) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 18) | pass 11270 via tolerance (n3, claim check 37) |

### quinlan2010-bedtools | claude:claude-haiku-5-5 | run 3

Status: answer. 44 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-005759-aef7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/quinlan2010-bedtools/run3/home/sessions/20261012-005759-aef7/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/quinlan2010-bedtools/run3/home/sessions/20261012-005759-aef7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 15) | pass 126 via tolerance (n2, claim check 49) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 15) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 15) | pass 33713 via tolerance (n1, claim check 49) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 21) | pass 11270 via tolerance (n3, claim check 49) |

### rouault-gdal-autotest | claude:claude-haiku-5-5 | run 1

Status: answer. 91 s. 8 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 5 unsourced.
Session: 20261012-005843-4af2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rouault-gdal-autotest/run1/home/sessions/20261012-005843-4af2/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rouault-gdal-autotest/run1/home/sessions/20261012-005843-4af2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 75) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 75) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 12) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 12) | pass 60 via tolerance (n1, claim check 75) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 12) | pass 74 via tolerance (n3, claim check 75) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 12) | pass 255 via tolerance (n3, claim check 75) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 12) | pass 126.765 via tolerance (n1, claim check 75) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 12) | pass 22.928 via tolerance (n1, claim check 75) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 23) | pass 22 via tolerance (n3, claim check 75) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 23) | pass 18 via tolerance (n3, claim check 75) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 31) | pass 100 via tolerance (n4, claim check 75) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 31) | pass 129.5 via tolerance (n4, claim check 75) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 31) | pass 42 via tolerance (n4, claim check 75) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 31) | pass 135 via tolerance (n4, claim check 75) |

### rouault-gdal-autotest | claude:claude-haiku-5-5 | run 2

Status: answer. 104 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-010014-2d2c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rouault-gdal-autotest/run2/home/sessions/20261012-010014-2d2c/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rouault-gdal-autotest/run2/home/sessions/20261012-010014-2d2c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 71) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 71) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 12) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 12) | pass 60 via tolerance (n1, claim check 71) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 12) | pass 74 via tolerance (n3, claim check 71) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 12) | pass 255 via tolerance (n3, claim check 71) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 12) | pass 126.765 via tolerance (n1, claim check 71) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 12) | pass 22.928 via tolerance (n1, claim check 71) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 23) | pass 22 via tolerance (n3, claim check 71) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 23) | pass 18 via tolerance (n3, claim check 71) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 26) | pass 100 via tolerance (n4, claim check 71) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 26) | pass 129.5 via tolerance (n4, claim check 71) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 26) | pass 42 via tolerance (n4, claim check 71) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 26) | pass 135 via tolerance (n4, claim check 71) |

### rouault-gdal-autotest | claude:claude-haiku-5-5 | run 3

Status: answer. 54 s. 6 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-010158-a0e1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rouault-gdal-autotest/run3/home/sessions/20261012-010158-a0e1/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rouault-gdal-autotest/run3/home/sessions/20261012-010158-a0e1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 60) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 60) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 12) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 12) | pass 60 via tolerance (n1, claim check 60) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 12) | pass 74 via tolerance (n3, claim check 60) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 12) | pass 255 via tolerance (n3, claim check 60) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 12) | pass 126.765 via tolerance (n1, claim check 60) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 12) | pass 22.928 via tolerance (n1, claim check 60) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 26) | pass 22 via tolerance (n3, claim check 60) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 26) | pass 18 via tolerance (n3, claim check 60) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 29) | pass 100 via tolerance (n4, claim check 60) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 29) | pass 129.5 via tolerance (n4, claim check 60) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 29) | pass 42 via tolerance (n4, claim check 60) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 29) | pass 135 via tolerance (n4, claim check 60) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | run 1

Status: answer. 142 s. 13 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-010253-78eb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261012-010253-78eb/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261012-010253-78eb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261012-010253-78eb/work/inspect_table-1/columns.csv, entry 12) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 47) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08641 (n8 stdout, entry 91) | pass 23.09 via tolerance (n2, claim check 143) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 47) | pass 19.73 via tolerance (n2, claim check 143) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 47) | pass 26.44 via tolerance (n2, claim check 143) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 51) | pass -0.55 via tolerance (n3, claim check 143) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 51) | pass -2.84 via tolerance (n3, claim check 143) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 51) | pass 1.73 via tolerance (n3, claim check 143) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 51) | pass 0.63 via tolerance (n7, claim check 143) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n8 stdout, entry 91) | pass -5.51 via tolerance (n8, claim check 143) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 55) | pass -26.36 via tolerance (n4, claim check 143) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 55) | pass 15.34 via tolerance (n4, claim check 143) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 55) | pass 0.6 via tolerance (n7, claim check 143) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n8 stdout, entry 91) | pass 122.92 via tolerance (n8, claim check 143) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96333 (n8 stdout, entry 91) | pass -68.96 via tolerance (n8, claim check 143) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 59) | pass 314.81 via tolerance (n5, claim check 143) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 59) | pass 0.206 via tolerance (n7, claim check 143) |
| p3np_diff | -0.11 ±0.005 | pass -0.110391 (n8 stdout, entry 91) | pass -0.11 via tolerance (n8, claim check 143) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 63) | pass -2.37 via tolerance (n8, claim check 143) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 63) | pass 2.15 via tolerance (n8, claim check 143) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 63) | pass 0.923 via tolerance (n7, claim check 143) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | run 2

Status: answer. 118 s. 8 requests, 11 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-010515-a302. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261012-010515-a302/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261012-010515-a302/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n2 metrics.n_b, entry 38) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 38) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08641 (n8 stdout, entry 70) | pass 23.09 via tolerance (n2, claim check 111) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 38) | pass 19.73 via tolerance (n2, claim check 111) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 38) | pass 26.44 via tolerance (n2, claim check 111) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 42) | pass -0.55 via tolerance (n3, claim check 111) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 42) | pass -2.84 via tolerance (n3, claim check 111) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 42) | pass 1.73 via tolerance (n3, claim check 111) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 42) | pass 0.63 via tolerance (n7, claim check 111) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n8 stdout, entry 70) | pass -5.51 via tolerance (n8, claim check 111) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 46) | pass -26.36 via tolerance (n4, claim check 111) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 46) | pass 15.34 via tolerance (n4, claim check 111) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 46) | pass 0.6 via tolerance (n7, claim check 111) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n8 stdout, entry 70) | pass 122.92 via tolerance (n8, claim check 111) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96333 (n8 stdout, entry 70) | pass -68.96 via tolerance (n8, claim check 111) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 50) | pass 314.81 via tolerance (n5, claim check 111) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 50) | pass 0.206 via tolerance (n7, claim check 111) |
| p3np_diff | -0.11 ±0.005 | pass -0.110391 (n8 stdout, entry 70) | pass -0.11 via tolerance (n8, claim check 111) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 54) | pass -2.37 via tolerance (n8, claim check 111) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 54) | pass 2.15 via tolerance (n8, claim check 111) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 54) | pass 0.923 via tolerance (n7, claim check 111) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | run 3

Status: answer. 105 s. 7 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261012-010713-77db. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261012-010713-77db/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261012-010713-77db/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n2 metrics.n_b, entry 42) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 42) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 42) | pass 23.09 via tolerance (n2, claim check 92) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 42) | pass 19.73 via tolerance (n2, claim check 92) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 42) | pass 26.44 via tolerance (n2, claim check 92) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 45) | pass -0.55 via tolerance (n3, claim check 92) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 45) | pass -2.84 via tolerance (n3, claim check 92) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 45) | pass 1.73 via tolerance (n3, claim check 92) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 45) | pass 0.63 via tolerance (n7, claim check 92) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 48) | pass -5.51 via tolerance (n4, claim check 92) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 48) | pass -26.36 via tolerance (n4, claim check 92) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 48) | pass 15.34 via tolerance (n4, claim check 92) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 48) | pass 0.6 via tolerance (n7, claim check 92) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 51) | pass 122.92 via tolerance (n5, claim check 92) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n5 metrics.ci_lo, entry 51) | pass -68.96 via tolerance (n5, claim check 92) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 51) | pass 314.81 via tolerance (n5, claim check 92) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 51) | pass 0.21 via rounding (n7, claim check 92) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 54) | pass -0.11 via tolerance (n6, claim check 92) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 54) | pass -2.37 via tolerance (n6, claim check 92) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 54) | pass 2.15 via tolerance (n6, claim check 92) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 54) | pass 0.92 via rounding (n7, claim check 92) |

### white2021-flowkit | claude:claude-haiku-5-5 | run 1

Status: answer. 106 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-010859-cc92. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/white2021-flowkit/run1/home/sessions/20261012-010859-cc92/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/white2021-flowkit/run1/home/sessions/20261012-010859-cc92/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 12) | pass 290172 via tolerance (n4, claim check 80) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 33) | pass 133670 via tolerance (n4, claim check 80) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 33) | pass 133860 via tolerance (n3, claim check 80) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 33) | pass 82484 via tolerance (n4, claim check 80) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 33) | pass 82636 via tolerance (n3, claim check 80) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 33) | pass 47165 via tolerance (n4, claim check 80) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 33) | pass 47241 via tolerance (n3, claim check 80) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 33) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 48) | pass 135381 via tolerance (n4, claim check 80) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 48) | pass 85369 via tolerance (n4, claim check 80) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 48) | pass 47694 via tolerance (n4, claim check 80) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 48) | not asked |

### white2021-flowkit | claude:claude-haiku-5-5 | run 2

Status: answer. 98 s. 5 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-011047-0763. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/white2021-flowkit/run2/home/sessions/20261012-011047-0763/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/white2021-flowkit/run2/home/sessions/20261012-011047-0763/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 12) | pass 290172 via tolerance (n4, claim check 66) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 33) | pass 133670 via tolerance (n4, claim check 66) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 33) | pass 133860 via tolerance (n3, claim check 66) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 33) | pass 82484 via tolerance (n4, claim check 66) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 33) | pass 82636 via tolerance (n3, claim check 66) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 33) | pass 47165 via tolerance (n4, claim check 66) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 33) | pass 47241 via tolerance (n3, claim check 66) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 33) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 43) | FAIL 133860 (n3, claim check 66) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 43) | pass 85369 via tolerance (n4, claim check 66) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 43) | FAIL 47241 (n3, claim check 66) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 43) | not asked |

### white2021-flowkit | claude:claude-haiku-5-5 | run 3

Status: answer. 136 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011226-c1fc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/white2021-flowkit/run3/home/sessions/20261012-011226-c1fc/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/white2021-flowkit/run3/home/sessions/20261012-011226-c1fc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 12) | pass 290172 via tolerance (n4, claim check 85) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 31) | pass 133670 via tolerance (n4, claim check 85) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 31) | pass 133860 via tolerance (n3, claim check 85) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 31) | pass 82484 via tolerance (n4, claim check 85) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 31) | pass 82636 via tolerance (n3, claim check 85) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 31) | pass 47165 via tolerance (n4, claim check 85) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 31) | pass 47241 via tolerance (n3, claim check 85) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 31) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 46) | pass 135381 via tolerance (n4, claim check 85) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 46) | pass 85369 via tolerance (n4, claim check 85) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 46) | pass 47694 via tolerance (n4, claim check 85) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 46) | not asked |

