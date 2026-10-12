# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 9/9 | 3/3 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| mahbod2024-nuinsseg | 9/9 / 3/3 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 1744 | 55 | 136 | 63194 | 1453362 | 65 | 1 | 0 | 4 | 3 | 8 | 15 | 13 | 2 | 10 | 10 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.06 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mahbod2024-nuinsseg | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 1 | 0 |
| mahbod2024-nuinsseg | claude:claude-haiku-5-5 | 3 | on | 8 | 0 | 0 | 1 | 0 |

## Details

### mahbod2024-nuinsseg | claude:claude-haiku-5-5 | run 1

Status: answer. 503 s. 14 requests, 22 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-035802-91d4. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/mahbod2024-nuinsseg/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261012-035802-91d4/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/mahbod2024-nuinsseg/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261012-035802-91d4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n13 metrics.mean_dice, entry 84) | pass 0.538 via tolerance (n25, claim check 197) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 12) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n13 metrics.total_truth, entry 84) | not asked |

### mahbod2024-nuinsseg | claude:claude-haiku-5-5 | run 2

Status: answer. 685 s. 23 requests, 20 tool calls (0 failed), 0 nudges, 2 plan reminders, 1 unsourced.
Session: 20261012-040624-a949. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/mahbod2024-nuinsseg/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261012-040624-a949/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/mahbod2024-nuinsseg/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261012-040624-a949/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n12 metrics.mean_dice, entry 97) | pass 0.538 via tolerance (n12, claim check 237) |
| image_patches | 665 exact | pass 665 (n3 stdout, entry 52) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n12 metrics.total_truth, entry 97) | not asked |

### mahbod2024-nuinsseg | claude:claude-haiku-5-5 | run 3

Status: answer. 557 s. 18 requests, 23 tool calls (1 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261012-041749-5e01. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/mahbod2024-nuinsseg/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261012-041749-5e01/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/mahbod2024-nuinsseg/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261012-041749-5e01/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n11 metrics.mean_dice, entry 85) | pass 0.538 via tolerance (n22, claim check 221) |
| image_patches | 665 exact | pass 665 (n11 metrics.n_images, entry 85) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n11 metrics.total_truth, entry 85) | not asked |

