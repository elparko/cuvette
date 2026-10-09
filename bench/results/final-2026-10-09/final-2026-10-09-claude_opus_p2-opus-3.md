# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 99/99 | 78/78 | 15 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| andreasson2019-endotoxin-health | 30/30 / 21/21 |
| caicedo2019-bbbc039 | 3/3 / 3/3 |
| gramfort2013-mne-sample | 42/42 / 36/36 |
| korsunsky2019-harmony | 15/15 / 15/15 |
| mahbod2024-nuinsseg | 9/9 / 3/3 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 15 | 5604 | 267 | 614 | 169664 | 6281761 | 384 | 11 | 0 | 1 | 15 | 74 | 47 | 20 | 37 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $7.46 for 15 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| andreasson2019-endotoxin-health | claude:claude-opus-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| andreasson2019-endotoxin-health | claude:claude-opus-5-5 | 2 | on | 7 | 0 | 0 | 0 | 0 |
| andreasson2019-endotoxin-health | claude:claude-opus-5-5 | 3 | on | 7 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-opus-5-5 | 1 | on | 12 | 0 | 1 | 1 | 0 |
| caicedo2019-bbbc039 | claude:claude-opus-5-5 | 2 | on | 60 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-opus-5-5 | 3 | on | 9 | 0 | 0 | 0 | 0 |
| gramfort2013-mne-sample | claude:claude-opus-5-5 | 1 | on | 7 | 0 | 0 | 9 | 0 |
| gramfort2013-mne-sample | claude:claude-opus-5-5 | 2 | on | 7 | 0 | 0 | 7 | 0 |
| gramfort2013-mne-sample | claude:claude-opus-5-5 | 3 | on | 6 | 0 | 0 | 6 | 0 |
| korsunsky2019-harmony | claude:claude-opus-5-5 | 1 | on | 17 | 0 | 0 | 1 | 0 |
| korsunsky2019-harmony | claude:claude-opus-5-5 | 2 | on | 15 | 0 | 0 | 9 | 0 |
| korsunsky2019-harmony | claude:claude-opus-5-5 | 3 | on | 18 | 0 | 0 | 3 | 0 |
| mahbod2024-nuinsseg | claude:claude-opus-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-opus-5-5 | 2 | on | 4 | 0 | 1 | 1 | 0 |
| mahbod2024-nuinsseg | claude:claude-opus-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |

## Details

### andreasson2019-endotoxin-health | claude:claude-opus-5-5 | run 1

Status: answer. 152 s. 15 requests, 18 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071104-a75f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261009-071104-a75f/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261009-071104-a75f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n4 metrics.n, entry 59) | not asked |
| n_subjects | 52 exact | pass 52 (n4 metrics.n_groups, entry 59) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n4 metrics.coef_Intercept, entry 59) | pass 6.238 via tolerance (n7, claim check 160) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n4 metrics.coef_C_lps_T_1, entry 59) | pass 0.02 via tolerance (n2, claim check 160) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n4 metrics.coef_C_time_T_2, entry 59) | pass -0.619 via tolerance (n6, claim check 160) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n4 metrics.coef_C_time_T_3, entry 59) | pass -0.2181 via tolerance (n4, claim check 160) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n4 metrics.coef_C_lps_T_1_C_time_T_2, entry 59) | pass -1.786 via tolerance (n4, claim check 160) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n4 metrics.coef_C_lps_T_1_C_time_T_3, entry 59) | pass -0.9055 via tolerance (n7, claim check 160) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n4 metrics.se_C_lps_T_1_C_time_T_2, entry 59) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n8 metrics.p_value, entry 120) | pass 0.004163 via tolerance (n8, claim check 160) |

### andreasson2019-endotoxin-health | claude:claude-opus-5-5 | run 2

Status: answer. 143 s. 15 requests, 17 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071337-b992. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261009-071337-b992/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261009-071337-b992/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n4 metrics.n, entry 56) | not asked |
| n_subjects | 52 exact | pass 52 (n4 metrics.n_groups, entry 56) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n4 metrics.coef_Intercept, entry 56) | pass 6.238 via tolerance (n3, claim check 153) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n4 metrics.coef_C_lps_T_1, entry 56) | pass 0.01997 via tolerance (n4, claim check 153) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n4 metrics.coef_C_time_T_2, entry 56) | pass -0.619 via tolerance (n5, claim check 153) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n4 metrics.coef_C_time_T_3, entry 56) | pass -0.2181 via tolerance (n4, claim check 153) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n4 metrics.coef_C_lps_T_1_C_time_T_2, entry 56) | pass -1.786 via tolerance (n4, claim check 153) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n4 metrics.coef_C_lps_T_1_C_time_T_3, entry 56) | pass -0.9055 via tolerance (n4, claim check 153) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n4 metrics.se_C_lps_T_1_C_time_T_2, entry 56) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n6 metrics.p_value, entry 95) | pass 0.004163 via tolerance (n7, claim check 153) |

