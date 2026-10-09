# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 276/276 | 237/237 | 24 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| andrews-fastqc | 21/21 / 9/9 |
| chure2024-hplc-py | 36/36 / 33/33 |
| hackshaw1997-ets-lung-cancer | 12/12 / 9/9 |
| lackey2015-tb-default | 90/90 / 84/84 |
| makrai2023-colonies | 6/6 / 3/3 |
| quinlan2010-bedtools | 12/12 / 9/9 |
| sriphoosanaphan2021-sample-size | 9/9 / 6/6 |
| yun2026-lasv-elisa | 90/90 / 84/84 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 24 | 4159 | 237 | 612 | 185979 | 5937206 | 284 | 14 | 4 | 3 | 23 | 101 | 81 | 22 | 21 | 3 | 3 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $9.36 for 24 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| andrews-fastqc | claude:claude-opus-5-5 | 1 | on | 5 | 0 | 0 | 4 | 0 |
| andrews-fastqc | claude:claude-opus-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| andrews-fastqc | claude:claude-opus-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-opus-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-opus-5-5 | 2 | on | 7 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-opus-5-5 | 3 | on | 7 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-opus-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-opus-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-opus-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-opus-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| makrai2023-colonies | claude:claude-opus-5-5 | 1 | on | 5 | 0 | 1 | 2 | 0 |
| makrai2023-colonies | claude:claude-opus-5-5 | 2 | on | 5 | 0 | 0 | 3 | 0 |
| makrai2023-colonies | claude:claude-opus-5-5 | 3 | on | 4 | 0 | 1 | 2 | 0 |
| quinlan2010-bedtools | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 2 | 9 | 0 |
| quinlan2010-bedtools | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-opus-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-opus-5-5 | 2 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-opus-5-5 | 3 | on | 0 | 0 | 0 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 1 | 1 | 0 |
| yun2026-lasv-elisa | claude:claude-opus-5-5 | 2 | on | 6 | 0 | 1 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 1 | 0 | 0 |

## Details

### andrews-fastqc | claude:claude-opus-5-5 | run 1

Status: answer. 149 s. 10 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-071104-cda3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andrews-fastqc/run1/home/sessions/20261009-071104-cda3/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andrews-fastqc/run1/home/sessions/20261009-071104-cda3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 28) | pass 250000 via tolerance (n1, claim check 100) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 31) | pass 395288 via tolerance (n2, claim check 100) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 28) | pass 40 via tolerance (n2, claim check 100) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 28) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 31) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 28) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 31) | not asked |

### andrews-fastqc | claude:claude-opus-5-5 | run 2

Status: answer. 146 s. 13 requests, 15 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071336-1fdb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andrews-fastqc/run2/home/sessions/20261009-071336-1fdb/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andrews-fastqc/run2/home/sessions/20261009-071336-1fdb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 29) | pass 250000 via tolerance (n1, claim check 117) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 32) | pass 395288 via tolerance (n2, claim check 117) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 29) | pass 40 via tolerance (n5, claim check 117) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 29) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 32) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 29) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 32) | not asked |

### andrews-fastqc | claude:claude-opus-5-5 | run 3

Status: answer. 170 s. 11 requests, 17 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071604-d060. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andrews-fastqc/run3/home/sessions/20261009-071604-d060/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andrews-fastqc/run3/home/sessions/20261009-071604-d060/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 34) | pass 250000 via tolerance (n1, claim check 108) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 37) | pass 395288 via tolerance (n2, claim check 108) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 34) | pass 40 via tolerance (n2, claim check 108) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 34) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 37) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 34) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 37) | not asked |

### chure2024-hplc-py | claude:claude-opus-5-5 | run 1

Status: answer. 195 s. 12 requests, 17 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071857-545e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/chure2024-hplc-py/run1/home/sessions/20261009-071857-545e/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/chure2024-hplc-py/run1/home/sessions/20261009-071857-545e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 48) | pass 6 via tolerance (n17, claim check 156) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 48) | pass 10.9 via tolerance (n6, claim check 156) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 48) | pass 2805655 via tolerance (n2, claim check 156) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n6 table.rows[0][3], entry 48) | pass 23380.46 via tolerance (n2, claim check 156) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 48) | pass 0.15876 via tolerance (n6, claim check 156) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 48) | pass 0.6918 via tolerance (n2, claim check 156) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 48) | pass 14.45 via tolerance (n6, claim check 156) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 48) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n17 metrics.slope, entry 114) | pass 156586.7 via tolerance (n17, claim check 156) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n17 metrics.intercept, entry 114) | pass 14624.9 via tolerance (n17, claim check 156) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n17 metrics.r_squared, entry 114) | pass 0.998868 via tolerance (n17, claim check 156) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n18 metrics.mean_concentration, entry 121) | pass 1.89941 via tolerance (n18, claim check 156) |

