# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 5/5 | 4/4 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| rees2019-uptake | 5/5 / 4/4 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 136 | 14 | 36 | 12189 | 257692 | 12 | 2 | 0 | 1 | 1 | 3 | 4 | 1 | 0 | 1 | 1 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rees2019-uptake | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 1 | 0 | 0 |

## Details

### rees2019-uptake | claude:claude-haiku-5-5 | run 1

Status: answer. 136 s. 14 requests, 12 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-000829-08b0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261009-000829-08b0/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261009-000829-08b0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n5 table.rows[2][0], entry 97) | not asked |
| nuclei | 582 ±35 | pass 566 (n6 metrics.total_nuclei, entry 120) | pass 566 via tolerance (n7, claim check 168) |
| vesicles | 461 ±35 | pass 459 (n6 metrics.total_cells, entry 120) | pass 459 via tolerance (n7, claim check 168) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n6 table.rows[1][5], entry 120) | pass 0.64 via tolerance (n6, claim check 168) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.46512 (n6 table.rows[1][3], entry 120) | pass 0.465 via tolerance (n6, claim check 168) |
| cells (reference) | 572 ±35 | match 566 (n6 metrics.total_nuclei, entry 120) | match 566 via tolerance (n7, claim check 168) |

