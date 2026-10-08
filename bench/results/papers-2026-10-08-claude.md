# Paper benchmark 2026-10-08

Models: claude. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude | 88/88 | 64/64 | 14 | 0 |

## Matrix

| Paper | claude |
| --- | --- |
| alexandrov2019-metaspace | 5/5 / 4/4 |
| andrews-fastqc | 7/7 / 3/3 |
| bates2015-lme4-sleepstudy | 9/9 / 7/7 |
| belenky2003-sleepstudy | 6/6 / 2/2 |
| bemis2015-cardinal | 5/5 / 5/5 |
| bradley-photutils-100gaussians | 6/6 / 6/6 |
| caicedo2019-bbbc039 | 1/1 / 1/1 |
| danecek2021-bcftools | 6/6 / 5/5 |
| delaney2004-esol | 6/6 / 4/4 |
| gowers2016-mdanalysis | 7/7 / 7/7 |
| gramfort2013-mne-sample | 14/14 / 12/12 |
| lazear2023-sage | 6/6 / 3/3 |
| li2009-samtools | 7/7 / 3/3 |
| ljosa2012-bbbc005 | 3/3 / 2/2 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude | 14 | 2748 | 151 | 374 | 102597 | 2440518 | 211 | 3 | 2 | 0 | 14 | 50 | 44 | 21 | 28 | 5 | 5 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude: $4.65 for 14 runs

## Details

### alexandrov2019-metaspace | claude | run 1

Status: answer. 153 s. 12 requests, 21 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261008-144624-4edd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/alexandrov2019-metaspace/run1/home/sessions/20261008-144624-4edd/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n5 metrics.n_fdr_10, entry 40) | pass 414 via tolerance (n15, claim check 162) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n3 metrics.n_fdr_10, entry 28) | pass 263 via tolerance (n11, claim check 162) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n6 metrics.n_fdr_10, entry 43) | pass 191 via tolerance (n16, claim check 162) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n9 metrics.n_fdr_10, entry 58) | pass 123 via tolerance (n9, claim check 162) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n5 metrics.n_fdr_05, entry 40) | not asked |

### andrews-fastqc | claude | run 1

Status: answer. 167 s. 10 requests, 19 tool calls (0 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261008-144857-c552. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/andrews-fastqc/run1/home/sessions/20261008-144857-c552/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 32) | pass 250000 via tolerance (n8, claim check 113) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 35) | pass 395288 via tolerance (n8, claim check 113) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 32) | pass 40 via tolerance (n5, claim check 113) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 32) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 35) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 32) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 35) | not asked |

### bates2015-lme4-sleepstudy | claude | run 1

Status: answer. 160 s. 12 requests, 18 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261008-145146-1371. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/bates2015-lme4-sleepstudy/run1/home/sessions/20261008-145146-1371/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 37) | pass 251.4051 via tolerance (n4, claim check 139) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 37) | pass 10.46729 via tolerance (n4, claim check 139) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 37) | pass 1743.628 via tolerance (n4, claim check 139) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 37) | pass 24.74066 via tolerance (n4, claim check 139) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 37) | pass 5.922138 via tolerance (n4, claim check 139) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 37) | pass 25.5918 via tolerance (n4, claim check 139) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 37) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n7 metrics.chisq, entry 58) | pass 23.53654 via tolerance (n7, claim check 139) |
| n_subjects | 18 exact | pass 18 (n1 data.columns[1].min_rows_per_value, entry 17) | not asked |

### belenky2003-sleepstudy | claude | run 1

Status: answer. 76 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261008-145426-4eaa. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/belenky2003-sleepstudy/run1/home/sessions/20261008-145426-4eaa/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 35) | pass 10.467 via tolerance (n2, claim check 74) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 35) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 35) | pass 1.546 via tolerance (n2, claim check 74) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 35) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 35) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 35) | not asked |

### bemis2015-cardinal | claude | run 1

Status: answer. 238 s. 15 requests, 20 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-145542-7afe. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/bemis2015-cardinal/run1/home/sessions/20261008-145542-7afe/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 19) | pass 4959 via tolerance (n20, claim check 178) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 19) | pass 10200 via tolerance (n1, claim check 178) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 47) | pass 687 via tolerance (n5, claim check 178) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 63) | pass 6 via tolerance (n19, claim check 178) |
| segments_s64 | 3 ±1 | pass 3 (n5 data.snr, entry 47) | pass 3 via tolerance (n16, claim check 178) |

### bradley-photutils-100gaussians | claude | run 1

Status: answer. 114 s. 9 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-145940-4199. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/bradley-photutils-100gaussians/run1/home/sessions/20261008-145940-4199/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 42) | pass 5.152 via tolerance (n11, claim check 173) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 42) | pass 2.094 via tolerance (n11, claim check 173) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 114) | pass 82 via tolerance (n20, claim check 173) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 134) | pass 925 via tolerance (n21, claim check 173) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 134) | pass 760 via tolerance (n21, claim check 173) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 134) | pass 925 via tolerance (n21, claim check 173) |

### caicedo2019-bbbc039 | claude | run 1

Status: answer. 369 s. 15 requests, 21 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-150134-fe43. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/caicedo2019-bbbc039/run1/home/sessions/20261008-150134-fe43/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n10 stdout, entry 80) | pass 5720 via tolerance (n14, claim check 153) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1452 (n14 stdout, entry 114) | match 0.14 via tolerance (n14, claim check 153) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2017 (n14 stdout, entry 114) | match 0.2017 via tolerance (n14, claim check 153) |

