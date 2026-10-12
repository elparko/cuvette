# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 12/12 | 9/9 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| hackshaw1997-ets-lung-cancer | 12/12 / 9/9 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 269 | 18 | 54 | 22517 | 352887 | 12 | 0 | 0 | 0 | 3 | 8 | 12 | 8 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |

## Details

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 1

Status: answer. 85 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-030414-fda1. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/hackshaw1997-ets-lung-cancer/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261012-030414-fda1/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/hackshaw1997-ets-lung-cancer/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261012-030414-fda1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 12) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n7 metrics.effect, entry 48) | pass 1.24 via tolerance (n9, claim check 89) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n7 metrics.effect_ci_lo, entry 48) | pass 1.13 via tolerance (n4, claim check 89) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n7 metrics.effect_ci_hi, entry 48) | pass 1.36 via tolerance (n9, claim check 89) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 2

Status: answer. 113 s. 8 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-030539-de4c. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/hackshaw1997-ets-lung-cancer/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261012-030539-de4c/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/hackshaw1997-ets-lung-cancer/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261012-030539-de4c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 12) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.2385 (n12 stdout, entry 93) | pass 1.238 via tolerance (n7, claim check 111) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.1292 (n12 stdout, entry 93) | pass 1.129 via tolerance (n12, claim check 111) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.3583 (n12 stdout, entry 93) | pass 1.358 via tolerance (n12, claim check 111) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 3

Status: answer. 72 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-030731-396b. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/hackshaw1997-ets-lung-cancer/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261012-030731-396b/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/hackshaw1997-ets-lung-cancer/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261012-030731-396b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 12) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n7 metrics.effect, entry 48) | pass 1.24 via tolerance (n7, claim check 71) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n7 metrics.effect_ci_lo, entry 48) | pass 1.129 via tolerance (n7, claim check 71) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n7 metrics.effect_ci_hi, entry 48) | pass 1.358 via tolerance (n7, claim check 71) |

