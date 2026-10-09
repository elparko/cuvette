# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 177/177 | 132/132 | 21 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| belenky2003-sleepstudy | 18/18 / 6/6 |
| delaney2004-esol | 18/18 / 12/12 |
| kanetis2022-iqtree-sporocadaceae | 9/9 / 6/6 |
| liao2025-scanpy-bone-marrow | 15/15 / 12/12 |
| nair2024-plasmid-growth | 60/60 / 51/51 |
| rost2016-openms | 15/15 / 6/6 |
| wang2023-cuproptosis-oa | 42/42 / 39/39 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 21 | 2784 | 179 | 464 | 126273 | 2975757 | 202 | 18 | 2 | 1 | 20 | 90 | 61 | 24 | 36 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $5.81 for 21 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| belenky2003-sleepstudy | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-opus-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| delaney2004-esol | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 1 | 1 | 0 |
| delaney2004-esol | claude:claude-opus-5-5 | 2 | on | 1 | 0 | 1 | 2 | 0 |
| delaney2004-esol | claude:claude-opus-5-5 | 3 | on | 1 | 0 | 1 | 2 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-opus-5-5 | 1 | on | 3 | 0 | 0 | 2 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 0 | 1 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-opus-5-5 | 3 | on | 3 | 0 | 0 | 7 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-opus-5-5 | 1 | on | 11 | 0 | 0 | 9 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-opus-5-5 | 2 | on | 9 | 0 | 0 | 6 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-opus-5-5 | 3 | on | 11 | 0 | 0 | 2 | 0 |
| nair2024-plasmid-growth | claude:claude-opus-5-5 | 1 | on | 6 | 0 | 2 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-opus-5-5 | 2 | on | 6 | 0 | 2 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-opus-5-5 | 3 | on | 7 | 0 | 2 | 0 | 0 |
| rost2016-openms | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |
| rost2016-openms | claude:claude-opus-5-5 | 2 | on | 1 | 0 | 0 | 2 | 0 |
| rost2016-openms | claude:claude-opus-5-5 | 3 | on | 1 | 0 | 0 | 1 | 0 |
| wang2023-cuproptosis-oa | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| wang2023-cuproptosis-oa | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| wang2023-cuproptosis-oa | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### belenky2003-sleepstudy | claude:claude-opus-5-5 | run 1

Status: answer. 68 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071104-30b8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/belenky2003-sleepstudy/run1/home/sessions/20261009-071104-30b8/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/belenky2003-sleepstudy/run1/home/sessions/20261009-071104-30b8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 31) | pass 10.47 via tolerance (n5, claim check 78) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 31) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 31) | pass 1.546 via tolerance (n3, claim check 78) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 31) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 31) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 31) | not asked |

### belenky2003-sleepstudy | claude:claude-opus-5-5 | run 2

Status: answer. 68 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071212-7732. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/belenky2003-sleepstudy/run2/home/sessions/20261009-071212-7732/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/belenky2003-sleepstudy/run2/home/sessions/20261009-071212-7732/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 37) | pass 10.467 via tolerance (n2, claim check 75) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 37) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 37) | pass 1.546 via tolerance (n2, claim check 75) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 37) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 37) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 37) | not asked |

### belenky2003-sleepstudy | claude:claude-opus-5-5 | run 3

Status: answer. 72 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071320-52af. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/belenky2003-sleepstudy/run3/home/sessions/20261009-071320-52af/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/belenky2003-sleepstudy/run3/home/sessions/20261009-071320-52af/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 31) | pass 10.47 via tolerance (n5, claim check 86) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 31) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 31) | pass 1.546 via tolerance (n3, claim check 86) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 31) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 31) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 31) | not asked |

### delaney2004-esol | claude:claude-opus-5-5 | run 1

Status: answer. 132 s. 10 requests, 13 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-071432-ce5b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/delaney2004-esol/run1/home/sessions/20261009-071432-ce5b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/delaney2004-esol/run1/home/sessions/20261009-071432-ce5b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 35) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 56) | pass 1018 via tolerance (n3, claim check 118) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 56) | pass 12 via tolerance (n3, claim check 118) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 56) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 69) | pass 0.7519 via tolerance (n4, claim check 118) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 69) | pass 1.0994 via tolerance (n6, claim check 118) |

### delaney2004-esol | claude:claude-opus-5-5 | run 2

Status: answer. 114 s. 12 requests, 13 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-071646-ee57. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/delaney2004-esol/run2/home/sessions/20261009-071646-ee57/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/delaney2004-esol/run2/home/sessions/20261009-071646-ee57/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 32) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 53) | pass 1018 via tolerance (n3, claim check 127) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 53) | pass 12 via tolerance (n3, claim check 127) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 53) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 71) | pass 0.752 via tolerance (n4, claim check 127) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 71) | pass 1.1 via tolerance (n6, claim check 127) |

