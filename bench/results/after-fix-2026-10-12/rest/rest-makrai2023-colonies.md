# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 6/6 | 3/3 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| makrai2023-colonies | 6/6 / 3/3 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 708 | 35 | 96 | 27451 | 795887 | 28 | 1 | 4 | 0 | 3 | 10 | 9 | 12 | 4 | 5 | 5 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.04 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| makrai2023-colonies | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 4 | 0 |
| makrai2023-colonies | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| makrai2023-colonies | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |

## Details

### makrai2023-colonies | claude:claude-haiku-5-5 | run 1

Status: answer. 183 s. 12 requests, 10 tool calls (1 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261012-051333-89d1. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/makrai2023-colonies/claude_claude-haiku-5-5/makrai2023-colonies/run1/home/sessions/20261012-051333-89d1/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/makrai2023-colonies/claude_claude-haiku-5-5/makrai2023-colonies/run1/home/sessions/20261012-051333-89d1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 73) | not asked |
| total_colonies | 88 ±9 | pass 88 (n8 metrics.total_colonies, entry 89) | pass 88 via tolerance (n9, claim check 147) |

### makrai2023-colonies | claude:claude-haiku-5-5 | run 2

Status: answer. 274 s. 11 requests, 7 tool calls (0 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-051638-5604. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/makrai2023-colonies/claude_claude-haiku-5-5/makrai2023-colonies/run2/home/sessions/20261012-051638-5604/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/makrai2023-colonies/claude_claude-haiku-5-5/makrai2023-colonies/run2/home/sessions/20261012-051638-5604/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 66) | not asked |
| total_colonies | 88 ±9 | pass 88 (n7 metrics.total_colonies, entry 74) | pass 88 via tolerance (n11, claim check 137) |

### makrai2023-colonies | claude:claude-haiku-5-5 | run 3

Status: answer. 252 s. 12 requests, 11 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-052112-33ab. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/makrai2023-colonies/claude_claude-haiku-5-5/makrai2023-colonies/run3/home/sessions/20261012-052112-33ab/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/makrai2023-colonies/claude_claude-haiku-5-5/makrai2023-colonies/run3/home/sessions/20261012-052112-33ab/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 68) | not asked |
| total_colonies | 88 ±9 | pass 88 (n7 metrics.total_colonies, entry 84) | pass 88 via tolerance (n11, claim check 151) |

