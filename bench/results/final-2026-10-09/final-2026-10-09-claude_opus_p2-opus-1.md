# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 150/150 | 117/117 | 18 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| aledo2022-renz-onpg | 6/6 / 6/6 |
| bemis2015-cardinal | 15/15 / 15/15 |
| desveaux2026-pcrv-ic50 | 27/27 / 24/24 |
| kasurinen2018-mmp14-gastric | 75/75 / 51/51 |
| ljosa2012-bbbc005 | 9/9 / 6/6 |
| oksanen-vegan-dune | 18/18 / 15/15 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 18 | 4445 | 201 | 503 | 139980 | 4604032 | 262 | 15 | 2 | 1 | 14 | 61 | 76 | 16 | 3 | 5 | 5 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $7.52 for 18 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aledo2022-renz-onpg | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 1 | 0 | 0 |
| aledo2022-renz-onpg | claude:claude-opus-5-5 | 2 | on | 1 | 0 | 1 | 1 | 0 |
| aledo2022-renz-onpg | claude:claude-opus-5-5 | 3 | on | 1 | 0 | 1 | 0 | 0 |
| bemis2015-cardinal | claude:claude-opus-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-opus-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-opus-5-5 | 3 | on | 6 | 0 | 0 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-opus-5-5 | 1 | on | 6 | 0 | 1 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-opus-5-5 | 2 | on | 6 | 0 | 3 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-opus-5-5 | 3 | on | 5 | 0 | 3 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-opus-5-5 | 1 | on | 10 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-opus-5-5 | 2 | on | 9 | 0 | 0 | 1 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-opus-5-5 | 3 | on | 6 | 0 | 0 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 1 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 1 | 1 | 0 |
| ljosa2012-bbbc005 | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 1 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### aledo2022-renz-onpg | claude:claude-opus-5-5 | run 1

Status: answer. 61 s. 6 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071104-bb87. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/aledo2022-renz-onpg/run1/home/sessions/20261009-071104-bb87/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/aledo2022-renz-onpg/run1/home/sessions/20261009-071104-bb87/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 30) | pass 2.479 via tolerance (n1, claim check 56) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 30) | pass 0.1841 via tolerance (n1, claim check 56) |

### aledo2022-renz-onpg | claude:claude-opus-5-5 | run 2

Status: answer. 89 s. 7 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-071205-f78f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/aledo2022-renz-onpg/run2/home/sessions/20261009-071205-f78f/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/aledo2022-renz-onpg/run2/home/sessions/20261009-071205-f78f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 30) | pass 2.47926 via tolerance (n4, claim check 73) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 30) | pass 0.184074 via tolerance (n4, claim check 73) |

### aledo2022-renz-onpg | claude:claude-opus-5-5 | run 3

Status: answer. 65 s. 6 requests, 4 tool calls (1 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071334-d6f6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/aledo2022-renz-onpg/run3/home/sessions/20261009-071334-d6f6/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/aledo2022-renz-onpg/run3/home/sessions/20261009-071334-d6f6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 30) | pass 2.479 via tolerance (n1, claim check 55) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 30) | pass 0.1841 via tolerance (n1, claim check 55) |

### bemis2015-cardinal | claude:claude-opus-5-5 | run 1

Status: answer. 227 s. 13 requests, 17 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071439-2d75. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bemis2015-cardinal/run1/home/sessions/20261009-071439-2d75/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bemis2015-cardinal/run1/home/sessions/20261009-071439-2d75/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 25) | pass 4959 via tolerance (n18, claim check 166) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 25) | pass 10200 via tolerance (n1, claim check 166) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 60) | pass 687 via tolerance (n5, claim check 166) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 77) | pass 6 via tolerance (n16, claim check 166) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 77) | pass 3 via tolerance (n16, claim check 166) |

### bemis2015-cardinal | claude:claude-opus-5-5 | run 2

