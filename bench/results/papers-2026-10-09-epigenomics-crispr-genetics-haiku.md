# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 23/23 | 23/23 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| yavorska2017-mendelianrandomization | 12/12 / 12/12 |
| li2014-mageck-melanoma | 6/6 / 6/6 |
| ross-innes2012-diffbind-tamoxifen | 5/5 / 5/5 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 496 | 33 | 84 | 40522 | 849410 | 41 | 3 | 0 | 2 | 3 | 9 | 14 | 5 | 0 | 1 | 1 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.04 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| yavorska2017-mendelianrandomization | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 1 | 0 | 0 |
| li2014-mageck-melanoma | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 1 | 0 | 0 |
| ross-innes2012-diffbind-tamoxifen | claude:claude-haiku-5-5 | 1 | on | 14 | 0 | 1 | 0 | 0 |

## Details

### yavorska2017-mendelianrandomization | claude:claude-haiku-5-5 | run 1

Status: answer. 116 s. 7 requests, 8 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-024240-8c65. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/yavorska2017-mendelianrandomization/run1/home/sessions/20261009-024240-8c65/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/yavorska2017-mendelianrandomization/run1/home/sessions/20261009-024240-8c65/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_variants | 28 exact | pass 28 (n2 metrics.n_variants, entry 54) | pass 28 via tolerance (n6, claim check 103) |
| ivw_estimate | 2.834 ±0.01 | pass 2.834214 (n2 metrics.ivw_estimate, entry 54) | pass 2.834 via tolerance (n6, claim check 103) |
| ivw_se | 0.53 ±0.01 | pass 0.5297995 (n2 metrics.ivw_se, entry 54) | pass 0.53 via tolerance (n6, claim check 103) |
| ivw_ci_low | 1.796 ±0.02 | pass 1.795826 (n2 metrics.ivw_ci_low, entry 54) | pass 1.796 via tolerance (n2, claim check 103) |
| ivw_ci_high | 3.873 ±0.02 | pass 3.872602 (n2 metrics.ivw_ci_high, entry 54) | pass 3.873 via tolerance (n2, claim check 103) |
| cochran_q | 99.5304 ±0.5 | pass 99.53043 (n2 metrics.ivw_q, entry 54) | pass 99.53 via tolerance (n6, claim check 103) |
| i_squared | 72.9 ±0.5 | pass 72.87262 (n2 metrics.ivw_i2, entry 54) | pass 72.9 via tolerance (n2, claim check 103) |
| f_statistic (reference) | 28 ±0.5 | match 28 (n1 metrics.n_variants, entry 41) | match 28 via tolerance (n6, claim check 103) |
| egger_se | 0.77 ±0.01 | pass 0.7701292 (n2 metrics.egger_se, entry 54) | pass 0.77 via tolerance (n2, claim check 103) |
| egger_estimate | 3.253 ±0.01 | pass 3.25289 (n2 metrics.egger_estimate, entry 54) | pass 3.253 via tolerance (n2, claim check 103) |
| egger_intercept | -0.011 ±0.002 | pass -0.01146067 (n2 metrics.egger_intercept, entry 54) | pass -0.0115 via tolerance (n2, claim check 103) |
| egger_intercept_p | 0.451 ±0.01 | pass 0.4505065 (n2 metrics.egger_intercept_p, entry 54) | pass 0.451 via tolerance (n2, claim check 103) |
| weighted_median_estimate | 2.683 ±0.01 | pass 2.682883 (n2 metrics.weighted_median_estimate, entry 54) | pass 2.683 via tolerance (n2, claim check 103) |

### li2014-mageck-melanoma | claude:claude-haiku-5-5 | run 1

Status: answer. 169 s. 11 requests, 11 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-024436-9501. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/li2014-mageck-melanoma/run1/home/sessions/20261009-024436-9501/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/li2014-mageck-melanoma/run1/home/sessions/20261009-024436-9501/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cdh13_rank_day14 | 9 exact | pass 9 (n1 metrics.CDH13_pos_rank, entry 54) | pass 9 via tolerance (n2, claim check 118) |
| ppt1_rank_day14 | 14 exact | pass 14 (n1 metrics.PPT1_pos_rank, entry 54) | pass 14 via tolerance (n3, claim check 118) |
| tada1_rank_day14 | 11 exact | pass 11 (n1 metrics.TADA1_pos_rank, entry 54) | pass 11 via tolerance (n3, claim check 118) |
| rreb1_rank_neg_day14 | 1 exact | pass 1 (n1 metrics.n_neg_fdr, entry 54) | pass 1 via tolerance (n2, claim check 118) |
| egfr_rank_neg_day7 | 6 exact | pass 6 (n1 metrics.CDH13_sgrnas, entry 54) | pass 6 via tolerance (n2, claim check 118) |
| egfr_fdr_neg_day7 | 0.025 ±0.005 | pass 0.024752 (n1 metrics.RREB1_neg_fdr, entry 54) | pass 0.025 via tolerance (n3, claim check 118) |
| cdh13_fdr_day14 (reference) | 0.017 ±0.015 | match 0.016777 (n2 table.rows[17][4], entry 62) | match 0.025 via tolerance (n3, claim check 118) |
| genes_ranked (reference) | 17419 ±40 | match 17396 (n1 metrics.n_genes, entry 54) | not asked |

### ross-innes2012-diffbind-tamoxifen | claude:claude-haiku-5-5 | run 1

Status: answer. 212 s. 15 requests, 22 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-024725-1c01. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ross-innes2012-diffbind-tamoxifen/run1/home/sessions/20261009-024725-1c01/log.jsonl
Leak check: 14 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/ross-innes2012-diffbind-tamoxifen/run1/home/sessions/20261009-024725-1c01/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| consensus_sites | 2845 exact | pass 2845 (n1 metrics.n_sites, entry 39) | pass 2845 via tolerance (n12, claim check 215) |
| differential_tissue_block | 783 exact | pass 783 (n8 metrics.n_significant, entry 105) | pass 783 via tolerance (n12, claim check 215) |
| gain_tissue_block | 188 exact | pass 188 (n8 metrics.n_up, entry 105) | pass 188 via tolerance (n12, claim check 215) |
| lose_tissue_block | 595 exact | pass 595 (n8 metrics.n_down, entry 105) | pass 595 via tolerance (n12, claim check 215) |
| differential_no_block | 246 exact | pass 246 (n2 metrics.n_significant, entry 78) | pass 246 via tolerance (n12, claim check 215) |

