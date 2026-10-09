# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 20/26 | 18/24 | 2 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| wang2023-cuproptosis-oa | 13/14 / 12/13 |
| chure2024-hplc-py | 7/12 / 6/11 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 2 | 387 | 27 | 64 | 47025 | 789133 | 27 | 13 | 0 | 1 | 2 | 6 | 28 | 4 | 2 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.04 for 2 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 2 | 0 |

## Details

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 1

Status: answer. 91 s. 6 requests, 6 tool calls (5 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-234244-0a03. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261008-234244-0a03/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261008-234244-0a03/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | FAIL 0.989 (n1 data.duration_s, entry 29) | FAIL 1 (n1, claim check 96) |
| set_size_1 | 1578 exact | pass 1578 (n1 stdout, entry 29) | pass 1578 via tolerance (n1, claim check 96) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845 (n1 stdout, entry 29) | pass 0.001845 via tolerance (n1, claim check 96) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.111867 (n1 stdout, entry 29) | pass 0.111867 via tolerance (n1, claim check 96) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n1 stdout, entry 29) | pass 35.08762 via tolerance (n1, claim check 96) |
| set_size_2 | 24 exact | pass 24 (n1 stdout, entry 29) | pass 24 via tolerance (n1, claim check 96) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004792 (n1 stdout, entry 29) | pass 0.004792 via tolerance (n1, claim check 96) |
| set_size_3 | 30 exact | pass 30 (n1 stdout, entry 29) | pass 30 via tolerance (n1, claim check 96) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005987 (n1 stdout, entry 29) | pass 0.005987 via tolerance (n1, claim check 96) |
| set_size_4 | 649 exact | pass 649 (n1 stdout, entry 29) | pass 649 via tolerance (n1, claim check 96) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.00604 (n1 stdout, entry 29) | pass 0.00604 via tolerance (n1, claim check 96) |
| set_size_5 | 37 exact | pass 37 (n1 stdout, entry 29) | pass 37 via tolerance (n1, claim check 96) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.00738 (n1 stdout, entry 29) | pass 0.00738 via tolerance (n1, claim check 96) |
| n_sets_tested | 4026 exact | pass 4026 (n2 stdout, entry 74) | not asked |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 1

Status: answer. 296 s. 21 requests, 21 tool calls (8 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261008-234416-bd6c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261008-234416-bd6c/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261008-234416-bd6c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | FAIL 4.087477 (n2 stdout, entry 75) | FAIL 4 (n2, claim check 222) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.903 (n3 stdout, entry 84) | pass 10.903 via tolerance (n9, claim check 222) |
| peak1_area | 2800000 ±50000 | pass 2790511 (n3 stdout, entry 84) | pass 2790511 via tolerance (n3, claim check 222) |
| peak1_amplitude | 23000 ±500 | pass 23245 (n3 stdout, entry 84) | FAIL 13519 (n7, claim check 222) |
| peak1_scale | 0.16 ±0.005 | pass 0.158 (n3 stdout, entry 84) | pass 0.158 via tolerance (n9, claim check 222) |
| peak1_skew | 0.7 ±0.005 | FAIL 0.689 (n3 stdout, entry 84) | FAIL 0.689 (n9, claim check 222) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.448 (n3 stdout, entry 84) | pass 14.448 via tolerance (n9, claim check 222) |
| peak1_area_exact | 2805655.43 ±300 | FAIL 2790511 (n3 stdout, entry 84) | not asked |
| calibration_slope | 156586.74 ±160 | FAIL 155993.4 (n7 stdout, entry 137) | FAIL 155993.4 (n7, claim check 222) |
| calibration_intercept | 14624.94 ±150 | FAIL 14880.3 (n3 stdout, entry 84) | FAIL 13519 (n7, claim check 222) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.99887 (n7 stdout, entry 137) | pass 0.99887 via tolerance (n7, claim check 222) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899 (n7 stdout, entry 137) | pass 1.899 via tolerance (n8, claim check 222) |

