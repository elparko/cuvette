# Paper benchmark 2026-10-08

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 95/108 | 48/73 | 15 | 2 timeout |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| alexandrov2019-metaspace | 0/5 / 0/4 |
| andrews-fastqc | 7/7 / 3/3 |
| belenky2003-sleepstudy | 6/6 / 0/2 (1 timeout) |
| bemis2015-cardinal | 5/5 / 5/5 |
| danecek2021-bcftools | 5/6 / 4/5 |
| delaney2004-esol | 6/6 / 4/4 |
| gowers2016-mdanalysis | 6/7 / 2/7 |
| gramfort2013-mne-sample | 14/14 / 9/12 |
| lazear2023-sage | 6/6 / 3/3 |
| ljosa2012-bbbc005 | 3/3 / 0/2 |
| rossi1980-recidivism | 11/11 / 4/4 |
| rost2016-openms | 5/5 / 2/2 |
| rouault-gdal-autotest | 8/14 / 8/14 |
| schramm2012-imzml-pyimzml | 7/7 / 4/4 |
| wolf2018-scanpy | 6/6 / 0/2 (1 timeout) |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 15 | 5538 | 112 | 885774 | 28337 | 0 | 72 | 6 | 14 | 3 | 11 | 28 | 11 | 13 | 6 | 8 | 8 |

## Details

### alexandrov2019-metaspace | ollama:qwen3:8b | run 1

Status: answer. 144 s. 11 requests, 6 tool calls (2 failed), 0 nudges, 3 plan reminders, 0 unsourced.
Session: 20261008-161002-b662. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/alexandrov2019-metaspace/run1/home/sessions/20261008-161002-b662/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | FAIL 402 (n2 table.rows[25][0], entry 33) | FAIL - |
| d1_hmdb_fdr10 | 263 exact | FAIL 297 (n2 table.rows[17][0], entry 33) | FAIL - |
| d2_lipidmaps_fdr10 | 191 exact | FAIL 100 (n3 metrics.n_scanned, entry 43) | FAIL - |
| d2_hmdb_fdr10 | 123 exact | FAIL 100 (n3 metrics.n_scanned, entry 43) | FAIL - |
| d1_lipidmaps_fdr5 | 144 exact | FAIL 100 (n3 metrics.n_scanned, entry 43) | not asked |

### andrews-fastqc | ollama:qwen3:8b | run 1

Status: answer. 150 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-161226-10ee. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/andrews-fastqc/run1/home/sessions/20261008-161226-10ee/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 8) | pass 250000 via tolerance (n1, claim check 39) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 14) | pass 395288 via tolerance (n2, claim check 39) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 8) | pass 40 via tolerance (n2, claim check 39) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 8) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 14) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 8) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 14) | not asked |

### belenky2003-sleepstudy | ollama:qwen3:8b | run 1

Status: timeout. 902 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-161456-b614. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/belenky2003-sleepstudy/run1/home/sessions/20261008-161456-b614/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 29) | FAIL - |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 29) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 29) | FAIL - |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 29) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 29) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 29) | not asked |

### bemis2015-cardinal | ollama:qwen3:8b | run 1

Status: answer. 373 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-162958-74cc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/bemis2015-cardinal/run1/home/sessions/20261008-162958-74cc/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 8) | pass 4959 via tolerance (n5, claim check 74) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 8) | pass 10200 via tolerance (n1, claim check 74) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 32) | pass 687 via tolerance (n5, claim check 74) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 48) | pass 6 via tolerance (n7, claim check 74) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 48) | pass 3 via tolerance (n7, claim check 74) |

### danecek2021-bcftools | ollama:qwen3:8b | run 1

Status: answer. 64 s. 5 requests, 2 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-163611-e330. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/danecek2021-bcftools/run1/home/sessions/20261008-163611-e330/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 8) | pass 1955 via tolerance (n1, claim check 30) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 8) | pass 248 via tolerance (n1, claim check 30) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 8) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 8) | pass 2.2 via tolerance (n1, claim check 30) |
| records_in_region | 1137 exact | FAIL 1344 (n1 metrics.ts, entry 8) | FAIL 328 (n2, claim check 30) |
| records_af_5pct | 328 exact | pass 328 (n2 metrics.n_after, entry 18) | pass 328 via tolerance (n2, claim check 30) |

