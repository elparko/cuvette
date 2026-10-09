# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 421/423 | 347/354 | 45 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| aledo2022-renz-onpg | 6/6 / 6/6 |
| andreasson2019-endotoxin-health | 30/30 / 21/21 |
| astapova2021-deseq2-kgn | 12/12 / 9/9 |
| belenky2003-sleepstudy | 18/18 / 6/6 |
| bradley-photutils-100gaussians | 18/18 / 15/18 |
| chure2024-hplc-py | 36/36 / 33/33 |
| danecek2021-bcftools | 18/18 / 15/15 |
| desveaux2026-pcrv-ic50 | 27/27 / 24/24 |
| gramfort2013-mne-sample | 42/42 / 36/36 |
| hildyard2021-embryo-refgenes | 52/54 / 46/48 |
| kanetis2022-iqtree-sporocadaceae | 9/9 / 6/6 |
| klindworth2013-16s-primers | 33/33 / 33/33 |
| lackey2015-tb-default | 90/90 / 82/84 |
| li2009-samtools | 21/21 / 9/9 |
| ljosa2012-bbbc005 | 9/9 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 45 | 6540 | 405 | 1098 | 519635 | 9275058 | 415 | 30 | 16 | 17 | 36 | 136 | 193 | 63 | 91 | 12 | 12 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.55 for 45 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 1 | 9 | 0 |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 1 | 0 | 0 |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 1 | 0 | 0 |
| andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 1 | 0 |
| andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 10 | 0 |
| astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 1 | 0 |
| astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 2 | 0 |
| bradley-photutils-100gaussians | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 1 | 0 |
| chure2024-hplc-py | claude:claude-haiku-5-5 | 3 | on | 6 | 0 | 0 | 1 | 0 |
| danecek2021-bcftools | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 4 | 0 |
| danecek2021-bcftools | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| danecek2021-bcftools | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 1 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 1 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 1 | 0 | 0 |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 3 | on | 6 | 0 | 1 | 0 | 0 |
| gramfort2013-mne-sample | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 8 | 0 |
| gramfort2013-mne-sample | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 6 | 0 |
| gramfort2013-mne-sample | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 2 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 2 | 7 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 2 | 2 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 2 | 16 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 3 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 11 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 4 | 1 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 2 | 1 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-haiku-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 1 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 1 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 1 | 0 | 0 |

## Details

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 1

Status: answer. 54 s. 5 requests, 3 tool calls (1 failed), 0 nudges, 0 plan reminders, 9 unsourced.
Session: 20261009-045914-5e48. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aledo2022-renz-onpg/run1/home/sessions/20261009-045914-5e48/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 9 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aledo2022-renz-onpg/run1/home/sessions/20261009-045914-5e48/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 30) | pass 2.479 via tolerance (n1, claim check 54) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 30) | pass 0.1841 via tolerance (n1, claim check 54) |

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 2

Status: answer. 58 s. 6 requests, 4 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050008-9d76. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aledo2022-renz-onpg/run2/home/sessions/20261009-050008-9d76/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aledo2022-renz-onpg/run2/home/sessions/20261009-050008-9d76/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 30) | pass 2.479 via tolerance (n1, claim check 58) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 30) | pass 0.1841 via tolerance (n1, claim check 58) |

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 3

Status: answer. 61 s. 5 requests, 3 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050106-c0fa. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aledo2022-renz-onpg/run3/home/sessions/20261009-050106-c0fa/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aledo2022-renz-onpg/run3/home/sessions/20261009-050106-c0fa/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 30) | pass 2.479 via tolerance (n1, claim check 52) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 30) | pass 0.1841 via tolerance (n1, claim check 52) |

### andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | run 1

Status: answer. 135 s. 12 requests, 16 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-050207-5eec. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261009-050207-5eec/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run1/home/sessions/20261009-050207-5eec/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 46) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 46) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 46) | pass 6.238 via tolerance (n7, claim check 149) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 46) | pass 0.02 via tolerance (n2, claim check 149) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 46) | pass -0.619 via tolerance (n5, claim check 149) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 46) | pass -0.218 via tolerance (n5, claim check 149) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 46) | pass -1.786 via tolerance (n5, claim check 149) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 46) | pass -0.906 via tolerance (n5, claim check 149) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 46) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n6 metrics.p_value, entry 75) | pass 0.0042 via tolerance (n6, claim check 149) |

### andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | run 2

Status: answer. 154 s. 11 requests, 11 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-050423-2123. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261009-050423-2123/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run2/home/sessions/20261009-050423-2123/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 42) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 42) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 42) | pass 6.238 via tolerance (n3, claim check 133) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 42) | pass 0.02 via tolerance (n2, claim check 133) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 42) | pass -0.619 via tolerance (n3, claim check 133) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 42) | pass -0.218 via tolerance (n3, claim check 133) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 42) | pass -1.786 via tolerance (n3, claim check 133) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 42) | pass -0.906 via tolerance (n3, claim check 133) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 42) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n4 metrics.p_value, entry 73) | pass 0.004163 via tolerance (n4, claim check 133) |

### andreasson2019-endotoxin-health | claude:claude-haiku-5-5 | run 3

Status: answer. 155 s. 13 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-050656-fc47. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261009-050656-fc47/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andreasson2019-endotoxin-health/run3/home/sessions/20261009-050656-fc47/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 46) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 46) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 46) | pass 6.238 via tolerance (n6, claim check 153) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 46) | pass 0.02 via tolerance (n6, claim check 153) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 46) | pass -0.619 via tolerance (n6, claim check 153) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 46) | pass -0.218 via tolerance (n6, claim check 153) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 46) | pass -1.786 via tolerance (n6, claim check 153) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 46) | pass -0.906 via tolerance (n6, claim check 153) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 46) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | pass 0.004163466 (n7 metrics.p_value, entry 90) | pass 0.0042 via tolerance (n7, claim check 153) |

### astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | run 1

Status: answer. 159 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 10 unsourced.
Session: 20261009-050932-11d8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261009-050932-11d8/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 10 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261009-050932-11d8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 49) | pass 173 via tolerance (n7, claim check 87) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 49) | pass 125 via tolerance (n7, claim check 87) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 49) | pass 48 via tolerance (n7, claim check 87) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 11) | not asked |

### astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | run 2

Status: answer. 163 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-051211-a3c4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261009-051211-a3c4/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261009-051211-a3c4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 49) | pass 173 via tolerance (n7, claim check 88) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 49) | pass 125 via tolerance (n7, claim check 88) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 49) | pass 48 via tolerance (n7, claim check 88) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 11) | not asked |

### astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | run 3

Status: answer. 283 s. 17 requests, 11 tool calls (0 failed), 4 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-051455-2ab9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261009-051455-2ab9/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261009-051455-2ab9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 64) | pass 173 via tolerance (n7, claim check 167) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 64) | pass 125 via tolerance (n7, claim check 167) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 64) | pass 48 via tolerance (n7, claim check 167) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 11) | not asked |

### belenky2003-sleepstudy | claude:claude-haiku-5-5 | run 1

Status: answer. 45 s. 8 requests, 6 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051938-9797. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/belenky2003-sleepstudy/run1/home/sessions/20261009-051938-9797/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/belenky2003-sleepstudy/run1/home/sessions/20261009-051938-9797/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 39) | pass 10.47 via tolerance (n2, claim check 75) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 39) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 39) | pass 1.55 via tolerance (n2, claim check 75) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 39) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 39) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 39) | not asked |

### belenky2003-sleepstudy | claude:claude-haiku-5-5 | run 2

Status: answer. 76 s. 10 requests, 8 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-052023-3069. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/belenky2003-sleepstudy/run2/home/sessions/20261009-052023-3069/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/belenky2003-sleepstudy/run2/home/sessions/20261009-052023-3069/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 39) | pass 10.47 via tolerance (n4, claim check 96) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 39) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 39) | pass 1.55 via tolerance (n3, claim check 96) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 39) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 39) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 39) | not asked |

### belenky2003-sleepstudy | claude:claude-haiku-5-5 | run 3

Status: answer. 78 s. 11 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-052139-e9ab. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/belenky2003-sleepstudy/run3/home/sessions/20261009-052139-e9ab/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/belenky2003-sleepstudy/run3/home/sessions/20261009-052139-e9ab/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 40) | pass 10.47 via tolerance (n4, claim check 109) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 40) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 40) | pass 1.55 via tolerance (n3, claim check 109) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 40) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 40) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 40) | not asked |

### bradley-photutils-100gaussians | claude:claude-haiku-5-5 | run 1

Status: answer. 129 s. 10 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-052258-50ff. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261009-052258-50ff/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261009-052258-50ff/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 41) | pass 5.152 via tolerance (n11, claim check 176) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 41) | pass 2.094 via tolerance (n11, claim check 176) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 116) | pass 82 via tolerance (n20, claim check 176) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 137) | pass 925.2 via tolerance (n22, claim check 176) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 137) | pass 760.2 via tolerance (n21, claim check 176) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 137) | pass 925.2 via tolerance (n22, claim check 176) |

### bradley-photutils-100gaussians | claude:claude-haiku-5-5 | run 2

Status: answer. 131 s. 13 requests, 9 tool calls (0 failed), 2 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-052507-2c74. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261009-052507-2c74/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261009-052507-2c74/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 38) | pass 5.152 via tolerance (n11, claim check 192) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 38) | pass 2.094 via tolerance (n11, claim check 192) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 113) | pass 82 via tolerance (n20, claim check 192) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 134) | pass 925.2 via tolerance (n21, claim check 192) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 134) | pass 760.2 via tolerance (n21, claim check 192) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 134) | pass 925.2 via tolerance (n21, claim check 192) |

### bradley-photutils-100gaussians | claude:claude-haiku-5-5 | run 3

Status: answer. 88 s. 6 requests, 4 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-052719-afe5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261009-052719-afe5/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261009-052719-afe5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n9 metrics.background_median, entry 56) | pass 5.152 via tolerance (n9, claim check 126) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n9 metrics.rms_median, entry 56) | pass 2.094 via tolerance (n9, claim check 126) |
| sources_detected | 82 exact | pass 82 (n18 metrics.n_sources, entry 102) | pass 82 via tolerance (n18, claim check 126) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 847.0985 (n10 table.rows[5][5], entry 71) | FAIL 500 (n1, claim check 126) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 765.5189 (n18 table.rows[5][5], entry 102) | FAIL 500 (n1, claim check 126) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 847.0985 (n10 table.rows[5][5], entry 71) | FAIL 500 (n1, claim check 126) |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 1

Status: answer. 116 s. 9 requests, 14 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-052849-de33. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261009-052849-de33/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run1/home/sessions/20261009-052849-de33/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 11) | pass 6 via tolerance (n14, claim check 136) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 11) | pass 10.9 via tolerance (n6, claim check 136) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 52) | pass 2805655 via tolerance (n6, claim check 136) |
| peak1_amplitude | 23000 ±500 | pass 22935 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 11) | pass 23380.46 via tolerance (n2, claim check 136) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 52) | pass 0.15876 via tolerance (n6, claim check 136) |
| peak1_skew | 0.7 ±0.01 | pass 0.7 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 11) | pass 0.6918 via tolerance (n2, claim check 136) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 52) | pass 14.45 via tolerance (n6, claim check 136) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 52) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n14 metrics.slope, entry 96) | pass 156586.7 via tolerance (n14, claim check 136) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n14 metrics.intercept, entry 96) | pass 14624.94 via tolerance (n14, claim check 136) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n14 metrics.r_squared, entry 96) | pass 0.998868 via tolerance (n14, claim check 136) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n15 metrics.mean_concentration, entry 104) | pass 1.8994 via tolerance (n15, claim check 136) |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 2

