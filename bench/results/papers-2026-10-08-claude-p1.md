# Paper benchmark 2026-10-08

Models: claude. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude | 15/15 | 10/11 | 4 | 0 |

## Matrix

| Paper | claude |
| --- | --- |
| love2014-deseq2-airway | 5/5 / 3/4 |
| mahbod2024-nuinsseg | 3/3 / 1/1 |
| minh2020-iqtree2 | 1/1 / 1/1 |
| oksanen-vegan-dune | 6/6 / 5/5 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude | 4 | 1441 | 42 | 110 | 34190 | 630097 | 50 | 3 | 3 | 0 | 4 | 12 | 13 | 11 | 15 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude: $1.25 for 4 runs

## Details

### love2014-deseq2-airway | claude | run 1

Status: answer. 231 s. 12 requests, 13 tool calls (0 failed), 2 nudges, 0 plan reminders, 8 unsourced.
Session: 20261008-153325-c674. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/love2014-deseq2-airway/run1/home/sessions/20261008-153325-c674/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±600 | pass 16139 (n7 metrics.n_genes_tested, entry 60) | pass 16139 via tolerance (n7, claim check 141) |
| padj_01_workflow | 4381 ±400 | pass 4081 (n5 metrics.n_significant, entry 48) | FAIL 4905 (n9, claim check 141) |
| up_padj_01 | 2362 ±250 | pass 2343.573 (n7 table.rows[4][1], entry 60) | pass 2343.6 via tolerance (n8, claim check 141) |
| down_padj_01 | 2019 ±250 | pass 2059.028 (n8 table.rows[19][1], entry 68) | pass 2059 via tolerance (n8, claim check 141) |
| padj_005_workflow | 3602 ±400 | pass 3659.696 (n7 table.rows[8][1], entry 60) | not asked |

### mahbod2024-nuinsseg | claude | run 1

Status: answer. 980 s. 18 requests, 22 tool calls (0 failed), 1 nudges, 0 plan reminders, 5 unsourced.
Session: 20261008-153716-24d5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/mahbod2024-nuinsseg/run1/home/sessions/20261008-153716-24d5/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.53805 (n14 stdout, entry 84) | pass 0.538 via tolerance (n14, claim check 198) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 11) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n8 metrics.total_truth, entry 57) | not asked |

### minh2020-iqtree2 | claude | run 1

Status: answer. 116 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261008-155336-8650. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/minh2020-iqtree2/run1/home/sessions/20261008-155336-8650/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 10) | pass -21152.54 via tolerance (n1, claim check 48) |

### oksanen-vegan-dune | claude | run 1

Status: answer. 114 s. 6 requests, 11 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-155532-296b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/oksanen-vegan-dune/run1/home/sessions/20261008-155532-296b/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 26) | pass 1.4405 via tolerance (n10, claim check 110) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n7 metrics.stress, entry 67) | pass 0.1183 via tolerance (n7, claim check 110) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n3 metrics.r2, entry 47) | pass 0.3416 via tolerance (n3, claim check 110) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n10 stdout, entry 88) | pass 2.767 via tolerance (n10, claim check 110) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n3 metrics.p, entry 47) | pass 0.002 via tolerance (n10, claim check 110) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n4 metrics.f, entry 54) | not asked |

