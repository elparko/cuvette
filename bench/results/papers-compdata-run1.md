# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 12/12 | 12/12 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| hahne2009-flowcore-compdata | 12/12 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 69 | 5 | 14 | 5476 | 46300 | 4 | 1 | 0 | 0 | 1 | 5 | 5 | 2 | 1 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hahne2009-flowcore-compdata | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 1 | 1 | 0 |

## Details

### hahne2009-flowcore-compdata | claude:claude-haiku-5-5 | run 1

Status: answer. 69 s. 5 requests, 4 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-034053-e251. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hahne2009-flowcore-compdata/run1/home/sessions/20261009-034053-e251/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hahne2009-flowcore-compdata/run1/home/sessions/20261009-034053-e251/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spill_fl1_to_fl2 | 0.242022 ±0.00005 | pass 0.2420223 (n1 metrics.max_off_diagonal, entry 30) | pass 0.242 via tolerance (n1, claim check 64) |
| spill_fl1_to_fl3 | 0.032084 ±0.0004 | pass 0.0324092 (n1 metrics.spill_FL1_H_to_FL3_H, entry 30) | pass 0.032 via tolerance (n1, claim check 64) |
| spill_fl1_to_fl4 | 0.001128 ±0.00005 | pass 0.001127816 (n1 metrics.spill_FL1_H_to_FL4_H, entry 30) | pass 0.0011 via tolerance (n1, claim check 64) |
| spill_fl2_to_fl1 | 0.007722 ±0.00005 | pass 0.007722048 (n1 metrics.spill_FL2_H_to_FL1_H, entry 30) | pass 0.0077 via tolerance (n1, claim check 64) |
| spill_fl2_to_fl3 | 0.140788 ±0.00005 | pass 0.1407882 (n1 metrics.spill_FL2_H_to_FL3_H, entry 30) | pass 0.141 via rounding (n1, claim check 64) |
| spill_fl2_to_fl4 | 0.002633 ±0.0002 | pass 0.00273953 (n1 metrics.spill_FL2_H_to_FL4_H, entry 30) | pass 0.0027 via tolerance (n1, claim check 64) |
| spill_fl3_to_fl1 | 0.015081 ±0.00005 | pass 0.01508063 (n1 metrics.spill_FL3_H_to_FL1_H, entry 30) | pass 0.015 via rounding (n1, claim check 64) |
| spill_fl3_to_fl2 | 0.17559 ±0.00005 | pass 0.1755899 (n1 metrics.spill_FL3_H_to_FL2_H, entry 30) | pass 0.176 via rounding (n1, claim check 64) |
| spill_fl3_to_fl4 | 0.229594 ±0.00005 | pass 0.2295939 (n1 metrics.spill_FL3_H_to_FL4_H, entry 30) | pass 0.23 via rounding (n1, claim check 64) |
| spill_fl4_to_fl1 | 0.000759 ±0.00005 | pass 0.0007590319 (n1 metrics.spill_FL4_H_to_FL1_H, entry 30) | pass 0.00076 via tolerance (n1, claim check 64) |
| spill_fl4_to_fl2 | 0.000962 ±0.00005 | pass 0.0009620459 (n1 metrics.spill_FL4_H_to_FL2_H, entry 30) | pass 0.00096 via tolerance (n1, claim check 64) |
| spill_fl4_to_fl3 | 0.003219 ±0.00005 | pass 0.003218614 (n1 metrics.spill_FL4_H_to_FL3_H, entry 30) | pass 0.0032 via tolerance (n1, claim check 64) |

