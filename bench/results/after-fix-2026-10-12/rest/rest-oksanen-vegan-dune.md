# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 18/18 | 15/15 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| oksanen-vegan-dune | 18/18 / 15/15 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 309 | 26 | 74 | 28030 | 591912 | 36 | 0 | 0 | 2 | 3 | 6 | 11 | 12 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| oksanen-vegan-dune | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-haiku-5-5 | 2 | on | 13 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### oksanen-vegan-dune | claude:claude-haiku-5-5 | run 1

Status: answer. 101 s. 8 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-035513-8c8f. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/oksanen-vegan-dune/claude_claude-haiku-5-5/oksanen-vegan-dune/run1/home/sessions/20261012-035513-8c8f/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/oksanen-vegan-dune/claude_claude-haiku-5-5/oksanen-vegan-dune/run1/home/sessions/20261012-035513-8c8f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 26) | pass 1.4405 via tolerance (n2, claim check 124) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 75) | pass 0.1183 via tolerance (n10, claim check 124) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 50) | pass 0.3416 via tolerance (n6, claim check 124) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 50) | pass 2.767 via tolerance (n6, claim check 124) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n6 metrics.p, entry 50) | pass 0.002 via tolerance (n6, claim check 124) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 62) | not asked |

### oksanen-vegan-dune | claude:claude-haiku-5-5 | run 2

Status: answer. 114 s. 10 requests, 19 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-035654-89fd. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/oksanen-vegan-dune/claude_claude-haiku-5-5/oksanen-vegan-dune/run2/home/sessions/20261012-035654-89fd/log.jsonl
Leak check: 13 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/oksanen-vegan-dune/claude_claude-haiku-5-5/oksanen-vegan-dune/run2/home/sessions/20261012-035654-89fd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 27) | pass 1.4405 via tolerance (n2, claim check 148) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 71) | pass 0.1183 via tolerance (n10, claim check 148) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 51) | pass 0.3416 via tolerance (n6, claim check 148) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 51) | pass 2.767 via tolerance (n6, claim check 148) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n6 metrics.p, entry 51) | pass 0.003 via tolerance (n5, claim check 148) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 58) | not asked |

### oksanen-vegan-dune | claude:claude-haiku-5-5 | run 3

Status: answer. 95 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-035847-4222. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/oksanen-vegan-dune/claude_claude-haiku-5-5/oksanen-vegan-dune/run3/home/sessions/20261012-035847-4222/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/oksanen-vegan-dune/claude_claude-haiku-5-5/oksanen-vegan-dune/run3/home/sessions/20261012-035847-4222/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 29) | pass 1.4405 via tolerance (n2, claim check 115) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 83) | pass 0.1183 via tolerance (n10, claim check 115) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 58) | pass 0.3416 via tolerance (n6, claim check 115) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 58) | pass 2.767 via tolerance (n6, claim check 115) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n6 metrics.p, entry 58) | pass 0.002 via tolerance (n6, claim check 115) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 65) | not asked |

