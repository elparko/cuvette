# Paper benchmark 2026-10-08

Models: ollama:qwen3:8b. Runs per paper and model: 2.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 33/34 | 20/30 | 3 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| gramfort2013-mne-sample | 27/28 / 14/24 |
| bradley-photutils-100gaussians | 6/6 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 3 | 634 | 22 | 193722 | 3273 | 0 | 14 | 0 | 3 | 0 | 2 | 6 | 0 | 8 | 0 | 0 | 0 |

## Leak check

No run has a leak check.

## Details

### gramfort2013-mne-sample | ollama:qwen3:8b | run 1

Status: answer. 142 s. 8 requests, 5 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-182753-654d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/qwen3-experiments/baseline/ollama_qwen3_8b/gramfort2013-mne-sample/run1/home/sessions/20261008-182753-654d/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events_without_min_duration, entry 14) | not asked |
| events_id1 | 72 exact | FAIL 73 (n6 metrics.count_visual_left, entry 57) | FAIL 68 (n7, claim check 100) |
| events_id2 | 73 exact | pass 73 (n6 metrics.count_visual_left, entry 57) | FAIL 68 (n7, claim check 100) |
| events_id3 | 73 exact | pass 73 (n6 metrics.count_visual_left, entry 57) | FAIL 68 (n7, claim check 100) |
| events_id4 | 70 exact | pass 70 (n6 metrics.count_auditory_right, entry 57) | FAIL 68 (n7, claim check 100) |
| events_id5 | 15 exact | pass 15 (n3 metrics.count_buttonpress, entry 46) | FAIL 14 (n6, claim check 100) |
| events_id32 | 16 exact | pass 16 (n6 metrics.count_buttonpress, entry 57) | FAIL 14 (n6, claim check 100) |
| epochs_dropped | 10 exact | pass 10 (n6 metrics.n_dropped, entry 57) | not asked |
| epochs_kept | 309 exact | pass 309 (n6 metrics.n_epochs, entry 57) | pass 309 via tolerance (n6, claim check 100) |
| auditory_left_kept | 68 exact | pass 68 (n6 metrics.count_auditory_left, entry 57) | pass 68 via tolerance (n7, claim check 100) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323777 (n11 metrics.gfp_latency_s, entry 87) | pass 0.1 via tolerance (n1, claim check 100) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.10613 (n11 metrics.gfp_amplitude, entry 87) | FAIL 68 (n7, claim check 100) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08 (n11 metrics.window_start_s, entry 87) | FAIL 0.1 (n1, claim check 100) |
| strongest_grad_amplitude | abs 199 ±8 | pass 203 (n11 metrics.n_channels, entry 87) | FAIL -161.12 (n11, claim check 100) |

### gramfort2013-mne-sample | ollama:qwen3:8b | run 2

Status: answer. 151 s. 8 requests, 5 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-183015-ffb6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/qwen3-experiments/baseline/ollama_qwen3_8b/gramfort2013-mne-sample/run2/home/sessions/20261008-183015-ffb6/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 14) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 14) | pass 72 via tolerance (n2, claim check 103) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 14) | pass 73 via tolerance (n6, claim check 103) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 14) | pass 73 via tolerance (n6, claim check 103) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 14) | pass 70 via tolerance (n6, claim check 103) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 14) | pass 15 via tolerance (n2, claim check 103) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 14) | pass 16 via tolerance (n6, claim check 103) |
| epochs_dropped | 10 exact | pass 10 (n6 metrics.n_dropped, entry 57) | not asked |
| epochs_kept | 309 exact | pass 309 (n6 metrics.n_epochs, entry 57) | pass 309 via tolerance (n6, claim check 103) |
| auditory_left_kept | 68 exact | pass 68 (n6 metrics.count_auditory_left, entry 57) | pass 68 via tolerance (n7, claim check 103) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323777 (n11 metrics.gfp_latency_s, entry 91) | pass 0.093 via tolerance (n11, claim check 103) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.10613 (n11 metrics.gfp_amplitude, entry 91) | pass 42.11 via tolerance (n11, claim check 103) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08 (n11 metrics.window_start_s, entry 91) | pass 0.093 via tolerance (n11, claim check 103) |
| strongest_grad_amplitude | abs 199 ±8 | pass 203 (n11 metrics.n_channels, entry 91) | FAIL -161.12 (n11, claim check 103) |

### bradley-photutils-100gaussians | ollama:qwen3:8b | run 1

Status: answer. 341 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-183246-e06d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/qwen3-experiments/baseline/ollama_qwen3_8b/bradley-photutils-100gaussians/run1/home/sessions/20261008-183246-e06d/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.152442 (n9 metrics.background_median, entry 50) | pass 5.152 via tolerance (n9, claim check 128) |
| sky_noise | 2.094 ±0.01 | pass 2.094237 (n9 metrics.rms_median, entry 50) | pass 2.094 via tolerance (n9, claim check 128) |
| sources_detected | 82 exact | pass 82 (n18 metrics.n_sources, entry 91) | pass 82 via tolerance (n18, claim check 128) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n19 metrics.median_net_flux, entry 110) | pass 925.24 via tolerance (n19, claim check 128) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n19 table.rows[1][5], entry 110) | pass 760.2 via tolerance (n19, claim check 128) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n19 metrics.median_net_flux, entry 110) | pass 925.24 via tolerance (n19, claim check 128) |