Status: answer. 161 s. 12 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071826-0c65. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bemis2015-cardinal/run2/home/sessions/20261009-071826-0c65/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bemis2015-cardinal/run2/home/sessions/20261009-071826-0c65/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 21) | pass 4959 via tolerance (n5, claim check 153) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 21) | pass 10200 via tolerance (n1, claim check 153) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 54) | pass 687 via tolerance (n5, claim check 153) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 71) | pass 6 via tolerance (n14, claim check 153) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 71) | pass 3 via tolerance (n14, claim check 153) |

### bemis2015-cardinal | claude:claude-opus-5-5 | run 3

Status: answer. 229 s. 13 requests, 15 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072107-d951. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bemis2015-cardinal/run3/home/sessions/20261009-072107-d951/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bemis2015-cardinal/run3/home/sessions/20261009-072107-d951/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 21) | pass 4959 via tolerance (n5, claim check 158) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 21) | pass 10200 via tolerance (n1, claim check 158) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 53) | pass 687 via tolerance (n5, claim check 158) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 70) | pass 6 via tolerance (n14, claim check 158) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 70) | pass 3 via tolerance (n14, claim check 158) |

### desveaux2026-pcrv-ic50 | claude:claude-opus-5-5 | run 1

Status: answer. 221 s. 14 requests, 28 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072456-5a79. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-072456-5a79/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-072456-5a79/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.11725 (n18 stdout, entry 144) | pass 0.11725 via tolerance (n18, claim check 168) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.021307 (n18 stdout, entry 144) | pass 0.021307 via tolerance (n18, claim check 168) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n18 stdout, entry 144) | pass 3.6534 via tolerance (n18, claim check 168) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n4 metrics.P3D6_ic50, entry 79) | pass 11.792 via tolerance (n4, claim check 168) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.012782 (n18 stdout, entry 144) | pass 0.012782 via tolerance (n18, claim check 168) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.011202 (n18 stdout, entry 144) | pass 0.011202 via tolerance (n18, claim check 168) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.01305 (n18 stdout, entry 144) | pass 0.01305 via tolerance (n18, claim check 168) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.010452 (n18 stdout, entry 144) | pass 0.010452 via tolerance (n18, claim check 168) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n18 stdout, entry 144) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | match 0.0451 (n17 stdout, entry 128) | match 0.04518 via tolerance (n6, claim check 168) |

### desveaux2026-pcrv-ic50 | claude:claude-opus-5-5 | run 2

Status: answer. 217 s. 15 requests, 20 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072837-6cef. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261009-072837-6cef/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 3 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261009-072837-6cef/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.11725 (n11 stdout, entry 121) | pass 0.1173 via tolerance (n2, claim check 151) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n2 metrics.30_B8_ic50, entry 55) | pass 0.02131 via tolerance (n11, claim check 151) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n2 metrics.P3D6_ic50, entry 55) | pass 3.653 via tolerance (n2, claim check 151) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n4 metrics.P3D6_ic50, entry 70) | pass 11.79 via tolerance (n11, claim check 151) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n5 metrics.V2_ic50, entry 73) | pass 0.01278 via tolerance (n11, claim check 151) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n5 metrics.V3_ic50, entry 73) | pass 0.0112 via tolerance (n11, claim check 151) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.01305 (n11 stdout, entry 121) | pass 0.01305 via tolerance (n11, claim check 151) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n5 metrics.V5_ic50, entry 73) | pass 0.01045 via tolerance (n11, claim check 151) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n4 metrics.30_B8_ic50, entry 70) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | match 0.04517791 (n9 metrics.30_B8_ic50, entry 104) | match 0.04518 via tolerance (n9, claim check 151) |

### desveaux2026-pcrv-ic50 | claude:claude-opus-5-5 | run 3

