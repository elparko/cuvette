# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 54/54 | 38/39 | 18 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| love2014-deseq2-airway | 15/15 / 12/12 |
| minh2020-iqtree2 | 3/3 / 3/3 |
| palmer2017-metaspace-fdr | 0/0 / 0/0 |
| rost2016-openms | 15/15 / 6/6 |
| sriphoosanaphan2021-sample-size | 9/9 / 6/6 |
| weber2023-nnsvg-dlpfc | 12/12 / 11/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 18 | 2268 | 159 | 442 | 155038 | 3139696 | 142 | 12 | 10 | 7 | 17 | 41 | 66 | 40 | 36 | 6 | 6 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.17 for 18 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| love2014-deseq2-airway | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 1 | 0 |
| love2014-deseq2-airway | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 3 | 0 |
| love2014-deseq2-airway | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| minh2020-iqtree2 | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 3 | 0 |
| minh2020-iqtree2 | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| minh2020-iqtree2 | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 5 | 0 |
| palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | 2 | on | 0 | 0 | 0 | 1 | 0 |
| palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | 3 | on | 0 | 0 | 0 | 6 | 0 |
| rost2016-openms | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 4 | 0 |
| rost2016-openms | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 2 | 0 |
| rost2016-openms | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 2 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | 2 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | 3 | on | 0 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 2 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 2 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | 3 | on | 6 | 0 | 0 | 5 | 0 |

## Details

### love2014-deseq2-airway | claude:claude-haiku-5-5 | run 1

Status: answer. 258 s. 13 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-071104-ce66. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/love2014-deseq2-airway/run1/home/sessions/20261009-071104-ce66/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/love2014-deseq2-airway/run1/home/sessions/20261009-071104-ce66/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 59) | pass 16637 via tolerance (n8, claim check 145) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 59) | pass 4381 via tolerance (n8, claim check 145) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 59) | pass 2362 via tolerance (n8, claim check 145) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 59) | pass 2019 via tolerance (n8, claim check 145) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 50) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 59) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 59) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n10 table.rows[14][1], entry 98) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 59) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 59) | not asked |

### love2014-deseq2-airway | claude:claude-haiku-5-5 | run 2

Status: answer. 162 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-071522-cc72. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/love2014-deseq2-airway/run2/home/sessions/20261009-071522-cc72/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/love2014-deseq2-airway/run2/home/sessions/20261009-071522-cc72/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 49) | pass 16637 via tolerance (n7, claim check 98) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 49) | pass 4381 via tolerance (n7, claim check 98) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 49) | pass 2362 via tolerance (n7, claim check 98) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 49) | pass 2019 via tolerance (n7, claim check 98) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 40) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 49) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 49) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 57) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 49) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 49) | not asked |

### love2014-deseq2-airway | claude:claude-haiku-5-5 | run 3

Status: answer. 161 s. 9 requests, 6 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-071804-3f03. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/love2014-deseq2-airway/run3/home/sessions/20261009-071804-3f03/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/love2014-deseq2-airway/run3/home/sessions/20261009-071804-3f03/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 55) | pass 16637 via tolerance (n9, claim check 102) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 55) | pass 4381 via tolerance (n9, claim check 102) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 55) | pass 2362 via tolerance (n9, claim check 102) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 55) | pass 2019 via tolerance (n9, claim check 102) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 46) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 55) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 55) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.6 (n9 stdout, entry 89) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 55) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 55) | not asked |

### minh2020-iqtree2 | claude:claude-haiku-5-5 | run 1

Status: answer. 84 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-072045-8171. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/minh2020-iqtree2/run1/home/sessions/20261009-072045-8171/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/minh2020-iqtree2/run1/home/sessions/20261009-072045-8171/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 11) | pass -21152.54 via tolerance (n1, claim check 50) |

### minh2020-iqtree2 | claude:claude-haiku-5-5 | run 2

Status: answer. 89 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072209-fbf0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/minh2020-iqtree2/run2/home/sessions/20261009-072209-fbf0/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/minh2020-iqtree2/run2/home/sessions/20261009-072209-fbf0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 11) | pass -21152.54 via tolerance (n1, claim check 61) |

### minh2020-iqtree2 | claude:claude-haiku-5-5 | run 3

Status: answer. 98 s. 7 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 5 unsourced.
Session: 20261009-072339-0107. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/minh2020-iqtree2/run3/home/sessions/20261009-072339-0107/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/minh2020-iqtree2/run3/home/sessions/20261009-072339-0107/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 11) | pass -21152.54 via tolerance (n1, claim check 64) |

### palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | run 1