### delaney2004-esol | claude:claude-opus-5-5 | run 3

Status: answer. 127 s. 10 requests, 12 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-071839-f81b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/delaney2004-esol/run3/home/sessions/20261009-071839-f81b/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/delaney2004-esol/run3/home/sessions/20261009-071839-f81b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 32) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 53) | pass 1018 via tolerance (n3, claim check 115) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 53) | pass 12 via tolerance (n3, claim check 115) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 53) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 66) | pass 0.752 via tolerance (n4, claim check 115) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 66) | pass 1.1 via tolerance (n4, claim check 115) |

### kanetis2022-iqtree-sporocadaceae | claude:claude-opus-5-5 | run 1

Status: answer. 161 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-072046-5d04. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261009-072046-5d04/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261009-072046-5d04/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 22) | pass -15895.48 via tolerance (n3, claim check 68) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 14) | pass 2375 via tolerance (n3, claim check 68) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 14) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 22) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-opus-5-5 | run 2

Status: answer. 148 s. 9 requests, 7 tool calls (0 failed), 1 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-072328-01b0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261009-072328-01b0/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261009-072328-01b0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 22) | pass -15895.48 via tolerance (n2, claim check 80) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 14) | pass 2375 via tolerance (n2, claim check 80) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 14) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 22) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-opus-5-5 | run 3

Status: answer. 160 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 7 unsourced.
Session: 20261009-072555-9e92. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261009-072555-9e92/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 7 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261009-072555-9e92/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n3 stdout, entry 30) | pass -15895.48 via tolerance (n2, claim check 66) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 11) | pass 2375 via tolerance (n3, claim check 66) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 11) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n3 stdout, entry 30) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-opus-5-5 | run 1

Status: answer. 232 s. 14 requests, 22 tool calls (3 failed), 0 nudges, 0 plan reminders, 9 unsourced.
Session: 20261009-072835-f6c8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261009-072835-f6c8/log.jsonl
Leak check: 11 paths read, 0 outside the allow list, 0 blocked, 9 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261009-072835-f6c8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 23) | pass 10608 via tolerance (n8, claim check 159) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 26) | pass 10046 via tolerance (n9, claim check 159) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 105) | pass 9612 via tolerance (n8, claim check 159) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 108) | pass 8887 via tolerance (n9, claim check 159) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 23) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-opus-5-5 | run 2

Status: answer. 194 s. 10 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-073230-dca6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261009-073230-dca6/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261009-073230-dca6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 13) | pass 10608 via tolerance (n8, claim check 120) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 16) | pass 10046 via tolerance (n9, claim check 120) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 76) | pass 9612 via tolerance (n8, claim check 120) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 79) | pass 8887 via tolerance (n9, claim check 120) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 13) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-opus-5-5 | run 3

Status: answer. 167 s. 12 requests, 17 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-073551-84e0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261009-073551-84e0/log.jsonl
Leak check: 11 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261009-073551-84e0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 23) | pass 10608 via tolerance (n9, claim check 130) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 26) | pass 10046 via tolerance (n10, claim check 130) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n9 metrics.n_cells_after, entry 95) | pass 9612 via tolerance (n9, claim check 130) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n10 metrics.n_cells_after, entry 98) | pass 8887 via tolerance (n10, claim check 130) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 23) | not asked |

### nair2024-plasmid-growth | claude:claude-opus-5-5 | run 1

Status: answer. 171 s. 12 requests, 14 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-073844-6c6c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/nair2024-plasmid-growth/run1/home/sessions/20261009-073844-6c6c/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/nair2024-plasmid-growth/run1/home/sessions/20261009-073844-6c6c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 59) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 59) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 59) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_DA49828_P1, entry 93) | pass 1.005 via tolerance (n4, claim check 136) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_DA49828_P2, entry 93) | pass 1.028 via tolerance (n4, claim check 136) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_DA49828_P3, entry 93) | pass 1.033 via tolerance (n4, claim check 136) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_DA49828_P4, entry 93) | pass 0.9657 via tolerance (n4, claim check 136) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_DA49828_P5, entry 93) | pass 1.072 via tolerance (n4, claim check 136) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_DA49828_P6, entry 93) | pass 1.008 via tolerance (n4, claim check 136) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_DA49828_P7, entry 93) | pass 0.9612 via tolerance (n4, claim check 136) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_DA49828_P8, entry 93) | pass 0.9754 via tolerance (n4, claim check 136) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_DA49828_P9, entry 93) | pass 1.043 via tolerance (n4, claim check 136) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_DA49828_P10, entry 93) | pass 0.9902 via tolerance (n4, claim check 136) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_DA49828_P11, entry 93) | pass 0.9466 via tolerance (n4, claim check 136) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_DA49828_P14, entry 93) | pass 1.082 via tolerance (n4, claim check 136) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][9], entry 93) | pass 0.7424 via tolerance (n4, claim check 136) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][10], entry 93) | pass 1.151 via tolerance (n4, claim check 136) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_DA49828_P5, entry 93) | pass 0.2432 via tolerance (n4, claim check 136) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_DA49828_P11, entry 93) | pass 0.5076 via tolerance (n4, claim check 136) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n4 metrics.rel_mean_by_DA49828, entry 93) | pass 1.009 via tolerance (n4, claim check 136) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_DA49828_Host, entry 93) | differs 0.9902 (n4, claim check 136) |

