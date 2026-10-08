# Paper benchmark 2026-10-08

Models: ollama:qwen3:8b, ollama:qwen3:14b, ollama:qwen3:30b-a3b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 144/169 | 69/119 | 28 | 1 error |

## Matrix

| Paper | ollama:qwen3:8b | ollama:qwen3:14b | ollama:qwen3:30b-a3b |
| --- | --- | --- | --- |
| alexandrov2019-metaspace | 5/5 / 2/4 | - | - |
| andrews-fastqc | 7/7 / 3/3 | - | - |
| bates2015-lme4-sleepstudy | 9/9 / 7/7 | - | - |
| belenky2003-sleepstudy | 6/6 / 0/2 (1 error) | - | - |
| bemis2015-cardinal | 5/5 / 5/5 | - | - |
| bradley-photutils-100gaussians | 6/6 / 4/6 | - | - |
| caicedo2019-bbbc039 | 1/1 / 1/1 | - | - |
| danecek2021-bcftools | 5/6 / 4/5 | - | - |
| delaney2004-esol | 4/6 / 2/4 | - | - |
| gowers2016-mdanalysis | 6/7 / 2/7 | - | - |
| gramfort2013-mne-sample | 2/14 / 0/12 | - | - |
| lazear2023-sage | 5/6 / 2/3 | - | - |
| li2009-samtools | 5/7 / 3/3 | - | - |
| ljosa2012-bbbc005 | 1/3 / 1/2 | - | - |
| love2014-deseq2-airway | 5/5 / 4/4 | - | - |
| mahbod2024-nuinsseg | 3/3 / 1/1 | - | - |
| minh2020-iqtree2 | 1/1 / 1/1 | - | - |
| oksanen-vegan-dune | 6/6 / 5/5 | - | - |
| palmer2017-metaspace-fdr | 0/0 / 0/0 | - | - |
| quinlan2010-bedtools | 4/4 / 3/3 | - | - |
| rossi1980-recidivism | 11/11 / 3/4 | - | - |
| rost2016-openms | 5/5 / 1/2 | - | - |
| rouault-gdal-autotest | 14/14 / 4/14 | - | - |
| schindelin2012-fiji-blobs | 1/1 / 0/1 | - | - |
| schramm2012-imzml-pyimzml | 7/7 / 1/4 | - | - |
| student1908-sleep | 6/6 / 4/4 | - | - |
| white2021-flowkit | 8/12 / 4/10 | - | - |
| wolf2018-scanpy | 6/6 / 2/2 | - | - |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 28 | 7008 | 225 | 1695816 | 35407 | 0 | 145 | 35 | 26 | 8 | 16 | 51 | 47 | 68 | 19 | 34 | 34 |

## Details

### alexandrov2019-metaspace | ollama:qwen3:8b | run 1

Status: answer. 721 s. 27 requests, 21 tool calls (0 failed), 0 nudges, 3 plan reminders, 0 unsourced.
Session: 20261008-135629-7f08. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/alexandrov2019-metaspace/run1/home/sessions/20261008-135629-7f08/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 45) | pass 414 via tolerance (n14, claim check 201) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 33) | FAIL 191 (n15, claim check 201) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n7 metrics.n_fdr_10, entry 52) | pass 191 via tolerance (n15, claim check 201) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n16 metrics.n_fdr_10, entry 116) | FAIL 144 (n14, claim check 201) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 45) | not asked |

### andrews-fastqc | ollama:qwen3:8b | run 1

Status: answer. 185 s. 11 requests, 6 tool calls (4 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-140830-3c93. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/andrews-fastqc/run1/home/sessions/20261008-140830-3c93/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 8) | pass 250000 via tolerance (n1, claim check 67) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 14) | pass 395288 via tolerance (n2, claim check 67) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 8) | pass 40 via tolerance (n2, claim check 67) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 8) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 14) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 8) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 14) | not asked |

### bates2015-lme4-sleepstudy | ollama:qwen3:8b | run 1