### andreasson2019-endotoxin-health | claude:claude-opus-5-5 | run 3

Status: answer. 127 s. 14 requests, 17 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071600-00e7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261009-071600-00e7/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261009-071600-00e7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n4 metrics.n, entry 61) | not asked |
| n_subjects | 52 exact | pass 52 (n4 metrics.n_groups, entry 61) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n4 metrics.coef_Intercept, entry 61) | pass 6.238 via tolerance (n3, claim check 154) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n4 metrics.coef_C_lps_T_1, entry 61) | pass 0.01997 via tolerance (n4, claim check 154) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n4 metrics.coef_C_time_T_2, entry 61) | pass -0.619 via tolerance (n6, claim check 154) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n4 metrics.coef_C_time_T_3, entry 61) | pass -0.2181 via tolerance (n4, claim check 154) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n4 metrics.coef_C_lps_T_1_C_time_T_2, entry 61) | pass -1.786 via tolerance (n4, claim check 154) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n4 metrics.coef_C_lps_T_1_C_time_T_3, entry 61) | pass -0.9055 via tolerance (n4, claim check 154) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n4 metrics.se_C_lps_T_1_C_time_T_2, entry 61) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n7 metrics.p_value, entry 114) | pass 0.004163 via tolerance (n7, claim check 154) |

### caicedo2019-bbbc039 | claude:claude-opus-5-5 | run 1

Status: answer. 535 s. 20 requests, 32 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-071807-0b10. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/caicedo2019-bbbc039/run1/home/sessions/20261009-071807-0b10/log.jsonl
Leak check: 12 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/caicedo2019-bbbc039/run1/home/sessions/20261009-071807-0b10/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n9 stdout, entry 91) | pass 5720 via tolerance (n21, claim check 218) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1452 (n15 stdout, entry 144) | differs 0.086 (n14, claim check 218) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2017 (n15 stdout, entry 144) | differs 0.086 (n14, claim check 218) |

### caicedo2019-bbbc039 | claude:claude-opus-5-5 | run 2

Status: answer. 632 s. 18 requests, 74 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072703-d896. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/caicedo2019-bbbc039/run2/home/sessions/20261009-072703-d896/log.jsonl
Leak check: 60 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/caicedo2019-bbbc039/run2/home/sessions/20261009-072703-d896/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n7 stdout, entry 61) | pass 5720 via tolerance (n67, claim check 341) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n16 table.rows[12][8], entry 130) | differs 0.086 (n16, claim check 341) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2 (n10 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/caicedo2019-bbbc039/run2/home/sessions/20261009-072703-d896/work/segment_cells-3/IXMtest_A09_s1_w1CE70AD49-290D-4312-82E6-CDC717F32637_outlines.png, entry 100) | differs 0.086 (n16, claim check 341) |

### caicedo2019-bbbc039 | claude:claude-opus-5-5 | run 3

Status: answer. 419 s. 19 requests, 23 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073739-1009. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/caicedo2019-bbbc039/run3/home/sessions/20261009-073739-1009/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/caicedo2019-bbbc039/run3/home/sessions/20261009-073739-1009/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n5 stdout, entry 42) | pass 5720 via tolerance (n15, claim check 194) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1452 (n15 stdout, entry 135) | match 0.15 via tolerance (n15, claim check 194) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2017 (n15 stdout, entry 135) | match 0.2 via tolerance (n15, claim check 194) |

### gramfort2013-mne-sample | claude:claude-opus-5-5 | run 1

