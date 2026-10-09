# Paper benchmark 2026-10-09

Models: claude:claude-sonnet-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 45/45 | 27/27 | 12 | 0 |

## Matrix

| Paper | claude:claude-sonnet-5-5 |
| --- | --- |
| minh2020-iqtree2 | 3/3 / 3/3 |
| rees2019-uptake | 15/15 / 12/12 |
| sriphoosanaphan2021-sample-size | 9/9 / 6/6 |
| wolf2018-scanpy | 18/18 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 12 | 1063 | 106 | 266 | 49347 | 1536493 | 99 | 3 | 3 | 0 | 9 | 35 | 32 | 18 | 30 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-sonnet-5-5: $1.41 for 12 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| minh2020-iqtree2 | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 0 | 2 | 0 |
| minh2020-iqtree2 | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 2 | 0 |
| minh2020-iqtree2 | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 4 | 0 |
| rees2019-uptake | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 1 | 3 | 0 |
| rees2019-uptake | claude:claude-sonnet-5-5 | 2 | on | 3 | 0 | 0 | 2 | 0 |
| rees2019-uptake | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 0 | 6 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-sonnet-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-sonnet-5-5 | 2 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-sonnet-5-5 | 3 | on | 0 | 0 | 0 | 0 | 0 |
| wolf2018-scanpy | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 0 | 6 | 0 |
| wolf2018-scanpy | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 0 | 3 | 0 |
| wolf2018-scanpy | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 2 | 0 |

## Details

### minh2020-iqtree2 | claude:claude-sonnet-5-5 | run 1

Status: answer. 84 s. 7 requests, 2 tool calls (0 failed), 3 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-071104-fdbb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/minh2020-iqtree2/run1/home/sessions/20261009-071104-fdbb/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/minh2020-iqtree2/run1/home/sessions/20261009-071104-fdbb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 11) | pass -21152.54 via tolerance (n1, claim check 53) |

### minh2020-iqtree2 | claude:claude-sonnet-5-5 | run 2

Status: answer. 61 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-071229-bdb8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/minh2020-iqtree2/run2/home/sessions/20261009-071229-bdb8/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/minh2020-iqtree2/run2/home/sessions/20261009-071229-bdb8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 11) | pass -21152.54 via tolerance (n1, claim check 37) |

### minh2020-iqtree2 | claude:claude-sonnet-5-5 | run 3

Status: answer. 89 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-071330-26bb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/minh2020-iqtree2/run3/home/sessions/20261009-071330-26bb/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/minh2020-iqtree2/run3/home/sessions/20261009-071330-26bb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 11) | pass -21152.54 via tolerance (n1, claim check 38) |

### rees2019-uptake | claude:claude-sonnet-5-5 | run 1

Status: answer. 103 s. 9 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-071459-9e17. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rees2019-uptake/run1/home/sessions/20261009-071459-9e17/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rees2019-uptake/run1/home/sessions/20261009-071459-9e17/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 88) | not asked |
| nuclei | 582 ±35 | pass 566 (n7 metrics.total_nuclei, entry 96) | pass 566 via tolerance (n7, claim check 130) |
| vesicles | 461 ±35 | pass 459 (n7 metrics.total_cells, entry 96) | pass 459 via tolerance (n7, claim check 130) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n7 table.rows[1][5], entry 96) | pass 0.64 via tolerance (n7, claim check 130) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.46512 (n7 table.rows[1][3], entry 96) | pass 0.465 via tolerance (n7, claim check 130) |
| cells (reference) | 572 ±35 | match 566 (n7 metrics.total_nuclei, entry 96) | match 566 via tolerance (n7, claim check 130) |

### rees2019-uptake | claude:claude-sonnet-5-5 | run 2

Status: answer. 123 s. 9 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-071642-a137. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rees2019-uptake/run2/home/sessions/20261009-071642-a137/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rees2019-uptake/run2/home/sessions/20261009-071642-a137/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 86) | not asked |
| nuclei | 582 ±35 | pass 566 (n7 metrics.total_nuclei, entry 94) | pass 566 via tolerance (n7, claim check 139) |
| vesicles | 461 ±35 | pass 459 (n7 metrics.total_cells, entry 94) | pass 459 via tolerance (n7, claim check 139) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n7 table.rows[1][5], entry 94) | pass 0.64 via tolerance (n7, claim check 139) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.46512 (n7 table.rows[1][3], entry 94) | pass 0.4357 via tolerance (n12, claim check 139) |
| cells (reference) | 572 ±35 | match 566 (n7 metrics.total_nuclei, entry 94) | match 566 via tolerance (n7, claim check 139) |

