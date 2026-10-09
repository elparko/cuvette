# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 275/276 | 216/222 | 21 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| liao2025-scanpy-bone-marrow | 14/15 / 11/12 |
| manders1993-coloc | 18/18 / 15/15 |
| oreshkova2024-qmp-honeybee | 57/57 / 43/48 |
| rossi1980-recidivism | 33/33 / 12/12 |
| schramm2012-imzml-pyimzml | 21/21 / 12/12 |
| wang2023-cuproptosis-oa | 42/42 / 39/39 |
| yun2026-lasv-elisa | 90/90 / 84/84 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 21 | 2735 | 213 | 550 | 271161 | 4919355 | 238 | 19 | 4 | 10 | 18 | 69 | 103 | 40 | 16 | 29 | 29 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.28 for 21 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | 1 | on | 11 | 0 | 0 | 2 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | 2 | on | 9 | 0 | 0 | 0 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | 3 | on | 8 | 0 | 0 | 2 | 0 |
| manders1993-coloc | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 1 | on | 7 | 1 | 2 | 0 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 2 | 0 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 6 | 0 |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 1 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 1 | 4 | 0 |
| yun2026-lasv-elisa | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 1 | 2 | 0 |

Paths outside the allow list:
- oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 1: /

## Details

### liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | run 1

Status: answer. 203 s. 14 requests, 19 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-071104-6f07. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261009-071104-6f07/log.jsonl
Leak check: 11 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261009-071104-6f07/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 14) | pass 10608 via tolerance (n12, claim check 157) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 17) | pass 10046 via tolerance (n12, claim check 157) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 79) | pass 9612 via tolerance (n8, claim check 157) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 87) | pass 8887 via tolerance (n9, claim check 157) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 14) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | run 2

Status: answer. 141 s. 13 requests, 20 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071433-f83c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261009-071433-f83c/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261009-071433-f83c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 14) | pass 10608 via tolerance (n11, claim check 155) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 17) | pass 10046 via tolerance (n11, claim check 155) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 96) | pass 9612 via tolerance (n11, claim check 155) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 104) | pass 8887 via tolerance (n11, claim check 155) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 14) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | run 3

Status: answer. 157 s. 17 requests, 16 tool calls (2 failed), 3 nudges, 1 plan reminders, 2 unsourced.
Session: 20261009-071659-414e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261009-071659-414e/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261009-071659-414e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 14) | pass 10608 via tolerance (n8, claim check 165) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 17) | pass 10046 via tolerance (n7, claim check 165) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 90) | pass 9612 via tolerance (n8, claim check 165) |
| chase_cells_after_qc | 8887 exact | FAIL 8330 (n6 metrics.max_genes_per_cell, entry 55) | FAIL 9612 (n8, claim check 165) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 14) | not asked |

### manders1993-coloc | claude:claude-haiku-5-5 | run 1

Status: answer. 84 s. 10 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-071938-6641. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/manders1993-coloc/run1/home/sessions/20261009-071938-6641/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/manders1993-coloc/run1/home/sessions/20261009-071938-6641/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 48) | pass 0.721 via tolerance (n5, claim check 112) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 64) | pass 0.443 via tolerance (n6, claim check 112) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 68) | pass 0.1639 via tolerance (n7, claim check 112) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 48) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 64) | pass 0.5 via tolerance (n6, claim check 112) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 68) | pass 0.25 via tolerance (n7, claim check 112) |

### manders1993-coloc | claude:claude-haiku-5-5 | run 2

Status: answer. 55 s. 5 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072103-8051. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/manders1993-coloc/run2/home/sessions/20261009-072103-8051/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/manders1993-coloc/run2/home/sessions/20261009-072103-8051/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 38) | pass 0.721 via tolerance (n5, claim check 78) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 42) | pass 0.443 via tolerance (n6, claim check 78) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 46) | pass 0.164 via tolerance (n7, claim check 78) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 38) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 42) | pass 0.5 via tolerance (n6, claim check 78) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 46) | pass 0.25 via tolerance (n7, claim check 78) |