Status: answer. 134 s. 10 requests, 12 tool calls (1 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-053049-bd5c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run2/home/sessions/20261009-053049-bd5c/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run2/home/sessions/20261009-053049-bd5c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 43) | pass 6 via tolerance (n16, claim check 142) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 43) | pass 10.9 via tolerance (n6, claim check 142) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 43) | pass 2805655 via tolerance (n6, claim check 142) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n6 table.rows[0][3], entry 43) | pass 23380.46 via tolerance (n8, claim check 142) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 43) | pass 0.15876 via tolerance (n7, claim check 142) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 43) | pass 0.6918 via tolerance (n8, claim check 142) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 43) | pass 14.45 via tolerance (n6, claim check 142) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 43) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n16 metrics.slope, entry 99) | pass 156586.7 via tolerance (n16, claim check 142) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n16 metrics.intercept, entry 99) | pass 14624.94 via tolerance (n16, claim check 142) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n16 metrics.r_squared, entry 99) | pass 0.998868 via tolerance (n16, claim check 142) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n17 metrics.mean_concentration, entry 107) | pass 1.8994 via tolerance (n17, claim check 142) |

### chure2024-hplc-py | claude:claude-haiku-5-5 | run 3

Status: answer. 143 s. 10 requests, 12 tool calls (1 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-053303-75cc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run3/home/sessions/20261009-053303-75cc/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/chure2024-hplc-py/run3/home/sessions/20261009-053303-75cc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 metrics.n_peaks, entry 46) | pass 6 via tolerance (n16, claim check 139) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 46) | pass 10.9 via tolerance (n6, claim check 139) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n6 metrics.area_1, entry 46) | pass 2805655 via tolerance (n6, claim check 139) |
| peak1_amplitude | 23000 ±500 | pass 23380.46 (n6 table.rows[0][3], entry 46) | pass 23380.46 via tolerance (n2, claim check 139) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n6 table.rows[0][4], entry 46) | pass 0.15876 via tolerance (n6, claim check 139) |
| peak1_skew | 0.7 ±0.01 | pass 0.6917996 (n6 table.rows[0][5], entry 46) | pass 0.6918 via tolerance (n2, claim check 139) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 46) | pass 14.45 via tolerance (n6, claim check 139) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n6 metrics.area_1, entry 46) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n14 metrics.slope, entry 87) | pass 156586.7 via tolerance (n16, claim check 139) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n14 metrics.intercept, entry 87) | pass 14624.94 via tolerance (n16, claim check 139) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n14 metrics.r_squared, entry 87) | pass 0.998868 via tolerance (n16, claim check 139) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n15 metrics.mean_concentration, entry 95) | pass 1.899 via tolerance (n15, claim check 139) |

### danecek2021-bcftools | claude:claude-haiku-5-5 | run 1

Status: answer. 50 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-053526-8f06. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/danecek2021-bcftools/run1/home/sessions/20261009-053526-8f06/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/danecek2021-bcftools/run1/home/sessions/20261009-053526-8f06/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 11) | pass 1955 via tolerance (n1, claim check 36) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 11) | pass 248 via tolerance (n1, claim check 36) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 11) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 11) | pass 2.2 via tolerance (n1, claim check 36) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 14) | pass 1137 via tolerance (n2, claim check 36) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 17) | pass 328 via tolerance (n3, claim check 36) |

### danecek2021-bcftools | claude:claude-haiku-5-5 | run 2

Status: answer. 32 s. 3 requests, 3 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-053616-b37a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/danecek2021-bcftools/run2/home/sessions/20261009-053616-b37a/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/danecek2021-bcftools/run2/home/sessions/20261009-053616-b37a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 11) | pass 1955 via tolerance (n1, claim check 34) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 11) | pass 248 via tolerance (n1, claim check 34) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 11) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 11) | pass 2.2 via tolerance (n1, claim check 34) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 14) | pass 1137 via tolerance (n2, claim check 34) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 17) | pass 328 via tolerance (n3, claim check 34) |

### danecek2021-bcftools | claude:claude-haiku-5-5 | run 3

Status: answer. 49 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-053648-0597. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/danecek2021-bcftools/run3/home/sessions/20261009-053648-0597/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/danecek2021-bcftools/run3/home/sessions/20261009-053648-0597/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 11) | pass 1955 via tolerance (n1, claim check 36) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 11) | pass 248 via tolerance (n1, claim check 36) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 11) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 11) | pass 2.2 via tolerance (n1, claim check 36) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 14) | pass 1137 via tolerance (n2, claim check 36) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 17) | pass 328 via tolerance (n3, claim check 36) |

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 1

Status: answer. 169 s. 13 requests, 15 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-053737-2513. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-053737-2513/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-053737-2513/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n1 metrics.MEDI3902_ic50, entry 68) | pass 0.1173 via tolerance (n1, claim check 140) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n1 metrics.30_B8_ic50, entry 68) | pass 0.02131 via tolerance (n4, claim check 140) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n1 metrics.P3D6_ic50, entry 68) | pass 3.653 via tolerance (n1, claim check 140) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n3 metrics.P3D6_ic50, entry 86) | pass 11.79 via tolerance (n3, claim check 140) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n4 metrics.V2_ic50, entry 89) | pass 0.01278 via tolerance (n4, claim check 140) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n4 metrics.V3_ic50, entry 89) | pass 0.0112 via tolerance (n4, claim check 140) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n4 metrics.V4_ic50, entry 89) | pass 0.01305 via tolerance (n4, claim check 140) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n4 metrics.V5_ic50, entry 89) | pass 0.01045 via tolerance (n4, claim check 140) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n3 metrics.30_B8_ic50, entry 86) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.06375493 (n4 metrics.V5_rse, entry 89) | differs 0.02645 (n4, claim check 140) |

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 2

