# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 18/18 | 15/15 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| manders1993-coloc | 18/18 / 15/15 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 183 | 15 | 40 | 18787 | 211539 | 25 | 1 | 0 | 0 | 2 | 10 | 12 | 1 | 0 | 8 | 8 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| manders1993-coloc | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |

## Details

### manders1993-coloc | claude:claude-haiku-5-5 | run 1

Status: answer. 62 s. 4 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-025305-a9af. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/manders1993-coloc/claude_claude-haiku-5-5/manders1993-coloc/run1/home/sessions/20261012-025305-a9af/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/manders1993-coloc/claude_claude-haiku-5-5/manders1993-coloc/run1/home/sessions/20261012-025305-a9af/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 39) | pass 0.721 via tolerance (n5, claim check 67) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 43) | pass 0.443 via tolerance (n6, claim check 67) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 47) | pass 0.164 via tolerance (n7, claim check 67) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 39) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 43) | pass 0.5 via tolerance (n6, claim check 67) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 47) | pass 0.25 via tolerance (n7, claim check 67) |

### manders1993-coloc | claude:claude-haiku-5-5 | run 2

Status: answer. 87 s. 8 requests, 13 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-025408-6945. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/manders1993-coloc/claude_claude-haiku-5-5/manders1993-coloc/run2/home/sessions/20261012-025408-6945/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/manders1993-coloc/claude_claude-haiku-5-5/manders1993-coloc/run2/home/sessions/20261012-025408-6945/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 39) | pass 0.721 via tolerance (n9, claim check 107) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n7 metrics.pearson_r, entry 72) | pass 0.443 via tolerance (n6, claim check 107) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n8 metrics.pearson_r, entry 75) | pass 0.164 via tolerance (n6, claim check 107) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 39) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 stdout, entry 63) | pass 0.5 via tolerance (n10, claim check 107) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n6 stdout, entry 63) | pass 0.25 via tolerance (n11, claim check 107) |

### manders1993-coloc | claude:claude-haiku-5-5 | run 3

Status: answer. 34 s. 3 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-025535-bd20. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/manders1993-coloc/claude_claude-haiku-5-5/manders1993-coloc/run3/home/sessions/20261012-025535-bd20/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/manders1993-coloc/claude_claude-haiku-5-5/manders1993-coloc/run3/home/sessions/20261012-025535-bd20/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n3 metrics.pearson_r, entry 33) | pass 0.721 via tolerance (n3, claim check 55) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n4 metrics.pearson_r, entry 36) | pass 0.443 via tolerance (n4, claim check 55) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n5 metrics.pearson_r, entry 39) | pass 0.164 via tolerance (n5, claim check 55) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n3 metrics.manders_m1, entry 33) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n4 metrics.manders_m1, entry 36) | pass 0.5 via tolerance (n4, claim check 55) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n5 metrics.manders_m1, entry 39) | pass 0.25 via tolerance (n5, claim check 55) |

