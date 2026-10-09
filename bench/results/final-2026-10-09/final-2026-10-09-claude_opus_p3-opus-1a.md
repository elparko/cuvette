# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 54/54 | 54/54 | 6 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| rouault-gdal-autotest | 42/42 / 42/42 |
| weber2023-nnsvg-dlpfc | 12/12 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 6 | 649 | 57 | 144 | 28671 | 798604 | 59 | 1 | 0 | 0 | 6 | 21 | 12 | 3 | 1 | 1 | 1 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $1.32 for 6 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rouault-gdal-autotest | claude:claude-opus-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-opus-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-opus-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-opus-5-5 | 2 | on | 7 | 0 | 0 | 1 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-opus-5-5 | 3 | on | 7 | 0 | 0 | 0 | 0 |

## Details

### rouault-gdal-autotest | claude:claude-opus-5-5 | run 1

Status: answer. 134 s. 13 requests, 15 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081432-2920. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rouault-gdal-autotest/run1/home/sessions/20261009-081432-2920/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rouault-gdal-autotest/run1/home/sessions/20261009-081432-2920/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n6, claim check 115) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n6, claim check 115) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 11) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 11) | pass 60 via tolerance (n1, claim check 115) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 11) | pass 74 via tolerance (n3, claim check 115) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 11) | pass 255 via tolerance (n3, claim check 115) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 11) | pass 126.765 via tolerance (n1, claim check 115) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 11) | pass 22.928 via tolerance (n1, claim check 115) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 23) | pass 22 via tolerance (n3, claim check 115) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 23) | pass 18 via tolerance (n3, claim check 115) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 26) | pass 100 via tolerance (n7, claim check 115) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 26) | pass 129.5 via tolerance (n7, claim check 115) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 26) | pass 42 via tolerance (n7, claim check 115) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 26) | pass 135 via tolerance (n7, claim check 115) |

### rouault-gdal-autotest | claude:claude-opus-5-5 | run 2

Status: answer. 72 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081647-6b7b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rouault-gdal-autotest/run2/home/sessions/20261009-081647-6b7b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rouault-gdal-autotest/run2/home/sessions/20261009-081647-6b7b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 49) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 49) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 11) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 11) | pass 60 via tolerance (n1, claim check 49) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 11) | pass 74 via tolerance (n3, claim check 49) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 11) | pass 255 via tolerance (n3, claim check 49) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 11) | pass 126.765 via tolerance (n1, claim check 49) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 11) | pass 22.928 via tolerance (n1, claim check 49) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 21) | pass 22 via tolerance (n3, claim check 49) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 21) | pass 18 via tolerance (n3, claim check 49) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 24) | pass 100 via tolerance (n4, claim check 49) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 24) | pass 129.5 via tolerance (n4, claim check 49) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 24) | pass 42 via tolerance (n4, claim check 49) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 24) | pass 135 via tolerance (n4, claim check 49) |

### rouault-gdal-autotest | claude:claude-opus-5-5 | run 3

Status: answer. 113 s. 9 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081759-39eb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rouault-gdal-autotest/run3/home/sessions/20261009-081759-39eb/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rouault-gdal-autotest/run3/home/sessions/20261009-081759-39eb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n6, claim check 84) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n6, claim check 84) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 11) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 11) | pass 60 via tolerance (n1, claim check 84) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 11) | pass 74 via tolerance (n3, claim check 84) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 11) | pass 255 via tolerance (n3, claim check 84) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 11) | pass 126.765 via tolerance (n1, claim check 84) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 11) | pass 22.928 via tolerance (n1, claim check 84) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 23) | pass 22 via tolerance (n3, claim check 84) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 23) | pass 18 via tolerance (n3, claim check 84) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 26) | pass 100 via tolerance (n4, claim check 84) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 26) | pass 129.5 via tolerance (n4, claim check 84) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 26) | pass 42 via tolerance (n4, claim check 84) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 26) | pass 135 via tolerance (n4, claim check 84) |

### weber2023-nnsvg-dlpfc | claude:claude-opus-5-5 | run 1

Status: answer. 100 s. 10 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081952-6a6e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261009-081952-6a6e/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261009-081952-6a6e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 19) | pass 3639 via tolerance (n8, claim check 110) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 78) | pass 2 via tolerance (n8, claim check 110) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 78) | pass 4 via tolerance (n8, claim check 110) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 78) | pass 19 via tolerance (n8, claim check 110) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 36) | differs 3309 (n8, claim check 110) |

### weber2023-nnsvg-dlpfc | claude:claude-opus-5-5 | run 2

Status: answer. 94 s. 9 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-082132-7157. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261009-082132-7157/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261009-082132-7157/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 20) | pass 3639 via tolerance (n8, claim check 104) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 77) | pass 2 via tolerance (n8, claim check 104) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 77) | pass 4 via tolerance (n8, claim check 104) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 77) | pass 19 via tolerance (n8, claim check 104) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 37) | differs 3309 (n8, claim check 104) |

### weber2023-nnsvg-dlpfc | claude:claude-opus-5-5 | run 3

Status: answer. 136 s. 11 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-082306-68ce. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261009-082306-68ce/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261009-082306-68ce/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 19) | pass 3639 via tolerance (n8, claim check 117) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 77) | pass 2 via tolerance (n8, claim check 117) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 77) | pass 4 via tolerance (n8, claim check 117) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 77) | pass 19 via tolerance (n8, claim check 117) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 36) | differs 3309 (n8, claim check 117) |