### delaney2004-esol | ollama:qwen3:8b | run 1

Status: answer. 174 s. 8 requests, 5 tool calls (1 failed), 1 nudges, 0 plan reminders, 2 unsourced.
Session: 20261008-163715-d265. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/delaney2004-esol/run1/home/sessions/20261008-163715-d265/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 13) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 32) | pass 1018 via tolerance (n3, claim check 71) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 32) | pass 12 via tolerance (n3, claim check 71) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 32) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 52) | pass 0.7519 via tolerance (n4, claim check 71) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 52) | pass 1.0994 via tolerance (n4, claim check 71) |

### gowers2016-mdanalysis | ollama:qwen3:8b | run 1

Status: answer. 126 s. 8 requests, 4 tool calls (0 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-164009-6111. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/gowers2016-mdanalysis/run1/home/sessions/20261008-164009-6111/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 8) | FAIL 214 (n4, claim check 50) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 8) | FAIL 75 (n4, claim check 50) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n2 metrics.rmsd_last, entry 18) | FAIL 72 (n4, claim check 50) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n3 metrics.rg_last, entry 32) | FAIL 72 (n4, claim check 50) |
| residues_chain_a | 214 exact | pass 214 (n4 metrics.residues_A, entry 42) | pass 214 via tolerance (n4, claim check 50) |
| residues_chain_b | 214 exact | pass 214 (n4 metrics.residues_A, entry 42) | pass 214 via tolerance (n4, claim check 50) |
| ca_rmsd_open_closed | 7.131 ±0.02 | FAIL 7 (n2 table.rows[7][0], entry 18) | FAIL 72 (n4, claim check 50) |

### gramfort2013-mne-sample | ollama:qwen3:8b | run 1

Status: answer. 277 s. 11 requests, 8 tool calls (0 failed), 1 nudges, 0 plan reminders, 3 unsourced.
Session: 20261008-164215-9b7f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/gramfort2013-mne-sample/run1/home/sessions/20261008-164215-9b7f/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n1 metrics.n_events, entry 8) | not asked |
| events_id1 | 72 exact | pass 72 (n1 metrics.count_1, entry 8) | pass 72 via tolerance (n1, claim check 136) |
| events_id2 | 73 exact | pass 73 (n1 metrics.count_2, entry 8) | pass 73 via tolerance (n9, claim check 136) |
| events_id3 | 73 exact | pass 73 (n1 metrics.count_2, entry 8) | pass 73 via tolerance (n9, claim check 136) |
| events_id4 | 70 exact | pass 70 (n1 metrics.count_4, entry 8) | pass 70 via tolerance (n9, claim check 136) |
| events_id5 | 15 exact | pass 15 (n1 metrics.count_5, entry 8) | pass 15 via tolerance (n1, claim check 136) |
| events_id32 | 16 exact | pass 16 (n1 metrics.count_32, entry 8) | pass 16 via tolerance (n9, claim check 136) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 89) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 89) | pass 309 via tolerance (n9, claim check 136) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 89) | pass 68 via tolerance (n10, claim check 136) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n14 metrics.gfp_latency_s, entry 119) | pass 0.1 via tolerance (n4, claim check 136) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n14 metrics.gfp_amplitude, entry 119) | FAIL 32 (n1, claim check 136) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08 (n14 metrics.window_start_s, entry 119) | FAIL 0.1 (n4, claim check 136) |
| strongest_grad_amplitude | abs 199 ±8 | pass 203 (n14 metrics.n_channels, entry 119) | FAIL -161 (n14, claim check 136) |

### lazear2023-sage | ollama:qwen3:8b | run 1

Status: answer. 743 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-164653-b261. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/lazear2023-sage/run1/home/sessions/20261008-164653-b261/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 8) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 8) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 14) | pass 207 via tolerance (n3, claim check 44) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 14) | pass 47 via tolerance (n3, claim check 44) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 14) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n5 metrics.n_psm_pass, entry 29) | pass 242 via tolerance (n5, claim check 44) |

