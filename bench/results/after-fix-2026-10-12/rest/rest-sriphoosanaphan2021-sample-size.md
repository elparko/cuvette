# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 9/9 | 6/6 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| sriphoosanaphan2021-sample-size | 9/9 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 113 | 8 | 26 | 8869 | 67966 | 3 | 0 | 0 | 0 | 2 | 9 | 7 | 0 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | 2 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | 3 | on | 0 | 0 | 0 | 0 | 0 |

## Details

### sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | run 1

Status: answer. 45 s. 3 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-035207-06ce. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-sample-size/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261012-035207-06ce/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-sample-size/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261012-035207-06ce/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 12) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 12) | pass 30 via tolerance (n1, claim check 29) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 12) | pass 60 via tolerance (n1, claim check 29) |

### sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | run 2

Status: answer. 44 s. 3 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-035252-2f29. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-sample-size/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261012-035252-2f29/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-sample-size/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261012-035252-2f29/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 12) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 12) | pass 30 via tolerance (n1, claim check 30) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 12) | pass 60 via tolerance (n1, claim check 30) |

### sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | run 3

Status: answer. 25 s. 2 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-035336-f768. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-sample-size/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261012-035336-f768/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/sriphoosanaphan2021-sample-size/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261012-035336-f768/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 12) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 12) | pass 30 via tolerance (n1, claim check 26) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 12) | pass 60 via tolerance (n1, claim check 26) |