Status: answer. 207 s. 13 requests, 15 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-054026-2d4d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261009-054026-2d4d/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run2/home/sessions/20261009-054026-2d4d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.11725 (n8 stdout, entry 116) | pass 0.1173 via tolerance (n3, claim check 141) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n3 metrics.30_B8_ic50, entry 64) | pass 0.02131 via tolerance (n8, claim check 141) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n3 metrics.P3D6_ic50, entry 64) | pass 3.653 via tolerance (n3, claim check 141) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n4 metrics.P3D6_ic50, entry 67) | pass 11.79 via tolerance (n8, claim check 141) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n5 metrics.30_B8_V2_ic50, entry 70) | pass 0.01278 via tolerance (n8, claim check 141) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n5 metrics.30_B8_V3_ic50, entry 70) | pass 0.0112 via tolerance (n8, claim check 141) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.01305 (n8 stdout, entry 116) | pass 0.01305 via tolerance (n8, claim check 141) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n5 metrics.30_B8_V5_ic50, entry 70) | pass 0.01045 via tolerance (n8, claim check 141) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n4 metrics.30_B8_ic50, entry 67) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.056 (n1 stdout, entry 27) | differs 0.02645 (n5, claim check 141) |

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 3

Status: answer. 177 s. 12 requests, 15 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-054354-b82a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261009-054354-b82a/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run3/home/sessions/20261009-054354-b82a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n2 metrics.MEDI3902_ic50, entry 59) | pass 0.1173 via tolerance (n2, claim check 139) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n2 metrics.30_B8_ic50, entry 59) | pass 0.02131 via tolerance (n4, claim check 139) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n2 metrics.P3D6_ic50, entry 59) | pass 3.653 via tolerance (n2, claim check 139) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n3 metrics.P3D6_ic50, entry 62) | pass 11.79 via tolerance (n3, claim check 139) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n4 metrics.V2_ic50, entry 65) | pass 0.01278 via tolerance (n4, claim check 139) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n4 metrics.V3_ic50, entry 65) | pass 0.0112 via tolerance (n4, claim check 139) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n4 metrics.V4_ic50, entry 65) | pass 0.01305 via tolerance (n4, claim check 139) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n4 metrics.V5_ic50, entry 65) | pass 0.01045 via tolerance (n4, claim check 139) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n3 metrics.30_B8_ic50, entry 62) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.06375493 (n4 metrics.V5_rse, entry 65) | differs 0.02645 (n4, claim check 139) |

### gramfort2013-mne-sample | claude:claude-haiku-5-5 | run 1

Status: answer. 128 s. 13 requests, 13 tool calls (5 failed), 0 nudges, 0 plan reminders, 8 unsourced.
Session: 20261009-054651-7a5a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gramfort2013-mne-sample/run1/home/sessions/20261009-054651-7a5a/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 8 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gramfort2013-mne-sample/run1/home/sessions/20261009-054651-7a5a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 14) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 14) | pass 72 via tolerance (n2, claim check 185) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 14) | pass 73 via tolerance (n9, claim check 185) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 14) | pass 73 via tolerance (n9, claim check 185) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 14) | pass 70 via tolerance (n9, claim check 185) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 14) | pass 15 via tolerance (n2, claim check 185) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 14) | pass 16 via tolerance (n9, claim check 185) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 99) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 99) | pass 309 via tolerance (n9, claim check 185) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 99) | pass 68 via tolerance (n10, claim check 185) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n11 metrics.gfp_latency_s, entry 137) | pass 0.0932 via tolerance (n11, claim check 185) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n11 metrics.gfp_amplitude, entry 137) | pass 42.07 via tolerance (n11, claim check 185) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n11 metrics.peak_latency_s, entry 137) | pass 0.0866 via tolerance (n11, claim check 185) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n11 metrics.peak_amplitude, entry 137) | pass 198.8 via tolerance (n11, claim check 185) |

### gramfort2013-mne-sample | claude:claude-haiku-5-5 | run 2

Status: answer. 135 s. 11 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-054900-2273. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gramfort2013-mne-sample/run2/home/sessions/20261009-054900-2273/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gramfort2013-mne-sample/run2/home/sessions/20261009-054900-2273/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n3 metrics.n_events, entry 22) | not asked |
| events_id1 | 72 exact | pass 72 (n3 metrics.count_1, entry 22) | pass 72 via tolerance (n3, claim check 158) |
| events_id2 | 73 exact | pass 73 (n3 metrics.count_2, entry 22) | pass 73 via tolerance (n7, claim check 158) |
| events_id3 | 73 exact | pass 73 (n3 metrics.count_2, entry 22) | pass 73 via tolerance (n7, claim check 158) |
| events_id4 | 70 exact | pass 70 (n3 metrics.count_4, entry 22) | pass 70 via tolerance (n7, claim check 158) |
| events_id5 | 15 exact | pass 15 (n3 metrics.count_5, entry 22) | pass 15 via tolerance (n3, claim check 158) |
| events_id32 | 16 exact | pass 16 (n3 metrics.count_32, entry 22) | pass 16 via tolerance (n7, claim check 158) |
| epochs_dropped | 10 exact | pass 10 (n7 metrics.n_dropped, entry 63) | not asked |
| epochs_kept | 309 exact | pass 309 (n7 metrics.n_epochs, entry 63) | pass 309 via tolerance (n7, claim check 158) |
| auditory_left_kept | 68 exact | pass 68 (n7 metrics.count_auditory_left, entry 63) | pass 68 via tolerance (n8, claim check 158) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n12 metrics.gfp_latency_s, entry 97) | pass 0.093 via tolerance (n12, claim check 158) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.10613 (n12 metrics.gfp_amplitude, entry 97) | pass 42.11 via tolerance (n12, claim check 158) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n12 metrics.peak_latency_s, entry 97) | pass 0.087 via tolerance (n12, claim check 158) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.9631 (n12 metrics.peak_amplitude, entry 97) | pass 198.96 via tolerance (n12, claim check 158) |

