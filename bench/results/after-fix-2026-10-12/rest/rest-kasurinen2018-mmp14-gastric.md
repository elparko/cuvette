# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 75/75 | 51/51 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| kasurinen2018-mmp14-gastric | 75/75 / 51/51 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 434 | 36 | 86 | 43351 | 935373 | 46 | 0 | 0 | 1 | 3 | 8 | 17 | 8 | 0 | 6 | 6 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.05 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | 2 | on | 8 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | 3 | on | 8 | 0 | 0 | 0 | 0 |

## Details

### kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | run 1

Status: answer. 138 s. 11 requests, 15 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-033043-ce6f. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/kasurinen2018-mmp14-gastric/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261012-033043-ce6f/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/kasurinen2018-mmp14-gastric/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261012-033043-ce6f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 12) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 27) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4923 (n9 stdout, entry 81) | pass 0.4923 via tolerance (n9, claim check 136) |
| surv5_high | 0.2211 ±0.001 | pass 0.2211 (n9 stdout, entry 81) | pass 0.2211 via tolerance (n9, claim check 136) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 27) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 27) | pass 0.00138 via tolerance (n2, claim check 136) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 43) | pass 1.92 via tolerance (n3, claim check 136) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 43) | pass 1.28 via tolerance (n3, claim check 136) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 43) | pass 2.88 via tolerance (n3, claim check 136) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 43) | pass 0.00167 via tolerance (n3, claim check 136) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 46) | pass 1.55 via tolerance (n4, claim check 136) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 46) | pass 1.02 via tolerance (n4, claim check 136) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 46) | pass 2.35 via tolerance (n4, claim check 136) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 46) | pass 0.0399 via tolerance (n4, claim check 136) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 46) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 46) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 46) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 46) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 46) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n7 metrics.hr_mmp14_high, entry 69) | pass 3.54 via tolerance (n7, claim check 136) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n7 table.rows[0][5], entry 69) | pass 1.51 via tolerance (n7, claim check 136) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n7 table.rows[0][6], entry 69) | pass 8.33 via tolerance (n7, claim check 136) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n7 metrics.p_mmp14_high, entry 69) | pass 0.00374 via tolerance (n10, claim check 136) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n8 metrics.hr_mmp14_high, entry 72) | pass 1.54 via tolerance (n8, claim check 136) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n8 metrics.p_mmp14_high, entry 72) | pass 0.0711 via tolerance (n10, claim check 136) |

### kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | run 2

Status: answer. 157 s. 15 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-033302-e3e9. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/kasurinen2018-mmp14-gastric/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261012-033302-e3e9/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/kasurinen2018-mmp14-gastric/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261012-033302-e3e9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 12) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 34) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n2 table.rows[0][4], entry 34) | pass 0.492 via tolerance (n2, claim check 149) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n2 table.rows[1][4], entry 34) | pass 0.221 via tolerance (n2, claim check 149) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 34) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 34) | pass 0.00138 via tolerance (n8, claim check 149) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 60) | pass 1.92 via tolerance (n3, claim check 149) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 60) | pass 1.28 via tolerance (n3, claim check 149) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 60) | pass 2.88 via tolerance (n3, claim check 149) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 60) | pass 0.00167 via tolerance (n8, claim check 149) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 64) | pass 1.55 via tolerance (n4, claim check 149) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 64) | pass 1.02 via tolerance (n4, claim check 149) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 64) | pass 2.35 via tolerance (n4, claim check 149) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 64) | pass 0.0399 via tolerance (n8, claim check 149) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 64) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 64) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 64) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 64) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 64) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n5 metrics.hr_mmp14_high, entry 73) | pass 3.54 via tolerance (n5, claim check 149) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n5 table.rows[0][5], entry 73) | pass 1.51 via tolerance (n5, claim check 149) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n5 table.rows[0][6], entry 73) | pass 8.33 via tolerance (n5, claim check 149) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n5 metrics.p_mmp14_high, entry 73) | pass 0.00374 via tolerance (n8, claim check 149) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n6 metrics.hr_mmp14_high, entry 77) | pass 1.54 via tolerance (n9, claim check 149) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n6 metrics.p_mmp14_high, entry 77) | pass 0.0711 via tolerance (n8, claim check 149) |

### kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | run 3

Status: answer. 139 s. 10 requests, 16 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-033538-36a1. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/kasurinen2018-mmp14-gastric/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261012-033538-36a1/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/kasurinen2018-mmp14-gastric/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261012-033538-36a1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 12) | not asked |
| events | 138 exact | pass 138 (n4 metrics.events, entry 29) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n4 table.rows[0][4], entry 29) | pass 0.492 via tolerance (n9, claim check 131) |
| surv5_high | 0.2211 ±0.001 | pass 0.221053 (n9 stdout, entry 71) | pass 0.221 via tolerance (n4, claim check 131) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n4 metrics.logrank_chi2, entry 29) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n4 metrics.logrank_p, entry 29) | pass 0.00138 via tolerance (n12, claim check 131) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n5 metrics.hr_mmp14_high, entry 50) | pass 1.92 via tolerance (n9, claim check 131) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n5 table.rows[0][5], entry 50) | pass 1.28 via tolerance (n9, claim check 131) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n5 table.rows[0][6], entry 50) | pass 2.88 via tolerance (n9, claim check 131) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n5 metrics.p_mmp14_high, entry 50) | pass 0.00167 via tolerance (n9, claim check 131) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n6 metrics.hr_mmp14_high, entry 54) | pass 1.55 via tolerance (n6, claim check 131) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n6 table.rows[0][5], entry 54) | pass 1.02 via tolerance (n9, claim check 131) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n6 table.rows[0][6], entry 54) | pass 2.35 via tolerance (n9, claim check 131) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n6 metrics.p_mmp14_high, entry 54) | pass 0.0399 via tolerance (n9, claim check 131) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n6 metrics.hr_age_ge67, entry 54) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n6 metrics.hr_stage2, entry 54) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n6 metrics.hr_stage3, entry 54) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n6 metrics.hr_stage4, entry 54) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n6 metrics.hr_diffuse, entry 54) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n7 metrics.hr_mmp14_high, entry 58) | pass 3.54 via tolerance (n7, claim check 131) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n7 table.rows[0][5], entry 58) | pass 1.51 via tolerance (n9, claim check 131) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n7 table.rows[0][6], entry 58) | pass 8.33 via tolerance (n9, claim check 131) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n7 metrics.p_mmp14_high, entry 58) | pass 0.00374 via tolerance (n12, claim check 131) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n8 metrics.hr_mmp14_high, entry 62) | pass 1.54 via tolerance (n9, claim check 131) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n8 metrics.p_mmp14_high, entry 62) | pass 0.0711 via tolerance (n12, claim check 131) |