### chure2024-hplc-py | claude:claude-opus-5-5 | run 2

Status: answer. 156 s. 8 requests, 14 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072212-d2cf. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/chure2024-hplc-py/run2/home/sessions/20261009-072212-d2cf/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/chure2024-hplc-py/run2/home/sessions/20261009-072212-d2cf/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 49) | pass 6 via tolerance (n16, claim check 134) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 49) | pass 10.9 via tolerance (n6, claim check 134) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 49) | pass 2805655 via tolerance (n2, claim check 134) |
| peak1_amplitude | 23000 ±500 | pass 23111.62 (n7 metrics.area, entry 57) | pass 23111.6 via tolerance (n7, claim check 134) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 49) | pass 0.15876 via tolerance (n6, claim check 134) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 49) | pass 0.6918 via tolerance (n2, claim check 134) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 49) | pass 14.45 via tolerance (n6, claim check 134) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 49) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n16 metrics.slope, entry 100) | pass 156586.7 via tolerance (n16, claim check 134) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n16 metrics.intercept, entry 100) | pass 14624.94 via tolerance (n16, claim check 134) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n16 metrics.r_squared, entry 100) | pass 0.998868 via tolerance (n16, claim check 134) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n18 metrics.mean_concentration, entry 110) | pass 1.89941 via tolerance (n18, claim check 134) |

### chure2024-hplc-py | claude:claude-opus-5-5 | run 3

Status: answer. 157 s. 12 requests, 18 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072449-cf31. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/chure2024-hplc-py/run3/home/sessions/20261009-072449-cf31/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/chure2024-hplc-py/run3/home/sessions/20261009-072449-cf31/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 55) | pass 6 via tolerance (n17, claim check 162) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 55) | pass 10.9 via tolerance (n6, claim check 162) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 55) | pass 2805655 via tolerance (n2, claim check 162) |
| peak1_amplitude | 23000 ±500 | pass 22875.33 (n7 metrics.area, entry 63) | pass 22875.3 via tolerance (n7, claim check 162) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 55) | pass 0.15876 via tolerance (n6, claim check 162) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 55) | pass 0.6918 via tolerance (n2, claim check 162) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 55) | pass 14.45 via tolerance (n6, claim check 162) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 55) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n17 metrics.slope, entry 118) | pass 156586.7 via tolerance (n17, claim check 162) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n17 metrics.intercept, entry 118) | pass 14624.9 via tolerance (n17, claim check 162) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n17 metrics.r_squared, entry 118) | pass 0.998868 via tolerance (n17, claim check 162) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n18 metrics.mean_concentration, entry 125) | pass 1.899 via tolerance (n18, claim check 162) |

### hackshaw1997-ets-lung-cancer | claude:claude-opus-5-5 | run 1

Status: answer. 158 s. 9 requests, 10 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072726-6aed. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261009-072726-6aed/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261009-072726-6aed/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 13) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n8 metrics.effect, entry 56) | pass 1.24 via tolerance (n10, claim check 126) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n8 metrics.effect_ci_lo, entry 56) | pass 1.13 via tolerance (n15, claim check 126) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n8 metrics.effect_ci_hi, entry 56) | pass 1.36 via tolerance (n10, claim check 126) |

### hackshaw1997-ets-lung-cancer | claude:claude-opus-5-5 | run 2

Status: answer. 142 s. 9 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073004-fd9f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261009-073004-fd9f/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261009-073004-fd9f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 13) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n8 metrics.effect, entry 56) | pass 1.2385 via tolerance (n13, claim check 126) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n8 metrics.effect_ci_lo, entry 56) | pass 1.1292 via tolerance (n13, claim check 126) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n8 metrics.effect_ci_hi, entry 56) | pass 1.3583 via tolerance (n13, claim check 126) |

### hackshaw1997-ets-lung-cancer | claude:claude-opus-5-5 | run 3

Status: answer. 170 s. 13 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-073226-a0e8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261009-073226-a0e8/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261009-073226-a0e8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 13) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n9 metrics.effect, entry 69) | pass 1.24 via tolerance (n13, claim check 160) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n9 metrics.effect_ci_lo, entry 69) | pass 1.13 via tolerance (n17, claim check 160) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n9 metrics.effect_ci_hi, entry 69) | pass 1.36 via tolerance (n13, claim check 160) |