### danecek2021-bcftools | claude | run 1

Status: answer. 80 s. 6 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261008-150742-f300. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/danecek2021-bcftools/run1/home/sessions/20261008-150742-f300/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 10) | pass 1955 via tolerance (n1, claim check 65) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 10) | pass 248 via tolerance (n1, claim check 65) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 10) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 10) | pass 2.2 via tolerance (n1, claim check 65) |
| records_in_region | 1137 exact | pass 1137 (n3 metrics.n_records, entry 29) | pass 1137 via tolerance (n3, claim check 65) |
| records_af_5pct | 328 exact | pass 328 (n4 metrics.n_after, entry 32) | pass 328 via tolerance (n5, claim check 65) |

### delaney2004-esol | claude | run 1

Status: answer. 106 s. 10 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261008-150902-f94d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/delaney2004-esol/run1/home/sessions/20261008-150902-f94d/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 23) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n4 metrics.n_zero_violations, entry 50) | pass 1018 via tolerance (n4, claim check 114) |
| two_or_more_violations | 12 ±3 | pass 12 (n2 table.rows[0][6], entry 30) | pass 12 via tolerance (n4, claim check 114) |
| logp_above_5 | 97 ±5 | pass 97 (n4 metrics.n_logp_over_5, entry 50) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n5 metrics.all_r_squared_correlation, entry 67) | pass 0.752 via tolerance (n5, claim check 114) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n5 metrics.all_rmse, entry 67) | pass 1.1 via tolerance (n5, claim check 114) |

### gowers2016-mdanalysis | claude | run 1

Status: answer. 86 s. 7 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-151048-5fe8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/gowers2016-mdanalysis/run1/home/sessions/20261008-151048-5fe8/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 13) | pass 3341 via tolerance (n1, claim check 85) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 13) | pass 98 via tolerance (n5, claim check 85) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n4 metrics.rmsd_last, entry 25) | pass 6.82 via tolerance (n4, claim check 85) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n5 metrics.rg_last, entry 32) | pass 19.59 via tolerance (n5, claim check 85) |
| residues_chain_a | 214 exact | pass 214 (n1 metrics.n_residues, entry 13) | pass 214 via tolerance (n6, claim check 85) |
| residues_chain_b | 214 exact | pass 214 (n1 metrics.n_residues, entry 13) | pass 214 via tolerance (n6, claim check 85) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 39) | pass 7.13 via tolerance (n6, claim check 85) |

### gramfort2013-mne-sample | claude | run 1

Status: answer. 128 s. 12 requests, 17 tool calls (2 failed), 0 nudges, 0 plan reminders, 10 unsourced.
Session: 20261008-151215-2617. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/gramfort2013-mne-sample/run1/home/sessions/20261008-151215-2617/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 29) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 29) | pass 72 via tolerance (n2, claim check 188) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 29) | pass 73 via tolerance (n9, claim check 188) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 29) | pass 73 via tolerance (n9, claim check 188) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 29) | pass 70 via tolerance (n9, claim check 188) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 29) | pass 15 via tolerance (n2, claim check 188) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 29) | pass 16 via tolerance (n9, claim check 188) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 104) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 104) | pass 309 via tolerance (n9, claim check 188) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 104) | pass 68 via tolerance (n13, claim check 188) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n17 metrics.gfp_latency_s, entry 147) | pass 0.1 via tolerance (n4, claim check 188) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n17 metrics.gfp_amplitude, entry 147) | pass 42.07 via tolerance (n17, claim check 188) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n17 metrics.peak_latency_s, entry 147) | pass 0.08 via tolerance (n17, claim check 188) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n17 metrics.peak_amplitude, entry 147) | pass 198.8 via tolerance (n17, claim check 188) |

### lazear2023-sage | claude | run 1

Status: answer. 179 s. 12 requests, 15 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-151422-e330. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/lazear2023-sage/run1/home/sessions/20261008-151422-e330/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n3 metrics.n_psm, entry 41) | not asked |
| decoy_psms | 43 exact | pass 43 (n3 metrics.n_decoy_psm, entry 41) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n4 metrics.n_psm_pass, entry 48) | pass 207 via tolerance (n7, claim check 112) |
| distinct_peptides | 47 exact | pass 47 (n4 metrics.n_peptides_pass, entry 48) | pass 47 via tolerance (n7, claim check 112) |
| decoy_psms_kept | 1 exact | pass 1 (n4 metrics.n_decoy_pass, entry 48) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n7 stdout, entry 67) | pass 242 via tolerance (n7, claim check 112) |

### li2009-samtools | claude | run 1

Status: answer. 132 s. 14 requests, 15 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-151722-421a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/li2009-samtools/run1/home/sessions/20261008-151722-421a/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 22) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 40) | pass 3271 via tolerance (n5, claim check 143) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 40) | pass 3144 via tolerance (n4, claim check 143) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 40) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 43) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 43) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 70) | pass 79 via tolerance (n10, claim check 143) |

### ljosa2012-bbbc005 | claude | run 1

Status: answer. 759 s. 10 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261008-151934-b3d3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/claude/ljosa2012-bbbc005/run1/home/sessions/20261008-151934-b3d3/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n20 metrics.ratio_otsu_shape, entry 126) | pass 0.9399 via tolerance (n12, claim check 156) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n12 metrics.mean_abs_error, entry 89) | pass 3.01 via tolerance (n12, claim check 156) |
| true_total_sample | 5007 exact | pass 5007 (n12 metrics.true_total, entry 89) | not asked |

