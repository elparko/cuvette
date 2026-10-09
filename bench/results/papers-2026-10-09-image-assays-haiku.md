# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 13/13 | 10/10 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| makrai2023-colonies | 2/2 / 1/1 |
| manders1993-coloc | 6/6 / 5/5 |
| rees2019-uptake | 5/5 / 4/4 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 474 | 34 | 84 | 27638 | 636060 | 35 | 4 | 0 | 0 | 3 | 8 | 13 | 8 | 0 | 6 | 6 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| makrai2023-colonies | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| rees2019-uptake | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 1 | 0 | 0 |

## Details

### makrai2023-colonies | claude:claude-haiku-5-5 | run 1

Status: answer. 258 s. 14 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-235553-82f3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/makrai2023-colonies/run1/home/sessions/20261008-235553-82f3/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/makrai2023-colonies/run1/home/sessions/20261008-235553-82f3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 72) | not asked |
| total_colonies | 88 ±9 | pass 88 (n8 metrics.total_colonies, entry 88) | pass 88 via tolerance (n12, claim check 163) |

### manders1993-coloc | claude:claude-haiku-5-5 | run 1

Status: answer. 74 s. 6 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-000012-06e9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/manders1993-coloc/run1/home/sessions/20261009-000012-06e9/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/manders1993-coloc/run1/home/sessions/20261009-000012-06e9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 45) | pass 0.721 via tolerance (n5, claim check 85) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 49) | pass 0.443 via tolerance (n6, claim check 85) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 53) | pass 0.164 via tolerance (n7, claim check 85) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 45) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 49) | pass 0.5 via tolerance (n6, claim check 85) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 53) | pass 0.25 via tolerance (n7, claim check 85) |

### rees2019-uptake | claude:claude-haiku-5-5 | run 1

Status: answer. 143 s. 14 requests, 13 tool calls (4 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-000127-8cd0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261009-000127-8cd0/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261009-000127-8cd0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n3 table.rows[2][0], entry 86) | not asked |
| nuclei | 582 ±35 | pass 566 (n4 metrics.total_nuclei, entry 95) | pass 566 via tolerance (n4, claim check 169) |
| vesicles | 461 ±35 | pass 459 (n4 metrics.total_cells, entry 95) | pass 459 via tolerance (n4, claim check 169) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n4 table.rows[1][5], entry 95) | pass 0.64 via tolerance (n4, claim check 169) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.4422658 (n6 metrics.otsu_cargo_per_cell, entry 152) | pass 0.436 via tolerance (n5, claim check 169) |
| cells (reference) | 572 ±35 | match 566 (n4 metrics.total_nuclei, entry 95) | match 566 via tolerance (n4, claim check 169) |

