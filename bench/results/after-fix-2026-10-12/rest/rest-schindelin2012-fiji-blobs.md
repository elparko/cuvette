# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3/3 | 3/3 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| schindelin2012-fiji-blobs | 3/3 / 3/3 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 236 | 16 | 50 | 10973 | 163324 | 10 | 0 | 0 | 0 | 3 | 12 | 15 | 3 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |

## Details

### schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | run 1

Status: answer. 62 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-040022-d55b. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/schindelin2012-fiji-blobs/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261012-040022-d55b/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/schindelin2012-fiji-blobs/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261012-040022-d55b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 47) | pass 64 via tolerance (n10, claim check 97) |

### schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | run 2

Status: answer. 71 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-040124-1ff2. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/schindelin2012-fiji-blobs/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261012-040124-1ff2/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/schindelin2012-fiji-blobs/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261012-040124-1ff2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 47) | pass 64 via tolerance (n10, claim check 90) |

### schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | run 3

Status: answer. 103 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-040235-f1a9. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/schindelin2012-fiji-blobs/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261012-040235-f1a9/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/schindelin2012-fiji-blobs/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261012-040235-f1a9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 47) | pass 64 via tolerance (n10, claim check 87) |