Status: answer. 210 s. 9 requests, 4 tool calls (0 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-141134-6245. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/bates2015-lme4-sleepstudy/run1/home/sessions/20261008-141134-6245/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 24) | pass 251.41 via tolerance (n4, claim check 82) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 24) | pass 10.47 via tolerance (n4, claim check 82) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 24) | pass 1743.63 via tolerance (n4, claim check 82) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 24) | pass 24.74 via tolerance (n4, claim check 82) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 24) | pass 5.92 via tolerance (n4, claim check 82) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 24) | pass 25.59 via tolerance (n4, claim check 82) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 24) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 41) | pass 23.54 via tolerance (n5, claim check 82) |
| n_subjects | 18 exact | pass 18 (n1 data.columns[1].min_rows_per_value, entry 8) | not asked |

### belenky2003-sleepstudy | ollama:qwen3:8b | run 1

Status: error (Ollama did not finish within 600 s.). 623 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-141505-8475. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/belenky2003-sleepstudy/run1/home/sessions/20261008-141505-8475/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 29) | FAIL - |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 29) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 29) | FAIL - |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 29) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 29) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 29) | not asked |

### bemis2015-cardinal | ollama:qwen3:8b | run 1

Status: answer. 204 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-142527-65d4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/bemis2015-cardinal/run1/home/sessions/20261008-142527-65d4/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 8) | pass 4959 via tolerance (n5, claim check 77) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 8) | pass 10200 via tolerance (n1, claim check 77) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 32) | pass 687 via tolerance (n5, claim check 77) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 48) | pass 6 via tolerance (n8, claim check 77) |
| segments_s64 | 3 ±1 | pass 3 (n5 data.snr, entry 32) | pass 3 via tolerance (n7, claim check 77) |

### bradley-photutils-100gaussians | ollama:qwen3:8b | run 1

Status: answer. 251 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-142851-6cff. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/bradley-photutils-100gaussians/run1/home/sessions/20261008-142851-6cff/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.152442 (n9 metrics.background_median, entry 50) | pass 5.152 via tolerance (n9, claim check 138) |
| sky_noise | 2.094 ±0.01 | pass 2.094237 (n9 metrics.rms_median, entry 50) | pass 2.094 via tolerance (n9, claim check 138) |
| sources_detected | 82 exact | pass 82 (n18 metrics.n_sources, entry 91) | pass 82 via tolerance (n19, claim check 138) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 859.7662 (n19 table.rows[11][5], entry 110) | FAIL 764.5976 (n19, claim check 138) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 745.7972 (n19 table.rows[13][5], entry 110) | pass 764.5976 via tolerance (n19, claim check 138) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 859.7662 (n19 table.rows[11][5], entry 110) | FAIL 764.5976 (n19, claim check 138) |

### caicedo2019-bbbc039 | ollama:qwen3:8b | run 1

Status: answer. 859 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261008-143303-946c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/caicedo2019-bbbc039/run1/home/sessions/20261008-143303-946c/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n4 metrics.total_truth, entry 37) | pass 5720 via tolerance (n4, claim check 58) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n4 table.rows[12][8], entry 37) | differs 0.086 (n4, claim check 58) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.1837 (n4 table.rows[12][8], entry 37) | differs 0.086 (n4, claim check 58) |

### danecek2021-bcftools | ollama:qwen3:8b | run 1

Status: answer. 53 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261008-144721-eb8c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/danecek2021-bcftools/run1/home/sessions/20261008-144721-eb8c/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 8) | pass 1955 via tolerance (n1, claim check 27) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 8) | pass 248 via tolerance (n1, claim check 27) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 8) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 8) | pass 2.2 via tolerance (n1, claim check 27) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 19) | pass 1137 via tolerance (n2, claim check 27) |
| records_af_5pct | 328 exact | FAIL 312 (n2 metrics.tv, entry 19) | FAIL 248 (n1, claim check 27) |

### delaney2004-esol | ollama:qwen3:8b | run 1