### gramfort2013-mne-sample | claude:claude-haiku-5-5 | run 3

Status: answer. 130 s. 10 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-055116-86f8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gramfort2013-mne-sample/run3/home/sessions/20261009-055116-86f8/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gramfort2013-mne-sample/run3/home/sessions/20261009-055116-86f8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 14) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 14) | pass 72 via tolerance (n2, claim check 160) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 14) | pass 73 via tolerance (n8, claim check 160) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 14) | pass 73 via tolerance (n8, claim check 160) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 14) | pass 70 via tolerance (n8, claim check 160) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 14) | pass 15 via tolerance (n2, claim check 160) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 14) | pass 16 via tolerance (n8, claim check 160) |
| epochs_dropped | 10 exact | pass 10 (n7 metrics.n_dropped, entry 67) | not asked |
| epochs_kept | 309 exact | pass 309 (n7 metrics.n_epochs, entry 67) | pass 309 via tolerance (n8, claim check 160) |
| auditory_left_kept | 68 exact | pass 68 (n7 metrics.count_auditory_left, entry 67) | pass 68 via tolerance (n9, claim check 160) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n13 metrics.gfp_latency_s, entry 116) | pass 0.1 via tolerance (n1, claim check 160) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.10613 (n13 metrics.gfp_amplitude, entry 116) | pass 42.1 via tolerance (n13, claim check 160) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n13 metrics.peak_latency_s, entry 116) | pass 0.08 via tolerance (n13, claim check 160) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.9631 (n13 metrics.peak_amplitude, entry 116) | pass 199 via tolerance (n13, claim check 160) |

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 1

Status: answer. 162 s. 12 requests, 14 tool calls (3 failed), 0 nudges, 1 plan reminders, 7 unsourced.
Session: 20261009-055328-29c6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261009-055328-29c6/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 2 blocked, 7 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261009-055328-29c6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 55) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 55) | pass 0.2175 via tolerance (n1, claim check 126) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 55) | pass 0.5275 via tolerance (n1, claim check 126) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 55) | pass 0.441 via tolerance (n1, claim check 126) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 55) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 55) | pass 14 via tolerance (n4, claim check 126) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 55) | pass 0.0686 via tolerance (n1, claim check 126) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 55) | pass 0.1348 via tolerance (n1, claim check 126) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 55) | pass 0.481 via tolerance (n1, claim check 126) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 63) | pass 0.081 via tolerance (n2, claim check 126) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 63) | pass 0.1805 via tolerance (n2, claim check 126) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n4 metrics.genorm_best_pair_M, entry 76) | pass 0.1142 via tolerance (n4, claim check 126) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n3 metrics.slope_GAPDH, entry 68) | pass -3.4557 via tolerance (n3, claim check 126) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n3 metrics.slope_HTATSF1, entry 68) | pass -3.1799 via tolerance (n3, claim check 126) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n3 metrics.slope_UBC, entry 68) | pass -3.3788 via tolerance (n3, claim check 126) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n3 metrics.efficiency_CYC1, entry 68) | pass 1.945 via tolerance (n3, claim check 126) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n3 metrics.efficiency_PAK1IP1, entry 68) | pass 2.012 via tolerance (n3, claim check 126) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n3 metrics.slope_ACTB, entry 68) | pass -3.2993 via tolerance (n3, claim check 126) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n3 metrics.slope_SDHA, entry 68) | differs -3.2331 (n3, claim check 126) |

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 2

Status: answer. 154 s. 8 requests, 12 tool calls (3 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-055610-3d8c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261009-055610-3d8c/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 2 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261009-055610-3d8c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 49) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 49) | pass 0.2175 via tolerance (n1, claim check 108) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 49) | pass 0.5275 via tolerance (n1, claim check 108) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 49) | pass 0.441 via tolerance (n1, claim check 108) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 49) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 49) | pass 14 via tolerance (n3, claim check 108) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 49) | pass 0.0686 via tolerance (n1, claim check 108) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 49) | pass 0.1348 via tolerance (n1, claim check 108) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 49) | pass 0.481 via tolerance (n1, claim check 108) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | FAIL 0.06863984 (n1 metrics.genorm_V2_3, entry 49) | FAIL 0.0686 (n1, claim check 108) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | FAIL 0.1831813 (n1 metrics.normfinder_PAK1IP1, entry 49) | FAIL 0.15 (n3, claim check 108) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n3 metrics.genorm_best_pair_M, entry 71) | pass 0.1142 via tolerance (n3, claim check 108) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n2 metrics.slope_GAPDH, entry 63) | pass -3.4557 via tolerance (n2, claim check 108) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n2 metrics.slope_HTATSF1, entry 63) | pass -3.1799 via tolerance (n2, claim check 108) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n2 metrics.slope_UBC, entry 63) | pass -3.3788 via tolerance (n2, claim check 108) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n2 metrics.efficiency_CYC1, entry 63) | pass 1.945 via tolerance (n2, claim check 108) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n2 metrics.efficiency_PAK1IP1, entry 63) | pass 2.012 via tolerance (n2, claim check 108) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n2 metrics.slope_ACTB, entry 63) | pass -3.2993 via tolerance (n2, claim check 108) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n2 metrics.slope_SDHA, entry 63) | differs -3.2331 (n2, claim check 108) |

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 3

