# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 57/57 | 46/48 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| oreshkova2024-qmp-honeybee | 57/57 / 46/48 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 529 | 38 | 100 | 66221 | 1210657 | 46 | 0 | 0 | 3 | 3 | 11 | 24 | 14 | 5 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.06 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 4 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 3 | on | 7 | 0 | 0 | 1 | 0 |

## Details

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 1

Status: answer. 161 s. 11 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-031105-27f3. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/oreshkova2024-qmp-honeybee/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261012-031105-27f3/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/oreshkova2024-qmp-honeybee/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261012-031105-27f3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 54) | pass 35.69 via rounding (n6, claim check 148) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 54) | pass 0.032 via tolerance (n6, claim check 148) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 54) | pass 36 via tolerance (n5, claim check 148) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 54) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 54) | pass 0.86 via rounding (n5, claim check 148) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 54) | pass 1.057 via tolerance (n4, claim check 148) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 54) | pass 2.809 via tolerance (n6, claim check 148) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 54) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 58) | pass 27.78 via tolerance (n7, claim check 148) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 58) | pass 29.16 via rounding (n7, claim check 148) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 58) | pass 6.853 via tolerance (n7, claim check 148) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 58) | FAIL 0.002 (n12, claim check 148) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 58) | pass 4.457 via tolerance (n7, claim check 148) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01568 (n12 stdout, entry 89) | pass 0.016 via rounding (n12, claim check 148) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n8 metrics.H, entry 65) | pass 9.35 via rounding (n8, claim check 148) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 12) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n8 metrics.p_value, entry 65) | pass 0.025 via rounding (n8, claim check 148) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n8 metrics.min_p_adjusted, entry 65) | pass 0.04 via rounding (n6, claim check 148) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n9 metrics.H, entry 68) | pass 23.87 via tolerance (n9, claim check 148) |

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 2

Status: answer. 146 s. 11 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 4 unsourced.
Session: 20261012-031347-240c. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/oreshkova2024-qmp-honeybee/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261012-031347-240c/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/oreshkova2024-qmp-honeybee/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261012-031347-240c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 52) | pass 35.69 via rounding (n6, claim check 140) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 52) | pass 0.032 via tolerance (n6, claim check 140) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 52) | pass 36 via tolerance (n5, claim check 140) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 52) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 52) | pass 0.86 via rounding (n5, claim check 140) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 52) | pass 1.057 via tolerance (n4, claim check 140) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 52) | pass 2.809 via tolerance (n6, claim check 140) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 52) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 55) | pass 27.78 via tolerance (n7, claim check 140) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 55) | pass 29.16 via rounding (n7, claim check 140) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 55) | pass 6.853 via tolerance (n7, claim check 140) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 55) | FAIL 0.002 (n10, claim check 140) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 55) | pass 4.457 via tolerance (n7, claim check 140) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n7 metrics.p_Age_x_Treatment_x_Replicate, entry 55) | pass 0.016 via rounding (n10, claim check 140) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n8 metrics.H, entry 67) | pass 9.35 via rounding (n8, claim check 140) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 12) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n8 metrics.p_value, entry 67) | pass 0.025 via rounding (n8, claim check 140) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n8 metrics.min_p_adjusted, entry 67) | pass 0.04 via rounding (n6, claim check 140) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n9 metrics.H, entry 70) | pass 23.87 via tolerance (n9, claim check 140) |

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 3

Status: answer. 221 s. 16 requests, 17 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261012-031613-96af. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/oreshkova2024-qmp-honeybee/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261012-031613-96af/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/oreshkova2024-qmp-honeybee/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261012-031613-96af/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 58) | pass 35.69 via rounding (n6, claim check 176) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 58) | pass 0.032 via tolerance (n6, claim check 176) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 58) | pass 36 via tolerance (n5, claim check 176) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 58) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 58) | pass 0.86 via rounding (n5, claim check 176) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 58) | pass 1.057 via tolerance (n4, claim check 176) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 58) | pass 2.809 via tolerance (n6, claim check 176) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 58) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 67) | pass 27.78 via tolerance (n7, claim check 176) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 67) | pass 29.16 via rounding (n7, claim check 176) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 67) | pass 6.853 via tolerance (n7, claim check 176) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 67) | pass 0.0021 via tolerance (n10, claim check 176) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 67) | pass 4.457 via tolerance (n7, claim check 176) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n7 metrics.p_Age_x_Treatment_x_Replicate, entry 67) | pass 0.0157 via rounding (n10, claim check 176) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n8 metrics.H, entry 79) | pass 9.35 via rounding (n8, claim check 176) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 12) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n8 metrics.p_value, entry 79) | pass 0.025 via rounding (n10, claim check 176) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n8 metrics.min_p_adjusted, entry 79) | pass 0.0397 via tolerance (n8, claim check 176) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n9 metrics.H, entry 82) | pass 23.87 via tolerance (n9, claim check 176) |