### lackey2015-tb-default | claude:claude-opus-5-5 | run 1

Status: answer. 128 s. 13 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-073515-7504. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lackey2015-tb-default/run1/home/sessions/20261009-073515-7504/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lackey2015-tb-default/run1/home/sessions/20261009-073515-7504/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 11) | not asked |
| defaulted | 127 exact | pass 127 (n7 stdout, entry 64) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 40) | pass 0.006 via tolerance (n9, claim check 139) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 43) | pass 0.0000395 via tolerance (n9, claim check 139) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 46) | pass 0.68 via rounding (n4, claim check 139) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 49) | pass 0.034 via tolerance (n9, claim check 139) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n8 metrics.or_drug_use_Yes, entry 83) | pass 4.78 via tolerance (n8, claim check 139) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n8 metrics.or_lo_drug_use_Yes, entry 83) | pass 3.05 via tolerance (n8, claim check 139) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n8 metrics.or_hi_drug_use_Yes, entry 83) | pass 7.49 via tolerance (n8, claim check 139) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n8 metrics.or_bmi_Underweight, entry 83) | pass 2.08 via tolerance (n8, claim check 139) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n8 metrics.or_lo_bmi_Underweight, entry 83) | pass 1.21 via tolerance (n8, claim check 139) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n8 metrics.or_hi_bmi_Underweight, entry 83) | pass 3.56 via tolerance (n8, claim check 139) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n8 metrics.or_bmi_Overweight_Obese, entry 83) | pass 0.88 via tolerance (n8, claim check 139) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n8 metrics.or_lo_bmi_Overweight_Obese, entry 83) | pass 0.44 via tolerance (n8, claim check 139) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n8 metrics.or_hi_bmi_Overweight_Obese, entry 83) | pass 1.73 via tolerance (n8, claim check 139) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n8 metrics.or_mdr_tb_Yes, entry 83) | pass 3.04 via tolerance (n8, claim check 139) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n8 metrics.or_lo_mdr_tb_Yes, entry 83) | pass 1.58 via tolerance (n8, claim check 139) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n8 metrics.or_hi_mdr_tb_Yes, entry 83) | pass 5.85 via tolerance (n8, claim check 139) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n8 metrics.or_alcohol_weekly_Yes, entry 83) | pass 2.22 via tolerance (n8, claim check 139) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n8 metrics.or_lo_alcohol_weekly_Yes, entry 83) | pass 1.4 via tolerance (n8, claim check 139) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n8 metrics.or_hi_alcohol_weekly_Yes, entry 83) | pass 3.52 via tolerance (n8, claim check 139) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n8 metrics.or_hiv_status_Test_not_done, entry 83) | pass 2.3 via tolerance (n8, claim check 139) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n8 metrics.or_lo_hiv_status_Test_not_done, entry 83) | pass 1.5 via tolerance (n8, claim check 139) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n8 metrics.or_hi_hiv_status_Test_not_done, entry 83) | pass 3.54 via tolerance (n8, claim check 139) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n8 metrics.or_hiv_status_Positive, entry 83) | pass 1.39 via tolerance (n8, claim check 139) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n8 metrics.or_lo_hiv_status_Positive, entry 83) | pass 0.42 via tolerance (n8, claim check 139) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n8 metrics.or_hi_hiv_status_Positive, entry 83) | pass 4.65 via tolerance (n8, claim check 139) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n8 metrics.or_secondary_education_No, entry 83) | pass 1.55 via tolerance (n8, claim check 139) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n8 metrics.or_lo_secondary_education_No, entry 83) | pass 1.03 via tolerance (n8, claim check 139) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n8 metrics.or_hi_secondary_education_No, entry 83) | pass 2.33 via tolerance (n8, claim check 139) |

### lackey2015-tb-default | claude:claude-opus-5-5 | run 2

