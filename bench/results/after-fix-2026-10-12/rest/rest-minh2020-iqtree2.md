# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3/3 | 3/3 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| minh2020-iqtree2 | 3/3 / 3/3 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 253 | 19 | 56 | 26552 | 252501 | 10 | 0 | 3 | 0 | 3 | 10 | 12 | 5 | 10 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| minh2020-iqtree2 | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 1 | 0 |
| minh2020-iqtree2 | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 9 | 0 |
| minh2020-iqtree2 | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### minh2020-iqtree2 | claude:claude-haiku-5-5 | run 1

Status: answer. 75 s. 8 requests, 3 tool calls (0 failed), 3 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-031414-8f59. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/minh2020-iqtree2/claude_claude-haiku-5-5/minh2020-iqtree2/run1/home/sessions/20261012-031414-8f59/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/minh2020-iqtree2/claude_claude-haiku-5-5/minh2020-iqtree2/run1/home/sessions/20261012-031414-8f59/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 12) | pass -21152.54 via tolerance (n1, claim check 66) |

### minh2020-iqtree2 | claude:claude-haiku-5-5 | run 2

Status: answer. 88 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 9 unsourced.
Session: 20261012-031529-e081. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/minh2020-iqtree2/claude_claude-haiku-5-5/minh2020-iqtree2/run2/home/sessions/20261012-031529-e081/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 9 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/minh2020-iqtree2/claude_claude-haiku-5-5/minh2020-iqtree2/run2/home/sessions/20261012-031529-e081/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 12) | pass -21152.54 via tolerance (n1, claim check 56) |

### minh2020-iqtree2 | claude:claude-haiku-5-5 | run 3

Status: answer. 90 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-031657-2db7. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/minh2020-iqtree2/claude_claude-haiku-5-5/minh2020-iqtree2/run3/home/sessions/20261012-031657-2db7/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/minh2020-iqtree2/claude_claude-haiku-5-5/minh2020-iqtree2/run3/home/sessions/20261012-031657-2db7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 12) | pass -21152.54 via tolerance (n1, claim check 49) |

