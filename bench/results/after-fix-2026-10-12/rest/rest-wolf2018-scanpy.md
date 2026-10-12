# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 18/18 | 6/6 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| wolf2018-scanpy | 18/18 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 654 | 71 | 160 | 66096 | 2168107 | 73 | 5 | 0 | 3 | 3 | 11 | 13 | 5 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.08 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wolf2018-scanpy | claude:claude-haiku-5-5 | 1 | on | 14 | 0 | 0 | 0 | 0 |
| wolf2018-scanpy | claude:claude-haiku-5-5 | 2 | on | 15 | 0 | 0 | 0 | 0 |
| wolf2018-scanpy | claude:claude-haiku-5-5 | 3 | on | 15 | 0 | 0 | 0 | 0 |

## Details

### wolf2018-scanpy | claude:claude-haiku-5-5 | run 1

Status: answer. 254 s. 26 requests, 28 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-040418-6e93. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wolf2018-scanpy/claude_claude-haiku-5-5/wolf2018-scanpy/run1/home/sessions/20261012-040418-6e93/log.jsonl
Leak check: 14 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wolf2018-scanpy/claude_claude-haiku-5-5/wolf2018-scanpy/run1/home/sessions/20261012-040418-6e93/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 15) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 15) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 32) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 76) | pass 2638 via tolerance (n16, claim check 293) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 99) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 167) | pass 7 via tolerance (n23, claim check 293) |

### wolf2018-scanpy | claude:claude-haiku-5-5 | run 2

Status: answer. 203 s. 24 requests, 24 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-040843-0ddb. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wolf2018-scanpy/claude_claude-haiku-5-5/wolf2018-scanpy/run2/home/sessions/20261012-040843-0ddb/log.jsonl
Leak check: 15 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wolf2018-scanpy/claude_claude-haiku-5-5/wolf2018-scanpy/run2/home/sessions/20261012-040843-0ddb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 12) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 12) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 41) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 77) | pass 2638 via tolerance (n16, claim check 268) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 100) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 169) | pass 7 via tolerance (n21, claim check 268) |

### wolf2018-scanpy | claude:claude-haiku-5-5 | run 3

Status: answer. 198 s. 21 requests, 21 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-041208-2809. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wolf2018-scanpy/claude_claude-haiku-5-5/wolf2018-scanpy/run3/home/sessions/20261012-041208-2809/log.jsonl
Leak check: 15 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wolf2018-scanpy/claude_claude-haiku-5-5/wolf2018-scanpy/run3/home/sessions/20261012-041208-2809/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 17) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 17) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 35) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 70) | pass 2638 via tolerance (n16, claim check 239) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 93) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 161) | pass 7 via tolerance (n21, claim check 239) |