Status: answer. 123 s. 13 requests, 18 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073724-17f0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lackey2015-tb-default/run2/home/sessions/20261009-073724-17f0/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lackey2015-tb-default/run2/home/sessions/20261009-073724-17f0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 11) | not asked |
| defaulted | 127 exact | pass 127 (n2 table.rows[1][2], entry 36) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n3 metrics.p_value, entry 48) | pass 0.006 via tolerance (n9, claim check 143) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n4 metrics.p_value, entry 51) | pass 0.0000395 via tolerance (n9, claim check 143) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n5 metrics.p_value, entry 54) | pass 0.682 via tolerance (n5, claim check 143) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n6 metrics.p_value, entry 57) | pass 0.0344 via tolerance (n9, claim check 143) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n10 metrics.or_drug_use_Yes, entry 98) | pass 4.78 via tolerance (n10, claim check 143) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n10 metrics.or_lo_drug_use_Yes, entry 98) | pass 3.05 via tolerance (n10, claim check 143) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n10 metrics.or_hi_drug_use_Yes, entry 98) | pass 7.49 via tolerance (n10, claim check 143) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n10 metrics.or_bmi_Underweight, entry 98) | pass 2.08 via tolerance (n10, claim check 143) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n10 metrics.or_lo_bmi_Underweight, entry 98) | pass 1.21 via tolerance (n10, claim check 143) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n10 metrics.or_hi_bmi_Underweight, entry 98) | pass 3.56 via tolerance (n10, claim check 143) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n10 metrics.or_bmi_Overweight_Obese, entry 98) | pass 0.88 via tolerance (n10, claim check 143) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n10 metrics.or_lo_bmi_Overweight_Obese, entry 98) | pass 0.44 via tolerance (n10, claim check 143) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n10 metrics.or_hi_bmi_Overweight_Obese, entry 98) | pass 1.73 via tolerance (n10, claim check 143) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n10 metrics.or_mdr_tb_Yes, entry 98) | pass 3.04 via tolerance (n10, claim check 143) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n10 metrics.or_lo_mdr_tb_Yes, entry 98) | pass 1.58 via tolerance (n10, claim check 143) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n10 metrics.or_hi_mdr_tb_Yes, entry 98) | pass 5.85 via tolerance (n10, claim check 143) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n10 metrics.or_alcohol_weekly_Yes, entry 98) | pass 2.22 via tolerance (n10, claim check 143) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n10 metrics.or_lo_alcohol_weekly_Yes, entry 98) | pass 1.4 via tolerance (n10, claim check 143) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n10 metrics.or_hi_alcohol_weekly_Yes, entry 98) | pass 3.52 via tolerance (n10, claim check 143) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n10 metrics.or_hiv_status_Test_not_done, entry 98) | pass 2.3 via tolerance (n10, claim check 143) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n10 metrics.or_lo_hiv_status_Test_not_done, entry 98) | pass 1.5 via tolerance (n10, claim check 143) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n10 metrics.or_hi_hiv_status_Test_not_done, entry 98) | pass 3.54 via tolerance (n10, claim check 143) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n10 metrics.or_hiv_status_Positive, entry 98) | pass 1.39 via tolerance (n10, claim check 143) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n10 metrics.or_lo_hiv_status_Positive, entry 98) | pass 0.42 via tolerance (n10, claim check 143) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n10 metrics.or_hi_hiv_status_Positive, entry 98) | pass 4.65 via tolerance (n10, claim check 143) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n10 metrics.or_secondary_education_No, entry 98) | pass 1.55 via tolerance (n10, claim check 143) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n10 metrics.or_lo_secondary_education_No, entry 98) | pass 1.03 via tolerance (n10, claim check 143) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n10 metrics.or_hi_secondary_education_No, entry 98) | pass 2.33 via tolerance (n10, claim check 143) |

### lackey2015-tb-default | claude:claude-opus-5-5 | run 3