Status: answer. 120 s. 8 requests, 4 tool calls (1 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-144814-0e07. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/delaney2004-esol/run1/home/sessions/20261008-144814-0e07/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 13) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 32) | pass 1018 via tolerance (n3, claim check 61) |
| two_or_more_violations | 12 ±3 | pass 12 (n2 table.rows[0][6], entry 19) | pass 12 via tolerance (n3, claim check 61) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 32) | not asked |
| esol_r2 | 0.752 ±0.03 | FAIL - | FAIL 0.9894 (n3, claim check 61) |
| esol_rmse | 1.1 ±0.1 | FAIL - | FAIL 0.9894 (n3, claim check 61) |

### gowers2016-mdanalysis | ollama:qwen3:8b | run 1

Status: answer. 100 s. 8 requests, 4 tool calls (0 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-145014-c335. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/gowers2016-mdanalysis/run1/home/sessions/20261008-145014-c335/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 8) | FAIL 214 (n4, claim check 52) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 8) | FAIL 75 (n4, claim check 52) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n2 metrics.rmsd_last, entry 18) | FAIL 72 (n4, claim check 52) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n3 metrics.rg_last, entry 32) | FAIL 72 (n4, claim check 52) |
| residues_chain_a | 214 exact | pass 214 (n1 metrics.n_residues, entry 8) | pass 214 via tolerance (n4, claim check 52) |
| residues_chain_b | 214 exact | pass 214 (n1 metrics.n_residues, entry 8) | pass 214 via tolerance (n4, claim check 52) |
| ca_rmsd_open_closed | 7.131 ±0.02 | FAIL 7 (n2 table.rows[7][0], entry 18) | FAIL 72 (n4, claim check 52) |

### gramfort2013-mne-sample | ollama:qwen3:8b | run 1

Status: answer. 86 s. 8 requests, 4 tool calls (0 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-145154-a83b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/gramfort2013-mne-sample/run1/home/sessions/20261008-145154-a83b/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | FAIL 277.7087 (n1 metrics.duration_s, entry 8) | not asked |
| events_id1 | 72 exact | FAIL 60 (n1 metrics.n_eeg, entry 8) | FAIL 0 (n4, claim check 46) |
| events_id2 | 73 exact | FAIL 60 (n1 metrics.n_eeg, entry 8) | FAIL 0 (n4, claim check 46) |
| events_id3 | 73 exact | FAIL 60 (n1 metrics.n_eeg, entry 8) | FAIL 0 (n4, claim check 46) |
| events_id4 | 70 exact | FAIL 60 (n1 metrics.n_eeg, entry 8) | FAIL 0 (n4, claim check 46) |
| events_id5 | 15 exact | FAIL 9 (n1 metrics.n_stim, entry 8) | FAIL 0 (n4, claim check 46) |
| events_id32 | 16 exact | FAIL 9 (n1 metrics.n_stim, entry 8) | FAIL 0 (n4, claim check 46) |
| epochs_dropped | 10 exact | FAIL 9 (n1 metrics.n_stim, entry 8) | not asked |
| epochs_kept | 309 exact | FAIL 277.7087 (n1 metrics.duration_s, entry 8) | FAIL 0 (n4, claim check 46) |
| auditory_left_kept | 68 exact | FAIL 60 (n1 metrics.n_eeg, entry 8) | FAIL 0 (n4, claim check 46) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.1 (n1 metrics.highpass, entry 8) | FAIL - |
| n100_amplitude_gfp | 42.1 ±2 | FAIL 40 (n1 metrics.lowpass, entry 8) | FAIL - |
| strongest_grad_latency | 0.0866 ±0.007 | FAIL 0.1 (n1 metrics.highpass, entry 8) | FAIL - |
| strongest_grad_amplitude | abs 199 ±8 | pass 204 (n1 metrics.n_grad, entry 8) | FAIL 0 (n4, claim check 46) |

### lazear2023-sage | ollama:qwen3:8b | run 1

Status: answer. 102 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 5 unsourced.
Session: 20261008-145321-9283. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/lazear2023-sage/run1/home/sessions/20261008-145321-9283/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 8) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 8) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 14) | pass 207 via tolerance (n3, claim check 43) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 14) | pass 47 via tolerance (n3, claim check 43) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 14) | not asked |
| target_psms_fdr5 | 242 exact | FAIL 260 (n1 metrics.n_target_psm, entry 8) | FAIL 260 (n1, claim check 43) |

