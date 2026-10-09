# Paper benchmark 2026-10-09

Models: claude:claude-sonnet-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 150/150 | 132/132 | 12 | 0 |

## Matrix

| Paper | claude:claude-sonnet-5-5 |
| --- | --- |
| mahbod2024-nuinsseg | 9/9 / 3/3 |
| oreshkova2024-qmp-honeybee | 57/57 / 48/48 |
| rouault-gdal-autotest | 42/42 / 42/42 |
| wang2023-cuproptosis-oa | 42/42 / 39/39 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 12 | 3569 | 87 | 242 | 65365 | 1323193 | 122 | 8 | 2 | 0 | 11 | 38 | 54 | 17 | 27 | 15 | 15 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-sonnet-5-5: $1.78 for 12 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-sonnet-5-5 | 1 | on | 5 | 0 | 0 | 5 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-sonnet-5-5 | 2 | on | 3 | 0 | 0 | 14 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-sonnet-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| wang2023-cuproptosis-oa | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 0 | 3 | 0 |
| wang2023-cuproptosis-oa | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 1 | 0 |
| wang2023-cuproptosis-oa | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 0 | 4 | 0 |

## Details

### mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | run 1

Status: answer. 975 s. 9 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071104-73e6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261009-071104-73e6/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261009-071104-73e6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n12 metrics.mean_dice, entry 64) | pass 0.538 via tolerance (n21, claim check 141) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 11) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n12 metrics.total_truth, entry 64) | not asked |

### mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | run 2

Status: answer. 1093 s. 14 requests, 17 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072720-f76a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261009-072720-f76a/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261009-072720-f76a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.53805 (n20 stdout, entry 98) | pass 0.538 via tolerance (n20, claim check 181) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 11) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n11 metrics.total_truth, entry 58) | not asked |

### mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | run 3

Status: answer. 798 s. 10 requests, 16 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074533-aae6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261009-074533-aae6/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run3/home/sessions/20261009-074533-aae6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n12 metrics.mean_dice, entry 65) | pass 0.538 via tolerance (n24, claim check 148) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 11) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n12 metrics.total_truth, entry 65) | not asked |

### oreshkova2024-qmp-honeybee | claude:claude-sonnet-5-5 | run 1

Status: answer. 107 s. 9 requests, 19 tool calls (2 failed), 0 nudges, 0 plan reminders, 5 unsourced.
Session: 20261009-075851-b93a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261009-075851-b93a/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261009-075851-b93a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 45) | pass 35.69 via rounding (n10, claim check 151) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 45) | pass 0.03156 via tolerance (n5, claim check 151) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 45) | pass 36 via tolerance (n5, claim check 151) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 45) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 45) | pass 0.8596 via tolerance (n5, claim check 151) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 45) | pass 1.057 via tolerance (n4, claim check 151) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.809 (n17 stdout, entry 129) | pass 2.809 via tolerance (n17, claim check 151) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 45) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 48) | pass 27.78 via tolerance (n7, claim check 151) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 48) | pass 29.16 via rounding (n7, claim check 151) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 48) | pass 6.853 via tolerance (n7, claim check 151) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 48) | pass 0.002087 via tolerance (n7, claim check 151) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 48) | pass 4.457 via tolerance (n7, claim check 151) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n7 metrics.p_Age_x_Treatment_x_Replicate, entry 48) | pass 0.01568 via tolerance (n7, claim check 151) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n8 metrics.H, entry 59) | pass 9.3498 via tolerance (n11, claim check 151) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 9) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n8 metrics.p_value, entry 59) | pass 0.02498 via tolerance (n11, claim check 151) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n8 metrics.min_p_adjusted, entry 59) | pass 0.03969 via tolerance (n11, claim check 151) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n9 metrics.H, entry 62) | pass 23.8701 via tolerance (n12, claim check 151) |

### oreshkova2024-qmp-honeybee | claude:claude-sonnet-5-5 | run 2

