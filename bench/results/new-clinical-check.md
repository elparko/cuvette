# Paper benchmark 2026-10-08

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 50/56 | 26/43 | 3 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| kasurinen2018-mmp14-gastric | 19/25 / 0/17 |
| sriphoosanaphan2021-vitd-hcv | 21/21 / 19/19 |
| andreasson2019-endotoxin-health | 10/10 / 7/7 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 3 | 1936 | 29 | 321490 | 7362 | 0 | 20 | 6 | 3 | 0 | 2 | 0 | 5 | 19 | 3 | 9 | 9 |

## Leak check

No run has a leak check.

## Details

### kasurinen2018-mmp14-gastric | ollama:qwen3:8b | run 1

Status: answer. 378 s. 10 requests, 6 tool calls (3 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-174234-21d7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/kasurinen2018-mmp14-gastric/run1/home/sessions/20261008-174234-21d7/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 8) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 14) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n2 table.rows[0][4], entry 14) | FAIL - |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n2 table.rows[1][4], entry 14) | FAIL - |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 14) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 14) | FAIL - |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n4 metrics.hr_mmp14_high, entry 45) | FAIL - |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n4 table.rows[0][5], entry 45) | FAIL - |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n4 table.rows[0][6], entry 45) | FAIL - |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n4 metrics.p_mmp14_high, entry 45) | FAIL - |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n5 metrics.hr_mmp14_high, entry 56) | FAIL - |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n5 table.rows[0][5], entry 56) | FAIL - |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n5 table.rows[0][6], entry 56) | FAIL - |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n5 metrics.p_mmp14_high, entry 56) | FAIL - |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n5 metrics.hr_age_ge67, entry 56) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n5 metrics.hr_stage2, entry 56) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n5 metrics.hr_stage3, entry 56) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n5 metrics.hr_stage4, entry 56) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n5 metrics.hr_diffuse, entry 56) | not asked |
| hr_intestinal | 3.542 ±0.005 | FAIL 3.598528 (n5 table.rows[1][6], entry 56) | FAIL - |
| hr_intestinal_ci_lo | 1.507 ±0.005 | FAIL 1.501023 (n5 table.rows[5][5], entry 56) | FAIL - |
| hr_intestinal_ci_hi | 8.329 ±0.02 | FAIL 7.976084 (n5 table.rows[3][5], entry 56) | FAIL - |
| p_intestinal | 0.00374 ±0.0005 | FAIL 0.001672369 (n4 metrics.p_mmp14_high, entry 45) | FAIL - |
| hr_diffuse_type | 1.5355 ±0.005 | FAIL 1.548716 (n5 metrics.hr_mmp14_high, entry 56) | FAIL - |
| p_diffuse_type | 0.0711 ±0.001 | FAIL 0.05 (n4 data.data.alpha, entry 45) | FAIL - |

### sriphoosanaphan2021-vitd-hcv | ollama:qwen3:8b | run 1

Status: answer. 724 s. 9 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-174853-c425. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261008-174853-c425/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n2 metrics.n_b, entry 27) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 27) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 27) | pass 23.09 via tolerance (n2, claim check 77) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 27) | pass 19.73 via tolerance (n2, claim check 77) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 27) | pass 26.44 via tolerance (n2, claim check 77) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 34) | pass -0.5543 via tolerance (n3, claim check 77) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 34) | pass -2.84 via tolerance (n3, claim check 77) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 34) | pass 1.73 via tolerance (n3, claim check 77) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 34) | pass 0.6302 via tolerance (n3, claim check 77) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 41) | pass -5.51 via tolerance (n4, claim check 77) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 41) | pass -26.36 via tolerance (n4, claim check 77) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 41) | pass 15.34 via tolerance (n4, claim check 77) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 41) | pass 0.6 via tolerance (n4, claim check 77) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 48) | pass 122.9 via tolerance (n5, claim check 77) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n5 metrics.ci_lo, entry 48) | pass -68.96 via tolerance (n5, claim check 77) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 48) | pass 314.81 via tolerance (n5, claim check 77) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 48) | pass 0.2058 via tolerance (n5, claim check 77) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 55) | pass -0.1104 via tolerance (n6, claim check 77) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 55) | pass -2.37 via tolerance (n6, claim check 77) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 55) | pass 2.15 via tolerance (n6, claim check 77) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 55) | pass 0.9228 via tolerance (n6, claim check 77) |

### andreasson2019-endotoxin-health | ollama:qwen3:8b | run 1

Status: answer. 834 s. 10 requests, 7 tool calls (2 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261008-180057-ae49. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/andreasson2019-endotoxin-health/run1/home/sessions/20261008-180057-ae49/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n5 metrics.n, entry 56) | not asked |
| n_subjects | 52 exact | pass 52 (n5 metrics.n_groups, entry 56) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n5 metrics.coef_Intercept, entry 56) | pass 6.238 via tolerance (n5, claim check 103) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n5 metrics.coef_C_lps_T_1, entry 56) | pass 0.02 via tolerance (n2, claim check 103) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n5 metrics.coef_C_time_T_2, entry 56) | pass -0.619 via tolerance (n5, claim check 103) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n5 metrics.coef_C_time_T_3, entry 56) | pass -0.218 via tolerance (n5, claim check 103) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n5 metrics.coef_C_lps_T_1_C_time_T_2, entry 56) | pass -1.786 via tolerance (n5, claim check 103) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n5 metrics.coef_C_lps_T_1_C_time_T_3, entry 56) | pass -0.906 via tolerance (n5, claim check 103) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n5 metrics.se_C_lps_T_1_C_time_T_2, entry 56) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n4 metrics.p_value, entry 40) | pass 0.0042 via tolerance (n4, claim check 103) |