Status: answer. 270 s. 15 requests, 30 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073214-3fdf. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261009-073214-3fdf/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 3 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261009-073214-3fdf/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.11725 (n21 stdout, entry 155) | pass 0.11725 via tolerance (n21, claim check 181) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n2 metrics.30_B8_ic50, entry 54) | pass 0.02131 via tolerance (n21, claim check 181) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n2 metrics.P3D6_ic50, entry 54) | pass 3.65345 via tolerance (n21, claim check 181) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n4 metrics.P3D6_ic50, entry 66) | pass 11.792 via tolerance (n5, claim check 181) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n3 metrics.V2_ic50, entry 57) | pass 0.01278 via tolerance (n21, claim check 181) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n3 metrics.V3_ic50, entry 57) | pass 0.0112 via tolerance (n21, claim check 181) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.01305 (n21 stdout, entry 155) | pass 0.01305 via tolerance (n21, claim check 181) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n3 metrics.V5_ic50, entry 57) | pass 0.01045 via tolerance (n21, claim check 181) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n4 metrics.30_B8_ic50, entry 66) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | match 0.0451 (n16 stdout, entry 110) | match 0.04518 via tolerance (n17, claim check 181) |

### kasurinen2018-mmp14-gastric | claude:claude-opus-5-5 | run 1

Status: answer. 168 s. 14 requests, 17 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073644-80ea. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261009-073644-80ea/log.jsonl
Leak check: 10 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261009-073644-80ea/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 13) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 35) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n2 table.rows[0][4], entry 35) | pass 0.492 via tolerance (n7, claim check 139) |
| surv5_high | 0.2211 ±0.001 | pass 0.221053 (n7 stdout, entry 102) | pass 0.221 via tolerance (n2, claim check 139) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 35) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 35) | pass 0.00138 via tolerance (n2, claim check 139) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 61) | pass 1.92 via tolerance (n7, claim check 139) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 61) | pass 1.28 via tolerance (n3, claim check 139) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 61) | pass 2.88 via tolerance (n3, claim check 139) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 61) | pass 0.00167 via tolerance (n3, claim check 139) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 69) | pass 1.55 via tolerance (n4, claim check 139) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 69) | pass 1.02 via tolerance (n4, claim check 139) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 69) | pass 2.35 via tolerance (n4, claim check 139) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 69) | pass 0.0399 via tolerance (n4, claim check 139) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 69) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 69) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 69) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 69) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 69) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n5 metrics.hr_mmp14_high, entry 77) | pass 3.54 via tolerance (n5, claim check 139) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n5 table.rows[0][5], entry 77) | pass 1.51 via tolerance (n5, claim check 139) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n5 table.rows[0][6], entry 77) | pass 8.33 via tolerance (n5, claim check 139) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n5 metrics.p_mmp14_high, entry 77) | pass 0.00374 via tolerance (n5, claim check 139) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n6 metrics.hr_mmp14_high, entry 80) | pass 1.54 via tolerance (n7, claim check 139) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n6 metrics.p_mmp14_high, entry 80) | pass 0.0711 via tolerance (n6, claim check 139) |

### kasurinen2018-mmp14-gastric | claude:claude-opus-5-5 | run 2

