# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 23/23 | 22/22 | 2 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| chure2024-hplc-py | 12/12 / 11/11 |
| klindworth2013-16s-primers | 11/11 / 11/11 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 2 | 247 | 14 | 42 | 17675 | 295155 | 18 | 3 | 0 | 0 | 2 | 9 | 7 | 3 | 6 | 1 | 1 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 2 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 2 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 4 | 1 |

## Details

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 1

Status: answer. 153 s. 8 requests, 11 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-000317-1ee8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261009-000317-1ee8/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261009-000317-1ee8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 43) | pass 6 via tolerance (n16, claim check 127) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 43) | pass 10.9 via tolerance (n6, claim check 127) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 43) | pass 2805655 via tolerance (n6, claim check 127) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n6 table.rows[0][3], entry 43) | pass 23380.46 via tolerance (n2, claim check 127) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 43) | pass 0.158762 via tolerance (n2, claim check 127) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 43) | pass 0.6918 via tolerance (n2, claim check 127) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 43) | pass 14.45 via tolerance (n6, claim check 127) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 43) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n14 metrics.slope, entry 87) | pass 156586.7 via tolerance (n16, claim check 127) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n14 metrics.intercept, entry 87) | pass 14624.94 via tolerance (n16, claim check 127) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n14 metrics.r_squared, entry 87) | pass 0.998868 via tolerance (n16, claim check 127) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n15 metrics.mean_concentration, entry 95) | pass 1.8994 via tolerance (n15, claim check 127) |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 1

Status: answer. 94 s. 6 requests, 7 tool calls (2 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-000550-f823. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261009-000550-f823/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261009-000550-f823/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n7, claim check 97) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 35) | pass 1608 via tolerance (n4, claim check 97) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 35) | pass 2072 via tolerance (n4, claim check 97) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 35) | pass 465 via tolerance (n6, claim check 97) |
| pair1_ecoli_position | 341 exact | pass 341 (n6 metrics.pair1_fwd_16S_pos, entry 68) | pass 341 via tolerance (n6, claim check 97) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n7, claim check 97) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 39) | pass 1275 via tolerance (n5, claim check 97) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 39) | pass 2193 via tolerance (n5, claim check 97) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 39) | pass 919 via tolerance (n6, claim check 97) |
| pair2_ecoli_position | 8 exact | pass 8 (n6 metrics.pair2_fwd_16S_pos, entry 68) | pass 8 via tolerance (n6, claim check 97) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n7 metrics.tm_c_1, entry 76) | pass 61.39 via tolerance (n7, claim check 97) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 35) | not asked |