Status: answer. 130 s. 11 requests, 15 tool calls (0 failed), 0 nudges, 0 plan reminders, 9 unsourced.
Session: 20261009-074442-9e6e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gramfort2013-mne-sample/run1/home/sessions/20261009-074442-9e6e/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 9 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gramfort2013-mne-sample/run1/home/sessions/20261009-074442-9e6e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 23) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 23) | pass 72 via tolerance (n2, claim check 182) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 23) | pass 73 via tolerance (n9, claim check 182) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 23) | pass 73 via tolerance (n9, claim check 182) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 23) | pass 70 via tolerance (n9, claim check 182) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 23) | pass 15 via tolerance (n2, claim check 182) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 23) | pass 16 via tolerance (n9, claim check 182) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 99) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 99) | pass 309 via tolerance (n9, claim check 182) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 99) | pass 68 via tolerance (n13, claim check 182) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n17 metrics.gfp_latency_s, entry 142) | pass 0.093 via tolerance (n17, claim check 182) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n17 metrics.gfp_amplitude, entry 142) | pass 42.07 via tolerance (n17, claim check 182) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n17 metrics.peak_latency_s, entry 142) | pass 0.087 via tolerance (n17, claim check 182) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n17 metrics.peak_amplitude, entry 142) | pass 198.8 via tolerance (n17, claim check 182) |

### gramfort2013-mne-sample | claude:claude-opus-5-5 | run 2

Status: answer. 115 s. 12 requests, 18 tool calls (2 failed), 0 nudges, 0 plan reminders, 7 unsourced.
Session: 20261009-074653-6fb6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gramfort2013-mne-sample/run2/home/sessions/20261009-074653-6fb6/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 7 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gramfort2013-mne-sample/run2/home/sessions/20261009-074653-6fb6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 31) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 31) | pass 72 via tolerance (n2, claim check 190) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 31) | pass 73 via tolerance (n9, claim check 190) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 31) | pass 73 via tolerance (n9, claim check 190) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 31) | pass 70 via tolerance (n9, claim check 190) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 31) | pass 15 via tolerance (n2, claim check 190) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 31) | pass 16 via tolerance (n9, claim check 190) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 107) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 107) | pass 309 via tolerance (n14, claim check 190) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 107) | pass 68 via tolerance (n13, claim check 190) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n18 metrics.gfp_latency_s, entry 152) | pass 0.093 via tolerance (n18, claim check 190) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n18 metrics.gfp_amplitude, entry 152) | pass 42.07 via tolerance (n18, claim check 190) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n18 metrics.peak_latency_s, entry 152) | pass 0.087 via tolerance (n18, claim check 190) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n18 metrics.peak_amplitude, entry 152) | pass 198.8 via tolerance (n18, claim check 190) |

### gramfort2013-mne-sample | claude:claude-opus-5-5 | run 3

Status: answer. 141 s. 13 requests, 18 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-074848-d3ec. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gramfort2013-mne-sample/run3/home/sessions/20261009-074848-d3ec/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gramfort2013-mne-sample/run3/home/sessions/20261009-074848-d3ec/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 23) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 23) | pass 72 via tolerance (n2, claim check 217) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 23) | pass 73 via tolerance (n9, claim check 217) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 23) | pass 73 via tolerance (n9, claim check 217) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 23) | pass 70 via tolerance (n9, claim check 217) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 23) | pass 15 via tolerance (n2, claim check 217) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 23) | pass 16 via tolerance (n9, claim check 217) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 98) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 98) | pass 309 via tolerance (n9, claim check 217) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 98) | pass 68 via tolerance (n17, claim check 217) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n21 metrics.gfp_latency_s, entry 155) | pass 0.1 via tolerance (n4, claim check 217) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n21 metrics.gfp_amplitude, entry 155) | pass 42.07 via tolerance (n21, claim check 217) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n21 metrics.peak_latency_s, entry 155) | pass 0.08 via tolerance (n21, claim check 217) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n21 metrics.peak_amplitude, entry 155) | pass 198.8 via tolerance (n21, claim check 217) |

### korsunsky2019-harmony | claude:claude-opus-5-5 | run 1

Status: answer. 450 s. 26 requests, 33 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-075110-c4a0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/korsunsky2019-harmony/run1/home/sessions/20261009-075110-c4a0/log.jsonl
Leak check: 17 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/korsunsky2019-harmony/run1/home/sessions/20261009-075110-c4a0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.002393 (n14 metrics.mean, entry 142) | pass 1.06 via tolerance (n13, claim check 292) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n13 table.rows[2][3], entry 139) | pass 1.64 via tolerance (n13, claim check 292) |
| clisi_before | 1 ±0.02 | pass 1 (n14 metrics.median, entry 142) | pass 1 via tolerance (n31, claim check 292) |
| clisi_after | 1 ±0.02 | pass 1 (n14 metrics.median, entry 142) | pass 1 via tolerance (n31, claim check 292) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n6 table.rows[0][1], entry 73) | pass 3255 via tolerance (n12, claim check 292) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n6 table.rows[2][1], entry 73) | differs 2885 (n18, claim check 292) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n12 table.rows[1][1], entry 128) | differs 1773 (n12, claim check 292) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n12 table.rows[1][2], entry 128) | differs 1615 (n12, claim check 292) |