Status: answer. 103 s. 11 requests, 15 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073927-3b8b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lackey2015-tb-default/run3/home/sessions/20261009-073927-3b8b/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lackey2015-tb-default/run3/home/sessions/20261009-073927-3b8b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 13) | not asked |
| defaulted | 127 exact | pass 127 (n8 metrics.events, entry 86) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 40) | pass 0.006039 via tolerance (n2, claim check 127) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 43) | pass 0.00003945 via tolerance (n3, claim check 127) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 46) | pass 0.6815 via tolerance (n4, claim check 127) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 49) | pass 0.03436 via tolerance (n5, claim check 127) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n8 metrics.or_drug_use_Yes, entry 86) | pass 4.782 via tolerance (n8, claim check 127) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n8 metrics.or_lo_drug_use_Yes, entry 86) | pass 3.052 via tolerance (n8, claim check 127) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n8 metrics.or_hi_drug_use_Yes, entry 86) | pass 7.491 via tolerance (n8, claim check 127) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n8 metrics.or_bmi_Underweight, entry 86) | pass 2.08 via tolerance (n8, claim check 127) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n8 metrics.or_lo_bmi_Underweight, entry 86) | pass 1.214 via tolerance (n8, claim check 127) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n8 metrics.or_hi_bmi_Underweight, entry 86) | pass 3.563 via tolerance (n8, claim check 127) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n8 metrics.or_bmi_Overweight_Obese, entry 86) | pass 0.878 via tolerance (n8, claim check 127) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n8 metrics.or_lo_bmi_Overweight_Obese, entry 86) | pass 0.444 via tolerance (n8, claim check 127) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n8 metrics.or_hi_bmi_Overweight_Obese, entry 86) | pass 1.733 via tolerance (n8, claim check 127) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n8 metrics.or_mdr_tb_Yes, entry 86) | pass 3.038 via tolerance (n8, claim check 127) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n8 metrics.or_lo_mdr_tb_Yes, entry 86) | pass 1.578 via tolerance (n8, claim check 127) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n8 metrics.or_hi_mdr_tb_Yes, entry 86) | pass 5.851 via tolerance (n8, claim check 127) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n8 metrics.or_alcohol_weekly_Yes, entry 86) | pass 2.222 via tolerance (n8, claim check 127) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n8 metrics.or_lo_alcohol_weekly_Yes, entry 86) | pass 1.401 via tolerance (n8, claim check 127) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n8 metrics.or_hi_alcohol_weekly_Yes, entry 86) | pass 3.525 via tolerance (n8, claim check 127) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n8 metrics.or_hiv_status_Test_not_done, entry 86) | pass 2.303 via tolerance (n8, claim check 127) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n8 metrics.or_lo_hiv_status_Test_not_done, entry 86) | pass 1.5 via tolerance (n8, claim check 127) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n8 metrics.or_hi_hiv_status_Test_not_done, entry 86) | pass 3.536 via tolerance (n8, claim check 127) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n8 metrics.or_hiv_status_Positive, entry 86) | pass 1.392 via tolerance (n8, claim check 127) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n8 metrics.or_lo_hiv_status_Positive, entry 86) | pass 0.417 via tolerance (n8, claim check 127) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n8 metrics.or_hi_hiv_status_Positive, entry 86) | pass 4.654 via tolerance (n8, claim check 127) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n8 metrics.or_secondary_education_No, entry 86) | pass 1.55 via tolerance (n8, claim check 127) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n8 metrics.or_lo_secondary_education_No, entry 86) | pass 1.032 via tolerance (n8, claim check 127) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n8 metrics.or_hi_secondary_education_No, entry 86) | pass 2.329 via tolerance (n8, claim check 127) |

### makrai2023-colonies | claude:claude-opus-5-5 | run 1

Status: answer. 298 s. 13 requests, 15 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-074110-9a70. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/makrai2023-colonies/run1/home/sessions/20261009-074110-9a70/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 1 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/makrai2023-colonies/run1/home/sessions/20261009-074110-9a70/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 76) | not asked |
| total_colonies | 88 ±9 | pass 88 (n7 metrics.total_colonies, entry 90) | pass 88 via tolerance (n11, claim check 159) |

### makrai2023-colonies | claude:claude-opus-5-5 | run 2

Status: answer. 354 s. 15 requests, 15 tool calls (0 failed), 1 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-074609-fa8b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/makrai2023-colonies/run2/home/sessions/20261009-074609-fa8b/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/makrai2023-colonies/run2/home/sessions/20261009-074609-fa8b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 68) | not asked |
| total_colonies | 88 ±9 | pass 88 (n11 metrics.total_colonies, entry 98) | pass 88 via tolerance (n16, claim check 179) |

### makrai2023-colonies | claude:claude-opus-5-5 | run 3

Status: answer. 720 s. 17 requests, 24 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-075202-2ffe. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/makrai2023-colonies/run3/home/sessions/20261009-075202-2ffe/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 1 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/makrai2023-colonies/run3/home/sessions/20261009-075202-2ffe/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 74) | not asked |
| total_colonies | 88 ±9 | pass 88 (n12 metrics.total_colonies, entry 114) | pass 88 via tolerance (n21, claim check 229) |

### quinlan2010-bedtools | claude:claude-opus-5-5 | run 1

Status: answer. 59 s. 4 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080403-13c4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/quinlan2010-bedtools/run1/home/sessions/20261009-080403-13c4/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/quinlan2010-bedtools/run1/home/sessions/20261009-080403-13c4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 19) | pass 126 via tolerance (n2, claim check 40) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 19) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 19) | pass 33713 via tolerance (n1, claim check 40) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 25) | pass 11270 via tolerance (n3, claim check 40) |

### quinlan2010-bedtools | claude:claude-opus-5-5 | run 2