### manders1993-coloc | claude:claude-haiku-5-5 | run 3

Status: answer. 71 s. 5 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072158-0dda. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/manders1993-coloc/run3/home/sessions/20261009-072158-0dda/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/manders1993-coloc/run3/home/sessions/20261009-072158-0dda/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 40) | pass 0.721 via tolerance (n8, claim check 85) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 44) | pass 0.443 via tolerance (n9, claim check 85) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 48) | pass 0.164 via tolerance (n10, claim check 85) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 40) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 44) | pass 0.5 via tolerance (n9, claim check 85) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 48) | pass 0.25 via tolerance (n10, claim check 85) |

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 1

Status: answer. 236 s. 16 requests, 22 tool calls (3 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-072310-f807. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261009-072310-f807/log.jsonl
Leak check: 7 paths read, 1 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261009-072310-f807/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 63) | pass 35.69 via rounding (n14, claim check 200) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 63) | pass 0.032 via tolerance (n14, claim check 200) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 63) | pass 36 via tolerance (n16, claim check 200) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 63) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 63) | pass 0.8596 via tolerance (n16, claim check 200) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 63) | pass 1.057 via tolerance (n15, claim check 200) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 63) | pass 2.809 via tolerance (n14, claim check 200) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 63) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 67) | pass 27.78 via tolerance (n7, claim check 200) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 67) | pass 29.16 via rounding (n7, claim check 200) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 67) | pass 6.853 via tolerance (n7, claim check 200) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 67) | pass 0.0021 via tolerance (n7, claim check 200) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 67) | pass 4.457 via tolerance (n7, claim check 200) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n7 metrics.p_Age_x_Treatment_x_Replicate, entry 67) | pass 0.0157 via rounding (n7, claim check 200) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n10 metrics.H, entry 86) | pass 9.35 via rounding (n10, claim check 200) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 11) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n10 metrics.p_value, entry 86) | pass 0.025 via rounding (n10, claim check 200) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n10 metrics.min_p_adjusted, entry 86) | pass 0.0397 via tolerance (n10, claim check 200) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n11 metrics.H, entry 89) | pass 23.87 via tolerance (n11, claim check 200) |

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 2

Status: answer. 209 s. 18 requests, 22 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-072706-7a58. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261009-072706-7a58/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261009-072706-7a58/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n8 metrics.F_age, entry 81) | pass 35.69 via rounding (n8, claim check 195) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n8 metrics.F_treatment, entry 81) | pass 0.03156 via tolerance (n7, claim check 195) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n8 metrics.F_replicate, entry 81) | pass 36 via tolerance (n7, claim check 195) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n8 metrics.p_age, entry 81) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n8 metrics.p_treatment, entry 81) | pass 0.8596 via tolerance (n7, claim check 195) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n8 metrics.F_age_x_treatment, entry 81) | pass 1.057 via tolerance (n6, claim check 195) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n8 metrics.F_age_x_replicate, entry 81) | pass 2.809 via tolerance (n8, claim check 195) |
| protein_df_residual | 60 exact | pass 60 (n8 metrics.df_residual, entry 81) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n11 metrics.F_Age, entry 103) | pass 27.78 via tolerance (n11, claim check 195) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n11 metrics.F_Treatment, entry 103) | pass 29.16 via rounding (n11, claim check 195) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n11 metrics.F_Replicate, entry 103) | pass 6.853 via tolerance (n11, claim check 195) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n11 metrics.p_Replicate, entry 103) | pass 0.0021 via tolerance (n11, claim check 195) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n11 metrics.F_Age_x_Treatment_x_Replicate, entry 103) | pass 4.457 via tolerance (n11, claim check 195) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n11 metrics.p_Age_x_Treatment_x_Replicate, entry 103) | pass 0.0157 via rounding (n11, claim check 195) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n12 metrics.H, entry 115) | pass 9.35 via rounding (n12, claim check 195) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 11) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n12 metrics.p_value, entry 115) | pass 0.025 via rounding (n12, claim check 195) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n12 metrics.min_p_adjusted, entry 115) | pass 0.0397 via tolerance (n12, claim check 195) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n13 metrics.H, entry 118) | pass 23.87 via tolerance (n13, claim check 195) |

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 3

