# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 51/57 | 46/51 | 4 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| wang2023-cuproptosis-oa | 14/14 / 13/13 |
| klindworth2013-16s-primers | 11/12 / 11/11 |
| chure2024-hplc-py | 7/12 / 7/11 |
| oreshkova2024-qmp-honeybee | 19/19 / 15/16 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 4 | 501 | 45 | 120 | 57296 | 1677096 | 51 | 6 | 0 | 2 | 4 | 15 | 19 | 7 | 6 | 7 | 7 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.07 for 4 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 4 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 2 | 1 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 2 | 0 | 0 |

## Details

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 1

Status: answer. 75 s. 4 requests, 2 tool calls (2 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261008-235155-7a8d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261008-235155-7a8d/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261008-235155-7a8d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 50) | pass 3 via tolerance (n4, claim check 70) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 50) | pass 1578 via tolerance (n4, claim check 70) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 50) | pass 0.0018454 via tolerance (n4, claim check 70) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 50) | pass 0.11187 via tolerance (n4, claim check 70) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 50) | pass 35.09 via rounding (n4, claim check 70) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 50) | pass 24 via tolerance (n4, claim check 70) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 50) | pass 0.0047917 via tolerance (n4, claim check 70) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 50) | pass 30 via tolerance (n4, claim check 70) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 50) | pass 0.005987 via tolerance (n4, claim check 70) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 50) | pass 649 via tolerance (n4, claim check 70) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 50) | pass 0.0060398 via tolerance (n4, claim check 70) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 50) | pass 37 via tolerance (n4, claim check 70) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 50) | pass 0.00738 via tolerance (n4, claim check 70) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 11) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 1

Status: answer. 66 s. 4 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261008-235310-8e4b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261008-235310-8e4b/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261008-235310-8e4b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n3 metrics.n_products, entry 25) | pass 1 via tolerance (n6, claim check 85) |
| pair1_start | 1608 exact | pass 1608 (n3 metrics.start_1based, entry 25) | pass 1608 via tolerance (n3, claim check 85) |
| pair1_end | 2072 exact | pass 2072 (n3 metrics.end_1based, entry 25) | pass 2072 via tolerance (n3, claim check 85) |
| pair1_length | 465 exact | pass 465 (n3 metrics.product_bp, entry 25) | pass 465 via tolerance (n7, claim check 85) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_fwd_gene_pos, entry 61) | pass 341 via tolerance (n7, claim check 85) |
| pair2_products | 1 exact | pass 1 (n3 metrics.n_products, entry 25) | pass 1 via tolerance (n6, claim check 85) |
| pair2_start | 1275 exact | pass 1275 (n4 metrics.start_1based, entry 28) | pass 1275 via tolerance (n4, claim check 85) |
| pair2_end | 2193 exact | pass 2193 (n4 metrics.end_1based, entry 28) | pass 2193 via tolerance (n4, claim check 85) |
| pair2_length | 919 exact | pass 919 (n4 metrics.product_bp, entry 28) | pass 919 via tolerance (n7, claim check 85) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_fwd_gene_pos, entry 61) | pass 8 via tolerance (n7, claim check 85) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 58) | pass 61.39 via tolerance (n6, claim check 85) |
| pair1_coordinate_difference | 464 exact | FAIL 465 (n3 metrics.product_bp, entry 25) | not asked |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 1

Status: answer. 172 s. 22 requests, 25 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261008-235416-6b36. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261008-235416-6b36/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261008-235416-6b36/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 45) | pass 6 via tolerance (n24, claim check 239) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 45) | pass 10.9 via tolerance (n6, claim check 239) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 45) | pass 2805655 via tolerance (n2, claim check 239) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n6 table.rows[0][3], entry 45) | pass 23380.46 via tolerance (n2, claim check 239) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 45) | pass 0.15876 via tolerance (n6, claim check 239) |
| peak1_skew | 0.7 ±0.005 | FAIL 0.6917996 (n6 table.rows[0][5], entry 45) | FAIL 0.6918 (n2, claim check 239) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 45) | pass 14.45 via tolerance (n6, claim check 239) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 45) | not asked |
| calibration_slope | 156586.74 ±160 | FAIL 154699.7 (n24 metrics.slope, entry 198) | FAIL 154699.7 (n24, claim check 239) |
| calibration_intercept | 14624.94 ±150 | FAIL 15061.84 (n6 table.rows[3][3], entry 45) | FAIL 23380.46 (n2, claim check 239) |
| calibration_r_squared | 0.99887 ±0.00005 | FAIL 1 (n1 table.rows[12][1], entry 13) | FAIL 0.993645 (n24, claim check 239) |
| unknown_concentration | 1.8994 ±0.005 | FAIL 1.935276 (n25 metrics.mean_concentration, entry 206) | pass 1.9 via tolerance (n2, claim check 239) |

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 1

Status: answer. 189 s. 15 requests, 19 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261008-235708-3be9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261008-235708-3be9/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261008-235708-3be9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n12 stdout, entry 146) | pass 35.69 via rounding (n6, claim check 169) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 63) | pass 0.032 via tolerance (n6, claim check 169) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n12 stdout, entry 146) | pass 36 via tolerance (n12, claim check 169) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 63) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.85959 (n12 stdout, entry 146) | pass 0.86 via rounding (n12, claim check 169) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 63) | pass 1.06 via rounding (n4, claim check 169) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.80851 (n12 stdout, entry 146) | pass 2.81 via tolerance (n12, claim check 169) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 63) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n9 metrics.F_Age, entry 86) | pass 27.78 via tolerance (n9, claim check 169) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n9 metrics.F_Treatment, entry 86) | pass 29.16 via rounding (n9, claim check 169) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n9 metrics.F_Replicate, entry 86) | pass 6.85 via rounding (n9, claim check 169) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n9 metrics.p_Replicate, entry 86) | FAIL 0.002 (n9, claim check 169) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n9 metrics.F_Age_x_Treatment_x_Replicate, entry 86) | pass 4.46 via rounding (n9, claim check 169) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n9 metrics.p_Age_x_Treatment_x_Replicate, entry 86) | pass 0.016 via rounding (n9, claim check 169) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n10 metrics.H, entry 98) | pass 9.35 via rounding (n10, claim check 169) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 11) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n10 metrics.p_value, entry 98) | pass 0.025 via rounding (n10, claim check 169) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n10 metrics.min_p_adjusted, entry 98) | pass 0.04 via rounding (n8, claim check 169) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n11 metrics.H, entry 101) | pass 23.87 via tolerance (n11, claim check 169) |

