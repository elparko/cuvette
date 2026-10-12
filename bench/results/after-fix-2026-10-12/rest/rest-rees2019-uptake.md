# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 15/15 | 12/12 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| rees2019-uptake | 15/15 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 373 | 30 | 80 | 25281 | 531225 | 23 | 0 | 0 | 1 | 3 | 10 | 17 | 5 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rees2019-uptake | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| rees2019-uptake | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| rees2019-uptake | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |

## Details

### rees2019-uptake | claude:claude-haiku-5-5 | run 1

Status: answer. 129 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-052525-0a3c. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/rees2019-uptake/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261012-052525-0a3c/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/rees2019-uptake/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261012-052525-0a3c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 89) | not asked |
| nuclei | 582 ±35 | pass 566 (n7 metrics.total_nuclei, entry 97) | pass 566 via tolerance (n8, claim check 139) |
| vesicles | 461 ±35 | pass 459 (n7 metrics.total_cells, entry 97) | pass 459 via tolerance (n8, claim check 139) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n7 table.rows[1][5], entry 97) | pass 0.64 via tolerance (n8, claim check 139) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.4290298 (n8 stdout, entry 106) | pass 0.465 via tolerance (n8, claim check 139) |
| cells (reference) | 572 ±35 | match 566 (n7 metrics.total_nuclei, entry 97) | match 566 via tolerance (n8, claim check 139) |

### rees2019-uptake | claude:claude-haiku-5-5 | run 2

Status: answer. 116 s. 10 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-052734-c48e. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/rees2019-uptake/claude_claude-haiku-5-5/rees2019-uptake/run2/home/sessions/20261012-052734-c48e/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/rees2019-uptake/claude_claude-haiku-5-5/rees2019-uptake/run2/home/sessions/20261012-052734-c48e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n5 table.rows[2][0], entry 89) | not asked |
| nuclei | 582 ±35 | pass 566 (n6 metrics.total_nuclei, entry 105) | pass 566 via tolerance (n6, claim check 143) |
| vesicles | 461 ±35 | pass 459 (n6 metrics.total_cells, entry 105) | pass 459 via tolerance (n6, claim check 143) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n6 table.rows[1][5], entry 105) | pass 0.64 via tolerance (n6, claim check 143) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.429 (n7 stdout, entry 121) | pass 0.429 via tolerance (n7, claim check 143) |
| cells (reference) | 572 ±35 | match 566 (n6 metrics.total_nuclei, entry 105) | match 566 via tolerance (n6, claim check 143) |

### rees2019-uptake | claude:claude-haiku-5-5 | run 3

Status: answer. 127 s. 11 requests, 8 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-052931-d872. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/rees2019-uptake/claude_claude-haiku-5-5/rees2019-uptake/run3/home/sessions/20261012-052931-d872/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/rees2019-uptake/claude_claude-haiku-5-5/rees2019-uptake/run3/home/sessions/20261012-052931-d872/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n5 metrics.n_images, entry 88) | not asked |
| nuclei | 582 ±35 | pass 566 (n5 metrics.total_nuclei, entry 88) | pass 566 via tolerance (n5, claim check 150) |
| vesicles | 461 ±35 | pass 459 (n5 metrics.total_cells, entry 88) | pass 459 via tolerance (n6, claim check 150) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n5 table.rows[1][5], entry 88) | pass 0.769 via tolerance (n5, claim check 150) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.4290298 (n6 stdout, entry 105) | pass 0.465 via tolerance (n6, claim check 150) |
| cells (reference) | 572 ±35 | match 566 (n5 metrics.total_nuclei, entry 88) | match 566 via tolerance (n5, claim check 150) |