Status: answer. 174 s. 11 requests, 14 tool calls (3 failed), 0 nudges, 1 plan reminders, 16 unsourced.
Session: 20261009-055844-6031. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261009-055844-6031/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 2 blocked, 16 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261009-055844-6031/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 52) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 52) | pass 0.2175 via tolerance (n1, claim check 126) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 52) | pass 0.5275 via tolerance (n1, claim check 126) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 52) | pass 0.441 via tolerance (n1, claim check 126) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 52) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 52) | pass 14 via tolerance (n4, claim check 126) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 52) | pass 0.0686 via tolerance (n1, claim check 126) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 52) | pass 0.1348 via tolerance (n1, claim check 126) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 52) | pass 0.481 via tolerance (n1, claim check 126) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n3 metrics.normfinder_UBC, entry 63) | pass 0.081 via tolerance (n3, claim check 126) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n3 metrics.normfinder_B2M, entry 63) | pass 0.1805 via tolerance (n3, claim check 126) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n4 metrics.genorm_best_pair_M, entry 73) | pass 0.1142 via tolerance (n4, claim check 126) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n2 metrics.slope_GAPDH, entry 55) | pass -3.4557 via tolerance (n2, claim check 126) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n2 metrics.slope_HTATSF1, entry 55) | pass -3.1799 via tolerance (n2, claim check 126) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n2 metrics.slope_UBC, entry 55) | pass -3.3788 via tolerance (n2, claim check 126) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n2 metrics.efficiency_CYC1, entry 55) | pass 1.945 via tolerance (n2, claim check 126) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n2 metrics.efficiency_PAK1IP1, entry 55) | pass 2.012 via tolerance (n2, claim check 126) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n2 metrics.slope_ACTB, entry 55) | pass -3.2993 via tolerance (n2, claim check 126) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n2 metrics.slope_SDHA, entry 55) | differs -3.2331 (n2, claim check 126) |

### kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | run 1

Status: answer. 168 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-060138-b04e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261009-060138-b04e/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261009-060138-b04e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 19) | pass -15895.48 via tolerance (n2, claim check 59) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 11) | pass 2375 via tolerance (n2, claim check 59) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 11) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 19) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | run 2

Status: answer. 165 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-060426-d61d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261009-060426-d61d/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261009-060426-d61d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 19) | pass -15895.48 via tolerance (n2, claim check 59) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 11) | pass 2375 via tolerance (n2, claim check 59) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 11) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 19) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | run 3

Status: answer. 199 s. 7 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 11 unsourced.
Session: 20261009-060711-9896. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261009-060711-9896/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 11 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261009-060711-9896/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 14) | pass -15895.48 via tolerance (n2, claim check 70) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 11) | pass 2375 via tolerance (n2, claim check 70) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 11) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 14) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 1

Status: answer. 122 s. 7 requests, 7 tool calls (1 failed), 0 nudges, 1 plan reminders, 4 unsourced.
Session: 20261009-061030-0f70. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261009-061030-0f70/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261009-061030-0f70/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 105) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 36) | pass 1608 via tolerance (n4, claim check 105) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 36) | pass 2072 via tolerance (n4, claim check 105) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 36) | pass 465 via tolerance (n7, claim check 105) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_fwd_gene_pos, entry 70) | pass 341 via tolerance (n7, claim check 105) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 105) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 40) | pass 1275 via tolerance (n5, claim check 105) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 40) | pass 2193 via tolerance (n5, claim check 105) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 40) | pass 919 via tolerance (n7, claim check 105) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_fwd_gene_pos, entry 70) | pass 8 via tolerance (n7, claim check 105) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 67) | pass 61.39 via tolerance (n6, claim check 105) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 36) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 2

Status: answer. 59 s. 5 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-061233-a8f1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run2/home/sessions/20261009-061233-a8f1/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run2/home/sessions/20261009-061233-a8f1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 86) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 28) | pass 1608 via tolerance (n4, claim check 86) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 28) | pass 2072 via tolerance (n4, claim check 86) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 28) | pass 465 via tolerance (n7, claim check 86) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_gene_pos, entry 65) | pass 341 via tolerance (n7, claim check 86) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 86) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 31) | pass 1275 via tolerance (n5, claim check 86) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 31) | pass 2193 via tolerance (n5, claim check 86) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 31) | pass 919 via tolerance (n7, claim check 86) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_gene_pos, entry 65) | pass 8 via tolerance (n7, claim check 86) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 58) | pass 61.39 via tolerance (n6, claim check 86) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 28) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 3

Status: answer. 70 s. 7 requests, 8 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-061332-af49. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run3/home/sessions/20261009-061332-af49/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/klindworth2013-16s-primers/run3/home/sessions/20261009-061332-af49/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n7, claim check 107) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 34) | pass 1608 via tolerance (n4, claim check 107) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 34) | pass 2072 via tolerance (n4, claim check 107) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 34) | pass 465 via tolerance (n8, claim check 107) |
| pair1_ecoli_position | 341 exact | pass 341 (n8 metrics.pair1_fwd_16S_start, entry 79) | pass 341 via tolerance (n8, claim check 107) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n7, claim check 107) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 38) | pass 1275 via tolerance (n5, claim check 107) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 38) | pass 2193 via tolerance (n5, claim check 107) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 38) | pass 919 via tolerance (n8, claim check 107) |
| pair2_ecoli_position | 8 exact | pass 8 (n8 metrics.pair2_fwd_16S_start, entry 79) | pass 8 via tolerance (n8, claim check 107) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n7 metrics.tm_c_1, entry 71) | pass 61.39 via tolerance (n7, claim check 107) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 34) | not asked |

### lackey2015-tb-default | claude:claude-haiku-5-5 | run 1

