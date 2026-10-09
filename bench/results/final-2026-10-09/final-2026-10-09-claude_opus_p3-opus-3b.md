# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 18/18 | 6/6 | 3 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| wolf2018-scanpy | 18/18 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 3 | 665 | 72 | 156 | 41527 | 1559913 | 79 | 0 | 0 | 0 | 3 | 12 | 8 | 3 | 5 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $1.75 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wolf2018-scanpy | claude:claude-opus-5-5 | 1 | on | 14 | 0 | 0 | 3 | 0 |
| wolf2018-scanpy | claude:claude-opus-5-5 | 2 | on | 17 | 0 | 0 | 2 | 0 |
| wolf2018-scanpy | claude:claude-opus-5-5 | 3 | on | 17 | 0 | 0 | 0 | 0 |

## Details

### wolf2018-scanpy | claude:claude-opus-5-5 | run 1

Status: answer. 235 s. 27 requests, 27 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-081432-8f70. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wolf2018-scanpy/run1/home/sessions/20261009-081432-8f70/log.jsonl
Leak check: 14 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wolf2018-scanpy/run1/home/sessions/20261009-081432-8f70/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 27) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 27) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 38) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 78) | pass 2638 via tolerance (n16, claim check 282) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 100) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 172) | pass 7 via tolerance (n22, claim check 282) |

### wolf2018-scanpy | claude:claude-opus-5-5 | run 2

Status: answer. 225 s. 24 requests, 26 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-081830-cc47. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wolf2018-scanpy/run2/home/sessions/20261009-081830-cc47/log.jsonl
Leak check: 17 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wolf2018-scanpy/run2/home/sessions/20261009-081830-cc47/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 27) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 27) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 39) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 79) | pass 2638 via tolerance (n16, claim check 261) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 101) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n15 metrics.n_clusters, entry 172) | pass 7 via tolerance (n22, claim check 261) |

### wolf2018-scanpy | claude:claude-opus-5-5 | run 3

Status: answer. 205 s. 21 requests, 26 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-082217-8260. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wolf2018-scanpy/run3/home/sessions/20261009-082217-8260/log.jsonl
Leak check: 17 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/wolf2018-scanpy/run3/home/sessions/20261009-082217-8260/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 23) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 23) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 34) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 68) | pass 2638 via tolerance (n20, claim check 242) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 90) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n15 metrics.n_clusters, entry 150) | pass 7 via tolerance (n21, claim check 242) |