Status: answer. 68 s. 5 requests, 10 tool calls (2 failed), 0 nudges, 0 plan reminders, 9 unsourced.
Session: 20261009-080503-48e5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/quinlan2010-bedtools/run2/home/sessions/20261009-080503-48e5/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 2 blocked, 9 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/quinlan2010-bedtools/run2/home/sessions/20261009-080503-48e5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_result, entry 27) | pass 126 via tolerance (n2, claim check 60) |
| overlapping_pairs | 129 exact | pass 129 (n2 metrics.n_result, entry 30) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n2 metrics.overlap_bases, entry 30) | pass 33713 via tolerance (n2, claim check 60) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 33) | pass 11270 via tolerance (n3, claim check 60) |

### quinlan2010-bedtools | claude:claude-opus-5-5 | run 3

Status: answer. 56 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080612-c315. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/quinlan2010-bedtools/run3/home/sessions/20261009-080612-c315/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/quinlan2010-bedtools/run3/home/sessions/20261009-080612-c315/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_result, entry 11) | pass 126 via tolerance (n2, claim check 32) |
| overlapping_pairs | 129 exact | pass 129 (n2 metrics.n_result, entry 14) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n2 metrics.overlap_bases, entry 14) | pass 33713 via tolerance (n2, claim check 32) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 17) | pass 11270 via tolerance (n3, claim check 32) |

### sriphoosanaphan2021-sample-size | claude:claude-opus-5-5 | run 1

Status: answer. 55 s. 3 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080710-5a3d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261009-080710-5a3d/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261009-080710-5a3d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 11) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 11) | pass 30 via tolerance (n1, claim check 31) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 11) | pass 60 via tolerance (n1, claim check 31) |

### sriphoosanaphan2021-sample-size | claude:claude-opus-5-5 | run 2

Status: answer. 44 s. 3 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080809-6473. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261009-080809-6473/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261009-080809-6473/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 11) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 11) | pass 30 via tolerance (n1, claim check 30) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 11) | pass 60 via tolerance (n1, claim check 30) |

### sriphoosanaphan2021-sample-size | claude:claude-opus-5-5 | run 3

Status: answer. 32 s. 3 requests, 1 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080854-909e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261009-080854-909e/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261009-080854-909e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 11) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 11) | pass 30 via tolerance (n1, claim check 28) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 11) | pass 60 via tolerance (n1, claim check 28) |

### yun2026-lasv-elisa | claude:claude-opus-5-5 | run 1

Status: answer. 207 s. 12 requests, 11 tool calls (2 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-080926-0226. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/yun2026-lasv-elisa/run1/home/sessions/20261009-080926-0226/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/yun2026-lasv-elisa/run1/home/sessions/20261009-080926-0226/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 77) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.5869 (n5 stdout, entry 94) | pass 7.587 via tolerance (n3, claim check 135) |
| conc_d2 | 3.7072 ±0.001 | pass 3.7072 (n5 stdout, entry 94) | pass 3.707 via tolerance (n3, claim check 135) |
| conc_d3 | 1.8719 ±0.001 | pass 1.8719 (n5 stdout, entry 94) | pass 1.872 via tolerance (n5, claim check 135) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n3 metrics.mean_conc_STD_4, entry 77) | pass 0.9171 via tolerance (n5, claim check 135) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n3 metrics.mean_conc_STD_5, entry 77) | pass 0.4637 via tolerance (n5, claim check 135) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334 (n5 stdout, entry 94) | pass 0.2334 via tolerance (n5, claim check 135) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n3 metrics.mean_conc_STD_7, entry 77) | pass 0.1205 via tolerance (n5, claim check 135) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n3 metrics.mean_conc_STD_8, entry 77) | pass 0.05579 via tolerance (n3, claim check 135) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n3 metrics.mean_conc_STD_9, entry 77) | pass 0.02661 via tolerance (n3, claim check 135) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n3 metrics.mean_conc_STD_10, entry 77) | pass 0.01388 via tolerance (n2, claim check 135) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07 (n5 stdout, entry 94) | pass 11.07 via tolerance (n5, claim check 135) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.9268 (n5 stdout, entry 94) | pass 10.93 via tolerance (n5, claim check 135) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 77) | pass 15.71 via tolerance (n5, claim check 135) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 77) | pass 15.55 via tolerance (n3, claim check 135) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n3 metrics.cv_conc_pct_STD_9, entry 77) | pass 25.89 via tolerance (n5, claim check 135) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 77) | pass 21.92 via tolerance (n3, claim check 135) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.6206 (n5 stdout, entry 94) | pass 26.62 via tolerance (n3, claim check 135) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.8867 (n5 stdout, entry 94) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.9718 (n5 stdout, entry 94) | pass 97.97 via tolerance (n5, claim check 135) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n3 metrics.recovery_pct_STD_4, entry 77) | pass 94.74 via tolerance (n3, claim check 135) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n3 metrics.recovery_pct_STD_7, entry 77) | pass 99.55 via tolerance (n3, claim check 135) |
| recovery_d9 | 88.71 ±0.06 | pass 88.7106 (n5 stdout, entry 94) | pass 88.71 via tolerance (n5, claim check 135) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n3 metrics.recovery_pct_STD_10, entry 77) | differs 92.56 (n3, claim check 135) |
| hpc_conc | 1.9932 ±0.001 | pass 1.9932 (n5 stdout, entry 94) | pass 1.993 via tolerance (n3, claim check 135) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n3 metrics.cv_conc_pct_HPC, entry 77) | pass 22.45 via tolerance (n5, claim check 135) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n5 stdout, entry 94) | pass 107.28 via tolerance (n5, claim check 135) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 77) | pass 0.4569 via tolerance (n5, claim check 135) |
| lpc_recovery | 98.25 ±0.06 | pass 98.2536 (n5 stdout, entry 94) | pass 98.25 via tolerance (n5, claim check 135) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.028 (n5 stdout, entry 94) | match 20 via rounding (n2, claim check 135) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 77) | pass 0.121 via tolerance (n5, claim check 135) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 77) | pass 7.744 via tolerance (n5, claim check 135) |

