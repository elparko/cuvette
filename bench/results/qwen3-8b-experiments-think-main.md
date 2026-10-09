# Paper benchmark 2026-10-09

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 22/26 | 18/24 | 2 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| white2021-flowkit | 8/12 / 4/10 |
| rouault-gdal-autotest | 14/14 / 14/14 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 2 | 956 | 10 | 67480 | 7678 | 0 | 6 | 0 | 0 | 0 | 2 | 0 | 1 | 5 | 10 | 0 | 0 |

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| white2021-flowkit | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 10 | 0 |
| rouault-gdal-autotest | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### white2021-flowkit | ollama:qwen3:8b | run 1

Status: answer. 317 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 10 unsourced.
Session: 20261008-193901-fa5d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/qwen3-experiments/think-main/ollama_qwen3_8b/white2021-flowkit/run1/home/sessions/20261008-193901-fa5d/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 10 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/qwen3-experiments/think-main/ollama_qwen3_8b/white2021-flowkit/run1/home/sessions/20261008-193901-fa5d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 9) | pass 290172 via tolerance (n2, claim check 38) |
| cd3_flowkit | 133670 exact | pass 133670 (n2 metrics.count_CD3, entry 23) | pass 133670 via tolerance (n2, claim check 38) |
| cd3_flowjo | 133860 exact | pass 133860 (n2 table.rows[3][6], entry 23) | FAIL 133670 (n2, claim check 38) |
| cd4_flowkit | 82484 exact | pass 82484 (n2 metrics.count_CD4, entry 23) | pass 82484 via tolerance (n2, claim check 38) |
| cd4_flowjo | 82636 exact | pass 82636 (n2 table.rows[4][6], entry 23) | FAIL 82484 (n2, claim check 38) |
| cd8_flowkit | 47165 exact | pass 47165 (n2 metrics.count_CD8, entry 23) | pass 47165 via tolerance (n2, claim check 38) |
| cd8_flowjo | 47241 exact | pass 47241 (n2 table.rows[5][6], entry 23) | FAIL 47165 (n2, claim check 38) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n2 table.rows[4][8], entry 23) | not asked |
| cd3_no_compensation | 135381 exact | FAIL 133860 (n2 table.rows[3][6], entry 23) | FAIL 133670 (n2, claim check 38) |
| cd4_no_compensation | 85369 exact | FAIL 82636 (n2 table.rows[4][6], entry 23) | FAIL 82484 (n2, claim check 38) |
| cd8_no_compensation | 47694 exact | FAIL 47241 (n2 table.rows[5][6], entry 23) | FAIL 47165 (n2, claim check 38) |
| cd8_ifng_no_compensation | 672 exact | FAIL 690 (n2 metrics.max_abs_diff_vs_flowjo, entry 23) | not asked |

### rouault-gdal-autotest | ollama:qwen3:8b | run 1

Status: answer. 639 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-194420-e436. Record: /Volumes/T7/guided-analysis/tools/bench-runs/qwen3-experiments/think-main/ollama_qwen3_8b/rouault-gdal-autotest/run1/home/sessions/20261008-194420-e436/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/qwen3-experiments/think-main/ollama_qwen3_8b/rouault-gdal-autotest/run1/home/sessions/20261008-194420-e436/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 9) | pass 20 via tolerance (n3, claim check 47) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 9) | pass 20 via tolerance (n3, claim check 47) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 9) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 9) | pass 60 via tolerance (n1, claim check 47) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 9) | pass 74 via tolerance (n3, claim check 47) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 9) | pass 255 via tolerance (n3, claim check 47) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 9) | pass 126.765 via tolerance (n1, claim check 47) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 9) | pass 22.928 via tolerance (n1, claim check 47) |
| warp_width | 22 exact | pass 22 (n3 metrics.width, entry 23) | pass 22 via tolerance (n3, claim check 47) |
| warp_height | 18 exact | pass 18 (n3 metrics.height, entry 23) | pass 18 via tolerance (n3, claim check 47) |
| zone_a_pixels | 100 exact | pass 100 (n4 metrics.count, entry 36) | pass 100 via tolerance (n4, claim check 47) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n4 metrics.mean, entry 36) | pass 129.5 via tolerance (n4, claim check 47) |
| zone_b_pixels_centers | 42 exact | pass 42 (n4 table.rows[1][1], entry 36) | pass 42 via tolerance (n4, claim check 47) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n4 table.rows[1][4], entry 36) | pass 135 via tolerance (n4, claim check 47) |

