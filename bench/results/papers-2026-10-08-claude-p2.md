# Paper benchmark 2026-10-08

Models: claude. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude | 20/20 | 9/9 | 4 | 0 |

## Matrix

| Paper | claude |
| --- | --- |
| palmer2017-metaspace-fdr | 0/0 / 0/0 |
| quinlan2010-bedtools | 4/4 / 3/3 |
| rossi1980-recidivism | 11/11 / 4/4 |
| rost2016-openms | 5/5 / 2/2 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude | 4 | 476 | 36 | 92 | 21514 | 610383 | 51 | 14 | 1 | 1 | 3 | 13 | 18 | 5 | 1 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude: $0.92 for 4 runs

## Details

### palmer2017-metaspace-fdr | claude | run 1

Status: answer. 174 s. 16 requests, 25 tool calls (10 failed), 1 nudges, 1 plan reminders, 0 unsourced.
Session: 20261008-153325-0c87. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/palmer2017-metaspace-fdr/run1/home/sessions/20261008-153325-0c87/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs 61 (n5 metrics.n_databases, entry 81) | differs 30 (n4, claim check 173) |
| unique_formulas_three_sections (reference) | 66 exact | differs 61 (n5 metrics.n_databases, entry 81) | not asked |
| total_formulas (reference) | 103 ±20 | differs 61 (n5 metrics.n_databases, entry 81) | not asked |

### quinlan2010-bedtools | claude | run 1

Status: answer. 45 s. 3 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153619-d829. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/quinlan2010-bedtools/run1/home/sessions/20261008-153619-d829/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_result, entry 14) | pass 126 via tolerance (n2, claim check 36) |
| overlapping_pairs | 129 exact | pass 129 (n2 metrics.n_result, entry 17) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n2 metrics.overlap_bases, entry 17) | pass 33713 via tolerance (n2, claim check 36) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 20) | pass 11270 via tolerance (n3, claim check 36) |

### rossi1980-recidivism | claude | run 1

Status: answer. 121 s. 12 requests, 14 tool calls (4 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153704-a49a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/rossi1980-recidivism/run1/home/sessions/20261008-153704-a49a/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 11) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 25) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 47) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 47) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 47) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n3 metrics.hr_fin, entry 47) | pass 0.6843 via tolerance (n3, claim check 115) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 47) | pass 0.0474 via tolerance (n3, claim check 115) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 47) | pass 0.6403 via tolerance (n3, claim check 115) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 25) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 25) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 47) | pass 0.000714 via tolerance (n3, claim check 115) |

### rost2016-openms | claude | run 1

Status: answer. 136 s. 5 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261008-153905-b6b9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/rost2016-openms/run1/home/sessions/20261008-153905-b6b9/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | pass 7173 via tolerance (n1, claim check 104) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 11) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 56) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 56) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 56) | pass 1887 via tolerance (n9, claim check 104) |

