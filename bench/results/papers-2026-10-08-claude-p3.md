# Paper benchmark 2026-10-08

Models: claude. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude | 22/22 | 19/19 | 3 | 0 |

## Matrix

| Paper | claude |
| --- | --- |
| rouault-gdal-autotest | 14/14 / 14/14 |
| schindelin2012-fiji-blobs | 1/1 / 1/1 |
| schramm2012-imzml-pyimzml | 7/7 / 4/4 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude | 3 | 283 | 21 | 54 | 14815 | 227530 | 30 | 0 | 0 | 0 | 3 | 8 | 9 | 4 | 3 | 1 | 1 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude: $0.62 for 3 runs

## Details

### rouault-gdal-autotest | claude | run 1

Status: answer. 80 s. 6 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153325-49fe. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/rouault-gdal-autotest/run1/home/sessions/20261008-153325-49fe/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 10) | pass 20 via tolerance (n6, claim check 67) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 10) | pass 20 via tolerance (n6, claim check 67) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 10) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 10) | pass 60 via tolerance (n1, claim check 67) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 10) | pass 74 via tolerance (n3, claim check 67) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 10) | pass 255 via tolerance (n3, claim check 67) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 10) | pass 126.765 via tolerance (n1, claim check 67) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 10) | pass 22.928 via tolerance (n1, claim check 67) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 22) | pass 22 via tolerance (n3, claim check 67) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 22) | pass 18 via tolerance (n3, claim check 67) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 25) | pass 100 via tolerance (n4, claim check 67) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 25) | pass 129.5 via tolerance (n4, claim check 67) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 25) | pass 42 via tolerance (n4, claim check 67) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 25) | pass 135 via tolerance (n4, claim check 67) |

### schindelin2012-fiji-blobs | claude | run 1

Status: answer. 116 s. 7 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261008-153445-d16e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/schindelin2012-fiji-blobs/run1/home/sessions/20261008-153445-d16e/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n6 metrics.n_objects, entry 45) | pass 64 via tolerance (n17, claim check 116) |

### schramm2012-imzml-pyimzml | claude | run 1

Status: answer. 87 s. 8 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153641-c2b6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/schramm2012-imzml-pyimzml/run1/home/sessions/20261008-153641-c2b6/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 20) | pass 9 via tolerance (n5, claim check 72) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 20) | pass 100.0833 via tolerance (n2, claim check 72) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 20) | pass 799.9167 via tolerance (n2, claim check 72) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 31) | pass 243.54 via tolerance (n4, claim check 72) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 31) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 20) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 23) | not asked |

