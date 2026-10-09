# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 10/10 | 10/10 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| jahncke2025-dag1-mipsc | 10/10 / 10/10 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 398 | 14 | 34 | 19159 | 470387 | 14 | 2 | 0 | 0 | 1 | 3 | 3 | 5 | 0 | 1 | 1 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| jahncke2025-dag1-mipsc | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |

## Details

### jahncke2025-dag1-mipsc | claude:claude-haiku-5-5 | run 1

Status: answer. 398 s. 14 requests, 14 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-053013-97c5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jahncke2025-dag1-mipsc/run1/home/sessions/20261009-053013-97c5/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jahncke2025-dag1-mipsc/run1/home/sessions/20261009-053013-97c5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_cells_ctrl | 16 exact | pass 16 (n9 table.rows[0][4], entry 107) | pass 16 via tolerance (n13, claim check 172) |
| n_cells_cko | 16 exact | pass 16 (n9 table.rows[0][4], entry 107) | pass 16 via tolerance (n13, claim check 172) |
| n_animals_per_group | 6 exact | pass 6 (n9 table.rows[0][6], entry 107) | pass 6 via tolerance (n12, claim check 172) |
| p_frequency | 0.018 ±0.015 | pass 0.01436587 (n9 metrics.min_p_bh, entry 107) | pass 0.0194 via tolerance (n13, claim check 172) |
| p_amplitude | 0.017 ±0.015 | pass 0.01436587 (n9 metrics.min_p_bh, entry 107) | pass 0.0194 via tolerance (n13, claim check 172) |
| p_rise (reference) | 0.38 ±0.2 | match 0.2717857 (n9 metrics.max_icc_animal, entry 107) | not asked |
| p_decay (reference) | 0.36 ±0.25 | match 0.2717857 (n9 metrics.max_icc_animal, entry 107) | not asked |
| decay_ctrl | 7.87 ±0.5 | pass 8.07126 (n9 table.rows[3][8], entry 107) | pass 8.07 via tolerance (n12, claim check 172) |
| freq_ctrl | 2.97 ±0.6 | pass 2.576535 (n9 table.rows[0][8], entry 107) | pass 3.01 via tolerance (n10, claim check 172) |
| freq_cko | 1.76 ±0.5 | pass 1.662719 (n9 table.rows[0][10], entry 107) | pass 1.66 via tolerance (n12, claim check 172) |
| amp_ctrl | 51.9 ±7 | pass 55.49043 (n9 table.rows[1][8], entry 107) | pass 54.12 via tolerance (n13, claim check 172) |
| amp_cko | 38.3 ±6 | pass 38.11834 (n9 table.rows[1][10], entry 107) | pass 38.12 via tolerance (n12, claim check 172) |
| p_amplitude_animal_unit (reference) | 0.067 ±0.03 | match 0.051347 (n9 table.rows[0][19], entry 107) | not asked |

