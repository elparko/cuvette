# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 54/54 | 51/51 | 6 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| quinlan2010-bedtools | 12/12 / 9/9 |
| rouault-gdal-autotest | 42/42 / 42/42 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 6 | 362 | 37 | 112 | 33965 | 463590 | 32 | 0 | 7 | 3 | 3 | 11 | 20 | 1 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 6 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| quinlan2010-bedtools | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### quinlan2010-bedtools | claude:claude-haiku-5-5 | run 1

Status: answer. 47 s. 4 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081432-2829. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/quinlan2010-bedtools/run1/home/sessions/20261009-081432-2829/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/quinlan2010-bedtools/run1/home/sessions/20261009-081432-2829/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 11) | pass 126 via tolerance (n2, claim check 40) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 11) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 11) | pass 33713 via tolerance (n1, claim check 40) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 17) | pass 11270 via tolerance (n3, claim check 40) |

### quinlan2010-bedtools | claude:claude-haiku-5-5 | run 2

Status: answer. 34 s. 4 requests, 5 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-081519-12d6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/quinlan2010-bedtools/run2/home/sessions/20261009-081519-12d6/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/quinlan2010-bedtools/run2/home/sessions/20261009-081519-12d6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 14) | pass 126 via tolerance (n2, claim check 42) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 14) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 14) | pass 33713 via tolerance (n1, claim check 42) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 20) | pass 11270 via tolerance (n3, claim check 42) |

### quinlan2010-bedtools | claude:claude-haiku-5-5 | run 3

Status: answer. 30 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-081553-e3d3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/quinlan2010-bedtools/run3/home/sessions/20261009-081553-e3d3/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/quinlan2010-bedtools/run3/home/sessions/20261009-081553-e3d3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 14) | pass 126 via tolerance (n2, claim check 49) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 14) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 14) | pass 33713 via tolerance (n1, claim check 49) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 25) | pass 11270 via tolerance (n3, claim check 49) |

### rouault-gdal-autotest | claude:claude-haiku-5-5 | run 1

Status: answer. 55 s. 5 requests, 4 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081623-4985. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rouault-gdal-autotest/run1/home/sessions/20261009-081623-4985/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rouault-gdal-autotest/run1/home/sessions/20261009-081623-4985/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 46) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 46) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 11) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 11) | pass 60 via tolerance (n1, claim check 46) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 11) | pass 74 via tolerance (n3, claim check 46) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 11) | pass 255 via tolerance (n3, claim check 46) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 11) | pass 126.765 via tolerance (n1, claim check 46) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 11) | pass 22.928 via tolerance (n1, claim check 46) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 22) | pass 22 via tolerance (n3, claim check 46) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 22) | pass 18 via tolerance (n3, claim check 46) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 25) | pass 100 via tolerance (n4, claim check 46) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 25) | pass 129.5 via tolerance (n4, claim check 46) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 25) | pass 42 via tolerance (n4, claim check 46) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 25) | pass 135 via tolerance (n4, claim check 46) |

### rouault-gdal-autotest | claude:claude-haiku-5-5 | run 2

Status: answer. 117 s. 11 requests, 8 tool calls (0 failed), 3 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-081718-7f88. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rouault-gdal-autotest/run2/home/sessions/20261009-081718-7f88/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rouault-gdal-autotest/run2/home/sessions/20261009-081718-7f88/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 88) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 88) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 11) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 11) | pass 60 via tolerance (n1, claim check 88) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 11) | pass 74 via tolerance (n5, claim check 88) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 11) | pass 255 via tolerance (n5, claim check 88) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 11) | pass 126.765 via tolerance (n1, claim check 88) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 11) | pass 22.928 via tolerance (n1, claim check 88) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 25) | pass 22 via tolerance (n5, claim check 88) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 25) | pass 18 via tolerance (n5, claim check 88) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 28) | pass 100 via tolerance (n4, claim check 88) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 28) | pass 129.5 via tolerance (n4, claim check 88) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 28) | pass 42 via tolerance (n4, claim check 88) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 28) | pass 135 via tolerance (n4, claim check 88) |

### rouault-gdal-autotest | claude:claude-haiku-5-5 | run 3

Status: answer. 80 s. 8 requests, 6 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081915-58c9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rouault-gdal-autotest/run3/home/sessions/20261009-081915-58c9/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rouault-gdal-autotest/run3/home/sessions/20261009-081915-58c9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 71) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 11) | pass 20 via tolerance (n3, claim check 71) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 11) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 11) | pass 60 via tolerance (n1, claim check 71) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 11) | pass 74 via tolerance (n3, claim check 71) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 11) | pass 255 via tolerance (n3, claim check 71) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 11) | pass 126.765 via tolerance (n1, claim check 71) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 11) | pass 22.928 via tolerance (n1, claim check 71) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 22) | pass 22 via tolerance (n3, claim check 71) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 22) | pass 18 via tolerance (n3, claim check 71) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 25) | pass 100 via tolerance (n4, claim check 71) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 25) | pass 129.5 via tolerance (n4, claim check 71) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 25) | pass 42 via tolerance (n4, claim check 71) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 25) | pass 135 via tolerance (n4, claim check 71) |

