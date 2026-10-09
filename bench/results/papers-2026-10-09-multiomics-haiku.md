# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 25/25 | 24/24 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| thaqi2026-bovine-corpus-luteum | 14/14 / 13/13 |
| zhu2020-deqms-spike-in | 4/4 / 4/4 |
| argelaguet2018-mofa-cll | 7/7 / 7/7 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 733 | 35 | 88 | 46466 | 1169939 | 51 | 0 | 0 | 1 | 3 | 8 | 11 | 9 | 0 | 3 | 3 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.06 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| thaqi2026-bovine-corpus-luteum | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| zhu2020-deqms-spike-in | claude:claude-haiku-5-5 | 1 | on | 9 | 0 | 0 | 0 | 0 |
| argelaguet2018-mofa-cll | claude:claude-haiku-5-5 | 1 | on | 13 | 0 | 0 | 0 | 0 |

## Details

### thaqi2026-bovine-corpus-luteum | claude:claude-haiku-5-5 | run 1

Status: answer. 123 s. 7 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-030114-c6fb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/thaqi2026-bovine-corpus-luteum/run1/home/sessions/20261009-030114-c6fb/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/thaqi2026-bovine-corpus-luteum/run1/home/sessions/20261009-030114-c6fb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_after_flags | 3783 exact | pass 3783 (n1 metrics.n_after_flags, entry 40) | pass 3783 via tolerance (n1, claim check 115) |
| i_vs_iv_first | 282 exact | pass 282 (n4 metrics.n_up, entry 64) | pass 282 via tolerance (n4, claim check 115) |
| i_vs_iv_second | 268 exact | pass 268 (n4 metrics.n_down, entry 64) | pass 268 via tolerance (n4, claim check 115) |
| iii_vs_v_first | 240 exact | pass 240 (n5 metrics.n_up, entry 67) | pass 240 via tolerance (n8, claim check 115) |
| iii_vs_v_second | 240 exact | pass 240 (n5 metrics.n_up, entry 67) | pass 240 via tolerance (n8, claim check 115) |
| iv_vs_vi_first | 98 exact | pass 98 (n6 metrics.n_up, entry 70) | pass 98 via tolerance (n6, claim check 115) |
| iv_vs_vi_second | 131 exact | pass 131 (n6 metrics.n_down, entry 70) | pass 131 via tolerance (n6, claim check 115) |
| v_vs_vi_first | 74 exact | pass 74 (n7 metrics.n_up, entry 73) | pass 74 via tolerance (n7, claim check 115) |
| v_vs_vi_second | 109 exact | pass 109 (n7 metrics.n_down, entry 73) | pass 109 via tolerance (n7, claim check 115) |
| vi_vs_vii_first | 219 exact | pass 219 (n8 metrics.n_up, entry 76) | pass 219 via tolerance (n8, claim check 115) |
| vi_vs_vii_second | 240 exact | pass 240 (n5 metrics.n_up, entry 67) | pass 240 via tolerance (n8, claim check 115) |
| vii_vs_x_first | 138 exact | pass 138 (n9 metrics.n_up, entry 79) | pass 138 via tolerance (n9, claim check 115) |
| vii_vs_x_second | 125 exact | pass 125 (n9 metrics.n_down, entry 79) | pass 125 via tolerance (n9, claim check 115) |
| n_tested | 1908 exact | pass 1908 (n1 metrics.n_kept, entry 40) | not asked |

### zhu2020-deqms-spike-in | claude:claude-haiku-5-5 | run 1

Status: answer. 118 s. 14 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-030317-43a1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/zhu2020-deqms-spike-in/run1/home/sessions/20261009-030317-43a1/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/zhu2020-deqms-spike-in/run1/home/sessions/20261009-030317-43a1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_after_flags | 6566 exact | pass 6566 (n1 metrics.n_after_flags, entry 49) | pass 6566 via tolerance (n1, claim check 158) |
| n_valid | 5022 exact | pass 5022 (n1 metrics.n_kept, entry 49) | pass 5022 via tolerance (n6, claim check 158) |
| tp_limma_trend | 1230 ±5 | pass 1235 (n4 metrics.n_up_match, entry 73) | pass 1235 via tolerance (n6, claim check 158) |
| fp_limma_trend | 13 exact | pass 13 (n4 metrics.n_up_other, entry 73) | pass 13 via tolerance (n6, claim check 158) |
| tp_deqms (reference) | 1237 ±0.5 | differs 1235 (n4 metrics.n_up_match, entry 73) | differs 1235 (n6, claim check 158) |
| fp_deqms (reference) | 11 ±0.5 | differs 10 (n1 table.n_rows, entry 49) | differs 13 (n6, claim check 158) |

### argelaguet2018-mofa-cll | claude:claude-haiku-5-5 | run 1

Status: answer. 492 s. 14 requests, 26 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-030515-548e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/argelaguet2018-mofa-cll/run1/home/sessions/20261009-030515-548e/log.jsonl
Leak check: 13 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/argelaguet2018-mofa-cll/run1/home/sessions/20261009-030515-548e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_factors | 10 exact | pass 10 (n1 metrics.n_factors, entry 54) | pass 10 via tolerance (n9, claim check 172) |
| r2_drugs | 41 ±7 | pass 41.82948 (n12 table.rows[0][5], entry 137) | pass 38.16 via tolerance (n7, claim check 172) |
| r2_mrna | 38 ±3 | pass 37.88456 (n1 metrics.r2_total_drugs, entry 54) | pass 37.9 via tolerance (n6, claim check 172) |
| r2_methylation | 24 ±3 | pass 24.37368 (n12 metrics.r2_total_methylation, entry 137) | pass 24.4 via tolerance (n12, claim check 172) |
| r2_mutations | 24 ±6 | pass 24.37368 (n12 metrics.r2_total_methylation, entry 137) | pass 24.4 via tolerance (n12, claim check 172) |
| ighv_factor | 1 exact | pass 1 (n2 metrics.best_factor_IGHV, entry 62) | pass 1 via tolerance (n13, claim check 172) |
| trisomy12_factor | 2 exact | pass 2 (n2 metrics.n_covariates, entry 62) | pass 2 via tolerance (n13, claim check 172) |

