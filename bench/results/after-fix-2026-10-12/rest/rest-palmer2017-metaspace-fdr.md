# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 0/0 | 0/0 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| palmer2017-metaspace-fdr | 0/0 / 0/0 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 402 | 37 | 98 | 33893 | 984734 | 66 | 16 | 4 | 0 | 3 | 6 | 20 | 10 | 2 | 7 | 7 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.04 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | 2 | on | 0 | 0 | 0 | 2 | 0 |
| palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | 3 | on | 0 | 0 | 0 | 0 | 0 |

## Details

### palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | run 1

Status: answer. 123 s. 14 requests, 25 tool calls (0 failed), 4 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-034524-1618. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/palmer2017-metaspace-fdr/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261012-034524-1618/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/palmer2017-metaspace-fdr/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261012-034524-1618/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs 36 (n1, claim check 160) |
| unique_formulas_three_sections (reference) | 66 exact | differs 72 (n5 data.pixel_size.Xaxis, entry 34) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n9 data.pixel_size.Xaxis, entry 56) | not asked |

### palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | run 2

Status: answer. 145 s. 10 requests, 21 tool calls (7 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-034727-fb2a. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/palmer2017-metaspace-fdr/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261012-034727-fb2a/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/palmer2017-metaspace-fdr/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261012-034727-fb2a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | match 50 via tolerance (n13, claim check 145) |
| unique_formulas_three_sections (reference) | 66 exact | differs 72 (n3 data.pixel_size.Xaxis, entry 23) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n2 metrics.n_scanned, entry 15) | not asked |

### palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | run 3

Status: answer. 135 s. 13 requests, 20 tool calls (9 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-034952-5890. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/palmer2017-metaspace-fdr/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261012-034952-5890/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/palmer2017-metaspace-fdr/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261012-034952-5890/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | match 50 via tolerance (n5, claim check 166) |
| unique_formulas_three_sections (reference) | 66 exact | differs 62 (n10 metrics.n_databases, entry 96) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n6 data.pixel_size.Xaxis, entry 37) | not asked |