Status: answer. 73 s. 8 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061442-41ff. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lackey2015-tb-default/run1/home/sessions/20261009-061442-41ff/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lackey2015-tb-default/run1/home/sessions/20261009-061442-41ff/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 11) | not asked |
| defaulted | 127 exact | pass 127 (n8 metrics.events, entry 77) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 31) | pass 0.006 via tolerance (n7, claim check 106) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 34) | pass 0.00004 via tolerance (n7, claim check 106) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 37) | FAIL 0.707 (n8, claim check 106) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 40) | pass 0.034 via tolerance (n7, claim check 106) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n8 metrics.or_drug_use_Yes, entry 77) | pass 4.78 via tolerance (n8, claim check 106) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n8 metrics.or_lo_drug_use_Yes, entry 77) | pass 3.05 via tolerance (n8, claim check 106) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n8 metrics.or_hi_drug_use_Yes, entry 77) | pass 7.49 via tolerance (n8, claim check 106) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n8 metrics.or_bmi_Underweight, entry 77) | pass 2.08 via tolerance (n8, claim check 106) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n8 metrics.or_lo_bmi_Underweight, entry 77) | pass 1.21 via tolerance (n8, claim check 106) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n8 metrics.or_hi_bmi_Underweight, entry 77) | pass 3.56 via tolerance (n8, claim check 106) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n8 metrics.or_bmi_Overweight_Obese, entry 77) | pass 0.88 via tolerance (n8, claim check 106) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n8 metrics.or_lo_bmi_Overweight_Obese, entry 77) | pass 0.44 via tolerance (n8, claim check 106) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n8 metrics.or_hi_bmi_Overweight_Obese, entry 77) | pass 1.73 via tolerance (n8, claim check 106) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n8 metrics.or_mdr_tb_Yes, entry 77) | pass 3.04 via tolerance (n8, claim check 106) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n8 metrics.or_lo_mdr_tb_Yes, entry 77) | pass 1.58 via tolerance (n8, claim check 106) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n8 metrics.or_hi_mdr_tb_Yes, entry 77) | pass 5.85 via tolerance (n8, claim check 106) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n8 metrics.or_alcohol_weekly_Yes, entry 77) | pass 2.22 via tolerance (n8, claim check 106) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n8 metrics.or_lo_alcohol_weekly_Yes, entry 77) | pass 1.4 via tolerance (n8, claim check 106) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n8 metrics.or_hi_alcohol_weekly_Yes, entry 77) | pass 3.52 via tolerance (n8, claim check 106) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n8 metrics.or_hiv_status_Test_not_done, entry 77) | pass 2.3 via tolerance (n8, claim check 106) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n8 metrics.or_lo_hiv_status_Test_not_done, entry 77) | pass 1.5 via tolerance (n8, claim check 106) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n8 metrics.or_hi_hiv_status_Test_not_done, entry 77) | pass 3.54 via tolerance (n8, claim check 106) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n8 metrics.or_hiv_status_Positive, entry 77) | pass 1.39 via tolerance (n8, claim check 106) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n8 metrics.or_lo_hiv_status_Positive, entry 77) | pass 0.42 via tolerance (n8, claim check 106) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n8 metrics.or_hi_hiv_status_Positive, entry 77) | pass 4.65 via tolerance (n8, claim check 106) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n8 metrics.or_secondary_education_No, entry 77) | pass 1.55 via tolerance (n8, claim check 106) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n8 metrics.or_lo_secondary_education_No, entry 77) | pass 1.03 via tolerance (n8, claim check 106) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n8 metrics.or_hi_secondary_education_No, entry 77) | pass 2.33 via tolerance (n8, claim check 106) |

### lackey2015-tb-default | claude:claude-haiku-5-5 | run 2

Status: answer. 71 s. 11 requests, 16 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061555-f17f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lackey2015-tb-default/run2/home/sessions/20261009-061555-f17f/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lackey2015-tb-default/run2/home/sessions/20261009-061555-f17f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 11) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 65) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006039 (n8 table.rows[0][0], entry 77) | pass 0.006039 via tolerance (n8, claim check 130) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 34) | pass 0.00003945 via tolerance (n8, claim check 130) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 37) | pass 0.6815 via tolerance (n4, claim check 130) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436 (n8 table.rows[3][0], entry 77) | pass 0.03436 via tolerance (n8, claim check 130) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 65) | pass 4.78 via tolerance (n7, claim check 130) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 65) | pass 3.05 via tolerance (n7, claim check 130) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 65) | pass 7.49 via tolerance (n7, claim check 130) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 65) | pass 2.08 via tolerance (n7, claim check 130) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 65) | pass 1.21 via tolerance (n7, claim check 130) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 65) | pass 3.56 via tolerance (n7, claim check 130) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 65) | pass 0.88 via tolerance (n7, claim check 130) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 65) | pass 0.44 via tolerance (n7, claim check 130) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 65) | pass 1.73 via tolerance (n7, claim check 130) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 65) | pass 3.04 via tolerance (n7, claim check 130) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 65) | pass 1.58 via tolerance (n7, claim check 130) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 65) | pass 5.85 via tolerance (n7, claim check 130) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 65) | pass 2.22 via tolerance (n7, claim check 130) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 65) | pass 1.4 via tolerance (n7, claim check 130) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 65) | pass 3.52 via tolerance (n7, claim check 130) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 65) | pass 2.3 via tolerance (n7, claim check 130) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 65) | pass 1.5 via tolerance (n7, claim check 130) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 65) | pass 3.54 via tolerance (n7, claim check 130) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 65) | pass 1.39 via tolerance (n7, claim check 130) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 65) | pass 0.42 via tolerance (n7, claim check 130) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 65) | pass 4.65 via tolerance (n7, claim check 130) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 65) | pass 1.55 via tolerance (n7, claim check 130) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 65) | pass 1.03 via tolerance (n7, claim check 130) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 65) | pass 2.33 via tolerance (n7, claim check 130) |