### rees2019-uptake | claude:claude-sonnet-5-5 | run 3

Status: answer. 88 s. 9 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-071846-db68. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rees2019-uptake/run3/home/sessions/20261009-071846-db68/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rees2019-uptake/run3/home/sessions/20261009-071846-db68/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 86) | not asked |
| nuclei | 582 ±35 | pass 566 (n7 metrics.total_nuclei, entry 94) | pass 566 via tolerance (n7, claim check 127) |
| vesicles | 461 ±35 | pass 459 (n7 metrics.total_cells, entry 94) | pass 459 via tolerance (n7, claim check 127) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n7 table.rows[1][5], entry 94) | pass 0.64 via tolerance (n7, claim check 127) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.46512 (n7 table.rows[1][3], entry 94) | pass 0.465 via tolerance (n7, claim check 127) |
| cells (reference) | 572 ±35 | match 566 (n7 metrics.total_nuclei, entry 94) | match 566 via tolerance (n7, claim check 127) |

### sriphoosanaphan2021-sample-size | claude:claude-sonnet-5-5 | run 1

Status: answer. 32 s. 3 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072014-91ba. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261009-072014-91ba/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261009-072014-91ba/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 15) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 15) | pass 30 via tolerance (n1, claim check 25) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 15) | pass 60 via tolerance (n1, claim check 25) |

### sriphoosanaphan2021-sample-size | claude:claude-sonnet-5-5 | run 2

Status: answer. 23 s. 3 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072047-c1d9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261009-072047-c1d9/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261009-072047-c1d9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 15) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 15) | pass 30 via tolerance (n1, claim check 26) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 15) | pass 60 via tolerance (n1, claim check 26) |

### sriphoosanaphan2021-sample-size | claude:claude-sonnet-5-5 | run 3

Status: answer. 33 s. 4 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072109-c0f2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261009-072109-c0f2/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261009-072109-c0f2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 15) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 15) | pass 30 via tolerance (n3, claim check 36) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 15) | pass 60 via tolerance (n3, claim check 36) |

### wolf2018-scanpy | claude:claude-sonnet-5-5 | run 1

Status: answer. 160 s. 16 requests, 17 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-072142-f937. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wolf2018-scanpy/run1/home/sessions/20261009-072142-f937/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wolf2018-scanpy/run1/home/sessions/20261009-072142-f937/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 16) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 16) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 27) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n4 metrics.n_cells_after, entry 49) | pass 2638 via tolerance (n20, claim check 186) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n6 metrics.n_highly_variable, entry 69) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n14 metrics.n_clusters, entry 122) | pass 7 via tolerance (n21, claim check 186) |

### wolf2018-scanpy | claude:claude-sonnet-5-5 | run 2

Status: answer. 140 s. 20 requests, 22 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-072427-f0eb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wolf2018-scanpy/run2/home/sessions/20261009-072427-f0eb/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wolf2018-scanpy/run2/home/sessions/20261009-072427-f0eb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 18) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 18) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 29) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 62) | pass 2638 via tolerance (n20, claim check 221) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 82) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n15 metrics.n_clusters, entry 136) | pass 7 via tolerance (n21, claim check 221) |

### wolf2018-scanpy | claude:claude-sonnet-5-5 | run 3

Status: answer. 128 s. 18 requests, 20 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-072649-6747. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wolf2018-scanpy/run3/home/sessions/20261009-072649-6747/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wolf2018-scanpy/run3/home/sessions/20261009-072649-6747/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 18) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 18) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 29) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n4 metrics.n_cells_after, entry 51) | pass 2638 via tolerance (n19, claim check 202) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n6 metrics.n_highly_variable, entry 72) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n14 metrics.n_clusters, entry 125) | pass 7 via tolerance (n20, claim check 202) |

