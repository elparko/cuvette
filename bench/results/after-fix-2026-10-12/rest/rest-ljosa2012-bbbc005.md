# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 9/9 | 6/6 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| ljosa2012-bbbc005 | 9/9 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 1422 | 38 | 100 | 34923 | 1097423 | 38 | 0 | 0 | 3 | 3 | 10 | 16 | 4 | 0 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.05 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ljosa2012-bbbc005 | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### ljosa2012-bbbc005 | claude:claude-haiku-5-5 | run 1

Status: answer. 436 s. 12 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-024713-ceb5. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/ljosa2012-bbbc005/claude_claude-haiku-5-5/ljosa2012-bbbc005/run1/home/sessions/20261012-024713-ceb5/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/ljosa2012-bbbc005/claude_claude-haiku-5-5/ljosa2012-bbbc005/run1/home/sessions/20261012-024713-ceb5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n18 metrics.ratio_otsu_shape, entry 131) | pass 0.9399 via tolerance (n19, claim check 172) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n13 metrics.mean_abs_error, entry 104) | pass 3.01 via tolerance (n19, claim check 172) |
| true_total_sample | 5007 exact | pass 5007 (n13 metrics.true_total, entry 104) | not asked |

### ljosa2012-bbbc005 | claude:claude-haiku-5-5 | run 2

Status: answer. 429 s. 11 requests, 11 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-025433-9322. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/ljosa2012-bbbc005/claude_claude-haiku-5-5/ljosa2012-bbbc005/run2/home/sessions/20261012-025433-9322/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/ljosa2012-bbbc005/claude_claude-haiku-5-5/ljosa2012-bbbc005/run2/home/sessions/20261012-025433-9322/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9399 (n11 metrics.detected_to_true_ratio, entry 83) | pass 0.9399 via tolerance (n17, claim check 161) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n11 metrics.mean_abs_error, entry 83) | pass 3.01 via tolerance (n17, claim check 161) |
| true_total_sample | 5007 exact | pass 5007 (n11 metrics.true_total, entry 83) | not asked |

### ljosa2012-bbbc005 | claude:claude-haiku-5-5 | run 3

Status: answer. 557 s. 15 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-030145-3069. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/ljosa2012-bbbc005/claude_claude-haiku-5-5/ljosa2012-bbbc005/run3/home/sessions/20261012-030145-3069/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/ljosa2012-bbbc005/claude_claude-haiku-5-5/ljosa2012-bbbc005/run3/home/sessions/20261012-030145-3069/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n20 metrics.ratio_Otsu_Shape, entry 150) | pass 0.9399 via tolerance (n19, claim check 193) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n12 metrics.mean_abs_error, entry 105) | pass 3.01 via tolerance (n19, claim check 193) |
| true_total_sample | 5007 exact | pass 5007 (n12 metrics.true_total, entry 105) | not asked |