Status: answer. 134 s. 16 requests, 19 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-073932-39fc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261009-073932-39fc/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261009-073932-39fc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 13) | not asked |
| events | 138 exact | pass 138 (n4 metrics.events, entry 44) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n4 table.rows[0][4], entry 44) | pass 0.492 via tolerance (n4, claim check 155) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n4 table.rows[1][4], entry 44) | pass 0.221 via tolerance (n4, claim check 155) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n4 metrics.logrank_chi2, entry 44) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n4 metrics.logrank_p, entry 44) | pass 0.00138 via tolerance (n4, claim check 155) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n5 metrics.hr_mmp14_high, entry 70) | pass 1.92 via tolerance (n5, claim check 155) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n5 table.rows[0][5], entry 70) | pass 1.28 via tolerance (n5, claim check 155) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n5 table.rows[0][6], entry 70) | pass 2.88 via tolerance (n5, claim check 155) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n5 metrics.p_mmp14_high, entry 70) | pass 0.00167 via tolerance (n5, claim check 155) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n6 metrics.hr_mmp14_high, entry 77) | pass 1.55 via tolerance (n6, claim check 155) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n6 table.rows[0][5], entry 77) | pass 1.02 via tolerance (n6, claim check 155) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n6 table.rows[0][6], entry 77) | pass 2.35 via tolerance (n6, claim check 155) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n6 metrics.p_mmp14_high, entry 77) | pass 0.0399 via tolerance (n6, claim check 155) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n6 metrics.hr_age_ge67, entry 77) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n6 metrics.hr_stage2, entry 77) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n6 metrics.hr_stage3, entry 77) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n6 metrics.hr_stage4, entry 77) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n6 metrics.hr_diffuse, entry 77) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n7 metrics.hr_mmp14_high, entry 84) | pass 3.54 via tolerance (n7, claim check 155) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n7 table.rows[0][5], entry 84) | pass 1.51 via tolerance (n7, claim check 155) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n7 table.rows[0][6], entry 84) | pass 8.33 via tolerance (n7, claim check 155) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n7 metrics.p_mmp14_high, entry 84) | pass 0.00374 via tolerance (n7, claim check 155) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n8 metrics.hr_mmp14_high, entry 87) | pass 1.5355 via tolerance (n8, claim check 155) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n8 metrics.p_mmp14_high, entry 87) | pass 0.0711 via tolerance (n8, claim check 155) |

### kasurinen2018-mmp14-gastric | claude:claude-opus-5-5 | run 3

Status: answer. 123 s. 12 requests, 15 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074147-b116. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261009-074147-b116/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261009-074147-b116/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 13) | not asked |
| events | 138 exact | pass 138 (n4 metrics.events, entry 39) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n4 table.rows[0][4], entry 39) | pass 0.4923 via tolerance (n4, claim check 126) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n4 table.rows[1][4], entry 39) | pass 0.2211 via tolerance (n4, claim check 126) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n4 metrics.logrank_chi2, entry 39) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n4 metrics.logrank_p, entry 39) | pass 0.00138 via tolerance (n4, claim check 126) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n5 metrics.hr_mmp14_high, entry 65) | pass 1.92 via tolerance (n5, claim check 126) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n5 table.rows[0][5], entry 65) | pass 1.28 via tolerance (n9, claim check 126) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n5 table.rows[0][6], entry 65) | pass 2.88 via tolerance (n9, claim check 126) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n5 metrics.p_mmp14_high, entry 65) | pass 0.00167 via tolerance (n9, claim check 126) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n6 metrics.hr_mmp14_high, entry 72) | pass 1.55 via tolerance (n6, claim check 126) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n6 table.rows[0][5], entry 72) | pass 1.02 via tolerance (n6, claim check 126) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n6 table.rows[0][6], entry 72) | pass 2.35 via tolerance (n6, claim check 126) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n6 metrics.p_mmp14_high, entry 72) | pass 0.0399 via tolerance (n9, claim check 126) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n6 metrics.hr_age_ge67, entry 72) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n6 metrics.hr_stage2, entry 72) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n6 metrics.hr_stage3, entry 72) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n6 metrics.hr_stage4, entry 72) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n6 metrics.hr_diffuse, entry 72) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n7 metrics.hr_mmp14_high, entry 79) | pass 3.54 via tolerance (n9, claim check 126) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n7 table.rows[0][5], entry 79) | pass 1.51 via tolerance (n9, claim check 126) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n7 table.rows[0][6], entry 79) | pass 8.33 via tolerance (n9, claim check 126) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n7 metrics.p_mmp14_high, entry 79) | pass 0.00374 via tolerance (n7, claim check 126) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n8 metrics.hr_mmp14_high, entry 82) | pass 1.54 via tolerance (n8, claim check 126) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n8 metrics.p_mmp14_high, entry 82) | pass 0.0711 via tolerance (n9, claim check 126) |

### ljosa2012-bbbc005 | claude:claude-opus-5-5 | run 1

