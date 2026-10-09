# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 12/12 | 12/12 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| ram2021-pix-h-score | 12/12 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 158 | 13 | 36 | 13542 | 386407 | 15 | 0 | 0 | 2 | 1 | 2 | 7 | 0 | 0 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ram2021-pix-h-score | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### ram2021-pix-h-score | claude:claude-haiku-5-5 | run 1

Status: answer. 158 s. 13 requests, 15 tool calls (0 failed), 0 nudges, 2 plan reminders, 0 unsourced.
Session: 20261009-043818-5dd8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ram2021-pix-h-score/run1/home/sessions/20261009-043818-5dd8/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ram2021-pix-h-score/run1/home/sessions/20261009-043818-5dd8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_pcad | 30 exact | pass 30 (n6 metrics.n_subjects, entry 69) | pass 30 via tolerance (n13, claim check 154) |
| n_pdl1 | 24 exact | pass 24 (n8 metrics.n_subjects, entry 75) | pass 24 via tolerance (n9, claim check 154) |
| n_5t4 | 21 exact | pass 21 (n10 metrics.n_subjects, entry 81) | pass 21 via tolerance (n11, claim check 154) |
| h_pdl1_case1 | 185 ±0.5 | pass 185 (n5 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ram2021-pix-h-score/run1/home/sessions/20261009-043818-5dd8/work/score_h_score-4/pix_h_score_table_h_score.csv, entry 56) | pass 185 via tolerance (n13, claim check 154) |
| rho_pcad_qupath | 0.39 ±0.01 | pass 0.3923009 (n6 metrics.spearman_rho, entry 69) | pass 0.392 via tolerance (n6, claim check 154) |
| rho_pcad_halo | 0.5 ±0.01 | pass 0.5003623 (n9 metrics.icc_icc3k, entry 78) | pass 0.495 via tolerance (n7, claim check 154) |
| rho_pdl1_qupath | 0.74 ±0.01 | pass 0.7398156 (n7 table.rows[5][3], entry 72) | pass 0.739 via tolerance (n8, claim check 154) |
| rho_pdl1_halo | 0.69 ±0.015 | pass 0.6924479 (n9 table.rows[4][3], entry 78) | pass 0.701 via tolerance (n9, claim check 154) |
| rho_5t4_qupath | 0.79 ±0.01 | pass 0.7895616 (n11 metrics.pearson_r, entry 84) | pass 0.789 via tolerance (n10, claim check 154) |
| rho_5t4_halo | 0.75 ±0.01 | pass 0.7496755 (n11 metrics.spearman_rho, entry 84) | pass 0.75 via tolerance (n13, claim check 154) |
| kappa_pcad_qupath | 0.010989 ±0.001 | pass 0.01098901 (n6 metrics.kappa, entry 69) | pass 0.011 via tolerance (n6, claim check 154) |
| icc2_pcad_qupath | 0.149255 ±0.002 | pass 0.1492545 (n6 metrics.icc, entry 69) | pass 0.149 via tolerance (n6, claim check 154) |

