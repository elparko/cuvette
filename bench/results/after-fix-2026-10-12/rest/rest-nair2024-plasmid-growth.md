# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 60/60 | 51/51 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| nair2024-plasmid-growth | 60/60 / 51/51 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 464 | 37 | 96 | 43299 | 1260599 | 37 | 0 | 0 | 2 | 3 | 9 | 11 | 4 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.06 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nair2024-plasmid-growth | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 0 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-haiku-5-5 | 3 | on | 8 | 1 | 0 | 0 | 0 |

Paths outside the allow list:
- nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 3: /compare_growth-1/groups.csv

## Details

### nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 1

Status: answer. 143 s. 13 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-033255-9b93. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/nair2024-plasmid-growth/claude_claude-haiku-5-5/nair2024-plasmid-growth/run1/home/sessions/20261012-033255-9b93/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/nair2024-plasmid-growth/claude_claude-haiku-5-5/nair2024-plasmid-growth/run1/home/sessions/20261012-033255-9b93/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 65) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 65) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 65) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n6 stdout, entry 113) | pass 1.005 via tolerance (n6, claim check 146) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n6 stdout, entry 113) | pass 1.028 via tolerance (n5, claim check 146) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n6 stdout, entry 113) | pass 1.033 via tolerance (n5, claim check 146) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.965689 (n6 stdout, entry 113) | pass 0.966 via tolerance (n5, claim check 146) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n6 stdout, entry 113) | pass 1.072 via tolerance (n5, claim check 146) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n6 stdout, entry 113) | pass 1.008 via tolerance (n5, claim check 146) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.961198 (n6 stdout, entry 113) | pass 0.961 via tolerance (n5, claim check 146) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.97545 (n6 stdout, entry 113) | pass 0.975 via tolerance (n5, claim check 146) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n6 stdout, entry 113) | pass 1.043 via tolerance (n5, claim check 146) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.990162 (n6 stdout, entry 113) | pass 0.99 via tolerance (n6, claim check 146) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.946554 (n6 stdout, entry 113) | pass 0.947 via tolerance (n6, claim check 146) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n6 stdout, entry 113) | pass 1.082 via tolerance (n6, claim check 146) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.742365 (n6 stdout, entry 113) | pass 0.742 via tolerance (n5, claim check 146) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n6 stdout, entry 113) | pass 1.151 via tolerance (n6, claim check 146) |
| p_p5 | 0.243208 ±0.0005 | pass 0.243208 (n6 stdout, entry 113) | pass 0.243 via tolerance (n6, claim check 146) |
| p_p11 | 0.507637 ±0.0005 | pass 0.507637 (n6 stdout, entry 113) | pass 0.508 via tolerance (n6, claim check 146) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n6 stdout, entry 113) | pass 1.009 via tolerance (n6, claim check 146) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n5 metrics.rel_mean_Host, entry 104) | differs 0.99 (n6, claim check 146) |

### nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 2

Status: answer. 158 s. 13 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-033518-ea65. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/nair2024-plasmid-growth/claude_claude-haiku-5-5/nair2024-plasmid-growth/run2/home/sessions/20261012-033518-ea65/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/nair2024-plasmid-growth/claude_claude-haiku-5-5/nair2024-plasmid-growth/run2/home/sessions/20261012-033518-ea65/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 55) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 55) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 55) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n5 stdout, entry 91) | pass 1.0053 via tolerance (n4, claim check 146) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n5 stdout, entry 91) | pass 1.0278 via tolerance (n4, claim check 146) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n5 stdout, entry 91) | pass 1.0329 via tolerance (n5, claim check 146) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.965689 (n5 stdout, entry 91) | pass 0.9657 via tolerance (n4, claim check 146) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n5 stdout, entry 91) | pass 1.0725 via tolerance (n5, claim check 146) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n5 stdout, entry 91) | pass 1.0083 via tolerance (n5, claim check 146) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.961198 (n5 stdout, entry 91) | pass 0.9612 via tolerance (n5, claim check 146) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.97545 (n5 stdout, entry 91) | pass 0.9754 via tolerance (n4, claim check 146) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n5 stdout, entry 91) | pass 1.0426 via tolerance (n4, claim check 146) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.990162 (n5 stdout, entry 91) | pass 0.9902 via tolerance (n4, claim check 146) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.946554 (n5 stdout, entry 91) | pass 0.9466 via tolerance (n5, claim check 146) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n5 stdout, entry 91) | pass 1.0821 via tolerance (n4, claim check 146) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.742365 (n5 stdout, entry 91) | pass 0.7424 via tolerance (n5, claim check 146) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n5 stdout, entry 91) | pass 1.1507 via tolerance (n5, claim check 146) |
| p_p5 | 0.243208 ±0.0005 | pass 0.243208 (n5 stdout, entry 91) | pass 0.243 via tolerance (n5, claim check 146) |
| p_p11 | 0.507637 ±0.0005 | pass 0.507637 (n5 stdout, entry 91) | pass 0.508 via tolerance (n5, claim check 146) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n6 metrics.mean of 12 plasmid means, entry 100) | pass 1.0092 via tolerance (n6, claim check 146) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_Host, entry 82) | differs 0.9902 (n4, claim check 146) |

### nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 3

Status: answer. 163 s. 11 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-033757-1f59. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/nair2024-plasmid-growth/claude_claude-haiku-5-5/nair2024-plasmid-growth/run3/home/sessions/20261012-033757-1f59/log.jsonl
Leak check: 8 paths read, 1 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/nair2024-plasmid-growth/claude_claude-haiku-5-5/nair2024-plasmid-growth/run3/home/sessions/20261012-033757-1f59/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 60) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 60) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 60) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n5 stdout, entry 103) | pass 1.005 via tolerance (n5, claim check 133) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n5 stdout, entry 103) | pass 1.028 via tolerance (n4, claim check 133) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n5 stdout, entry 103) | pass 1.033 via tolerance (n4, claim check 133) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.965689 (n5 stdout, entry 103) | pass 0.966 via tolerance (n4, claim check 133) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n5 stdout, entry 103) | pass 1.072 via tolerance (n4, claim check 133) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n5 stdout, entry 103) | pass 1.008 via tolerance (n4, claim check 133) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.961198 (n5 stdout, entry 103) | pass 0.961 via tolerance (n6, claim check 133) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.97545 (n5 stdout, entry 103) | pass 0.975 via tolerance (n4, claim check 133) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n5 stdout, entry 103) | pass 1.043 via tolerance (n4, claim check 133) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.990162 (n5 stdout, entry 103) | pass 0.99 via tolerance (n5, claim check 133) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.946554 (n5 stdout, entry 103) | pass 0.947 via tolerance (n5, claim check 133) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n5 stdout, entry 103) | pass 1.082 via tolerance (n5, claim check 133) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.742365 (n5 stdout, entry 103) | pass 0.742 via tolerance (n4, claim check 133) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n5 stdout, entry 103) | pass 1.151 via tolerance (n5, claim check 133) |
| p_p5 | 0.243208 ±0.0005 | pass 0.243208 (n5 stdout, entry 103) | pass 0.243 via tolerance (n5, claim check 133) |
| p_p11 | 0.507637 ±0.0005 | pass 0.507637 (n5 stdout, entry 103) | pass 0.508 via tolerance (n5, claim check 133) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n6 metrics.mean_of_12_plasmid_means, entry 112) | pass 1.009 via tolerance (n6, claim check 133) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_DA49828_Host, entry 94) | differs 0.99 (n5, claim check 133) |

