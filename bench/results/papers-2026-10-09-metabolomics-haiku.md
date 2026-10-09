# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 21/21 | 21/21 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| thevenot2015-ropls-sacurine | 21/21 / 21/21 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 198 | 10 | 28 | 18471 | 419210 | 12 | 0 | 0 | 1 | 1 | 4 | 4 | 2 | 5 | 3 | 3 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| thevenot2015-ropls-sacurine | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 5 | 0 |

## Details

### thevenot2015-ropls-sacurine | claude:claude-haiku-5-5 | run 1

Status: answer. 198 s. 10 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 5 unsourced.
Session: 20261009-041011-a533. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/thevenot2015-ropls-sacurine/run1/home/sessions/20261009-041011-a533/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/thevenot2015-ropls-sacurine/run1/home/sessions/20261009-041011-a533/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_samples | 183 exact | pass 183 (n2 metrics.n_samples, entry 56) | pass 183 via tolerance (n7, claim check 150) |
| pca_r2x | 0.501 ±0.002 | pass 0.501 (n2 metrics.r2x, entry 56) | pass 0.501 via tolerance (n2, claim check 150) |
| pca_components | 8 exact | pass 8 (n2 metrics.n_predictive, entry 56) | pass 8 via tolerance (n2, claim check 150) |
| plsda_r2x | 0.275 ±0.002 | pass 0.275 (n3 metrics.r2x, entry 64) | pass 0.275 via tolerance (n4, claim check 150) |
| plsda_r2y | 0.73 ±0.005 | pass 0.73 (n3 metrics.r2y, entry 64) | pass 0.73 via tolerance (n4, claim check 150) |
| plsda_q2 | 0.584 ±0.005 | pass 0.584 (n3 metrics.q2, entry 64) | pass 0.584 via tolerance (n3, claim check 150) |
| plsda_rmsee | 0.262 ±0.003 | pass 0.262 (n3 metrics.rmsee, entry 64) | pass 0.262 via tolerance (n4, claim check 150) |
| plsda_components | 3 exact | pass 3 (n3 metrics.n_predictive, entry 64) | pass 3 via tolerance (n3, claim check 150) |
| oplsda_q2 | 0.602 ±0.005 | pass 0.602 (n4 metrics.q2, entry 68) | pass 0.602 via tolerance (n4, claim check 150) |
| oplsda_orthogonal | 2 exact | pass 2 (n4 metrics.n_orthogonal, entry 68) | pass 2 via tolerance (n6, claim check 150) |
| permutation_p | 0.05 ±0.005 | pass 0.05 (n3 metrics.p_r2y, entry 64) | pass 0.05 via tolerance (n10, claim check 150) |
| oplsda_test_r2y | 0.825 ±0.005 | pass 0.825 (n6 metrics.r2y, entry 87) | pass 0.825 via tolerance (n6, claim check 150) |
| oplsda_test_q2 | 0.608 ±0.005 | pass 0.608 (n6 metrics.q2, entry 87) | pass 0.608 via tolerance (n6, claim check 150) |
| oplsda_test_rmsep | 0.341 ±0.003 | pass 0.341 (n6 metrics.rmsep, entry 87) | pass 0.341 via tolerance (n6, claim check 150) |
| oplsda_test_correct | 77 exact | pass 77 (n6 metrics.holdout_correct, entry 87) | pass 77 via tolerance (n6, claim check 150) |
| age_r2y | 0.476 ±0.005 | pass 0.476 (n7 metrics.r2y, entry 91) | pass 0.476 via tolerance (n7, claim check 150) |
| age_q2 | 0.31 ±0.005 | pass 0.31 (n7 metrics.q2, entry 91) | pass 0.31 via tolerance (n7, claim check 150) |
| age_rmsee | 7.53 ±0.02 | pass 7.53 (n7 metrics.rmsee, entry 91) | pass 7.53 via tolerance (n7, claim check 150) |
| n_significant | 42 exact | pass 42 (n10 metrics.n_significant, entry 114) | pass 42 via tolerance (n10, claim check 150) |
| n_up | 11 exact | pass 11 (n10 metrics.n_up, entry 114) | pass 11 via tolerance (n10, claim check 150) |
| n_down | 31 exact | pass 31 (n10 metrics.n_down, entry 114) | pass 31 via tolerance (n10, claim check 150) |