Status: answer. 672 s. 11 requests, 15 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074350-bc8a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/ljosa2012-bbbc005/run1/home/sessions/20261009-074350-bc8a/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/ljosa2012-bbbc005/run1/home/sessions/20261009-074350-bc8a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.936 (n20 stdout, entry 139) | pass 0.9399 via tolerance (n12, claim check 171) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n12 metrics.mean_abs_error, entry 104) | pass 3.01 via tolerance (n12, claim check 171) |
| true_total_sample | 5007 exact | pass 5007 (n12 metrics.true_total, entry 104) | not asked |

### ljosa2012-bbbc005 | claude:claude-opus-5-5 | run 2

Status: answer. 839 s. 13 requests, 14 tool calls (1 failed), 1 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-075533-302f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/ljosa2012-bbbc005/run2/home/sessions/20261009-075533-302f/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/ljosa2012-bbbc005/run2/home/sessions/20261009-075533-302f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.936 (n20 stdout, entry 141) | pass 0.9399 via tolerance (n12, claim check 179) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n12 metrics.mean_abs_error, entry 102) | pass 3.01 via tolerance (n12, claim check 179) |
| true_total_sample | 5007 exact | pass 5007 (n12 metrics.true_total, entry 102) | not asked |

### ljosa2012-bbbc005 | claude:claude-opus-5-5 | run 3

Status: answer. 650 s. 11 requests, 14 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080935-2ba8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/ljosa2012-bbbc005/run3/home/sessions/20261009-080935-2ba8/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/ljosa2012-bbbc005/run3/home/sessions/20261009-080935-2ba8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9399 (n12 metrics.detected_to_true_ratio, entry 96) | pass 0.9399 via tolerance (n12, claim check 167) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n12 metrics.mean_abs_error, entry 96) | pass 3.01 via tolerance (n12, claim check 167) |
| true_total_sample | 5007 exact | pass 5007 (n12 metrics.true_total, entry 96) | not asked |

### oksanen-vegan-dune | claude:claude-opus-5-5 | run 1

Status: answer. 95 s. 9 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-082040-2529. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oksanen-vegan-dune/run1/home/sessions/20261009-082040-2529/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oksanen-vegan-dune/run1/home/sessions/20261009-082040-2529/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 35) | pass 1.4405 via tolerance (n2, claim check 119) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 91) | pass 0.1183 via tolerance (n10, claim check 119) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 63) | pass 0.3416 via tolerance (n6, claim check 119) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 63) | pass 2.767 via tolerance (n6, claim check 119) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n6 metrics.p, entry 63) | pass 0.002 via tolerance (n6, claim check 119) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 74) | not asked |

### oksanen-vegan-dune | claude:claude-opus-5-5 | run 2

Status: answer. 97 s. 8 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-082214-9ff4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oksanen-vegan-dune/run2/home/sessions/20261009-082214-9ff4/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oksanen-vegan-dune/run2/home/sessions/20261009-082214-9ff4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 31) | pass 1.4405 via tolerance (n2, claim check 118) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 83) | pass 0.1183 via tolerance (n10, claim check 118) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 59) | pass 0.3416 via tolerance (n6, claim check 118) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 59) | pass 2.767 via tolerance (n6, claim check 118) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n6 metrics.p, entry 59) | pass 0.002 via tolerance (n6, claim check 118) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 66) | not asked |

### oksanen-vegan-dune | claude:claude-opus-5-5 | run 3

Status: answer. 129 s. 6 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-082351-641e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oksanen-vegan-dune/run3/home/sessions/20261009-082351-641e/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oksanen-vegan-dune/run3/home/sessions/20261009-082351-641e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 35) | pass 1.4405 via tolerance (n2, claim check 108) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 79) | pass 0.1183 via tolerance (n10, claim check 108) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 59) | pass 0.3416 via tolerance (n6, claim check 108) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 59) | pass 2.767 via tolerance (n6, claim check 108) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n6 metrics.p, entry 59) | pass 0.002 via tolerance (n6, claim check 108) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 66) | not asked |

