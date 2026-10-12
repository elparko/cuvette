# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 10/10 | 10/10 | 2 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| korsunsky2019-harmony | 10/10 / 10/10 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 2 | 857 | 49 | 110 | 47320 | 1703107 | 59 | 1 | 0 | 2 | 2 | 5 | 12 | 2 | 0 | 4 | 4 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.06 for 2 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 1 | on | 19 | 0 | 0 | 0 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 2 | on | 17 | 0 | 0 | 0 | 0 |

## Details

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 1

Status: answer. 430 s. 25 requests, 31 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-045357-9599. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-c/bench-runs/korsunsky2019-harmony/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261012-045357-9599/log.jsonl
Leak check: 19 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-c/bench-runs/korsunsky2019-harmony/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261012-045357-9599/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.002393 (n13 metrics.mean, entry 134) | pass 1.06 via tolerance (n30, claim check 295) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n30 table.rows[2][3], entry 267) | pass 1.64 via tolerance (n30, claim check 295) |
| clisi_before | 1 ±0.02 | pass 1 (n12 table.n_rows, entry 131) | pass 1 via tolerance (n28, claim check 295) |
| clisi_after | 1 ±0.02 | pass 1 (n12 table.n_rows, entry 131) | pass 1 via tolerance (n28, claim check 295) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n11 table.rows[0][1], entry 124) | pass 3255 via tolerance (n29, claim check 295) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n11 table.rows[1][3], entry 124) | differs 2885 (n29, claim check 295) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n11 table.rows[0][2], entry 124) | differs 1960 (n10, claim check 295) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n11 table.rows[1][2], entry 124) | differs 1960 (n10, claim check 295) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 2

Status: answer. 427 s. 24 requests, 28 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-050110-f9a2. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-c/bench-runs/korsunsky2019-harmony/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261012-050110-f9a2/log.jsonl
Leak check: 17 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-c/bench-runs/korsunsky2019-harmony/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261012-050110-f9a2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.002393 (n13 metrics.mean, entry 141) | pass 1.06 via tolerance (n12, claim check 292) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n12 table.rows[2][3], entry 137) | pass 1.66 via tolerance (n18, claim check 292) |
| clisi_before | 1 ±0.02 | pass 1 (n13 metrics.median, entry 141) | pass 1 via tolerance (n30, claim check 292) |
| clisi_after | 1 ±0.02 | pass 1 (n13 metrics.median, entry 141) | pass 1 via tolerance (n30, claim check 292) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n6 table.rows[0][1], entry 73) | pass 3255 via tolerance (n27, claim check 292) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n6 table.rows[2][1], entry 73) | differs 2885 (n27, claim check 292) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n27 table.rows[1][1], entry 219) | differs 1773 (n27, claim check 292) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n27 table.rows[1][2], entry 219) | differs 1615 (n27, claim check 292) |

