# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 15/15 | 12/12 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| love2014-deseq2-airway | 15/15 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 447 | 19 | 56 | 36171 | 315658 | 14 | 0 | 0 | 0 | 3 | 13 | 7 | 7 | 4 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| love2014-deseq2-airway | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| love2014-deseq2-airway | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 2 | 0 |
| love2014-deseq2-airway | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 2 | 0 |

## Details

### love2014-deseq2-airway | claude:claude-haiku-5-5 | run 1

Status: answer. 142 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-033758-6c61. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/love2014-deseq2-airway/claude_claude-haiku-5-5/love2014-deseq2-airway/run1/home/sessions/20261012-033758-6c61/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/love2014-deseq2-airway/claude_claude-haiku-5-5/love2014-deseq2-airway/run1/home/sessions/20261012-033758-6c61/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 50) | pass 16637 via tolerance (n7, claim check 95) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 50) | pass 4381 via tolerance (n7, claim check 95) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 50) | pass 2362 via tolerance (n7, claim check 95) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 50) | pass 2019 via tolerance (n7, claim check 95) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 41) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 50) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 50) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 58) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 50) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 50) | not asked |

### love2014-deseq2-airway | claude:claude-haiku-5-5 | run 2

Status: answer. 148 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-034020-b2d0. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/love2014-deseq2-airway/claude_claude-haiku-5-5/love2014-deseq2-airway/run2/home/sessions/20261012-034020-b2d0/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/love2014-deseq2-airway/claude_claude-haiku-5-5/love2014-deseq2-airway/run2/home/sessions/20261012-034020-b2d0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 50) | pass 16637 via tolerance (n7, claim check 88) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 50) | pass 4381 via tolerance (n7, claim check 88) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 50) | pass 2362 via tolerance (n7, claim check 88) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 50) | pass 2019 via tolerance (n7, claim check 88) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 41) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 50) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 50) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 58) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 50) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 50) | not asked |

### love2014-deseq2-airway | claude:claude-haiku-5-5 | run 3

Status: answer. 156 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-034248-4191. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/love2014-deseq2-airway/claude_claude-haiku-5-5/love2014-deseq2-airway/run3/home/sessions/20261012-034248-4191/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/love2014-deseq2-airway/claude_claude-haiku-5-5/love2014-deseq2-airway/run3/home/sessions/20261012-034248-4191/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n8 metrics.n_genes_tested, entry 53) | pass 16637 via tolerance (n8, claim check 91) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n8 metrics.n_significant, entry 53) | pass 4381 via tolerance (n8, claim check 91) |
| up_padj_01 | 2362 ±10 | pass 2362 (n8 metrics.n_up, entry 53) | pass 2362 via tolerance (n8, claim check 91) |
| down_padj_01 | 2019 ±3 | pass 2019 (n8 metrics.n_down, entry 53) | pass 2019 via tolerance (n8, claim check 91) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n6 metrics.n_significant, entry 44) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n8 metrics.n_genes_tested, entry 53) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n8 metrics.n_significant, entry 53) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n9 table.rows[14][1], entry 61) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n8 metrics.n_up, entry 53) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n8 metrics.n_significant, entry 53) | not asked |