### li2009-samtools | ollama:qwen3:8b | run 1

Status: answer. 64 s. 7 requests, 5 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-145502-fd51. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/li2009-samtools/run1/home/sessions/20261008-145502-fd51/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 8) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 26) | pass 3271 via tolerance (n4, claim check 63) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 26) | pass 3144 via tolerance (n4, claim check 63) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 26) | not asked |
| reads_seq1 | 1482 exact | FAIL 1653 (n4 metrics.read2, entry 26) | not asked |
| reads_seq2 | 1789 exact | FAIL 1654 (n4 metrics.read1, entry 26) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n9 metrics.count, entry 56) | pass 79 via tolerance (n9, claim check 63) |

### ljosa2012-bbbc005 | ollama:qwen3:8b | run 1

Status: answer. 727 s. 13 requests, 7 tool calls (2 failed), 1 nudges, 2 plan reminders, 1 unsourced.
Session: 20261008-145606-da2e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/ljosa2012-bbbc005/run1/home/sessions/20261008-145606-da2e/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n11 metrics.detected_to_true_count_ratio, entry 77) | pass 0.9399 via tolerance (n11, claim check 129) |
| mean_abs_error_sample | 3.11 ±0.1 | FAIL 1.3488 (n10 data.settings.threshold_smoothing, entry 68) | FAIL 0.94 (n11, claim check 129) |
| true_total_sample | 5007 exact | FAIL 4706 (n10 metrics.n_objects_total, entry 68) | not asked |

### love2014-deseq2-airway | ollama:qwen3:8b | run 1

Status: answer. 471 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-150813-6fdf. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/love2014-deseq2-airway/run1/home/sessions/20261008-150813-6fdf/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16139 ±100 | pass 16139 (n7 metrics.n_genes_tested, entry 41) | pass 16139 via tolerance (n7, claim check 54) |
| padj_01_workflow | 4905 ±100 | pass 4905 (n7 metrics.n_significant, entry 41) | pass 4905 via tolerance (n7, claim check 54) |
| up_padj_01 | 2607 ±60 | pass 2607 (n7 metrics.n_up, entry 41) | pass 2607 via tolerance (n7, claim check 54) |
| down_padj_01 | 2298 ±60 | pass 2298 (n7 metrics.n_down, entry 41) | pass 2298 via tolerance (n7, claim check 54) |
| padj_005_workflow | 4081 ±100 | pass 4081 (n5 metrics.n_significant, entry 29) | not asked |

### mahbod2024-nuinsseg | ollama:qwen3:8b | run 1

Status: answer. 469 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-151604-7bf3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/mahbod2024-nuinsseg/run1/home/sessions/20261008-151604-7bf3/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n10 metrics.mean_dice, entry 46) | pass 0.538 via tolerance (n10, claim check 70) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 8) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n10 metrics.total_truth, entry 46) | not asked |

### minh2020-iqtree2 | ollama:qwen3:8b | run 1

Status: answer. 67 s. 8 requests, 4 tool calls (1 failed), 2 nudges, 0 plan reminders, 2 unsourced.
Session: 20261008-152353-06e1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/minh2020-iqtree2/run1/home/sessions/20261008-152353-06e1/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 31) | pass -21152.54 via tolerance (n1, claim check 45) |

### oksanen-vegan-dune | ollama:qwen3:8b | run 1