Status: answer. 195 s. 14 requests, 18 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073036-4455. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261009-073036-4455/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261009-073036-4455/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 59) | pass 35.69 via rounding (n12, claim check 168) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 59) | pass 0.0316 via tolerance (n12, claim check 168) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 59) | pass 36 via tolerance (n5, claim check 168) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 59) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 59) | pass 0.8596 via tolerance (n5, claim check 168) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 59) | pass 1.057 via tolerance (n4, claim check 168) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 59) | pass 2.809 via tolerance (n12, claim check 168) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 59) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 68) | FAIL 26.78 (n11, claim check 168) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 68) | FAIL 26.78 (n11, claim check 168) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 68) | FAIL 6.012 (n11, claim check 168) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 68) | FAIL 0.0000708 (n9, claim check 168) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 68) | FAIL 4.235 (n9, claim check 168) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n7 metrics.p_Age_x_Treatment_x_Replicate, entry 68) | pass 0.01568 via tolerance (n7, claim check 168) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n8 metrics.H, entry 80) | pass 9.35 via rounding (n8, claim check 168) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 11) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n8 metrics.p_value, entry 80) | pass 0.02498 via tolerance (n8, claim check 168) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n8 metrics.min_p_adjusted, entry 80) | pass 0.0397 via tolerance (n8, claim check 168) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n9 metrics.H, entry 83) | pass 23.87 via tolerance (n9, claim check 168) |

### rossi1980-recidivism | claude:claude-haiku-5-5 | run 1

Status: answer. 123 s. 13 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-073352-4bec. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rossi1980-recidivism/run1/home/sessions/20261009-073352-4bec/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rossi1980-recidivism/run1/home/sessions/20261009-073352-4bec/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 11) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 32) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 53) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 53) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 53) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n3 metrics.hr_fin, entry 53) | pass 0.684 via tolerance (n4, claim check 134) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 53) | pass 0.0474 via tolerance (n4, claim check 134) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 53) | pass 0.64 via tolerance (n4, claim check 134) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 32) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 32) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 53) | pass 0.000714 via tolerance (n4, claim check 134) |

### rossi1980-recidivism | claude:claude-haiku-5-5 | run 2

Status: answer. 69 s. 11 requests, 9 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-073555-6d07. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rossi1980-recidivism/run2/home/sessions/20261009-073555-6d07/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rossi1980-recidivism/run2/home/sessions/20261009-073555-6d07/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 11) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 47) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n2 metrics.coef_fin, entry 47) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n2 metrics.coef_age, entry 47) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n2 metrics.coef_prio, entry 47) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n2 metrics.hr_fin, entry 47) | pass 0.684 via tolerance (n2, claim check 101) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n2 metrics.p_fin, entry 47) | pass 0.0474 via tolerance (n2, claim check 101) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n2 metrics.concordance, entry 47) | pass 0.64 via tolerance (n2, claim check 101) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n3 metrics.logrank_chi2, entry 55) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n3 metrics.logrank_p, entry 55) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n2 metrics.ph_test_min_p, entry 47) | pass 0.00071 via tolerance (n2, claim check 101) |

### rossi1980-recidivism | claude:claude-haiku-5-5 | run 3

Status: answer. 68 s. 10 requests, 8 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-073704-ae7c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rossi1980-recidivism/run3/home/sessions/20261009-073704-ae7c/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rossi1980-recidivism/run3/home/sessions/20261009-073704-ae7c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 11) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 48) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n2 metrics.coef_fin, entry 48) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n2 metrics.coef_age, entry 48) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n2 metrics.coef_prio, entry 48) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n2 metrics.hr_fin, entry 48) | pass 0.684 via tolerance (n2, claim check 97) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n2 metrics.p_fin, entry 48) | pass 0.0474 via tolerance (n2, claim check 97) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n2 metrics.concordance, entry 48) | pass 0.64 via tolerance (n2, claim check 97) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n3 metrics.logrank_chi2, entry 56) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n3 metrics.logrank_p, entry 56) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n2 metrics.ph_test_min_p, entry 48) | pass 0.00071 via tolerance (n2, claim check 97) |

### schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | run 1

Status: answer. 60 s. 7 requests, 6 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073812-2dd5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261009-073812-2dd5/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261009-073812-2dd5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 11) | pass 9 via tolerance (n4, claim check 64) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 11) | pass 100.083 via rounding (n2, claim check 64) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 11) | pass 799.917 via rounding (n2, claim check 64) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 22) | pass 243.54 via tolerance (n3, claim check 64) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 22) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 11) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 14) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | run 2

Status: answer. 51 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073915-b7f7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261009-073915-b7f7/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261009-073915-b7f7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 11) | pass 9 via tolerance (n4, claim check 52) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 11) | pass 100.0833 via tolerance (n2, claim check 52) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 11) | pass 799.9167 via tolerance (n2, claim check 52) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n4 metrics.tic_max, entry 25) | pass 243.54 via tolerance (n4, claim check 52) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n4 metrics.tic_mean, entry 25) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 11) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 14) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | run 3

Status: answer. 54 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074005-ee21. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261009-074005-ee21/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261009-074005-ee21/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 11) | pass 9 via tolerance (n4, claim check 56) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 11) | pass 100.0833 via tolerance (n2, claim check 56) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 11) | pass 799.9167 via tolerance (n2, claim check 56) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 22) | pass 243.54 via tolerance (n3, claim check 56) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 22) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 11) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 14) | not asked |

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 1

Status: answer. 86 s. 6 requests, 4 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-074100-5aab. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261009-074100-5aab/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261009-074100-5aab/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 53) | pass 3 via tolerance (n4, claim check 84) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 53) | pass 1578 via tolerance (n4, claim check 84) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 53) | pass 0.001845384 via tolerance (n4, claim check 84) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 53) | pass 0.1118672 via tolerance (n4, claim check 84) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 53) | pass 35.08762 via tolerance (n4, claim check 84) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 53) | pass 24 via tolerance (n4, claim check 84) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 53) | pass 0.004791726 via tolerance (n4, claim check 84) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 53) | pass 30 via tolerance (n4, claim check 84) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 53) | pass 0.005986962 via tolerance (n4, claim check 84) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 53) | pass 649 via tolerance (n4, claim check 84) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 53) | pass 0.006039754 via tolerance (n4, claim check 84) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 53) | pass 37 via tolerance (n4, claim check 84) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 53) | pass 0.007380042 via tolerance (n4, claim check 84) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 11) | not asked |

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 2

Status: answer. 99 s. 5 requests, 3 tool calls (2 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-074226-263e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261009-074226-263e/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261009-074226-263e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 50) | pass 3 via tolerance (n4, claim check 79) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 50) | pass 1578 via tolerance (n4, claim check 79) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 50) | pass 0.001845384 via tolerance (n4, claim check 79) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 50) | pass 0.1118672 via tolerance (n4, claim check 79) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 50) | pass 35.08762 via tolerance (n4, claim check 79) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 50) | pass 24 via tolerance (n4, claim check 79) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 50) | pass 0.004791726 via tolerance (n4, claim check 79) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 50) | pass 30 via tolerance (n4, claim check 79) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 50) | pass 0.005986962 via tolerance (n4, claim check 79) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 50) | pass 649 via tolerance (n4, claim check 79) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 50) | pass 0.006039754 via tolerance (n4, claim check 79) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 50) | pass 37 via tolerance (n4, claim check 79) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 50) | pass 0.007380042 via tolerance (n4, claim check 79) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 11) | not asked |

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 3