### yun2026-lasv-elisa | claude:claude-opus-5-5 | run 2

Status: answer. 255 s. 14 requests, 11 tool calls (2 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081254-a694. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/yun2026-lasv-elisa/run2/home/sessions/20261009-081254-a694/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/yun2026-lasv-elisa/run2/home/sessions/20261009-081254-a694/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 64) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.5869 (n5 stdout, entry 88) | pass 7.587 via tolerance (n3, claim check 146) |
| conc_d2 | 3.7072 ±0.001 | pass 3.7072 (n5 stdout, entry 88) | pass 3.707 via tolerance (n3, claim check 146) |
| conc_d3 | 1.8719 ±0.001 | pass 1.8719 (n5 stdout, entry 88) | pass 1.872 via tolerance (n5, claim check 146) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n3 metrics.mean_conc_STD_4, entry 64) | pass 0.917 via tolerance (n3, claim check 146) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n3 metrics.mean_conc_STD_5, entry 64) | pass 0.464 via tolerance (n1, claim check 146) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334 (n5 stdout, entry 88) | pass 0.233 via tolerance (n5, claim check 146) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n3 metrics.mean_conc_STD_7, entry 64) | pass 0.1205 via tolerance (n5, claim check 146) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n3 metrics.mean_conc_STD_8, entry 64) | pass 0.0558 via tolerance (n5, claim check 146) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n3 metrics.mean_conc_STD_9, entry 64) | pass 0.0266 via tolerance (n5, claim check 146) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n3 metrics.mean_conc_STD_10, entry 64) | pass 0.0139 via tolerance (n5, claim check 146) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07 (n5 stdout, entry 88) | pass 11.07 via tolerance (n5, claim check 146) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.9268 (n5 stdout, entry 88) | pass 10.93 via tolerance (n5, claim check 146) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 64) | pass 15.71 via tolerance (n5, claim check 146) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 64) | pass 15.55 via tolerance (n3, claim check 146) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n3 metrics.cv_conc_pct_STD_9, entry 64) | pass 25.89 via tolerance (n5, claim check 146) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 64) | pass 21.92 via tolerance (n3, claim check 146) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.6206 (n5 stdout, entry 88) | pass 26.62 via tolerance (n3, claim check 146) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.8867 (n5 stdout, entry 88) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.9718 (n5 stdout, entry 88) | pass 97.97 via tolerance (n5, claim check 146) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n3 metrics.recovery_pct_STD_4, entry 64) | pass 94.74 via tolerance (n3, claim check 146) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n3 metrics.recovery_pct_STD_7, entry 64) | pass 99.55 via tolerance (n3, claim check 146) |
| recovery_d9 | 88.71 ±0.06 | pass 88.7106 (n5 stdout, entry 88) | pass 88.71 via tolerance (n5, claim check 146) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n3 metrics.recovery_pct_STD_10, entry 64) | differs 92.56 (n3, claim check 146) |
| hpc_conc | 1.9932 ±0.001 | pass 1.9932 (n5 stdout, entry 88) | pass 1.993 via tolerance (n3, claim check 146) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n3 metrics.cv_conc_pct_HPC, entry 64) | pass 22.45 via tolerance (n5, claim check 146) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n5 stdout, entry 88) | pass 107.28 via tolerance (n5, claim check 146) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 64) | pass 0.457 via tolerance (n5, claim check 146) |
| lpc_recovery | 98.25 ±0.06 | pass 98.2536 (n5 stdout, entry 88) | pass 98.25 via tolerance (n5, claim check 146) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.028 (n5 stdout, entry 88) | match 20 via rounding (n4, claim check 146) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 64) | pass 0.121 via tolerance (n5, claim check 146) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 64) | pass 7.744 via tolerance (n5, claim check 146) |

