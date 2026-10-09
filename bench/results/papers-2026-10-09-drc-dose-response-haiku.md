# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 9/9 | 8/8 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| desveaux2026-pcrv-ic50 | 9/9 / 8/8 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 237 | 17 | 42 | 32028 | 1339841 | 25 | 1 | 1 | 1 | 1 | 2 | 7 | 2 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.05 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 1 | on | 8 | 0 | 1 | 0 | 0 |

## Details

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 1

Status: answer. 237 s. 17 requests, 25 tool calls (1 failed), 1 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-005138-9691. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-005138-9691/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-005138-9691/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.11725 (n17 stdout, entry 145) | pass 0.1173 via tolerance (n2, claim check 192) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.021307 (n17 stdout, entry 145) | pass 0.02131 via tolerance (n4, claim check 192) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n17 stdout, entry 145) | pass 3.653 via tolerance (n17, claim check 192) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n3 metrics.P3D6_ic50, entry 68) | pass 11.79 via tolerance (n17, claim check 192) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.012782 (n17 stdout, entry 145) | pass 0.01278 via tolerance (n17, claim check 192) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.011202 (n17 stdout, entry 145) | pass 0.0112 via tolerance (n17, claim check 192) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.01305 (n17 stdout, entry 145) | pass 0.01305 via tolerance (n17, claim check 192) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.010452 (n17 stdout, entry 145) | pass 0.01045 via tolerance (n4, claim check 192) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n17 stdout, entry 145) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | match 0.04508121 (n13 metrics.lack_of_fit_p_3PL, entry 118) | match 0.04518 via tolerance (n8, claim check 192) |

