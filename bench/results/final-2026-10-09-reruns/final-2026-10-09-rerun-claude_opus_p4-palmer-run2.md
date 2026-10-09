# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 0/0 | 0/0 | 1 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| palmer2017-metaspace-fdr | 0/0 / 0/0 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 1 | 286 | 30 | 68 | 17935 | 1320060 | 46 | 5 | 0 | 1 | 1 | 4 | 5 | 2 | 1 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $0.97 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| palmer2017-metaspace-fdr | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |

## Details

### palmer2017-metaspace-fdr | claude:claude-opus-5-5 | run 1

Status: answer. 286 s. 30 requests, 46 tool calls (5 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-084712-52f6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261009-084712-52f6/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261009-084712-52f6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | match 48 (n23 metrics.n_in_all, entry 190) | match 48 via tolerance (n30, claim check 307) |
| unique_formulas_three_sections (reference) | 66 exact | match 66 (n6 metrics.n_fdr_20, entry 54) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n9 data.pixel_size.Xaxis, entry 91) | not asked |