Status: answer. 123 s. 10 requests, 16 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072516-0b53. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261009-072516-0b53/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261009-072516-0b53/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | match 50 via tolerance (n3, claim check 115) |
| unique_formulas_three_sections (reference) | 66 exact | differs 61 (n8 metrics.n_databases, entry 56) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n3 metrics.n_scanned, entry 22) | not asked |

### palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | run 2

Status: answer. 143 s. 19 requests, 19 tool calls (6 failed), 3 nudges, 2 plan reminders, 1 unsourced.
Session: 20261009-072720-0244. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261009-072720-0244/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261009-072720-0244/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs 69 (n7, claim check 190) |
| unique_formulas_three_sections (reference) | 66 exact | differs 61 (n8 metrics.n_databases, entry 93) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n4 data.pixel_size.Xaxis, entry 32) | not asked |

### palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | run 3

Status: answer. 130 s. 17 requests, 20 tool calls (3 failed), 4 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-072943-9694. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261009-072943-9694/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261009-072943-9694/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs 20 (n9, claim check 170) |
| unique_formulas_three_sections (reference) | 66 exact | differs 61 (n10 metrics.n_databases, entry 50) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n1 metrics.n_scanned, entry 11) | not asked |

### rost2016-openms | claude:claude-haiku-5-5 | run 1

Status: answer. 292 s. 13 requests, 11 tool calls (0 failed), 2 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-073153-efd2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rost2016-openms/run1/home/sessions/20261009-073153-efd2/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rost2016-openms/run1/home/sessions/20261009-073153-efd2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | pass 7173 via tolerance (n13, claim check 167) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 57) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 57) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 57) | pass 1887 via tolerance (n8, claim check 167) |

### rost2016-openms | claude:claude-haiku-5-5 | run 2

Status: answer. 174 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-073646-b4cd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rost2016-openms/run2/home/sessions/20261009-073646-b4cd/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rost2016-openms/run2/home/sessions/20261009-073646-b4cd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | pass 7173 via tolerance (n1, claim check 113) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 62) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 62) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 62) | pass 1887 via tolerance (n8, claim check 113) |

### rost2016-openms | claude:claude-haiku-5-5 | run 3

Status: answer. 117 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-073940-d76e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rost2016-openms/run3/home/sessions/20261009-073940-d76e/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rost2016-openms/run3/home/sessions/20261009-073940-d76e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | pass 7173 via tolerance (n1, claim check 78) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 57) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 57) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 57) | pass 1887 via tolerance (n8, claim check 78) |

### sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | run 1

Status: answer. 43 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074137-1a97. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261009-074137-1a97/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261009-074137-1a97/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 11) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 11) | pass 30 via tolerance (n1, claim check 38) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 11) | pass 60 via tolerance (n1, claim check 38) |

### sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | run 2

Status: answer. 21 s. 2 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074220-dc1e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261009-074220-dc1e/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261009-074220-dc1e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 11) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 11) | pass 30 via tolerance (n1, claim check 22) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 11) | pass 60 via tolerance (n1, claim check 22) |

### sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | run 3

Status: answer. 49 s. 4 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074241-2b2c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261009-074241-2b2c/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261009-074241-2b2c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 13) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 13) | pass 30 via tolerance (n1, claim check 42) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 13) | pass 60 via tolerance (n1, claim check 42) |

### weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 1

Status: answer. 130 s. 13 requests, 11 tool calls (2 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261009-074330-2a35. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261009-074330-2a35/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261009-074330-2a35/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 14) | pass 3639 via tolerance (n8, claim check 138) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 73) | pass 2 via tolerance (n8, claim check 138) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 73) | pass 4 via tolerance (n8, claim check 138) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 73) | pass 19 via tolerance (n8, claim check 138) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 32) | differs 3309 (n8, claim check 138) |

### weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 2

Status: answer. 95 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261009-074541-4a5f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261009-074541-4a5f/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261009-074541-4a5f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 14) | pass 3639 via tolerance (n8, claim check 101) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 71) | pass 2 via tolerance (n8, claim check 101) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 71) | pass 4 via tolerance (n8, claim check 101) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 71) | pass 19 via tolerance (n8, claim check 101) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 32) | differs 3309 (n8, claim check 101) |

### weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 3

Status: answer. 99 s. 10 requests, 7 tool calls (0 failed), 1 nudges, 1 plan reminders, 5 unsourced.
Session: 20261009-074716-e662. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261009-074716-e662/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261009-074716-e662/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 14) | pass 3639 via tolerance (n8, claim check 108) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 74) | FAIL 3 (n8, claim check 108) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 74) | pass 4 via tolerance (n8, claim check 108) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 74) | pass 19 via tolerance (n8, claim check 108) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 32) | differs 3309 (n8, claim check 108) |

