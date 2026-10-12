# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 18/18 | 12/12 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| student1908-sleep | 18/18 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 130 | 16 | 42 | 10427 | 246168 | 11 | 0 | 0 | 0 | 2 | 3 | 5 | 1 | 1 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| student1908-sleep | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 1 | 0 |
| student1908-sleep | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |

## Details

### student1908-sleep | claude:claude-haiku-5-5 | run 1

Status: answer. 25 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-053139-9e86. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/student1908-sleep/claude_claude-haiku-5-5/student1908-sleep/run1/home/sessions/20261012-053139-9e86/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/student1908-sleep/claude_claude-haiku-5-5/student1908-sleep/run1/home/sessions/20261012-053139-9e86/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 41) | pass 1.58 via tolerance (n2, claim check 49) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 41) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 41) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 41) | pass 0.0028 via tolerance (n2, claim check 49) |
| ci_lower | 0.7 ±0.005 | pass 0.7 (n1 file:/private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/student1908-sleep/claude_claude-haiku-5-5/student1908-sleep/run1/home/sessions/20261012-053139-9e86/work/inspect_table-1/columns.csv, entry 12) | pass 0.7 via tolerance (n1, claim check 49) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 41) | pass 2.46 via tolerance (n2, claim check 49) |

### student1908-sleep | claude:claude-haiku-5-5 | run 2

Status: answer. 51 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-053204-a05d. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/student1908-sleep/claude_claude-haiku-5-5/student1908-sleep/run2/home/sessions/20261012-053204-a05d/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/student1908-sleep/claude_claude-haiku-5-5/student1908-sleep/run2/home/sessions/20261012-053204-a05d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 41) | pass 1.58 via tolerance (n2, claim check 68) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 41) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 41) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 41) | pass 0.0028 via tolerance (n2, claim check 68) |
| ci_lower | 0.7 ±0.005 | pass 0.7 (n1 file:/private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/student1908-sleep/claude_claude-haiku-5-5/student1908-sleep/run2/home/sessions/20261012-053204-a05d/work/inspect_table-1/columns.csv, entry 12) | pass 0.7 via tolerance (n1, claim check 68) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 41) | pass 2.46 via tolerance (n2, claim check 68) |

### student1908-sleep | claude:claude-haiku-5-5 | run 3

Status: answer. 55 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-053254-af36. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/student1908-sleep/claude_claude-haiku-5-5/student1908-sleep/run3/home/sessions/20261012-053254-af36/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-d/bench-runs/student1908-sleep/claude_claude-haiku-5-5/student1908-sleep/run3/home/sessions/20261012-053254-af36/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 42) | pass 1.58 via tolerance (n2, claim check 69) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 42) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 42) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 42) | pass 0.0028 via tolerance (n2, claim check 69) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 42) | pass 0.7 via tolerance (n2, claim check 69) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 42) | pass 2.46 via tolerance (n2, claim check 69) |