Status: answer. 85 s. 5 requests, 4 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074406-7cda. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261009-074406-7cda/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261009-074406-7cda/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 52) | pass 3 via tolerance (n4, claim check 83) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 52) | pass 1578 via tolerance (n4, claim check 83) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 52) | pass 0.001845384 via tolerance (n4, claim check 83) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 52) | pass 0.1118672 via tolerance (n4, claim check 83) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 52) | pass 35.08762 via tolerance (n4, claim check 83) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 52) | pass 24 via tolerance (n4, claim check 83) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 52) | pass 0.004791726 via tolerance (n4, claim check 83) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 52) | pass 30 via tolerance (n4, claim check 83) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 52) | pass 0.005986962 via tolerance (n4, claim check 83) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 52) | pass 649 via tolerance (n4, claim check 83) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 52) | pass 0.006039754 via tolerance (n4, claim check 83) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 52) | pass 37 via tolerance (n4, claim check 83) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 52) | pass 0.007380042 via tolerance (n4, claim check 83) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 11) | not asked |

### yun2026-lasv-elisa | claude:claude-haiku-5-5 | run 1

Status: answer. 185 s. 12 requests, 10 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-074531-1302. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/yun2026-lasv-elisa/run1/home/sessions/20261009-074531-1302/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/yun2026-lasv-elisa/run1/home/sessions/20261009-074531-1302/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n4 metrics.n_plates, entry 77) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n4 metrics.mean_conc_STD_1, entry 77) | pass 7.587 via tolerance (n5, claim check 139) |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n4 metrics.mean_conc_STD_2, entry 77) | pass 3.707 via tolerance (n5, claim check 139) |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n5 stdout, entry 86) | pass 1.872 via tolerance (n5, claim check 139) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n5 stdout, entry 86) | pass 0.917 via tolerance (n5, claim check 139) |
| conc_d5 | 0.46371 ±0.001 | pass 0.463713 (n5 stdout, entry 86) | pass 0.464 via tolerance (n2, claim check 139) |
| conc_d6 | 0.2334 ±0.001 | pass 0.233402 (n5 stdout, entry 86) | pass 0.233 via tolerance (n5, claim check 139) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.120456 (n5 stdout, entry 86) | pass 0.12 via tolerance (n3, claim check 139) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.055794 (n5 stdout, entry 86) | pass 0.0558 via tolerance (n2, claim check 139) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.026613 (n5 stdout, entry 86) | pass 0.0266 via tolerance (n5, claim check 139) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.013885 (n5 stdout, entry 86) | pass 0.0139 via tolerance (n2, claim check 139) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07001 (n4 metrics.cv_conc_pct_STD_1, entry 77) | pass 11.07 via tolerance (n4, claim check 139) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n5 stdout, entry 86) | pass 10.93 via tolerance (n5, claim check 139) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n4 metrics.cv_conc_pct_STD_7, entry 77) | pass 15.71 via tolerance (n5, claim check 139) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n4 metrics.cv_conc_pct_STD_8, entry 77) | pass 15.55 via tolerance (n4, claim check 139) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n5 stdout, entry 86) | pass 25.89 via tolerance (n4, claim check 139) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n4 table.rows[9][6], entry 77) | pass 21.92 via tolerance (n4, claim check 139) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n4 table.rows[10][6], entry 77) | pass 26.62 via tolerance (n5, claim check 139) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.886722 (n5 stdout, entry 86) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97182 (n5 stdout, entry 86) | pass 97.97 via tolerance (n5, claim check 139) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n5 stdout, entry 86) | pass 94.74 via tolerance (n5, claim check 139) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n5 stdout, entry 86) | pass 99.55 via tolerance (n5, claim check 139) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71061 (n4 metrics.recovery_pct_STD_9, entry 77) | pass 88.71 via tolerance (n4, claim check 139) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n4 metrics.recovery_pct_STD_10, entry 77) | differs 92.56 (n4, claim check 139) |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n5 stdout, entry 86) | pass 1.993 via tolerance (n4, claim check 139) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n5 stdout, entry 86) | pass 22.45 via tolerance (n4, claim check 139) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n4 metrics.recovery_pct_HPC, entry 77) | pass 107.28 via tolerance (n4, claim check 139) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n4 metrics.mean_conc_LPC, entry 77) | pass 0.457 via tolerance (n4, claim check 139) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n4 metrics.recovery_pct_LPC, entry 77) | pass 98.25 via tolerance (n4, claim check 139) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.02798 (n5 stdout, entry 86) | differs 20.03 (n5, claim check 139) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n4 metrics.series_lloq_sample, entry 77) | pass 0.121 via tolerance (n5, claim check 139) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n4 metrics.series_uloq_sample, entry 77) | pass 7.744 via tolerance (n5, claim check 139) |

