# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 12/12 | 12/12 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| weber2023-nnsvg-dlpfc | 12/12 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 274 | 27 | 78 | 19175 | 401846 | 21 | 0 | 0 | 3 | 3 | 3 | 10 | 1 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | 3 | on | 6 | 0 | 0 | 0 | 0 |

## Details

### weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 1

Status: answer. 92 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-032548-5fc3. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/weber2023-nnsvg-dlpfc/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261012-032548-5fc3/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/weber2023-nnsvg-dlpfc/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261012-032548-5fc3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 15) | pass 3639 via tolerance (n8, claim check 104) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 75) | pass 2 via tolerance (n8, claim check 104) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 75) | pass 4 via tolerance (n8, claim check 104) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 75) | pass 19 via tolerance (n8, claim check 104) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 33) | differs 3309 (n8, claim check 104) |

### weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 2

Status: answer. 93 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-032720-afdc. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/weber2023-nnsvg-dlpfc/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261012-032720-afdc/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/weber2023-nnsvg-dlpfc/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261012-032720-afdc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 15) | pass 3639 via tolerance (n8, claim check 105) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 75) | pass 2 via tolerance (n8, claim check 105) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 75) | pass 4 via tolerance (n8, claim check 105) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 75) | pass 19 via tolerance (n8, claim check 105) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 33) | differs 3309 (n8, claim check 105) |

### weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 3

Status: answer. 89 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-032853-a91a. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/weber2023-nnsvg-dlpfc/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261012-032853-a91a/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/weber2023-nnsvg-dlpfc/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261012-032853-a91a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 15) | pass 3639 via tolerance (n8, claim check 103) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 75) | pass 2 via tolerance (n8, claim check 103) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 75) | pass 4 via tolerance (n8, claim check 103) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 75) | pass 19 via tolerance (n8, claim check 103) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 33) | differs 3309 (n8, claim check 103) |

