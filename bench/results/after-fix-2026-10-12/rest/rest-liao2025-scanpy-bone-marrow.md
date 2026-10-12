# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 15/15 | 12/12 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| liao2025-scanpy-bone-marrow | 15/15 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 382 | 38 | 92 | 30604 | 773671 | 44 | 1 | 0 | 3 | 2 | 6 | 12 | 4 | 10 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | 1 | on | 10 | 0 | 0 | 0 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | 2 | on | 10 | 0 | 0 | 4 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | 3 | on | 9 | 0 | 0 | 6 | 0 |

## Details

### liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | run 1

Status: answer. 105 s. 9 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-034845-026f. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/liao2025-scanpy-bone-marrow/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261012-034845-026f/log.jsonl
Leak check: 10 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/liao2025-scanpy-bone-marrow/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261012-034845-026f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 15) | pass 10608 via tolerance (n10, claim check 112) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 18) | pass 10046 via tolerance (n11, claim check 112) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n10 metrics.n_cells_after, entry 84) | pass 9612 via tolerance (n10, claim check 112) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n11 metrics.n_cells_after, entry 87) | pass 8887 via tolerance (n11, claim check 112) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 15) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | run 2

Status: answer. 125 s. 14 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 4 unsourced.
Session: 20261012-035033-edf6. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/liao2025-scanpy-bone-marrow/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261012-035033-edf6/log.jsonl
Leak check: 10 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/liao2025-scanpy-bone-marrow/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261012-035033-edf6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 15) | pass 10608 via tolerance (n9, claim check 139) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 18) | pass 10046 via tolerance (n10, claim check 139) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n9 metrics.n_cells_after, entry 85) | pass 9612 via tolerance (n9, claim check 139) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n10 metrics.n_cells_after, entry 93) | pass 8887 via tolerance (n10, claim check 139) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 15) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | run 3

Status: answer. 151 s. 15 requests, 16 tool calls (1 failed), 0 nudges, 1 plan reminders, 6 unsourced.
Session: 20261012-035240-e62b. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/liao2025-scanpy-bone-marrow/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261012-035240-e62b/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/liao2025-scanpy-bone-marrow/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261012-035240-e62b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 15) | pass 10608 via tolerance (n11, claim check 155) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 18) | pass 10046 via tolerance (n11, claim check 155) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 88) | pass 9612 via tolerance (n11, claim check 155) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 96) | pass 8887 via tolerance (n11, claim check 155) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 15) | not asked |

