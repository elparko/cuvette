# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 18/18 | 16/16 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| hildyard2021-embryo-refgenes | 18/18 / 16/16 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 170 | 8 | 20 | 17634 | 265671 | 10 | 0 | 0 | 0 | 1 | 4 | 6 | 2 | 2 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 2 | 0 |

## Details

### hildyard2021-embryo-refgenes | claude:claude-haiku-5-5 | run 1

Status: answer. 170 s. 8 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261008-232410-da6e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261008-232410-da6e/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261008-232410-da6e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 40) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.217549 (n5 stdout, entry 63) | pass 0.2175 via tolerance (n1, claim check 103) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.527538 (n5 stdout, entry 63) | pass 0.5275 via tolerance (n5, claim check 103) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.440995 (n5 stdout, entry 63) | pass 0.441 via tolerance (n5, claim check 103) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.227746 (n5 stdout, entry 63) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 40) | pass 14 via tolerance (n5, claim check 103) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 40) | pass 0.0686 via tolerance (n1, claim check 103) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 40) | pass 0.1348 via tolerance (n1, claim check 103) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 40) | pass 0.481 via tolerance (n1, claim check 103) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 48) | pass 0.081 via tolerance (n2, claim check 103) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 48) | pass 0.1805 via tolerance (n2, claim check 103) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n3 metrics.genorm_best_pair_M, entry 51) | pass 0.1142 via tolerance (n3, claim check 103) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n4 metrics.slope_GAPDH, entry 54) | pass -3.4557 via tolerance (n4, claim check 103) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n4 metrics.slope_HTATSF1, entry 54) | pass -3.1799 via tolerance (n4, claim check 103) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n4 metrics.slope_UBC, entry 54) | pass -3.3788 via tolerance (n4, claim check 103) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n4 metrics.efficiency_CYC1, entry 54) | pass 1.945 via tolerance (n4, claim check 103) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n4 metrics.efficiency_PAK1IP1, entry 54) | pass 2.012 via tolerance (n4, claim check 103) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n4 metrics.slope_ACTB, entry 54) | pass -3.2993 via tolerance (n4, claim check 103) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n4 metrics.slope_SDHA, entry 54) | differs -3.2331 (n4, claim check 103) |

