# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 7/7 | 7/7 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| kochanek2023-deaths-final-data-2020 | 7/7 / 7/7 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 69 | 7 | 18 | 7462 | 101706 | 7 | 0 | 0 | 0 | 1 | 4 | 3 | 1 | 1 | 1 | 1 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kochanek2023-deaths-final-data-2020 | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |

## Details

### kochanek2023-deaths-final-data-2020 | claude:claude-haiku-5-5 | run 1

Status: answer. 69 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-035954-67da. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kochanek2023-deaths-final-data-2020/run1/home/sessions/20261009-035954-67da/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kochanek2023-deaths-final-data-2020/run1/home/sessions/20261009-035954-67da/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| adjusted_all_2020 | 835.4 ±0.1 | pass 835.42 (n1 metrics.adjusted_rate_all_2020, entry 36) | pass 835.42 via tolerance (n3, claim check 86) |
| adjusted_all_2019 | 715.2 ±0.1 | pass 715.2437 (n1 metrics.adjusted_rate_all_2019, entry 36) | pass 715.24 via tolerance (n2, claim check 86) |
| adjusted_heart_2020 | 168.2 ±0.1 | pass 168.1926 (n1 metrics.adjusted_rate_heart_2020, entry 36) | pass 168.19 via tolerance (n2, claim check 86) |
| adjusted_male_2020 | 998.3 ±0.1 | pass 998.3367 (n1 metrics.adjusted_rate_male_2020, entry 36) | pass 998.34 via tolerance (n3, claim check 86) |
| adjusted_female_2020 | 695.1 ±0.1 | pass 695.0589 (n1 metrics.adjusted_rate_female_2020, entry 36) | pass 695.06 via tolerance (n3, claim check 86) |
| ratio_2020_2019 | 1.168 ±0.003 | pass 1.168022 (n1 metrics.rate_ratio, entry 36) | pass 1.168 via tolerance (n3, claim check 86) |
| ratio_male_female | 1.436 ±0.003 | pass 1.436334 (n2 metrics.rate_ratio, entry 45) | pass 1.436 via tolerance (n3, claim check 86) |