### yun2026-lasv-elisa | claude:claude-haiku-5-5 | run 2

Status: answer. 247 s. 12 requests, 10 tool calls (1 failed), 0 nudges, 1 plan reminders, 4 unsourced.
Session: 20261009-074836-ab38. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/yun2026-lasv-elisa/run2/home/sessions/20261009-074836-ab38/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/yun2026-lasv-elisa/run2/home/sessions/20261009-074836-ab38/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 68) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n3 metrics.mean_conc_STD_1, entry 68) | pass 7.587 via tolerance (n3, claim check 138) |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n3 metrics.mean_conc_STD_2, entry 68) | pass 3.707 via tolerance (n3, claim check 138) |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n3 metrics.mean_conc_STD_3, entry 68) | pass 1.872 via tolerance (n3, claim check 138) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n3 metrics.mean_conc_STD_4, entry 68) | pass 0.917 via tolerance (n3, claim check 138) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n3 metrics.mean_conc_STD_5, entry 68) | pass 0.4637 via tolerance (n3, claim check 138) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334023 (n3 metrics.mean_conc_STD_6, entry 68) | pass 0.2334 via tolerance (n3, claim check 138) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n3 metrics.mean_conc_STD_7, entry 68) | pass 0.1205 via tolerance (n1, claim check 138) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n3 metrics.mean_conc_STD_8, entry 68) | pass 0.05579 via tolerance (n3, claim check 138) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n3 metrics.mean_conc_STD_9, entry 68) | pass 0.02661 via tolerance (n3, claim check 138) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n3 metrics.mean_conc_STD_10, entry 68) | pass 0.01388 via tolerance (n2, claim check 138) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07 (n5 stdout, entry 114) | pass 11.07 via tolerance (n5, claim check 138) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.9268 (n5 stdout, entry 114) | pass 10.93 via tolerance (n5, claim check 138) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 68) | pass 15.71 via tolerance (n5, claim check 138) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 68) | pass 15.55 via tolerance (n3, claim check 138) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n3 metrics.cv_conc_pct_STD_9, entry 68) | pass 25.89 via tolerance (n5, claim check 138) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 68) | pass 21.92 via tolerance (n3, claim check 138) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.6206 (n5 stdout, entry 114) | pass 26.62 via tolerance (n4, claim check 138) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.886722 (n3 table.rows[3][5], entry 68) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.9718 (n5 stdout, entry 114) | pass 97.97 via tolerance (n5, claim check 138) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n3 metrics.recovery_pct_STD_4, entry 68) | pass 94.74 via tolerance (n3, claim check 138) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n3 metrics.recovery_pct_STD_7, entry 68) | pass 99.55 via tolerance (n3, claim check 138) |
| recovery_d9 | 88.71 ±0.06 | pass 88.7106 (n5 stdout, entry 114) | pass 88.71 via tolerance (n5, claim check 138) |
| recovery_d8_printed (reference) | 92 ±0.06 | match 91.99465 (n3 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/yun2026-lasv-elisa/run2/home/sessions/20261009-074836-ab38/work/fit_standard_curve-3/samples.csv, entry 68) | differs 92.56 (n3, claim check 138) |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n3 metrics.mean_conc_HPC, entry 68) | pass 1.993 via tolerance (n3, claim check 138) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n3 metrics.cv_conc_pct_HPC, entry 68) | pass 22.45 via tolerance (n3, claim check 138) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n3 metrics.recovery_pct_HPC, entry 68) | pass 107.28 via tolerance (n3, claim check 138) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 68) | pass 0.4569 via tolerance (n3, claim check 138) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n3 metrics.recovery_pct_LPC, entry 68) | pass 98.25 via tolerance (n3, claim check 138) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.02798 (n3 metrics.cv_conc_pct_LPC, entry 68) | match 20 via rounding (n2, claim check 138) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 68) | pass 0.121 via tolerance (n5, claim check 138) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 68) | pass 7.744 via tolerance (n5, claim check 138) |

