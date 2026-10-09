# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 84/84 | 69/69 | 9 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| korsunsky2019-harmony | 15/15 / 15/15 |
| mahbod2024-nuinsseg | 9/9 / 3/3 |
| nair2024-plasmid-growth | 60/60 / 51/51 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 9 | 4532 | 192 | 452 | 194125 | 5673827 | 213 | 14 | 1 | 9 | 9 | 35 | 63 | 20 | 15 | 6 | 6 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.22 for 9 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 1 | on | 22 | 0 | 0 | 10 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 2 | on | 22 | 0 | 0 | 0 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 3 | on | 21 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-haiku-5-5 | 1 | on | 8 | 0 | 1 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 1 | 3 | 0 |
| mahbod2024-nuinsseg | claude:claude-haiku-5-5 | 3 | on | 7 | 0 | 1 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 2 | 1 | 0 |
| nair2024-plasmid-growth | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 2 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 2 | 1 | 0 |

## Details

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 1

Status: answer. 613 s. 32 requests, 31 tool calls (1 failed), 0 nudges, 1 plan reminders, 10 unsourced.
Session: 20261009-071104-3fec. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261009-071104-3fec/log.jsonl
Leak check: 22 paths read, 0 outside the allow list, 0 blocked, 10 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261009-071104-3fec/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.005921 (n20 table.rows[3][3], entry 192) | pass 1.06 via tolerance (n11, claim check 346) |
| ilisi_after | 1.59 ±0.1 | pass 1.617978 (n11 metrics.q75, entry 129) | pass 1.66 via tolerance (n21, claim check 346) |
| clisi_before | 1 ±0.02 | pass 1 (n11 table.n_rows, entry 129) | pass 1 via tolerance (n31, claim check 346) |
| clisi_after | 1 ±0.02 | pass 1 (n11 table.n_rows, entry 129) | pass 1 via tolerance (n31, claim check 346) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n6 table.rows[0][1], entry 73) | pass 3255 via tolerance (n21, claim check 346) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n6 table.rows[2][1], entry 73) | differs 2885 (n21, claim check 346) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n13 table.rows[0][2], entry 145) | differs 1773 (n13, claim check 346) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n13 table.rows[1][2], entry 145) | differs 1615 (n13, claim check 346) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 2

Status: answer. 654 s. 31 requests, 37 tool calls (1 failed), 0 nudges, 2 plan reminders, 0 unsourced.
Session: 20261009-072122-036d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261009-072122-036d/log.jsonl
Leak check: 22 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261009-072122-036d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.002393 (n12 metrics.mean, entry 139) | pass 1.06 via tolerance (n11, claim check 362) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n11 table.rows[2][3], entry 135) | pass 1.64 via tolerance (n32, claim check 362) |
| clisi_before | 1 ±0.02 | pass 1 (n12 metrics.median, entry 139) | pass 1 via tolerance (n32, claim check 362) |
| clisi_after | 1 ±0.02 | pass 1 (n12 metrics.median, entry 139) | pass 1 via tolerance (n32, claim check 362) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n13 table.rows[0][1], entry 142) | pass 3255 via tolerance (n30, claim check 362) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n13 table.rows[2][2], entry 142) | differs 2885 (n30, claim check 362) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n13 table.rows[1][1], entry 142) | differs 1773 (n13, claim check 362) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n13 table.rows[1][2], entry 142) | differs 1615 (n13, claim check 362) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 3

