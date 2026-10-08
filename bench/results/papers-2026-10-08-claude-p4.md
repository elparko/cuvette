# Paper benchmark 2026-10-08

Models: claude. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude | 24/24 | 16/16 | 3 | 0 |

## Matrix

| Paper | claude |
| --- | --- |
| student1908-sleep | 6/6 / 4/4 |
| white2021-flowkit | 12/12 / 10/10 |
| wolf2018-scanpy | 6/6 / 2/2 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude | 3 | 756 | 39 | 90 | 24945 | 615275 | 51 | 0 | 0 | 0 | 3 | 14 | 3 | 5 | 1 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude: $0.98 for 3 runs

## Details

### student1908-sleep | claude | run 1

Status: answer. 59 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153325-d563. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/student1908-sleep/run1/home/sessions/20261008-153325-d563/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 32) | pass 1.58 via tolerance (n3, claim check 66) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 32) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 32) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 32) | pass 0.002833 via tolerance (n3, claim check 66) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 32) | pass 0.7 via tolerance (n3, claim check 66) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 32) | pass 2.46 via tolerance (n3, claim check 66) |

### white2021-flowkit | claude | run 1

Status: answer. 411 s. 8 requests, 16 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153424-1d81. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/white2021-flowkit/run1/home/sessions/20261008-153424-1d81/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 15) | pass 290172 via tolerance (n4, claim check 98) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 35) | pass 133670 via tolerance (n6, claim check 98) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 35) | pass 133860 via tolerance (n3, claim check 98) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 35) | pass 82484 via tolerance (n6, claim check 98) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 35) | pass 82636 via tolerance (n3, claim check 98) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 35) | pass 47165 via tolerance (n8, claim check 98) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 35) | pass 47241 via tolerance (n3, claim check 98) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 35) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 38) | pass 135381 via tolerance (n4, claim check 98) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 38) | pass 85369 via tolerance (n4, claim check 98) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 38) | pass 47694 via tolerance (n4, claim check 98) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 38) | not asked |

### wolf2018-scanpy | claude | run 1

Status: answer. 286 s. 25 requests, 30 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261008-154115-3525. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/wolf2018-scanpy/run1/home/sessions/20261008-154115-3525/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 22) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 22) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 32) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n6 metrics.n_cells_after, entry 77) | pass 2638 via tolerance (n17, claim check 281) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n8 metrics.n_highly_variable, entry 99) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n10 table.rows[6][0], entry 119) | pass 7 via tolerance (n25, claim check 281) |

