# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 42/42 | 42/42 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| rouault-gdal-autotest | 42/42 / 42/42 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 195 | 18 | 48 | 17155 | 242850 | 18 | 0 | 0 | 0 | 3 | 10 | 11 | 1 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rouault-gdal-autotest | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### rouault-gdal-autotest | claude:claude-haiku-5-5 | run 1

Status: answer. 76 s. 6 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-034040-d903. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rouault-gdal-autotest/claude_claude-haiku-5-5/rouault-gdal-autotest/run1/home/sessions/20261012-034040-d903/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rouault-gdal-autotest/claude_claude-haiku-5-5/rouault-gdal-autotest/run1/home/sessions/20261012-034040-d903/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 65) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 65) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 12) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 12) | pass 60 via tolerance (n1, claim check 65) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 12) | pass 74 via tolerance (n3, claim check 65) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 12) | pass 255 via tolerance (n3, claim check 65) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 12) | pass 126.765 via tolerance (n1, claim check 65) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 12) | pass 22.928 via tolerance (n1, claim check 65) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 23) | pass 22 via tolerance (n3, claim check 65) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 23) | pass 18 via tolerance (n3, claim check 65) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 26) | pass 100 via tolerance (n4, claim check 65) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 26) | pass 129.5 via tolerance (n4, claim check 65) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 26) | pass 42 via tolerance (n4, claim check 65) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 26) | pass 135 via tolerance (n4, claim check 65) |

### rouault-gdal-autotest | claude:claude-haiku-5-5 | run 2

Status: answer. 59 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-034157-24cd. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rouault-gdal-autotest/claude_claude-haiku-5-5/rouault-gdal-autotest/run2/home/sessions/20261012-034157-24cd/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rouault-gdal-autotest/claude_claude-haiku-5-5/rouault-gdal-autotest/run2/home/sessions/20261012-034157-24cd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 58) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 58) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 12) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 12) | pass 60 via tolerance (n1, claim check 58) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 12) | pass 74 via tolerance (n3, claim check 58) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 12) | pass 255 via tolerance (n3, claim check 58) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 12) | pass 126.765 via tolerance (n1, claim check 58) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 12) | pass 22.928 via tolerance (n1, claim check 58) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 23) | pass 22 via tolerance (n3, claim check 58) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 23) | pass 18 via tolerance (n3, claim check 58) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 32) | pass 100 via tolerance (n4, claim check 58) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 32) | pass 129.5 via tolerance (n4, claim check 58) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 32) | pass 42 via tolerance (n4, claim check 58) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 32) | pass 135 via tolerance (n4, claim check 58) |

### rouault-gdal-autotest | claude:claude-haiku-5-5 | run 3

Status: answer. 60 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-034256-7c25. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rouault-gdal-autotest/claude_claude-haiku-5-5/rouault-gdal-autotest/run3/home/sessions/20261012-034256-7c25/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rouault-gdal-autotest/claude_claude-haiku-5-5/rouault-gdal-autotest/run3/home/sessions/20261012-034256-7c25/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 61) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 12) | pass 20 via tolerance (n3, claim check 61) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 12) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 12) | pass 60 via tolerance (n1, claim check 61) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 12) | pass 74 via tolerance (n3, claim check 61) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 12) | pass 255 via tolerance (n3, claim check 61) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 12) | pass 126.765 via tolerance (n1, claim check 61) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 12) | pass 22.928 via tolerance (n1, claim check 61) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 23) | pass 22 via tolerance (n3, claim check 61) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 23) | pass 18 via tolerance (n3, claim check 61) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 26) | pass 100 via tolerance (n4, claim check 61) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 26) | pass 129.5 via tolerance (n4, claim check 61) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 26) | pass 42 via tolerance (n4, claim check 61) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 26) | pass 135 via tolerance (n4, claim check 61) |