### nair2024-plasmid-growth | claude:claude-opus-5-5 | run 2

Status: answer. 163 s. 12 requests, 15 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074135-ca63. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/nair2024-plasmid-growth/run2/home/sessions/20261009-074135-ca63/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/nair2024-plasmid-growth/run2/home/sessions/20261009-074135-ca63/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 66) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 66) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 66) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_DA49828_P1, entry 96) | pass 1.005 via tolerance (n4, claim check 140) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_DA49828_P2, entry 96) | pass 1.028 via tolerance (n4, claim check 140) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_DA49828_P3, entry 96) | pass 1.033 via tolerance (n4, claim check 140) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_DA49828_P4, entry 96) | pass 0.9657 via tolerance (n4, claim check 140) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_DA49828_P5, entry 96) | pass 1.072 via tolerance (n4, claim check 140) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_DA49828_P6, entry 96) | pass 1.008 via tolerance (n4, claim check 140) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_DA49828_P7, entry 96) | pass 0.9612 via tolerance (n4, claim check 140) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_DA49828_P8, entry 96) | pass 0.9754 via tolerance (n4, claim check 140) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_DA49828_P9, entry 96) | pass 1.043 via tolerance (n4, claim check 140) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_DA49828_P10, entry 96) | pass 0.9902 via tolerance (n4, claim check 140) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_DA49828_P11, entry 96) | pass 0.9466 via tolerance (n4, claim check 140) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_DA49828_P14, entry 96) | pass 1.082 via tolerance (n4, claim check 140) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][9], entry 96) | pass 0.7424 via tolerance (n4, claim check 140) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][10], entry 96) | pass 1.151 via tolerance (n4, claim check 140) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_DA49828_P5, entry 96) | pass 0.2432 via tolerance (n4, claim check 140) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_DA49828_P11, entry 96) | pass 0.5076 via tolerance (n4, claim check 140) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n4 metrics.rel_mean_by_DA49828, entry 96) | pass 1.009 via tolerance (n4, claim check 140) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_DA49828_Host, entry 96) | differs 0.9902 (n4, claim check 140) |

### nair2024-plasmid-growth | claude:claude-opus-5-5 | run 3

Status: answer. 141 s. 10 requests, 14 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074418-7590. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/nair2024-plasmid-growth/run3/home/sessions/20261009-074418-7590/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/nair2024-plasmid-growth/run3/home/sessions/20261009-074418-7590/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 59) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 59) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 59) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_DA49828_P1, entry 94) | pass 1.005 via tolerance (n4, claim check 124) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_DA49828_P2, entry 94) | pass 1.028 via tolerance (n4, claim check 124) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_DA49828_P3, entry 94) | pass 1.033 via tolerance (n4, claim check 124) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_DA49828_P4, entry 94) | pass 0.9657 via tolerance (n4, claim check 124) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_DA49828_P5, entry 94) | pass 1.072 via tolerance (n4, claim check 124) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_DA49828_P6, entry 94) | pass 1.008 via tolerance (n4, claim check 124) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_DA49828_P7, entry 94) | pass 0.9612 via tolerance (n4, claim check 124) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_DA49828_P8, entry 94) | pass 0.9754 via tolerance (n4, claim check 124) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_DA49828_P9, entry 94) | pass 1.043 via tolerance (n4, claim check 124) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_DA49828_P10, entry 94) | pass 0.9902 via tolerance (n4, claim check 124) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_DA49828_P11, entry 94) | pass 0.9466 via tolerance (n4, claim check 124) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_DA49828_P14, entry 94) | pass 1.082 via tolerance (n4, claim check 124) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][9], entry 94) | pass 0.7424 via tolerance (n4, claim check 124) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][10], entry 94) | pass 1.151 via tolerance (n4, claim check 124) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_DA49828_P5, entry 94) | pass 0.2432 via tolerance (n4, claim check 124) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_DA49828_P11, entry 94) | pass 0.5076 via tolerance (n4, claim check 124) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n4 metrics.rel_mean_by_DA49828, entry 94) | pass 1.009 via tolerance (n4, claim check 124) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_DA49828_Host, entry 94) | differs 0.9902 (n4, claim check 124) |