Status: answer. 103 s. 8 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 14 unsourced.
Session: 20261009-080038-8c3e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261009-080038-8c3e/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 14 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261009-080038-8c3e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n7 metrics.F_age, entry 47) | pass 35.69 via rounding (n12, claim check 108) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n7 metrics.F_treatment, entry 47) | pass 0.03156 via tolerance (n6, claim check 108) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n7 metrics.F_replicate, entry 47) | pass 35.999 via tolerance (n12, claim check 108) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n7 metrics.p_age, entry 47) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n7 metrics.p_treatment, entry 47) | pass 0.8596 via tolerance (n6, claim check 108) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n7 metrics.F_age_x_treatment, entry 47) | pass 1.057 via tolerance (n5, claim check 108) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n7 metrics.F_age_x_replicate, entry 47) | pass 2.809 via tolerance (n12, claim check 108) |
| protein_df_residual | 60 exact | pass 60 (n7 metrics.df_residual, entry 47) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n8 metrics.F_Age, entry 50) | pass 27.78 via tolerance (n8, claim check 108) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n8 metrics.F_Treatment, entry 50) | pass 29.16 via rounding (n8, claim check 108) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n8 metrics.F_Replicate, entry 50) | pass 6.853 via tolerance (n8, claim check 108) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n8 metrics.p_Replicate, entry 50) | pass 0.002087 via tolerance (n8, claim check 108) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n8 metrics.F_Age_x_Treatment_x_Replicate, entry 50) | pass 4.457 via tolerance (n8, claim check 108) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n8 metrics.p_Age_x_Treatment_x_Replicate, entry 50) | pass 0.01568 via tolerance (n8, claim check 108) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n9 metrics.H, entry 61) | pass 9.3498 via tolerance (n9, claim check 108) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 9) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n9 metrics.p_value, entry 61) | pass 0.02498 via tolerance (n9, claim check 108) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n9 metrics.min_p_adjusted, entry 61) | pass 0.0397 via tolerance (n9, claim check 108) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n10 metrics.H, entry 64) | pass 23.8701 via tolerance (n10, claim check 108) |

### oreshkova2024-qmp-honeybee | claude:claude-sonnet-5-5 | run 3

Status: answer. 101 s. 8 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080220-4bfd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261009-080220-4bfd/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261009-080220-4bfd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n10 stdout, entry 73) | pass 35.69 via rounding (n6, claim check 106) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 47) | pass 0.03156 via tolerance (n11, claim check 106) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n10 stdout, entry 73) | pass 36 via tolerance (n11, claim check 106) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 47) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.85959 (n10 stdout, entry 73) | pass 0.8596 via tolerance (n11, claim check 106) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 47) | pass 1.057 via tolerance (n4, claim check 106) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.80851 (n10 stdout, entry 73) | pass 2.809 via tolerance (n11, claim check 106) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 47) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n10 stdout, entry 73) | pass 27.78 via tolerance (n10, claim check 106) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 50) | pass 29.16 via rounding (n7, claim check 106) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 50) | pass 6.853 via tolerance (n7, claim check 106) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.00209 (n10 stdout, entry 73) | pass 0.002087 via tolerance (n7, claim check 106) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n11 stdout, entry 89) | pass 4.457 via tolerance (n11, claim check 106) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01568 (n10 stdout, entry 73) | pass 0.01568 via tolerance (n10, claim check 106) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n8 metrics.H, entry 62) | pass 9.35 via rounding (n8, claim check 106) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 9) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n8 metrics.p_value, entry 62) | pass 0.02498 via tolerance (n8, claim check 106) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n8 metrics.min_p_adjusted, entry 62) | pass 0.0397 via tolerance (n8, claim check 106) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n9 metrics.H, entry 65) | pass 23.87 via tolerance (n9, claim check 106) |

### rouault-gdal-autotest | claude:claude-sonnet-5-5 | run 1

Status: answer. 49 s. 3 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080402-75a5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rouault-gdal-autotest/run1/home/sessions/20261009-080402-75a5/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rouault-gdal-autotest/run1/home/sessions/20261009-080402-75a5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 43) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 43) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 11) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 11) | pass 60 via tolerance (n1, claim check 43) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 11) | pass 74 via tolerance (n3, claim check 43) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 11) | pass 255 via tolerance (n3, claim check 43) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 11) | pass 126.765 via tolerance (n1, claim check 43) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 11) | pass 22.928 via tolerance (n1, claim check 43) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 22) | pass 22 via tolerance (n3, claim check 43) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 22) | pass 18 via tolerance (n3, claim check 43) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 25) | pass 100 via tolerance (n5, claim check 43) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 25) | pass 129.5 via tolerance (n5, claim check 43) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 25) | pass 42 via tolerance (n5, claim check 43) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 25) | pass 135 via tolerance (n5, claim check 43) |

### rouault-gdal-autotest | claude:claude-sonnet-5-5 | run 2

Status: answer. 82 s. 7 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080453-149e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rouault-gdal-autotest/run2/home/sessions/20261009-080453-149e/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rouault-gdal-autotest/run2/home/sessions/20261009-080453-149e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 13) | pass 20 via tolerance (n6, claim check 80) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 13) | pass 20 via tolerance (n6, claim check 80) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 13) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 13) | pass 60 via tolerance (n1, claim check 80) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 13) | pass 74 via tolerance (n3, claim check 80) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 13) | pass 255 via tolerance (n3, claim check 80) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 13) | pass 126.765 via tolerance (n1, claim check 80) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 13) | pass 22.928 via tolerance (n1, claim check 80) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 23) | pass 22 via tolerance (n3, claim check 80) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 23) | pass 18 via tolerance (n3, claim check 80) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 26) | pass 100 via tolerance (n5, claim check 80) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 26) | pass 129.5 via tolerance (n5, claim check 80) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 26) | pass 42 via tolerance (n5, claim check 80) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 26) | pass 135 via tolerance (n5, claim check 80) |