Status: answer. 184 s. 7 requests, 5 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-152500-4b52. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/oksanen-vegan-dune/run1/home/sessions/20261008-152500-4b52/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 19) | pass 1.4405 via tolerance (n2, claim check 84) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n7 metrics.stress, entry 71) | pass 0.1183 via tolerance (n7, claim check 84) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n3 metrics.r2, entry 44) | pass 0.3416 via tolerance (n3, claim check 84) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n3 metrics.f, entry 44) | pass 2.767 via tolerance (n3, claim check 84) |
| permanova_p | 0.003 ±0.003 | pass 0.003 (n3 metrics.p, entry 44) | pass 0.003 via tolerance (n3, claim check 84) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n4 metrics.f, entry 54) | not asked |

### palmer2017-metaspace-fdr | ollama:qwen3:8b | run 1

Status: answer. 183 s. 19 requests, 14 tool calls (13 failed), 0 nudges, 3 plan reminders, 0 unsourced.
Session: 20261008-152804-bef7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/palmer2017-metaspace-fdr/run1/home/sessions/20261008-152804-bef7/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | match 52 (n3 metrics.n_off_sample_fdr_20, entry 27) | differs 0 (n5, claim check 144) |
| unique_formulas_three_sections (reference) | 66 exact | differs 61 (n5 metrics.n_databases, entry 75) | not asked |
| total_formulas (reference) | 103 ±20 | differs 61 (n5 metrics.n_databases, entry 75) | not asked |

### quinlan2010-bedtools | ollama:qwen3:8b | run 1

Status: answer. 34 s. 4 requests, 2 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153107-9a25. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/quinlan2010-bedtools/run1/home/sessions/20261008-153107-9a25/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 8) | pass 126 via tolerance (n1, claim check 27) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 8) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 8) | pass 33713 via tolerance (n1, claim check 27) |
| merged_intervals | 11270 exact | pass 11270 (n2 metrics.n_merged, entry 18) | pass 11270 via tolerance (n2, claim check 27) |

### rossi1980-recidivism | ollama:qwen3:8b | run 1

Status: answer. 165 s. 7 requests, 5 tool calls (3 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261008-153141-5098. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/rossi1980-recidivism/run1/home/sessions/20261008-153141-5098/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 8) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 19) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 39) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 39) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 39) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n3 metrics.hr_fin, entry 39) | pass 0.684 via tolerance (n3, claim check 61) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 39) | pass 0.0474 via tolerance (n3, claim check 61) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 39) | pass 0.6403 via tolerance (n3, claim check 61) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 19) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 19) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 39) | FAIL 0.0474 (n3, claim check 61) |

### rost2016-openms | ollama:qwen3:8b | run 1

Status: answer. 98 s. 7 requests, 3 tool calls (7 failed), 2 nudges, 0 plan reminders, 1 unsourced.
Session: 20261008-153426-3d7c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/rost2016-openms/run1/home/sessions/20261008-153426-3d7c/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 8) | FAIL 1887 (n2, claim check 73) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 8) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n2 metrics.n_mass_traces, entry 60) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n2 metrics.n_elution_peaks, entry 60) | not asked |
| features | 1887 ±100 | pass 1887 (n2 metrics.n_features, entry 60) | pass 1887 via tolerance (n2, claim check 73) |

### rouault-gdal-autotest | ollama:qwen3:8b | run 1