Status: answer. 541 s. 28 requests, 33 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073222-b8c2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run3/home/sessions/20261009-073222-b8c2/log.jsonl
Leak check: 21 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run3/home/sessions/20261009-073222-b8c2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.006729 (n13 table.rows[3][3], entry 145) | pass 1.06 via tolerance (n12, claim check 316) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n12 table.rows[2][3], entry 137) | pass 1.64 via tolerance (n12, claim check 316) |
| clisi_before | 1 ±0.02 | pass 1 (n13 metrics.median, entry 145) | pass 1 via tolerance (n29, claim check 316) |
| clisi_after | 1 ±0.02 | pass 1 (n13 metrics.median, entry 145) | pass 1 via tolerance (n29, claim check 316) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n6 table.rows[0][1], entry 68) | pass 3255 via tolerance (n19, claim check 316) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n6 table.rows[2][1], entry 68) | differs 2885 (n19, claim check 316) |
| mix_jurkat_cells (reference) | 1799 exact | differs 2885 (n6 table.rows[2][1], entry 68) | differs 1859 (n29, claim check 316) |
| mix_t293_cells (reference) | 1565 exact | differs 2885 (n6 table.rows[2][1], entry 68) | differs 1859 (n29, claim check 316) |

### mahbod2024-nuinsseg | claude:claude-haiku-5-5 | run 1

Status: answer. 728 s. 24 requests, 27 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-074129-75c8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261009-074129-75c8/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261009-074129-75c8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n12 metrics.mean_dice, entry 106) | pass 0.538 via tolerance (n13, claim check 253) |
| image_patches | 665 exact | pass 665 (n12 metrics.n_images, entry 106) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n12 metrics.total_truth, entry 106) | not asked |

### mahbod2024-nuinsseg | claude:claude-haiku-5-5 | run 2

Status: answer. 369 s. 18 requests, 21 tool calls (1 failed), 0 nudges, 1 plan reminders, 3 unsourced.
Session: 20261009-075337-80b7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261009-075337-80b7/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 1 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261009-075337-80b7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.538 (n21 stdout, entry 165) | pass 0.538 via tolerance (n21, claim check 214) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 13) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n15 metrics.total_truth, entry 114) | not asked |

### mahbod2024-nuinsseg | claude:claude-haiku-5-5 | run 3

Status: answer. 1156 s. 21 requests, 23 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-075946-9c99. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261009-075946-9c99/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261009-075946-9c99/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n12 metrics.mean_dice, entry 101) | pass 0.538 via tolerance (n15, claim check 243) |
| image_patches | 665 exact | pass 665 (n3 stdout, entry 44) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n12 metrics.total_truth, entry 101) | not asked |

### nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 1

Status: answer. 158 s. 12 requests, 13 tool calls (2 failed), 1 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-081902-6f88. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/nair2024-plasmid-growth/run1/home/sessions/20261009-081902-6f88/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 2 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/nair2024-plasmid-growth/run1/home/sessions/20261009-081902-6f88/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 61) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 61) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 61) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_DA49828_P1, entry 90) | pass 1.005 via tolerance (n4, claim check 143) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_DA49828_P2, entry 90) | pass 1.028 via tolerance (n4, claim check 143) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_DA49828_P3, entry 90) | pass 1.033 via tolerance (n4, claim check 143) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_DA49828_P4, entry 90) | pass 0.966 via tolerance (n4, claim check 143) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_DA49828_P5, entry 90) | pass 1.072 via tolerance (n4, claim check 143) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_DA49828_P6, entry 90) | pass 1.008 via tolerance (n4, claim check 143) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_DA49828_P7, entry 90) | pass 0.961 via tolerance (n4, claim check 143) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_DA49828_P8, entry 90) | pass 0.975 via tolerance (n4, claim check 143) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_DA49828_P9, entry 90) | pass 1.043 via tolerance (n4, claim check 143) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_DA49828_P10, entry 90) | pass 0.99 via tolerance (n4, claim check 143) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_DA49828_P11, entry 90) | pass 0.947 via tolerance (n4, claim check 143) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_DA49828_P14, entry 90) | pass 1.082 via tolerance (n4, claim check 143) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][9], entry 90) | pass 0.742 via tolerance (n4, claim check 143) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][10], entry 90) | pass 1.151 via tolerance (n4, claim check 143) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_DA49828_P5, entry 90) | pass 0.243 via tolerance (n4, claim check 143) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_DA49828_P11, entry 90) | pass 0.508 via tolerance (n4, claim check 143) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n4 metrics.rel_mean_by_DA49828, entry 90) | pass 1.0092 via tolerance (n5, claim check 143) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_DA49828_Host, entry 90) | differs 0.99 (n4, claim check 143) |

### nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 2

Status: answer. 164 s. 14 requests, 15 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-082141-9a4c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/nair2024-plasmid-growth/run2/home/sessions/20261009-082141-9a4c/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/nair2024-plasmid-growth/run2/home/sessions/20261009-082141-9a4c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 61) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 61) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 61) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_DA49828_P1, entry 93) | pass 1.0053 via tolerance (n4, claim check 156) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_DA49828_P2, entry 93) | pass 1.0278 via tolerance (n4, claim check 156) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_DA49828_P3, entry 93) | pass 1.0329 via tolerance (n4, claim check 156) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_DA49828_P4, entry 93) | pass 0.9657 via tolerance (n4, claim check 156) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_DA49828_P5, entry 93) | pass 1.0725 via tolerance (n4, claim check 156) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_DA49828_P6, entry 93) | pass 1.0083 via tolerance (n4, claim check 156) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_DA49828_P7, entry 93) | pass 0.9612 via tolerance (n4, claim check 156) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_DA49828_P8, entry 93) | pass 0.9754 via tolerance (n4, claim check 156) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_DA49828_P9, entry 93) | pass 1.0426 via tolerance (n4, claim check 156) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_DA49828_P10, entry 93) | pass 0.9902 via tolerance (n4, claim check 156) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_DA49828_P11, entry 93) | pass 0.9466 via tolerance (n4, claim check 156) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_DA49828_P14, entry 93) | pass 1.0821 via tolerance (n4, claim check 156) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][9], entry 93) | pass 0.7424 via tolerance (n4, claim check 156) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][10], entry 93) | pass 1.1507 via tolerance (n4, claim check 156) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_DA49828_P5, entry 93) | pass 0.243 via tolerance (n4, claim check 156) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_DA49828_P11, entry 93) | pass 0.508 via tolerance (n4, claim check 156) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n5 metrics.mean_of_12_plasmid_means, entry 101) | pass 1.0092 via tolerance (n5, claim check 156) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_DA49828_Host, entry 93) | differs 0.9902 (n4, claim check 156) |

### nair2024-plasmid-growth | claude:claude-haiku-5-5 | run 3

Status: answer. 149 s. 12 requests, 13 tool calls (2 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-082425-f94b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/nair2024-plasmid-growth/run3/home/sessions/20261009-082425-f94b/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 2 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/nair2024-plasmid-growth/run3/home/sessions/20261009-082425-f94b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 61) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 61) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 61) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_P1, entry 88) | pass 1.005 via tolerance (n4, claim check 143) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_P2, entry 88) | pass 1.028 via tolerance (n4, claim check 143) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_P3, entry 88) | pass 1.033 via tolerance (n4, claim check 143) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_P4, entry 88) | pass 0.966 via tolerance (n4, claim check 143) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_P5, entry 88) | pass 1.072 via tolerance (n4, claim check 143) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_P6, entry 88) | pass 1.008 via tolerance (n4, claim check 143) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_P7, entry 88) | pass 0.961 via tolerance (n4, claim check 143) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_P8, entry 88) | pass 0.975 via tolerance (n4, claim check 143) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_P9, entry 88) | pass 1.043 via tolerance (n4, claim check 143) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_P10, entry 88) | pass 0.99 via tolerance (n4, claim check 143) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_P11, entry 88) | pass 0.947 via tolerance (n4, claim check 143) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_P14, entry 88) | pass 1.082 via tolerance (n4, claim check 143) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][8], entry 88) | pass 0.742 via tolerance (n4, claim check 143) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][9], entry 88) | pass 1.151 via tolerance (n4, claim check 143) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_P5, entry 88) | pass 0.243 via tolerance (n5, claim check 143) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_P11, entry 88) | pass 0.508 via tolerance (n4, claim check 143) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n5 metrics.mean_of_12_plasmid_rel_means, entry 96) | pass 1.009 via tolerance (n5, claim check 143) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_Host, entry 88) | differs 0.99 (n4, claim check 143) |