### yun2026-lasv-elisa | claude:claude-haiku-5-5 | run 3

Status: answer. 256 s. 9 requests, 9 tool calls (2 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-075244-1b6b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/yun2026-lasv-elisa/run3/home/sessions/20261009-075244-1b6b/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/yun2026-lasv-elisa/run3/home/sessions/20261009-075244-1b6b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 65) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n3 metrics.mean_conc_STD_1, entry 65) | pass 7.5869 via tolerance (n5, claim check 129) |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n3 metrics.mean_conc_STD_2, entry 65) | pass 3.7072 via tolerance (n5, claim check 129) |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n3 metrics.mean_conc_STD_3, entry 65) | pass 1.8719 via tolerance (n5, claim check 129) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n3 metrics.mean_conc_STD_4, entry 65) | pass 0.9171 via tolerance (n5, claim check 129) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n3 metrics.mean_conc_STD_5, entry 65) | pass 0.4637 via tolerance (n5, claim check 129) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334023 (n3 metrics.mean_conc_STD_6, entry 65) | pass 0.2334 via tolerance (n5, claim check 129) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n3 metrics.mean_conc_STD_7, entry 65) | pass 0.1205 via tolerance (n1, claim check 129) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n3 metrics.mean_conc_STD_8, entry 65) | pass 0.05579 via tolerance (n5, claim check 129) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n3 metrics.mean_conc_STD_9, entry 65) | pass 0.02661 via tolerance (n5, claim check 129) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n3 metrics.mean_conc_STD_10, entry 65) | pass 0.01388 via tolerance (n2, claim check 129) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07001 (n3 metrics.cv_conc_pct_STD_1, entry 65) | pass 11.07 via tolerance (n5, claim check 129) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n3 metrics.cv_conc_pct_STD_4, entry 65) | pass 10.93 via tolerance (n5, claim check 129) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 65) | pass 15.71 via tolerance (n5, claim check 129) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 65) | pass 15.55 via tolerance (n5, claim check 129) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n3 metrics.cv_conc_pct_STD_9, entry 65) | pass 25.89 via tolerance (n5, claim check 129) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 65) | pass 21.92 via tolerance (n5, claim check 129) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.6206 (n4 stdout, entry 74) | pass 26.62 via tolerance (n5, claim check 129) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.8867 (n4 stdout, entry 74) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97182 (n3 metrics.recovery_pct_STD_1, entry 65) | pass 97.97 via tolerance (n5, claim check 129) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n3 metrics.recovery_pct_STD_4, entry 65) | pass 94.74 via tolerance (n5, claim check 129) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n3 metrics.recovery_pct_STD_7, entry 65) | pass 99.55 via tolerance (n5, claim check 129) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71061 (n3 metrics.recovery_pct_STD_9, entry 65) | pass 88.71 via tolerance (n5, claim check 129) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n3 metrics.recovery_pct_STD_10, entry 65) | differs 92.56 (n5, claim check 129) |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n3 metrics.mean_conc_HPC, entry 65) | pass 1.9932 via tolerance (n5, claim check 129) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n3 metrics.cv_conc_pct_HPC, entry 65) | pass 22.45 via tolerance (n5, claim check 129) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n3 metrics.recovery_pct_HPC, entry 65) | pass 107.28 via tolerance (n5, claim check 129) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 65) | pass 0.4569 via tolerance (n5, claim check 129) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n3 metrics.recovery_pct_LPC, entry 65) | pass 98.25 via tolerance (n5, claim check 129) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.02798 (n3 metrics.cv_conc_pct_LPC, entry 65) | match 20 via rounding (n2, claim check 129) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 65) | pass 0.121 via tolerance (n5, claim check 129) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 65) | pass 7.744 via tolerance (n5, claim check 129) |