Status: answer. 64 s. 6 requests, 3 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153603-71a9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/rouault-gdal-autotest/run1/home/sessions/20261008-153603-71a9/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 8) | FAIL 42 (n3, claim check 35) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 8) | FAIL 42 (n3, claim check 35) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 8) | FAIL 135 (n3, claim check 35) |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 8) | FAIL 42 (n3, claim check 35) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 8) | FAIL 100 (n3, claim check 35) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 8) | FAIL 135 (n3, claim check 35) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 8) | FAIL 129.5 (n3, claim check 35) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 8) | FAIL 42 (n3, claim check 35) |
| warp_width | 22 exact | pass 22 (n2 metrics.width, entry 18) | FAIL 42 (n3, claim check 35) |
| warp_height | 18 exact | pass 18 (n2 metrics.height, entry 18) | FAIL 42 (n3, claim check 35) |
| zone_a_pixels | 100 exact | pass 100 (n3 metrics.count, entry 28) | pass 100 via tolerance (n3, claim check 35) |
| zone_a_mean | 129.5 ±0.01 | pass 129.5 (n3 metrics.mean, entry 28) | pass 129.5 via tolerance (n3, claim check 35) |
| zone_b_pixels_centers | 42 exact | pass 42 (n3 table.rows[1][1], entry 28) | pass 42 via tolerance (n3, claim check 35) |
| zone_b_mean_centers | 135 ±0.01 | pass 135 (n3 table.rows[1][4], entry 28) | pass 135 via tolerance (n3, claim check 35) |

### schindelin2012-fiji-blobs | ollama:qwen3:8b | run 1

Status: answer. 87 s. 7 requests, 4 tool calls (1 failed), 1 nudges, 0 plan reminders, 3 unsourced.
Session: 20261008-153707-2199. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/schindelin2012-fiji-blobs/run1/home/sessions/20261008-153707-2199/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 41) | FAIL - |

### schramm2012-imzml-pyimzml | ollama:qwen3:8b | run 1

Status: answer. 71 s. 5 requests, 3 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153834-9cfb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/schramm2012-imzml-pyimzml/run1/home/sessions/20261008-153834-9cfb/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 11) | FAIL 3 (n3, claim check 31) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 11) | FAIL 243.54 (n3, claim check 31) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 11) | FAIL 243.54 (n3, claim check 31) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 24) | pass 243.54 via tolerance (n3, claim check 31) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 24) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 11) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 17) | not asked |

### student1908-sleep | ollama:qwen3:8b | run 1

Status: answer. 44 s. 3 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-153945-3517. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/student1908-sleep/run1/home/sessions/20261008-153945-3517/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 27) | pass 1.58 via tolerance (n2, claim check 34) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 27) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 27) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 27) | pass 0.0028 via tolerance (n2, claim check 34) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 27) | pass 0.7 via tolerance (n2, claim check 34) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 27) | pass 2.46 via tolerance (n2, claim check 34) |

### white2021-flowkit | ollama:qwen3:8b | run 1

Status: answer. 155 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261008-154029-df6d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/white2021-flowkit/run1/home/sessions/20261008-154029-df6d/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 8) | pass 290172 via tolerance (n3, claim check 42) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 29) | pass 133670 via tolerance (n3, claim check 42) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 29) | FAIL 133670 (n3, claim check 42) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 29) | pass 82484 via tolerance (n3, claim check 42) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 29) | FAIL 82484 (n3, claim check 42) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 29) | pass 47165 via tolerance (n3, claim check 42) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 29) | FAIL 47165 (n3, claim check 42) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 29) | not asked |
| cd3_no_compensation | 135381 exact | FAIL 133860 (n3 table.rows[3][6], entry 29) | FAIL 133670 (n3, claim check 42) |
| cd4_no_compensation | 85369 exact | FAIL 82636 (n3 table.rows[4][6], entry 29) | FAIL 82484 (n3, claim check 42) |
| cd8_no_compensation | 47694 exact | FAIL 47241 (n3 table.rows[5][6], entry 29) | FAIL 47165 (n3, claim check 42) |
| cd8_ifng_no_compensation | 672 exact | FAIL 690 (n3 metrics.max_abs_diff_vs_flowjo, entry 29) | not asked |

### wolf2018-scanpy | ollama:qwen3:8b | run 1

Status: answer. 613 s. 15 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261008-154305-7e99. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/wolf2018-scanpy/run1/home/sessions/20261008-154305-7e99/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 8) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 8) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n4 metrics.n_genes_after, entry 30) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 46) | pass 2638 via tolerance (n16, claim check 172) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 66) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n9 table.rows[6][0], entry 86) | pass 7 via tolerance (n17, claim check 172) |

