# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 63/63 | 57/57 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| sriphoosanaphan2021-vitd-hcv | 63/63 / 57/57 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 325 | 39 | 96 | 35173 | 1016663 | 42 | 0 | 0 | 3 | 3 | 12 | 11 | 3 | 5 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.04 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 2 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 3 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |

## Details

### sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | run 1

Status: answer. 118 s. 16 requests, 16 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261012-042856-d32a. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-vitd-hcv/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261012-042856-d32a/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-vitd-hcv/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261012-042856-d32a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n2 metrics.n_b, entry 59) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 59) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 59) | pass 23.09 via tolerance (n2, claim check 165) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 59) | pass 19.73 via tolerance (n2, claim check 165) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 59) | pass 26.44 via tolerance (n2, claim check 165) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 67) | pass -0.55 via tolerance (n3, claim check 165) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 67) | pass -2.84 via tolerance (n3, claim check 165) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 67) | pass 1.73 via tolerance (n3, claim check 165) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 67) | pass 0.63 via tolerance (n7, claim check 165) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 70) | pass -5.51 via tolerance (n4, claim check 165) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 70) | pass -26.36 via tolerance (n4, claim check 165) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 70) | pass 15.34 via tolerance (n4, claim check 165) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 70) | pass 0.6 via tolerance (n7, claim check 165) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 73) | pass 122.92 via tolerance (n5, claim check 165) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n5 metrics.ci_lo, entry 73) | pass -68.96 via tolerance (n5, claim check 165) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 73) | pass 314.81 via tolerance (n5, claim check 165) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 73) | pass 0.21 via rounding (n7, claim check 165) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 76) | pass -0.11 via tolerance (n6, claim check 165) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 76) | pass -2.37 via tolerance (n6, claim check 165) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 76) | pass 2.15 via tolerance (n6, claim check 165) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 76) | pass 0.92 via rounding (n8, claim check 165) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | run 2

Status: answer. 89 s. 10 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 3 unsourced.
Session: 20261012-043054-b3b1. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-vitd-hcv/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261012-043054-b3b1/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-vitd-hcv/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261012-043054-b3b1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n2 metrics.n_b, entry 45) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 45) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 45) | pass 23.09 via tolerance (n2, claim check 118) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 45) | pass 19.73 via tolerance (n2, claim check 118) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 45) | pass 26.44 via tolerance (n2, claim check 118) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 48) | pass -0.55 via tolerance (n3, claim check 118) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 48) | pass -2.84 via tolerance (n3, claim check 118) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 48) | pass 1.73 via tolerance (n3, claim check 118) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 48) | pass 0.63 via tolerance (n7, claim check 118) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 51) | pass -5.51 via tolerance (n4, claim check 118) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 51) | pass -26.36 via tolerance (n4, claim check 118) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 51) | pass 15.34 via tolerance (n4, claim check 118) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 51) | pass 0.6 via tolerance (n7, claim check 118) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 54) | pass 122.92 via tolerance (n5, claim check 118) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n5 metrics.ci_lo, entry 54) | pass -68.96 via tolerance (n5, claim check 118) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 54) | pass 314.81 via tolerance (n5, claim check 118) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 54) | pass 0.206 via tolerance (n7, claim check 118) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 57) | pass -0.11 via tolerance (n6, claim check 118) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 57) | pass -2.37 via tolerance (n6, claim check 118) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 57) | pass 2.15 via tolerance (n6, claim check 118) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 57) | pass 0.923 via tolerance (n7, claim check 118) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | run 3

Status: answer. 118 s. 13 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-043223-120f. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-vitd-hcv/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261012-043223-120f/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-vitd-hcv/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261012-043223-120f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n1 file:/private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-vitd-hcv/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261012-043223-120f/work/inspect_table-1/columns.csv, entry 12) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 44) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 44) | pass 23.09 via tolerance (n2, claim check 149) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 44) | pass 19.73 via tolerance (n2, claim check 149) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 44) | pass 26.44 via tolerance (n2, claim check 149) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 52) | pass -0.55 via tolerance (n3, claim check 149) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 52) | pass -2.84 via tolerance (n3, claim check 149) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 52) | pass 1.73 via tolerance (n3, claim check 149) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 52) | pass 0.63 via tolerance (n7, claim check 149) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 55) | pass -5.51 via tolerance (n4, claim check 149) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 55) | pass -26.36 via tolerance (n4, claim check 149) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 55) | pass 15.34 via tolerance (n4, claim check 149) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 55) | pass 0.6 via tolerance (n7, claim check 149) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 58) | pass 122.92 via tolerance (n5, claim check 149) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n5 metrics.ci_lo, entry 58) | pass -68.96 via tolerance (n5, claim check 149) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 58) | pass 314.81 via tolerance (n5, claim check 149) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 58) | pass 0.206 via tolerance (n7, claim check 149) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 61) | pass -0.11 via tolerance (n6, claim check 149) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 61) | pass -2.37 via tolerance (n6, claim check 149) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 61) | pass 2.15 via tolerance (n6, claim check 149) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 61) | pass 0.923 via tolerance (n7, claim check 149) |

