# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 36/36 | 30/30 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| white2021-flowkit | 36/36 / 30/30 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 283 | 20 | 52 | 26832 | 325757 | 22 | 0 | 0 | 0 | 3 | 7 | 15 | 4 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| white2021-flowkit | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| white2021-flowkit | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| white2021-flowkit | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |

## Details

### white2021-flowkit | claude:claude-haiku-5-5 | run 1

Status: answer. 80 s. 6 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-034356-c9d3. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/white2021-flowkit/claude_claude-haiku-5-5/white2021-flowkit/run1/home/sessions/20261012-034356-c9d3/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/white2021-flowkit/claude_claude-haiku-5-5/white2021-flowkit/run1/home/sessions/20261012-034356-c9d3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 12) | pass 290172 via tolerance (n4, claim check 70) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 38) | pass 133670 via tolerance (n4, claim check 70) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 38) | pass 133860 via tolerance (n3, claim check 70) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 38) | pass 82484 via tolerance (n4, claim check 70) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 38) | pass 82636 via tolerance (n3, claim check 70) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 38) | pass 47165 via tolerance (n4, claim check 70) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 38) | pass 47241 via tolerance (n3, claim check 70) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 38) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 41) | pass 135381 via tolerance (n4, claim check 70) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 41) | pass 85369 via tolerance (n4, claim check 70) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 41) | pass 47694 via tolerance (n4, claim check 70) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 41) | not asked |

### white2021-flowkit | claude:claude-haiku-5-5 | run 2

Status: answer. 91 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-034519-b13b. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/white2021-flowkit/claude_claude-haiku-5-5/white2021-flowkit/run2/home/sessions/20261012-034519-b13b/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/white2021-flowkit/claude_claude-haiku-5-5/white2021-flowkit/run2/home/sessions/20261012-034519-b13b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 12) | pass 290172 via tolerance (n4, claim check 78) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 38) | pass 133670 via tolerance (n4, claim check 78) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 38) | pass 133860 via tolerance (n3, claim check 78) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 38) | pass 82484 via tolerance (n4, claim check 78) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 38) | pass 82636 via tolerance (n3, claim check 78) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 38) | pass 47165 via tolerance (n4, claim check 78) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 38) | pass 47241 via tolerance (n3, claim check 78) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 38) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 41) | pass 135381 via tolerance (n4, claim check 78) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 41) | pass 85369 via tolerance (n4, claim check 78) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 41) | pass 47694 via tolerance (n4, claim check 78) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 41) | not asked |

### white2021-flowkit | claude:claude-haiku-5-5 | run 3

Status: answer. 112 s. 7 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-034651-2698. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/white2021-flowkit/claude_claude-haiku-5-5/white2021-flowkit/run3/home/sessions/20261012-034651-2698/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/white2021-flowkit/claude_claude-haiku-5-5/white2021-flowkit/run3/home/sessions/20261012-034651-2698/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 12) | pass 290172 via tolerance (n4, claim check 81) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 33) | pass 133670 via tolerance (n4, claim check 81) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 33) | pass 133860 via tolerance (n3, claim check 81) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 33) | pass 82484 via tolerance (n4, claim check 81) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 33) | pass 82636 via tolerance (n3, claim check 81) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 33) | pass 47165 via tolerance (n4, claim check 81) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 33) | pass 47241 via tolerance (n3, claim check 81) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 33) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 43) | pass 135381 via tolerance (n4, claim check 81) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 43) | pass 85369 via tolerance (n4, claim check 81) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 43) | pass 47694 via tolerance (n4, claim check 81) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 43) | not asked |

