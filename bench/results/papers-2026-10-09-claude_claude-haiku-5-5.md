# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 9/9 | 9/9 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| elmasri2026-limit-maaslin2 | 9/9 / 9/9 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 308 | 33 | 76 | 38562 | 1194640 | 33 | 2 | 0 | 1 | 1 | 2 | 8 | 9 | 1 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.04 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| elmasri2026-limit-maaslin2 | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 1 | 1 | 0 |

## Details

### elmasri2026-limit-maaslin2 | claude:claude-haiku-5-5 | run 1

Status: answer. 308 s. 33 requests, 33 tool calls (2 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-035258-57f6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/elmasri2026-limit-maaslin2/run1/home/sessions/20261009-035258-57f6/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/elmasri2026-limit-maaslin2/run1/home/sessions/20261009-035258-57f6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples_in_study | 168 exact | pass 168 (n1 metrics.n_samples, entry 11) | pass 168 via tolerance (n17, claim check 378) |
| samples_in_model | 132 exact | pass 132 (n7 metrics.n_samples, entry 120) | pass 132 via tolerance (n20, claim check 378) |
| significant_otus | 1 exact | pass 1 (n7 metrics.n_significant, entry 120) | pass 1 via tolerance (n20, claim check 378) |
| top_q | 0.043 ±0.0005 | pass 0.04264705 (n7 metrics.min_q, entry 120) | pass 0.042647 via tolerance (n15, claim check 378) |
| top_otu_samples | 7 exact | pass 7 (n7 table.rows[0][8], entry 120) | pass 7 via tolerance (n18, claim check 378) |
| otus_tested (reference) | 65 exact | match 65 (n7 metrics.n_features_tested, entry 120) | match 65 via tolerance (n23, claim check 378) |
| shannon_gwg_p | 0.9917 ±0.005 | pass 0.9916617 (n8 metrics.test_p, entry 141) | pass 0.9917 via tolerance (n10, claim check 378) |
| permanova_gwg_r2 | 0.0104 ±0.0005 | pass 0.01040327 (n14 metrics.r2, entry 224) | pass 0.0104 via tolerance (n20, claim check 378) |
| permanova_gwg_f | 0.678 ±0.005 | pass 0.6780651 (n14 metrics.f, entry 224) | pass 0.678 via tolerance (n20, claim check 378) |
| permanova_gwg_p | 0.91 ±0.06 | pass 0.904 (n14 metrics.p, entry 224) | pass 0.904 via tolerance (n20, claim check 378) |