### korsunsky2019-harmony | claude:claude-opus-5-5 | run 2

Status: answer. 496 s. 28 requests, 32 tool calls (2 failed), 0 nudges, 0 plan reminders, 9 unsourced.
Session: 20261009-075842-806a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/korsunsky2019-harmony/run2/home/sessions/20261009-075842-806a/log.jsonl
Leak check: 15 paths read, 0 outside the allow list, 0 blocked, 9 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/korsunsky2019-harmony/run2/home/sessions/20261009-075842-806a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.006729 (n15 table.rows[3][3], entry 169) | pass 1.06 via tolerance (n14, claim check 303) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n14 table.rows[2][3], entry 166) | pass 1.64 via tolerance (n22, claim check 303) |
| clisi_before | 1 ±0.02 | pass 1 (n15 metrics.median, entry 169) | pass 1 via tolerance (n31, claim check 303) |
| clisi_after | 1 ±0.02 | pass 1 (n15 metrics.median, entry 169) | pass 1 via tolerance (n31, claim check 303) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n7 table.rows[0][1], entry 100) | pass 3255 via tolerance (n22, claim check 303) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n7 table.rows[2][1], entry 100) | differs 2885 (n22, claim check 303) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n13 table.rows[1][1], entry 155) | differs 1773 (n13, claim check 303) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n13 table.rows[1][2], entry 155) | differs 1615 (n13, claim check 303) |

### korsunsky2019-harmony | claude:claude-opus-5-5 | run 3

Status: answer. 542 s. 31 requests, 35 tool calls (1 failed), 0 nudges, 1 plan reminders, 3 unsourced.
Session: 20261009-080703-dfb0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/korsunsky2019-harmony/run3/home/sessions/20261009-080703-dfb0/log.jsonl
Leak check: 18 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/korsunsky2019-harmony/run3/home/sessions/20261009-080703-dfb0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.002393 (n14 metrics.mean, entry 160) | pass 1.0024 via tolerance (n14, claim check 318) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n13 table.rows[2][3], entry 152) | pass 1.64 via tolerance (n13, claim check 318) |
| clisi_before | 1 ±0.02 | pass 1 (n14 metrics.median, entry 160) | pass 1 via tolerance (n30, claim check 318) |
| clisi_after | 1 ±0.02 | pass 1 (n14 metrics.median, entry 160) | pass 1 via tolerance (n30, claim check 318) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n6 table.rows[0][1], entry 83) | pass 3255 via tolerance (n12, claim check 318) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n6 table.rows[2][1], entry 83) | differs 2885 (n18, claim check 318) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n12 table.rows[1][1], entry 140) | differs 1773 (n12, claim check 318) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n12 table.rows[1][2], entry 140) | differs 1615 (n12, claim check 318) |

### mahbod2024-nuinsseg | claude:claude-opus-5-5 | run 1

Status: answer. 668 s. 16 requests, 18 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081613-250a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261009-081613-250a/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261009-081613-250a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n8 metrics.mean_dice, entry 67) | pass 0.538 via tolerance (n8, claim check 175) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 13) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n8 metrics.total_truth, entry 67) | not asked |

### mahbod2024-nuinsseg | claude:claude-opus-5-5 | run 2

Status: answer. 490 s. 14 requests, 16 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-082722-9bfc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261009-082722-9bfc/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261009-082722-9bfc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.538 (n15 stdout, entry 117) | pass 0.538 via tolerance (n15, claim check 158) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 11) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n8 metrics.total_truth, entry 68) | not asked |

### mahbod2024-nuinsseg | claude:claude-opus-5-5 | run 3

Status: answer. 564 s. 15 requests, 18 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-083532-b4bc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261009-083532-b4bc/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261009-083532-b4bc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.53805 (n10 stdout, entry 80) | pass 0.538 via tolerance (n10, claim check 166) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 13) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n9 metrics.total_truth, entry 71) | not asked |