### rost2016-openms | claude:claude-opus-5-5 | run 1

Status: answer. 142 s. 7 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-074639-2b15. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rost2016-openms/run1/home/sessions/20261009-074639-2b15/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rost2016-openms/run1/home/sessions/20261009-074639-2b15/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | pass 7173 via tolerance (n1, claim check 108) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 58) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 58) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 58) | pass 1887 via tolerance (n9, claim check 108) |

### rost2016-openms | claude:claude-opus-5-5 | run 2

Status: answer. 114 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-074901-2656. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rost2016-openms/run2/home/sessions/20261009-074901-2656/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rost2016-openms/run2/home/sessions/20261009-074901-2656/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 13) | pass 7173 via tolerance (n1, claim check 88) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 13) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 58) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 58) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 58) | pass 1887 via tolerance (n9, claim check 88) |

### rost2016-openms | claude:claude-opus-5-5 | run 3

Status: answer. 180 s. 9 requests, 7 tool calls (0 failed), 1 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-075055-5d5d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rost2016-openms/run3/home/sessions/20261009-075055-5d5d/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rost2016-openms/run3/home/sessions/20261009-075055-5d5d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | pass 7173 via tolerance (n1, claim check 130) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 58) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 58) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 58) | pass 1887 via tolerance (n9, claim check 130) |

### wang2023-cuproptosis-oa | claude:claude-opus-5-5 | run 1

Status: answer. 84 s. 4 requests, 3 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075355-c8c9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261009-075355-c8c9/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261009-075355-c8c9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 52) | pass 3 via tolerance (n4, claim check 73) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 52) | pass 1578 via tolerance (n4, claim check 73) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 52) | pass 0.001845384 via tolerance (n4, claim check 73) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 52) | pass 0.1118672 via tolerance (n4, claim check 73) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 52) | pass 35.08762 via tolerance (n4, claim check 73) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 52) | pass 24 via tolerance (n4, claim check 73) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 52) | pass 0.004791726 via tolerance (n4, claim check 73) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 52) | pass 30 via tolerance (n4, claim check 73) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 52) | pass 0.005986962 via tolerance (n4, claim check 73) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 52) | pass 649 via tolerance (n4, claim check 73) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 52) | pass 0.006039754 via tolerance (n4, claim check 73) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 52) | pass 37 via tolerance (n4, claim check 73) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 52) | pass 0.00738 via tolerance (n4, claim check 73) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 13) | not asked |

### wang2023-cuproptosis-oa | claude:claude-opus-5-5 | run 2

Status: answer. 55 s. 3 requests, 3 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075519-8ba2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261009-075519-8ba2/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261009-075519-8ba2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 51) | pass 3 via tolerance (n4, claim check 65) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 51) | pass 1578 via tolerance (n4, claim check 65) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 51) | pass 0.001845384 via tolerance (n4, claim check 65) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 51) | pass 0.1118672 via tolerance (n4, claim check 65) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 51) | pass 35.08762 via tolerance (n4, claim check 65) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 51) | pass 24 via tolerance (n4, claim check 65) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 51) | pass 0.004791726 via tolerance (n4, claim check 65) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 51) | pass 30 via tolerance (n4, claim check 65) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 51) | pass 0.005986962 via tolerance (n4, claim check 65) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 51) | pass 649 via tolerance (n4, claim check 65) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 51) | pass 0.006039754 via tolerance (n4, claim check 65) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 51) | pass 37 via tolerance (n4, claim check 65) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 51) | pass 0.00738 via tolerance (n4, claim check 65) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 13) | not asked |

### wang2023-cuproptosis-oa | claude:claude-opus-5-5 | run 3

Status: answer. 93 s. 5 requests, 4 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075615-a0cc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261009-075615-a0cc/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261009-075615-a0cc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 51) | pass 3 via tolerance (n4, claim check 79) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 51) | pass 1578 via tolerance (n4, claim check 79) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 51) | pass 0.001845384 via tolerance (n4, claim check 79) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 51) | pass 0.1118672 via tolerance (n4, claim check 79) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 51) | pass 35.08762 via tolerance (n4, claim check 79) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 51) | pass 24 via tolerance (n4, claim check 79) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 51) | pass 0.004791726 via tolerance (n4, claim check 79) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 51) | pass 30 via tolerance (n4, claim check 79) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 51) | pass 0.005986962 via tolerance (n4, claim check 79) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 51) | pass 649 via tolerance (n4, claim check 79) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 51) | pass 0.006039754 via tolerance (n4, claim check 79) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 51) | pass 37 via tolerance (n4, claim check 79) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 51) | pass 0.00738 via tolerance (n4, claim check 79) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 13) | not asked |