### rouault-gdal-autotest | claude:claude-sonnet-5-5 | run 3

Status: answer. 101 s. 7 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080617-a4c2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rouault-gdal-autotest/run3/home/sessions/20261009-080617-a4c2/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rouault-gdal-autotest/run3/home/sessions/20261009-080617-a4c2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 17) | pass 20 via tolerance (n6, claim check 66) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 17) | pass 20 via tolerance (n6, claim check 66) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 17) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 17) | pass 60 via tolerance (n1, claim check 66) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 17) | pass 74 via tolerance (n3, claim check 66) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 17) | pass 255 via tolerance (n3, claim check 66) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 17) | pass 126.765 via tolerance (n1, claim check 66) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 17) | pass 22.928 via tolerance (n1, claim check 66) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 28) | pass 22 via tolerance (n3, claim check 66) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 28) | pass 18 via tolerance (n3, claim check 66) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 31) | pass 100 via tolerance (n5, claim check 66) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 31) | pass 129.5 via tolerance (n5, claim check 66) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 31) | pass 42 via tolerance (n5, claim check 66) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 31) | pass 135 via tolerance (n5, claim check 66) |

### wang2023-cuproptosis-oa | claude:claude-sonnet-5-5 | run 1

Status: answer. 57 s. 4 requests, 3 tool calls (2 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-080801-a8f6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261009-080801-a8f6/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261009-080801-a8f6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 49) | pass 3 via tolerance (n4, claim check 73) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 49) | pass 1578 via tolerance (n4, claim check 73) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 49) | pass 0.0018454 via tolerance (n4, claim check 73) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 49) | pass 0.11187 via tolerance (n4, claim check 73) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 49) | pass 35.0876 via tolerance (n4, claim check 73) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 49) | pass 24 via tolerance (n4, claim check 73) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 49) | pass 0.00479 via rounding (n4, claim check 73) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 49) | pass 30 via tolerance (n4, claim check 73) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 49) | pass 0.00599 via rounding (n4, claim check 73) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 49) | pass 649 via tolerance (n4, claim check 73) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 49) | pass 0.00604 via tolerance (n4, claim check 73) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 49) | pass 37 via tolerance (n4, claim check 73) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 49) | pass 0.00738 via tolerance (n4, claim check 73) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 11) | not asked |

### wang2023-cuproptosis-oa | claude:claude-sonnet-5-5 | run 2

Status: answer. 58 s. 4 requests, 3 tool calls (2 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-080900-ffbb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261009-080900-ffbb/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261009-080900-ffbb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 49) | pass 3 via tolerance (n4, claim check 70) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 49) | pass 1578 via tolerance (n4, claim check 70) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 49) | pass 0.00185 via rounding (n4, claim check 70) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 49) | pass 0.1118672 via tolerance (n4, claim check 70) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 49) | pass 35.0876 via tolerance (n4, claim check 70) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 49) | pass 24 via tolerance (n4, claim check 70) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 49) | pass 0.00479 via rounding (n4, claim check 70) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 49) | pass 30 via tolerance (n4, claim check 70) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 49) | pass 0.00599 via rounding (n4, claim check 70) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 49) | pass 649 via tolerance (n4, claim check 70) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 49) | pass 0.00604 via tolerance (n4, claim check 70) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 49) | pass 37 via tolerance (n4, claim check 70) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 49) | pass 0.00738 via tolerance (n4, claim check 70) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 11) | not asked |

### wang2023-cuproptosis-oa | claude:claude-sonnet-5-5 | run 3

Status: answer. 46 s. 4 requests, 3 tool calls (2 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-080958-0b24. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261009-080958-0b24/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261009-080958-0b24/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 49) | pass 3 via tolerance (n4, claim check 71) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 49) | pass 1578 via tolerance (n4, claim check 71) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 49) | pass 0.0018454 via tolerance (n4, claim check 71) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 49) | pass 0.11187 via tolerance (n4, claim check 71) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 49) | pass 35.09 via rounding (n4, claim check 71) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 49) | pass 24 via tolerance (n4, claim check 71) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 49) | pass 0.0047917 via tolerance (n4, claim check 71) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 49) | pass 30 via tolerance (n4, claim check 71) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 49) | pass 0.005987 via tolerance (n4, claim check 71) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 49) | pass 649 via tolerance (n4, claim check 71) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 49) | pass 0.0060398 via tolerance (n4, claim check 71) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 49) | pass 37 via tolerance (n4, claim check 71) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 49) | pass 0.00738 via tolerance (n4, claim check 71) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 11) | not asked |