### yun2026-lasv-elisa | claude:claude-opus-5-5 | run 3

Status: answer. 215 s. 11 requests, 11 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-081709-fb7b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/yun2026-lasv-elisa/run3/home/sessions/20261009-081709-fb7b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/yun2026-lasv-elisa/run3/home/sessions/20261009-081709-fb7b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n4 metrics.n_plates, entry 66) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.5869 (n6 stdout, entry 82) | pass 7.587 via tolerance (n4, claim check 132) |
| conc_d2 | 3.7072 ±0.001 | pass 3.7072 (n6 stdout, entry 82) | pass 3.707 via tolerance (n4, claim check 132) |
| conc_d3 | 1.8719 ±0.001 | pass 1.8719 (n6 stdout, entry 82) | pass 1.872 via tolerance (n6, claim check 132) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n4 metrics.mean_conc_STD_4, entry 66) | pass 0.917 via tolerance (n4, claim check 132) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n4 metrics.mean_conc_STD_5, entry 66) | pass 0.464 via tolerance (n2, claim check 132) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334 (n6 stdout, entry 82) | pass 0.233 via tolerance (n6, claim check 132) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n4 metrics.mean_conc_STD_7, entry 66) | pass 0.1205 via tolerance (n6, claim check 132) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n4 metrics.mean_conc_STD_8, entry 66) | pass 0.0558 via tolerance (n6, claim check 132) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n4 metrics.mean_conc_STD_9, entry 66) | pass 0.0266 via tolerance (n6, claim check 132) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n4 metrics.mean_conc_STD_10, entry 66) | pass 0.0139 via tolerance (n6, claim check 132) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07 (n6 stdout, entry 82) | pass 11.07 via tolerance (n6, claim check 132) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.9268 (n6 stdout, entry 82) | pass 10.93 via tolerance (n6, claim check 132) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n4 metrics.cv_conc_pct_STD_7, entry 66) | pass 15.71 via tolerance (n6, claim check 132) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n4 metrics.cv_conc_pct_STD_8, entry 66) | pass 15.55 via tolerance (n4, claim check 132) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n4 metrics.cv_conc_pct_STD_9, entry 66) | pass 25.89 via tolerance (n6, claim check 132) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n4 table.rows[9][6], entry 66) | pass 21.92 via tolerance (n4, claim check 132) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.6206 (n6 stdout, entry 82) | pass 26.62 via tolerance (n4, claim check 132) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.8867 (n6 stdout, entry 82) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.9718 (n6 stdout, entry 82) | pass 97.97 via tolerance (n6, claim check 132) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n4 metrics.recovery_pct_STD_4, entry 66) | pass 94.74 via tolerance (n4, claim check 132) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n4 metrics.recovery_pct_STD_7, entry 66) | pass 99.55 via tolerance (n4, claim check 132) |
| recovery_d9 | 88.71 ±0.06 | pass 88.7106 (n6 stdout, entry 82) | pass 88.71 via tolerance (n6, claim check 132) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n4 metrics.recovery_pct_STD_10, entry 66) | differs 92.56 (n4, claim check 132) |
| hpc_conc | 1.9932 ±0.001 | pass 1.9932 (n6 stdout, entry 82) | pass 1.993 via tolerance (n4, claim check 132) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n4 metrics.cv_conc_pct_HPC, entry 66) | pass 22.45 via tolerance (n6, claim check 132) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n6 stdout, entry 82) | pass 107.28 via tolerance (n6, claim check 132) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n4 metrics.mean_conc_LPC, entry 66) | pass 0.457 via tolerance (n6, claim check 132) |
| lpc_recovery | 98.25 ±0.06 | pass 98.2536 (n6 stdout, entry 82) | pass 98.25 via tolerance (n6, claim check 132) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.028 (n6 stdout, entry 82) | differs 20.03 (n6, claim check 132) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n1 stdout, entry 20) | pass 0.121 via tolerance (n6, claim check 132) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n1 stdout, entry 20) | pass 7.744 via tolerance (n6, claim check 132) |