### ljosa2012-bbbc005 | ollama:qwen3:8b | run 1

Status: answer. 700 s. 11 requests, 6 tool calls (1 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-165915-9d0a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/ljosa2012-bbbc005/run1/home/sessions/20261008-165915-9d0a/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n11 metrics.detected_to_true_ratio, entry 77) | FAIL - |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n10 metrics.mean_abs_error, entry 66) | FAIL - |
| true_total_sample | 5007 exact | pass 5007 (n10 metrics.true_total, entry 66) | not asked |

### rossi1980-recidivism | ollama:qwen3:8b | run 1

Status: answer. 619 s. 7 requests, 5 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-171055-568d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/rossi1980-recidivism/run1/home/sessions/20261008-171055-568d/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 8) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 19) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 39) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 39) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 39) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n3 metrics.hr_fin, entry 39) | pass 0.684 via tolerance (n3, claim check 57) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 39) | pass 0.0474 via tolerance (n3, claim check 57) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 39) | pass 0.6403 via tolerance (n3, claim check 57) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 19) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 19) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 39) | pass 0.000714 via tolerance (n3, claim check 57) |

### rost2016-openms | ollama:qwen3:8b | run 1

Status: answer. 152 s. 5 requests, 2 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-172114-47bd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/rost2016-openms/run1/home/sessions/20261008-172114-47bd/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 8) | pass 7173 via tolerance (n1, claim check 75) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 8) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 56) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 56) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 56) | pass 1887 via tolerance (n8, claim check 75) |

### rouault-gdal-autotest | ollama:qwen3:8b | run 1

Status: answer. 39 s. 2 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-172346-9252. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/rouault-gdal-autotest/run1/home/sessions/20261008-172346-9252/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 8) | pass 20 via tolerance (n1, claim check 15) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 8) | pass 20 via tolerance (n1, claim check 15) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 8) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 8) | pass 60 via tolerance (n1, claim check 15) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 8) | pass 74 via tolerance (n1, claim check 15) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 8) | pass 255 via tolerance (n1, claim check 15) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 8) | pass 126.765 via tolerance (n1, claim check 15) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 8) | pass 22.928 via tolerance (n1, claim check 15) |
| warp_width | 22 exact | FAIL 22.928 (n1 metrics.stddev, entry 8) | FAIL 22.928 (n1, claim check 15) |
| warp_height | 18 exact | FAIL 20 (n1 metrics.width, entry 8) | FAIL 20 (n1, claim check 15) |
| zone_a_pixels | 100 exact | FAIL 74 (n1 metrics.min, entry 8) | FAIL 74 (n1, claim check 15) |
| zone_a_mean | 129.5 ±0.01 | FAIL 126.765 (n1 metrics.mean, entry 8) | FAIL 126.765 (n1, claim check 15) |
| zone_b_pixels_centers | 42 exact | FAIL 60 (n1 metrics.pixel_x, entry 8) | FAIL 60 (n1, claim check 15) |
| zone_b_mean_centers | 135 ±0.01 | FAIL 126.765 (n1 metrics.mean, entry 8) | FAIL 126.765 (n1, claim check 15) |

### schramm2012-imzml-pyimzml | ollama:qwen3:8b | run 1

Status: answer. 171 s. 8 requests, 5 tool calls (0 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-172425-bbf4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/schramm2012-imzml-pyimzml/run1/home/sessions/20261008-172425-bbf4/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 11) | pass 9 via tolerance (n5, claim check 53) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 11) | pass 100.0833 via tolerance (n2, claim check 53) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 11) | pass 799.9167 via tolerance (n2, claim check 53) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 24) | pass 243.54 via tolerance (n4, claim check 53) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 24) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 11) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 14) | not asked |

### wolf2018-scanpy | ollama:qwen3:8b | run 1

Status: timeout. 904 s. 14 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261008-172716-ddc6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/wolf2018-scanpy/run1/home/sessions/20261008-172716-ddc6/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 8) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 8) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n4 metrics.n_genes_after, entry 30) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 46) | FAIL - |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 66) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 130) | FAIL - |