### lackey2015-tb-default | claude:claude-haiku-5-5 | run 3

Status: answer. 69 s. 7 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061707-f82d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lackey2015-tb-default/run3/home/sessions/20261009-061707-f82d/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lackey2015-tb-default/run3/home/sessions/20261009-061707-f82d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 11) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 65) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 31) | pass 0.00604 via tolerance (n8, claim check 95) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 34) | pass 0.0000394 via tolerance (n8, claim check 95) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 37) | FAIL 0.707 (n7, claim check 95) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 40) | pass 0.0344 via tolerance (n8, claim check 95) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 65) | pass 4.782 via tolerance (n7, claim check 95) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 65) | pass 3.052 via tolerance (n7, claim check 95) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 65) | pass 7.491 via tolerance (n7, claim check 95) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 65) | pass 2.08 via tolerance (n7, claim check 95) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 65) | pass 1.214 via tolerance (n7, claim check 95) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 65) | pass 3.563 via tolerance (n7, claim check 95) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 65) | pass 0.878 via tolerance (n7, claim check 95) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 65) | pass 0.444 via tolerance (n7, claim check 95) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 65) | pass 1.733 via tolerance (n7, claim check 95) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 65) | pass 3.038 via tolerance (n7, claim check 95) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 65) | pass 1.578 via tolerance (n7, claim check 95) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 65) | pass 5.851 via tolerance (n7, claim check 95) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 65) | pass 2.222 via tolerance (n7, claim check 95) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 65) | pass 1.401 via tolerance (n7, claim check 95) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 65) | pass 3.525 via tolerance (n7, claim check 95) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 65) | pass 2.303 via tolerance (n7, claim check 95) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 65) | pass 1.5 via tolerance (n7, claim check 95) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 65) | pass 3.536 via tolerance (n7, claim check 95) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 65) | pass 1.392 via tolerance (n7, claim check 95) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 65) | pass 0.417 via tolerance (n7, claim check 95) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 65) | pass 4.654 via tolerance (n7, claim check 95) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 65) | pass 1.55 via tolerance (n7, claim check 95) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 65) | pass 1.032 via tolerance (n7, claim check 95) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 65) | pass 2.329 via tolerance (n7, claim check 95) |

### li2009-samtools | claude:claude-haiku-5-5 | run 1

Status: answer. 57 s. 10 requests, 7 tool calls (0 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061816-77ea. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/li2009-samtools/run1/home/sessions/20261009-061816-77ea/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/li2009-samtools/run1/home/sessions/20261009-061816-77ea/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 11) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 33) | pass 3271 via tolerance (n5, claim check 99) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 33) | pass 3144 via tolerance (n4, claim check 99) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 33) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 36) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 36) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 64) | pass 79 via tolerance (n10, claim check 99) |

### li2009-samtools | claude:claude-haiku-5-5 | run 2

Status: answer. 39 s. 6 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061913-9a00. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/li2009-samtools/run2/home/sessions/20261009-061913-9a00/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/li2009-samtools/run2/home/sessions/20261009-061913-9a00/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 11) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 28) | pass 3271 via tolerance (n5, claim check 80) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 28) | pass 3144 via tolerance (n4, claim check 80) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 28) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 36) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 36) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 68) | pass 79 via tolerance (n10, claim check 80) |

### li2009-samtools | claude:claude-haiku-5-5 | run 3

Status: answer. 42 s. 7 requests, 6 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061952-be04. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/li2009-samtools/run3/home/sessions/20261009-061952-be04/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/li2009-samtools/run3/home/sessions/20261009-061952-be04/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 11) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 33) | pass 3271 via tolerance (n5, claim check 81) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 33) | pass 3144 via tolerance (n4, claim check 81) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 33) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 36) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 36) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 64) | pass 79 via tolerance (n10, claim check 81) |

### ljosa2012-bbbc005 | claude:claude-haiku-5-5 | run 1

Status: answer. 479 s. 8 requests, 8 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062034-a386. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ljosa2012-bbbc005/run1/home/sessions/20261009-062034-a386/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ljosa2012-bbbc005/run1/home/sessions/20261009-062034-a386/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n16 metrics.ratio_otsu_shape, entry 108) | pass 0.9399 via tolerance (n11, claim check 136) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n11 metrics.mean_abs_error, entry 76) | pass 3.01 via tolerance (n11, claim check 136) |
| true_total_sample | 5007 exact | pass 5007 (n11 metrics.true_total, entry 76) | not asked |

### ljosa2012-bbbc005 | claude:claude-haiku-5-5 | run 2

Status: answer. 700 s. 13 requests, 15 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-062904-c7bf. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ljosa2012-bbbc005/run2/home/sessions/20261009-062904-c7bf/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ljosa2012-bbbc005/run2/home/sessions/20261009-062904-c7bf/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n19 metrics.ratio_Otsu_Shape, entry 131) | pass 0.9399 via tolerance (n20, claim check 187) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n12 metrics.mean_abs_error, entry 100) | pass 3.01 via tolerance (n20, claim check 187) |
| true_total_sample | 5007 exact | pass 5007 (n12 metrics.true_total, entry 100) | not asked |

### ljosa2012-bbbc005 | claude:claude-haiku-5-5 | run 3

Status: answer. 495 s. 17 requests, 17 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-064047-0883. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ljosa2012-bbbc005/run3/home/sessions/20261009-064047-0883/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ljosa2012-bbbc005/run3/home/sessions/20261009-064047-0883/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n17 metrics.ratio_Otsu_Shape, entry 158) | pass 0.9399 via tolerance (n11, claim check 210) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n11 metrics.mean_abs_error, entry 116) | pass 3.01 via tolerance (n12, claim check 210) |
| true_total_sample | 5007 exact | pass 5007 (n11 metrics.true_total, entry 116) | not asked |

