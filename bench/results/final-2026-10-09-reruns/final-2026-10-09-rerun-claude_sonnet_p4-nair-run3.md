# Paper benchmark 2026-10-09

Models: claude:claude-sonnet-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 20/20 | 17/17 | 1 | 0 |

## Matrix

| Paper | claude:claude-sonnet-5-5 |
| --- | --- |
| nair2024-plasmid-growth | 20/20 / 17/17 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 1 | 83 | 10 | 26 | 4785 | 234511 | 11 | 2 | 0 | 0 | 1 | 3 | 5 | 1 | 1 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-sonnet-5-5: $0.20 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nair2024-plasmid-growth | claude:claude-sonnet-5-5 | 1 | on | 6 | 0 | 2 | 1 | 0 |

## Details

### nair2024-plasmid-growth | claude:claude-sonnet-5-5 | run 1

Status: answer. 83 s. 10 requests, 11 tool calls (2 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-084712-1523. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/nair2024-plasmid-growth/run1/home/sessions/20261009-084712-1523/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 2 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/nair2024-plasmid-growth/run1/home/sessions/20261009-084712-1523/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 55) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 55) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 55) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_P1, entry 86) | pass 1.005 via tolerance (n4, claim check 114) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_P2, entry 86) | pass 1.028 via tolerance (n4, claim check 114) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_P3, entry 86) | pass 1.033 via tolerance (n4, claim check 114) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_P4, entry 86) | pass 0.9657 via tolerance (n4, claim check 114) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_P5, entry 86) | pass 1.072 via tolerance (n4, claim check 114) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_P6, entry 86) | pass 1.008 via tolerance (n4, claim check 114) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_P7, entry 86) | pass 0.9612 via tolerance (n4, claim check 114) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_P8, entry 86) | pass 0.9754 via tolerance (n4, claim check 114) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_P9, entry 86) | pass 1.043 via tolerance (n4, claim check 114) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_P10, entry 86) | pass 0.9902 via tolerance (n4, claim check 114) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_P11, entry 86) | pass 0.9466 via tolerance (n4, claim check 114) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_P14, entry 86) | pass 1.082 via tolerance (n4, claim check 114) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][8], entry 86) | pass 0.7424 via tolerance (n4, claim check 114) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][9], entry 86) | pass 1.151 via tolerance (n4, claim check 114) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_P5, entry 86) | pass 0.2432 via tolerance (n4, claim check 114) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_P11, entry 86) | pass 0.5076 via tolerance (n4, claim check 114) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n5 metrics.mean_of_12_rel_means, entry 93) | pass 1.009 via tolerance (n5, claim check 114) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_Host, entry 86) | differs 0.9902 (n4, claim check 114) |

