# Paper benchmark 2026-10-09

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 376/472 | 240/384 | 53 | 1 no_answer, 1 timeout |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| aledo2022-renz-onpg | 2/2 / 2/2 |
| alexandrov2019-metaspace | 4/5 / 2/4 |
| andreasson2019-endotoxin-health | 9/10 / 6/7 |
| andrews-fastqc | 7/7 / 3/3 |
| astapova2021-deseq2-kgn | 4/4 / 3/3 |
| bates2015-lme4-sleepstudy | 9/9 / 7/7 |
| belenky2003-sleepstudy | 6/6 / 2/2 |
| bemis2015-cardinal | 5/5 / 5/5 |
| bradley-photutils-100gaussians | 6/6 / 6/6 |
| caicedo2019-bbbc039 | 1/1 / 1/1 |
| chure2024-hplc-py | 6/12 / 6/11 |
| cooley2020-splitluc-zprime | 9/19 / 0/19 (1 no_answer) |
| danecek2021-bcftools | 6/6 / 4/5 |
| delaney2004-esol | 4/6 / 2/4 |
| desveaux2026-pcrv-ic50 | 9/9 / 8/8 |
| gowers2016-mdanalysis | 7/7 / 7/7 |
| gramfort2013-mne-sample | 14/14 / 1/12 |
| hackshaw1997-ets-lung-cancer | 4/4 / 3/3 |
| hildyard2021-embryo-refgenes | 10/18 / 0/16 |
| jang2016-hcc-biomarkers | 22/22 / 20/20 |
| kanetis2022-iqtree-sporocadaceae | 2/3 / 0/2 |
| kasurinen2018-mmp14-gastric | 19/25 / 0/17 |
| klindworth2013-16s-primers | 9/11 / 9/11 |
| korsunsky2019-harmony | 4/5 / 3/5 |
| lackey2015-tb-default | 28/30 / 23/28 |
| lazear2023-sage | 5/6 / 2/3 |
| li2009-samtools | 5/7 / 3/3 |
| liao2025-scanpy-bone-marrow | 3/5 / 2/4 |
| ljosa2012-bbbc005 | 3/3 / 2/2 |
| love2014-deseq2-airway | 5/5 / 4/4 |
| mahbod2024-nuinsseg | 3/3 / 1/1 |
| makrai2023-colonies | 2/2 / 1/1 |
| manders1993-coloc | 6/6 / 5/5 |
| minh2020-iqtree2 | 1/1 / 1/1 |
| nair2024-plasmid-growth | 4/20 / 0/17 (1 timeout) |
| oksanen-vegan-dune | 6/6 / 5/5 |
| oreshkova2024-qmp-honeybee | 18/19 / 15/16 |
| palmer2017-metaspace-fdr | 0/0 / 0/0 |
| quinlan2010-bedtools | 4/4 / 3/3 |
| rees2019-uptake | 5/5 / 4/4 |
| rossi1980-recidivism | 6/11 / 0/4 |
| rost2016-openms | 5/5 / 1/2 |
| rouault-gdal-autotest | 8/14 / 8/14 |
| schindelin2012-fiji-blobs | 1/1 / 1/1 |
| schramm2012-imzml-pyimzml | 5/7 / 3/4 |
| sriphoosanaphan2021-sample-size | 3/3 / 2/2 |
| sriphoosanaphan2021-vitd-hcv | 5/21 / 3/19 |
| student1908-sleep | 6/6 / 4/4 |
| wang2023-cuproptosis-oa | 14/14 / 13/13 |
| weber2023-nnsvg-dlpfc | 3/4 / 3/4 |
| white2021-flowkit | 8/12 / 4/10 |
| wolf2018-scanpy | 6/6 / 2/2 |
| yun2026-lasv-elisa | 30/30 / 25/28 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 53 | 15128 | 466 | 5348264 | 63454 | 0 | 304 | 113 | 75 | 3 | 31 | 125 | 29 | 96 | 17 | 96 | 96 |

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aledo2022-renz-onpg | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| alexandrov2019-metaspace | ollama:qwen3:8b | 1 | on | 0 | 0 | 0 | 0 | 0 |
| andreasson2019-endotoxin-health | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| andrews-fastqc | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | ollama:qwen3:8b | 1 | on | 3 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | ollama:qwen3:8b | 1 | on | 4 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | ollama:qwen3:8b | 1 | on | 3 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| cooley2020-splitluc-zprime | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| danecek2021-bcftools | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| delaney2004-esol | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 3 | 0 |
| desveaux2026-pcrv-ic50 | ollama:qwen3:8b | 1 | on | 3 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | ollama:qwen3:8b | 1 | on | 4 | 0 | 0 | 0 | 0 |
| gramfort2013-mne-sample | ollama:qwen3:8b | 1 | on | 3 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| hildyard2021-embryo-refgenes | ollama:qwen3:8b | 1 | on | 2 | 0 | 1 | 0 | 0 |
| jang2016-hcc-biomarkers | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| kanetis2022-iqtree-sporocadaceae | ollama:qwen3:8b | 1 | on | 3 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | ollama:qwen3:8b | 1 | on | 3 | 0 | 0 | 8 | 0 |
| klindworth2013-16s-primers | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 1 | 0 |
| korsunsky2019-harmony | ollama:qwen3:8b | 1 | on | 16 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| lazear2023-sage | ollama:qwen3:8b | 1 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | ollama:qwen3:8b | 1 | on | 5 | 0 | 0 | 0 | 0 |
| liao2025-scanpy-bone-marrow | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| ljosa2012-bbbc005 | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| love2014-deseq2-airway | ollama:qwen3:8b | 1 | on | 5 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | ollama:qwen3:8b | 1 | on | 2 | 1 | 0 | 0 | 0 |
| makrai2023-colonies | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| manders1993-coloc | ollama:qwen3:8b | 1 | on | 4 | 0 | 0 | 0 | 0 |
| minh2020-iqtree2 | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 3 | 0 |
| nair2024-plasmid-growth | ollama:qwen3:8b | 1 | on | 3 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| oreshkova2024-qmp-honeybee | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 2 | 0 |
| palmer2017-metaspace-fdr | ollama:qwen3:8b | 1 | on | 0 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| rees2019-uptake | ollama:qwen3:8b | 1 | on | 1 | 0 | 1 | 0 | 0 |
| rossi1980-recidivism | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| rost2016-openms | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| rouault-gdal-autotest | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | ollama:qwen3:8b | 1 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-vitd-hcv | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| student1908-sleep | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |
| wang2023-cuproptosis-oa | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | ollama:qwen3:8b | 1 | on | 6 | 0 | 0 | 0 | 0 |
| white2021-flowkit | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |
| wolf2018-scanpy | ollama:qwen3:8b | 1 | on | 12 | 0 | 0 | 0 | 0 |
| yun2026-lasv-elisa | ollama:qwen3:8b | 1 | on | 1 | 0 | 0 | 0 | 0 |

Paths outside the allow list:
- mahbod2024-nuinsseg | ollama:qwen3:8b | run 1: /tissue images/*.png

## Details

### aledo2022-renz-onpg | ollama:qwen3:8b | run 1

Status: answer. 49 s. 2 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-030237-7dfa. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/aledo2022-renz-onpg/run1/home/sessions/20261009-030237-7dfa/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/aledo2022-renz-onpg/run1/home/sessions/20261009-030237-7dfa/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 13) | pass 2.479 via tolerance (n1, claim check 20) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 13) | pass 0.1841 via tolerance (n1, claim check 20) |

### alexandrov2019-metaspace | ollama:qwen3:8b | run 1

Status: answer. 142 s. 14 requests, 8 tool calls (0 failed), 4 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-030326-ec5b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/alexandrov2019-metaspace/run1/home/sessions/20261009-030326-ec5b/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/alexandrov2019-metaspace/run1/home/sessions/20261009-030326-ec5b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n3 metrics.n_fdr_10, entry 26) | pass 414 via tolerance (n9, claim check 100) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n1 metrics.n_fdr_10, entry 17) | FAIL 191 (n10, claim check 100) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n4 metrics.n_fdr_10, entry 33) | pass 191 via tolerance (n10, claim check 100) |
| d2_hmdb_fdr10 | 123 exact | FAIL 144 (n3 metrics.n_fdr_05, entry 26) | FAIL 144 (n9, claim check 100) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n3 metrics.n_fdr_05, entry 26) | not asked |

### andreasson2019-endotoxin-health | ollama:qwen3:8b | run 1

Status: answer. 151 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-030548-3641. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/andreasson2019-endotoxin-health/run1/home/sessions/20261009-030548-3641/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/andreasson2019-endotoxin-health/run1/home/sessions/20261009-030548-3641/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | pass 151 (n3 metrics.n, entry 33) | not asked |
| n_subjects | 52 exact | pass 52 (n3 metrics.n_groups, entry 33) | not asked |
| intercept | 6.238 ±0.005 | pass 6.238095 (n3 metrics.coef_Intercept, entry 33) | pass 6.238 via tolerance (n3, claim check 46) |
| coef_lps | 0.02 ±0.005 | pass 0.01996928 (n3 metrics.coef_C_lps_T_1, entry 33) | pass 0.02 via tolerance (n2, claim check 46) |
| coef_time2 | -0.619 ±0.005 | pass -0.6190476 (n3 metrics.coef_C_time_T_2, entry 33) | pass -0.619 via tolerance (n3, claim check 46) |
| coef_time3 | -0.218 ±0.005 | pass -0.2181137 (n3 metrics.coef_C_time_T_3, entry 33) | pass -0.218 via tolerance (n3, claim check 46) |
| coef_lps_time2 | -1.786 ±0.005 | pass -1.785698 (n3 metrics.coef_C_lps_T_1_C_time_T_2, entry 33) | pass -1.786 via tolerance (n3, claim check 46) |
| coef_lps_time3 | -0.906 ±0.005 | pass -0.9055435 (n3 metrics.coef_C_lps_T_1_C_time_T_3, entry 33) | pass -0.906 via tolerance (n3, claim check 46) |
| se_lps_time2 | 0.3157 ±0.001 | pass 0.315681 (n3 metrics.se_C_lps_T_1_C_time_T_2, entry 33) | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | FAIL - | FAIL 0.01 (n1, claim check 46) |

### andrews-fastqc | ollama:qwen3:8b | run 1

Status: answer. 55 s. 3 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-030819-319c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/andrews-fastqc/run1/home/sessions/20261009-030819-319c/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/andrews-fastqc/run1/home/sessions/20261009-030819-319c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 9) | pass 250000 via tolerance (n1, claim check 25) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 15) | pass 395288 via tolerance (n2, claim check 25) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 9) | pass 40 via tolerance (n2, claim check 25) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 9) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 15) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 9) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 15) | not asked |

### astapova2021-deseq2-kgn | ollama:qwen3:8b | run 1

Status: answer. 242 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-030914-3e84. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/astapova2021-deseq2-kgn/run1/home/sessions/20261009-030914-3e84/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/astapova2021-deseq2-kgn/run1/home/sessions/20261009-030914-3e84/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 45) | pass 173 via tolerance (n7, claim check 77) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 45) | pass 125 via tolerance (n7, claim check 77) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 45) | pass 48 via tolerance (n7, claim check 77) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 9) | not asked |

### bates2015-lme4-sleepstudy | ollama:qwen3:8b | run 1

Status: answer. 163 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-031316-7830. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/bates2015-lme4-sleepstudy/run1/home/sessions/20261009-031316-7830/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/bates2015-lme4-sleepstudy/run1/home/sessions/20261009-031316-7830/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 25) | pass 251.405 via tolerance (n4, claim check 79) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 25) | pass 10.467 via tolerance (n4, claim check 79) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 25) | pass 1743.628 via tolerance (n4, claim check 79) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 25) | pass 24.741 via tolerance (n4, claim check 79) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 25) | pass 5.922 via tolerance (n4, claim check 79) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 25) | pass 25.592 via tolerance (n4, claim check 79) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 25) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 38) | pass 23.537 via tolerance (n5, claim check 79) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 25) | not asked |

### belenky2003-sleepstudy | ollama:qwen3:8b | run 1

Status: answer. 61 s. 3 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-031559-2e01. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/belenky2003-sleepstudy/run1/home/sessions/20261009-031559-2e01/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/belenky2003-sleepstudy/run1/home/sessions/20261009-031559-2e01/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 26) | pass 10.47 via tolerance (n2, claim check 33) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 26) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 26) | pass 1.55 via tolerance (n2, claim check 33) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 26) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 26) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 26) | not asked |

### bemis2015-cardinal | ollama:qwen3:8b | run 1

Status: answer. 210 s. 10 requests, 4 tool calls (0 failed), 4 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-031700-9a2e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/bemis2015-cardinal/run1/home/sessions/20261009-031700-9a2e/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/bemis2015-cardinal/run1/home/sessions/20261009-031700-9a2e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 9) | pass 4959 via tolerance (n5, claim check 92) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 9) | pass 10200 via tolerance (n1, claim check 92) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 37) | pass 687 via tolerance (n5, claim check 92) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 58) | pass 6 via tolerance (n7, claim check 92) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 58) | pass 3 via tolerance (n7, claim check 92) |

### bradley-photutils-100gaussians | ollama:qwen3:8b | run 1

Status: answer. 728 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-032031-5ee1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/bradley-photutils-100gaussians/run1/home/sessions/20261009-032031-5ee1/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/bradley-photutils-100gaussians/run1/home/sessions/20261009-032031-5ee1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.152442 (n9 metrics.background_median, entry 52) | pass 5.152 via tolerance (n9, claim check 125) |
| sky_noise | 2.094 ±0.01 | pass 2.094237 (n9 metrics.rms_median, entry 52) | pass 2.094 via tolerance (n9, claim check 125) |
| sources_detected | 82 exact | pass 82 (n18 metrics.n_sources, entry 93) | pass 82 via tolerance (n18, claim check 125) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n19 metrics.median_net_flux, entry 112) | pass 925.24 via tolerance (n19, claim check 125) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n19 table.rows[1][5], entry 112) | pass 760.2 via tolerance (n19, claim check 125) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n19 metrics.median_net_flux, entry 112) | pass 925.24 via tolerance (n19, claim check 125) |

### caicedo2019-bbbc039 | ollama:qwen3:8b | run 1

Status: answer. 684 s. 13 requests, 6 tool calls (2 failed), 4 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-033239-4fbe. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/caicedo2019-bbbc039/run1/home/sessions/20261009-033239-4fbe/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/caicedo2019-bbbc039/run1/home/sessions/20261009-033239-4fbe/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n4 metrics.total_truth, entry 41) | pass 5720 via tolerance (n4, claim check 89) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n4 table.rows[12][8], entry 41) | match 0.1837 via tolerance (n4, claim check 89) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.1837 (n4 table.rows[12][8], entry 41) | match 0.1837 via tolerance (n4, claim check 89) |

### chure2024-hplc-py | ollama:qwen3:8b | run 1

Status: answer. 111 s. 4 requests, 2 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-034404-4447. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/chure2024-hplc-py/run1/home/sessions/20261009-034404-4447/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/chure2024-hplc-py/run1/home/sessions/20261009-034404-4447/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n6 table.rows[5][0], entry 39) | pass 6 via tolerance (n6, claim check 54) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n6 metrics.retention_time_1, entry 39) | pass 10.9 via tolerance (n6, claim check 54) |
| peak1_area | 2800000 ±50000 | pass 2789693 (n6 metrics.area_1, entry 39) | pass 2789693 via tolerance (n2, claim check 54) |
| peak1_amplitude | 23000 ±500 | pass 23247.44 (n6 table.rows[0][3], entry 39) | pass 23247.44 via tolerance (n2, claim check 54) |
| peak1_scale | 0.16 ±0.005 | pass 0.15833 (n1 table.rows[19][0], entry 9) | pass 0.1579 via tolerance (n6, claim check 54) |
| peak1_skew | 0.7 ±0.01 | FAIL 0.6858291 (n6 table.rows[0][5], entry 39) | FAIL 0.6858 (n2, claim check 54) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n6 metrics.retention_time_3, entry 39) | pass 14.45 via tolerance (n6, claim check 54) |
| peak1_area_exact | 2805655.43 ±300 | FAIL 2789693 (n6 metrics.area_1, entry 39) | not asked |
| calibration_slope | 156586.74 ±160 | FAIL 75508 (n1 metrics.signal_max, entry 9) | FAIL 23247.44 (n2, claim check 54) |
| calibration_intercept | 14624.94 ±150 | FAIL 14891.04 (n6 table.rows[3][3], entry 39) | FAIL 23247.44 (n2, claim check 54) |
| calibration_r_squared | 0.99887 ±0.00005 | FAIL 1 (n1 table.rows[12][1], entry 9) | FAIL 0.6858 (n2, claim check 54) |
| unknown_concentration | 1.8994 ±0.005 | FAIL 1.984174 (n6 table.rows[4][5], entry 39) | FAIL 0.6858 (n2, claim check 54) |

### cooley2020-splitluc-zprime | ollama:qwen3:8b | run 1

Status: no_answer. 312 s. 40 requests, 40 tool calls (25 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-034556-6825. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/cooley2020-splitluc-zprime/run1/home/sessions/20261009-034556-6825/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/cooley2020-splitluc-zprime/run1/home/sessions/20261009-034556-6825/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | FAIL 0.5218797 (n1 metrics.p2_z_prime, entry 32) | FAIL - |
| z10_p2 | 0.6102 ±0.004 | FAIL 0.6429603 (n1 metrics.p6_z_prime, entry 32) | FAIL - |
| z10_p3 | 0.7275 ±0.004 | pass 0.7282149 (n1 metrics.p10_z_prime, entry 32) | FAIL - |
| z10_p4 | 0.7302 ±0.002 | pass 0.7282149 (n1 metrics.p10_z_prime, entry 32) | FAIL - |
| z10_p5 | 0.6643 ±0.004 | FAIL 0.6708963 (n1 metrics.p7_z_prime, entry 32) | FAIL - |
| z10_p6 | 0.6319 ±0.004 | FAIL 0.6429603 (n1 metrics.p6_z_prime, entry 32) | FAIL - |
| z10_p7 | 0.7666 ±0.004 | FAIL 0.7864944 (n1 metrics.p4_z_prime, entry 32) | FAIL - |
| z10_p8 | 0.7415 ±0.004 | FAIL 0.746225 (n1 metrics.p3_z_prime, entry 32) | FAIL - |
| z10_p9 | 0.621 ±0.004 | FAIL 0.6429603 (n1 metrics.p6_z_prime, entry 32) | FAIL - |
| z10_p10 | 0.7217 ±0.004 | FAIL 0.7170989 (n1 metrics.z_prime_mean, entry 32) | FAIL - |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n1 metrics.p2_z_prime, entry 32) | FAIL - |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n1 metrics.p4_z_prime, entry 32) | FAIL - |
| z20_p6 | 0.643 ±0.004 | pass 0.6429603 (n1 metrics.p6_z_prime, entry 32) | FAIL - |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n1 metrics.p7_z_prime, entry 32) | FAIL - |
| z20_p8 | 0.685 ±0.004 | pass 0.6850474 (n1 metrics.p8_z_prime, entry 32) | FAIL - |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n1 metrics.p9_z_prime, entry 32) | FAIL - |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n1 metrics.p10_z_prime, entry 32) | FAIL - |
| mean_pos10_p1 | 2471.2 ±0.6 | FAIL 1643.543 (n1 table.rows[5][8], entry 32) | FAIL - |
| sd_pos10_p1 | 268.1 ±0.6 | FAIL 247.8378 (n1 table.rows[8][8], entry 32) | FAIL - |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.6429603 (n1 metrics.p6_z_prime, entry 32) | differs - |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.8524462 (n1 metrics.p5_z_prime, entry 32) | differs - |

### danecek2021-bcftools | ollama:qwen3:8b | run 1

Status: answer. 67 s. 6 requests, 3 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-035107-8cf7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/danecek2021-bcftools/run1/home/sessions/20261009-035107-8cf7/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/danecek2021-bcftools/run1/home/sessions/20261009-035107-8cf7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 9) | pass 1955 via tolerance (n1, claim check 38) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 9) | pass 248 via tolerance (n1, claim check 38) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 9) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 9) | pass 2.2 via tolerance (n1, claim check 38) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 19) | FAIL 1021 (n2, claim check 38) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 29) | pass 328 via tolerance (n3, claim check 38) |

### delaney2004-esol | ollama:qwen3:8b | run 1

Status: answer. 159 s. 8 requests, 4 tool calls (1 failed), 2 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-035214-6401. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/delaney2004-esol/run1/home/sessions/20261009-035214-6401/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/delaney2004-esol/run1/home/sessions/20261009-035214-6401/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 24) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 44) | pass 1018 via tolerance (n3, claim check 63) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 44) | pass 12 via tolerance (n3, claim check 63) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 44) | not asked |
| esol_r2 | 0.752 ±0.03 | FAIL - | FAIL 12 (n3, claim check 63) |
| esol_rmse | 1.1 ±0.1 | FAIL - | FAIL 12 (n3, claim check 63) |

### desveaux2026-pcrv-ic50 | ollama:qwen3:8b | run 1

Status: answer. 417 s. 8 requests, 5 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-035454-1447. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-035454-1447/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/desveaux2026-pcrv-ic50/run1/home/sessions/20261009-035454-1447/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | pass 0.1172502 (n1 metrics.MEDI3902_ic50, entry 31) | pass 0.1173 via tolerance (n1, claim check 68) |
| ic50_30b8 | 0.021307 ±0.0001 | pass 0.02130746 (n1 metrics.30_B8_ic50, entry 31) | pass 0.02131 via tolerance (n3, claim check 68) |
| ic50_p3d6 | 3.6534 ±0.006 | pass 3.653446 (n1 metrics.P3D6_ic50, entry 31) | pass 3.653 via tolerance (n1, claim check 68) |
| ic50_p3d6_cytotox | 11.792 ±0.06 | pass 11.79184 (n2 metrics.P3D6_ic50, entry 38) | pass 11.79 via tolerance (n2, claim check 68) |
| ic50_30b8_v2 | 0.012782 ±0.00006 | pass 0.01278244 (n3 metrics.V2_ic50, entry 45) | pass 0.01278 via tolerance (n3, claim check 68) |
| ic50_30b8_v3 | 0.011202 ±0.00006 | pass 0.01120237 (n3 metrics.V3_ic50, entry 45) | pass 0.0112 via tolerance (n3, claim check 68) |
| ic50_30b8_v4 | 0.01305 ±0.00006 | pass 0.0130497 (n3 metrics.V4_ic50, entry 45) | pass 0.01305 via tolerance (n3, claim check 68) |
| ic50_30b8_v5 | 0.010452 ±0.00006 | pass 0.01045157 (n3 metrics.V5_ic50, entry 45) | pass 0.01045 via tolerance (n3, claim check 68) |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | pass 6.699555 (n2 metrics.30_B8_ic50, entry 38) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.06375493 (n3 metrics.V5_rse, entry 45) | differs 0.02645 (n3, claim check 68) |

### gowers2016-mdanalysis | ollama:qwen3:8b | run 1

Status: answer. 160 s. 11 requests, 5 tool calls (0 failed), 4 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-040151-7ea6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/gowers2016-mdanalysis/run1/home/sessions/20261009-040151-7ea6/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/gowers2016-mdanalysis/run1/home/sessions/20261009-040151-7ea6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 9) | pass 3341 via tolerance (n1, claim check 74) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 9) | pass 98 via tolerance (n3, claim check 74) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n2 metrics.rmsd_last, entry 19) | pass 6.82 via tolerance (n2, claim check 74) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n3 metrics.rg_last, entry 33) | pass 19.59 via tolerance (n3, claim check 74) |
| residues_chain_a | 214 exact | pass 214 (n4 metrics.residues_A, entry 43) | pass 214 via tolerance (n5, claim check 74) |
| residues_chain_b | 214 exact | pass 214 (n4 metrics.residues_A, entry 43) | pass 214 via tolerance (n5, claim check 74) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n5 metrics.rmsd_after_fit, entry 57) | pass 7.13 via tolerance (n5, claim check 74) |

### gramfort2013-mne-sample | ollama:qwen3:8b | run 1

Status: answer. 128 s. 7 requests, 4 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-040437-152d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/gramfort2013-mne-sample/run1/home/sessions/20261009-040437-152d/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/gramfort2013-mne-sample/run1/home/sessions/20261009-040437-152d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n1 metrics.n_events, entry 9) | not asked |
| events_id1 | 72 exact | pass 72 (n1 metrics.count_1, entry 9) | FAIL 0.1 (n10, claim check 92) |
| events_id2 | 73 exact | pass 73 (n1 metrics.count_2, entry 9) | FAIL 0.1 (n10, claim check 92) |
| events_id3 | 73 exact | pass 73 (n1 metrics.count_2, entry 9) | FAIL 0.1 (n10, claim check 92) |
| events_id4 | 70 exact | pass 70 (n1 metrics.count_4, entry 9) | FAIL 0.1 (n10, claim check 92) |
| events_id5 | 15 exact | pass 15 (n1 metrics.count_5, entry 9) | FAIL 0.1 (n10, claim check 92) |
| events_id32 | 16 exact | pass 16 (n1 metrics.count_32, entry 9) | FAIL 0.1 (n10, claim check 92) |
| epochs_dropped | 10 exact | pass 10 (n5 metrics.n_dropped, entry 55) | not asked |
| epochs_kept | 309 exact | pass 309 (n5 metrics.n_epochs, entry 55) | FAIL 0.1 (n10, claim check 92) |
| auditory_left_kept | 68 exact | pass 68 (n5 metrics.count_auditory_left, entry 55) | FAIL 0.1 (n10, claim check 92) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n10 metrics.gfp_latency_s, entry 85) | pass 0.1 via tolerance (n10, claim check 92) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.10613 (n10 metrics.gfp_amplitude, entry 85) | FAIL 0.1 (n10, claim check 92) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08 (n10 metrics.window_start_s, entry 85) | FAIL 0.1 (n10, claim check 92) |
| strongest_grad_amplitude | abs 199 ±8 | pass 203 (n10 metrics.n_channels, entry 85) | FAIL -161.12 (n10, claim check 92) |

### hackshaw1997-ets-lung-cancer | ollama:qwen3:8b | run 1

Status: answer. 279 s. 9 requests, 7 tool calls (9 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-040646-1a33. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261009-040646-1a33/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261009-040646-1a33/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 9) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n3 metrics.effect, entry 69) | pass 1.238 via tolerance (n3, claim check 82) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n3 metrics.effect_ci_lo, entry 69) | pass 1.129 via tolerance (n3, claim check 82) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n3 metrics.effect_ci_hi, entry 69) | pass 1.358 via tolerance (n3, claim check 82) |

### hildyard2021-embryo-refgenes | ollama:qwen3:8b | run 1

Status: answer. 183 s. 11 requests, 7 tool calls (5 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-041125-d65a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/hildyard2021-embryo-refgenes/run1/home/sessions/20261009-041125-d65a/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/hildyard2021-embryo-refgenes/run1/home/sessions/20261009-041125-d65a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 30) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 30) | FAIL - |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 30) | FAIL - |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 30) | FAIL - |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 30) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 30) | FAIL - |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 30) | FAIL - |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 30) | FAIL - |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 30) | FAIL - |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | FAIL 0.06863984 (n1 metrics.genorm_V2_3, entry 30) | FAIL - |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | FAIL 0.1831813 (n1 metrics.normfinder_PAK1IP1, entry 30) | FAIL - |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n2 metrics.genorm_best_pair_M, entry 45) | FAIL - |
| slope_gapdh | -3.4557 ±0.0006 | FAIL 0 (n1 metrics.n_samples_dropped, entry 30) | FAIL - |
| slope_htatsf1 | -3.1799 ±0.0006 | FAIL 0 (n1 metrics.n_samples_dropped, entry 30) | FAIL - |
| slope_ubc | -3.3788 ±0.0006 | FAIL 0 (n1 metrics.n_samples_dropped, entry 30) | FAIL - |
| efficiency_cyc1 | 1.945026 ±0.0005 | FAIL 2 (n1 table.rows[1][0], entry 30) | FAIL - |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | FAIL 2 (n1 table.rows[1][0], entry 30) | FAIL - |
| slope_actb_computed | -3.2993 ±0.0006 | FAIL 0 (n1 metrics.n_samples_dropped, entry 30) | FAIL - |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs 0 (n1 metrics.n_samples_dropped, entry 30) | differs - |

### jang2016-hcc-biomarkers | ollama:qwen3:8b | run 1

Status: answer. 559 s. 16 requests, 14 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-041428-da65. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/jang2016-hcc-biomarkers/run1/home/sessions/20261009-041428-da65/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/jang2016-hcc-biomarkers/run1/home/sessions/20261009-041428-da65/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 10) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 10) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 32) | pass 0.7856 via tolerance (n2, claim check 129) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 32) | pass 0.7404 via tolerance (n2, claim check 129) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 32) | pass 0.8309 via tolerance (n2, claim check 129) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 38) | pass 0.7294 via tolerance (n3, claim check 129) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 38) | pass 0.6799 via tolerance (n3, claim check 129) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 38) | pass 0.7789 via tolerance (n3, claim check 129) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 44) | pass 0.6596 via tolerance (n4, claim check 129) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 44) | pass 0.6061 via tolerance (n4, claim check 129) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 44) | pass 0.7131 via tolerance (n4, claim check 129) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 50) | pass 0.665 via tolerance (n5, claim check 129) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 50) | pass 0.612 via tolerance (n5, claim check 129) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 50) | pass 0.718 via tolerance (n5, claim check 129) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n9 metrics.sensitivity, entry 75) | pass 0.6202 via tolerance (n9, claim check 129) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n9 metrics.specificity, entry 75) | pass 0.9016 via tolerance (n9, claim check 129) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n11 metrics.sensitivity, entry 88) | pass 0.5096 via tolerance (n11, claim check 129) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n11 metrics.specificity, entry 88) | pass 0.9119 via tolerance (n11, claim check 129) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n13 metrics.sensitivity, entry 101) | pass 0.4615 via tolerance (n13, claim check 129) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n13 metrics.specificity, entry 101) | pass 0.8031 via tolerance (n13, claim check 129) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n15 metrics.sensitivity, entry 114) | pass 0.5 via tolerance (n15, claim check 129) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n15 metrics.specificity, entry 114) | pass 0.8083 via tolerance (n15, claim check 129) |

### kanetis2022-iqtree-sporocadaceae | ollama:qwen3:8b | run 1

Status: answer. 157 s. 5 requests, 3 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-042348-817e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261009-042348-817e/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261009-042348-817e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | FAIL -16151.58 (n2 metrics.log_likelihood, entry 15) | FAIL -16151.58 (n2, claim check 34) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.longest_input, entry 9) | FAIL 2352 (n2, claim check 34) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 9) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -16151.58 (n2 metrics.log_likelihood, entry 15) | not asked |

### kasurinen2018-mmp14-gastric | ollama:qwen3:8b | run 1

Status: answer. 332 s. 22 requests, 10 tool calls (4 failed), 10 nudges, 0 plan reminders, 8 unsourced.
Session: 20261009-042625-1243. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/kasurinen2018-mmp14-gastric/run1/home/sessions/20261009-042625-1243/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 8 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/kasurinen2018-mmp14-gastric/run1/home/sessions/20261009-042625-1243/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 9) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 16) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n2 table.rows[0][4], entry 16) | FAIL - |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n2 table.rows[1][4], entry 16) | FAIL - |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 16) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 16) | FAIL - |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 39) | FAIL - |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 39) | FAIL - |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 39) | FAIL - |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 39) | FAIL - |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 50) | FAIL - |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 50) | FAIL - |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 50) | FAIL - |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 50) | FAIL - |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 50) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 50) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 50) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 50) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 50) | not asked |
| hr_intestinal | 3.542 ±0.005 | FAIL 3.598528 (n4 table.rows[1][6], entry 50) | FAIL - |
| hr_intestinal_ci_lo | 1.507 ±0.005 | FAIL 1.501023 (n4 table.rows[5][5], entry 50) | FAIL - |
| hr_intestinal_ci_hi | 8.329 ±0.02 | FAIL 7.976084 (n4 table.rows[3][5], entry 50) | FAIL - |
| p_intestinal | 0.00374 ±0.0005 | FAIL 0.001672369 (n3 metrics.p_mmp14_high, entry 39) | FAIL - |
| hr_diffuse_type | 1.5355 ±0.005 | FAIL 1.548716 (n4 metrics.hr_mmp14_high, entry 50) | FAIL - |
| p_diffuse_type | 0.0711 ±0.001 | FAIL 0.05 (n3 data.data.alpha, entry 39) | FAIL - |

### klindworth2013-16s-primers | ollama:qwen3:8b | run 1

Status: answer. 191 s. 7 requests, 5 tool calls (2 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-043157-c9d0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/klindworth2013-16s-primers/run1/home/sessions/20261009-043157-c9d0/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/klindworth2013-16s-primers/run1/home/sessions/20261009-043157-c9d0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 9) | pass 1 via tolerance (n6, claim check 84) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 29) | pass 1608 via tolerance (n4, claim check 84) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 29) | pass 2072 via tolerance (n4, claim check 84) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 29) | pass 465 via tolerance (n4, claim check 84) |
| pair1_ecoli_position | 341 exact | FAIL 465 (n4 metrics.product_bp, entry 29) | FAIL 465 (n4, claim check 84) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 9) | pass 1 via tolerance (n6, claim check 84) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 36) | pass 1275 via tolerance (n5, claim check 84) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 36) | pass 2193 via tolerance (n5, claim check 84) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 36) | pass 919 via tolerance (n5, claim check 84) |
| pair2_ecoli_position | 8 exact | FAIL 2 (n4 metrics.n_binding_sites, entry 29) | FAIL 2 (n5, claim check 84) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 66) | pass 61.39 via tolerance (n6, claim check 84) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 29) | not asked |

### korsunsky2019-harmony | ollama:qwen3:8b | run 1

Status: answer. 666 s. 20 requests, 18 tool calls (5 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-043508-838f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/korsunsky2019-harmony/run1/home/sessions/20261009-043508-838f/log.jsonl
Leak check: 16 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/korsunsky2019-harmony/run1/home/sessions/20261009-043508-838f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.006138 (n19 table.rows[2][4], entry 184) | FAIL 1.21 (n19, claim check 204) |
| ilisi_after | 1.59 ±0.1 | pass 1.528935 (n19 metrics.q75, entry 184) | FAIL 1.78 (n20, claim check 204) |
| clisi_before | 1 ±0.02 | pass 1 (n19 metrics.q05, entry 184) | pass 1 via tolerance (n20, claim check 204) |
| clisi_after | 1 ±0.02 | pass 1 (n19 metrics.q05, entry 184) | pass 1 via tolerance (n20, claim check 204) |
| jurkat_pure_cells_after_qc | 3255 exact | FAIL - | pass 3255 via tolerance (n20, claim check 204) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs - | differs 2885 (n20, claim check 204) |
| mix_jurkat_cells (reference) | 1799 exact | differs - | differs 2885 (n20, claim check 204) |
| mix_t293_cells (reference) | 1565 exact | differs - | differs 2885 (n20, claim check 204) |

### lackey2015-tb-default | ollama:qwen3:8b | run 1

Status: answer. 214 s. 13 requests, 11 tool calls (7 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-044630-8f98. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/lackey2015-tb-default/run1/home/sessions/20261009-044630-8f98/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/lackey2015-tb-default/run1/home/sessions/20261009-044630-8f98/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 9) | not asked |
| defaulted | 127 exact | pass 127 (n4 metrics.events, entry 95) | not asked |
| p_age | 0.00604 ±0.0002 | FAIL 0.007700489 (n4 metrics.p_bmi_Underweight, entry 95) | FAIL 0.0077 (n4, claim check 104) |
| p_sex | 0.0000395 ±0.000005 | pass 0.0000397635 (n2 metrics.p_value, entry 34) | FAIL 8.38e-12 (n4, claim check 104) |
| p_marital | 0.6815 ±0.001 | FAIL 0.707159 (n4 metrics.p_bmi_Overweight_Obese, entry 95) | FAIL 0.707 (n4, claim check 104) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03445384 (n3 metrics.p_value, entry 45) | FAIL 0.0349 (n4, claim check 104) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n4 metrics.or_drug_use_Yes, entry 95) | pass 4.78 via tolerance (n4, claim check 104) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n4 metrics.or_lo_drug_use_Yes, entry 95) | pass 3.05 via tolerance (n4, claim check 104) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n4 metrics.or_hi_drug_use_Yes, entry 95) | pass 7.49 via tolerance (n4, claim check 104) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n4 metrics.or_bmi_Underweight, entry 95) | pass 2.08 via tolerance (n4, claim check 104) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n4 metrics.or_lo_bmi_Underweight, entry 95) | pass 1.21 via tolerance (n4, claim check 104) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n4 metrics.or_hi_bmi_Underweight, entry 95) | pass 3.56 via tolerance (n4, claim check 104) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n4 metrics.or_bmi_Overweight_Obese, entry 95) | pass 0.88 via tolerance (n4, claim check 104) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n4 metrics.or_lo_bmi_Overweight_Obese, entry 95) | pass 0.44 via tolerance (n4, claim check 104) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n4 metrics.or_hi_bmi_Overweight_Obese, entry 95) | pass 1.73 via tolerance (n4, claim check 104) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n4 metrics.or_mdr_tb_Yes, entry 95) | pass 3.04 via tolerance (n4, claim check 104) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n4 metrics.or_lo_mdr_tb_Yes, entry 95) | pass 1.58 via tolerance (n4, claim check 104) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n4 metrics.or_hi_mdr_tb_Yes, entry 95) | pass 5.85 via tolerance (n4, claim check 104) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n4 metrics.or_alcohol_weekly_Yes, entry 95) | pass 2.22 via tolerance (n4, claim check 104) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n4 metrics.or_lo_alcohol_weekly_Yes, entry 95) | pass 1.4 via tolerance (n4, claim check 104) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n4 metrics.or_hi_alcohol_weekly_Yes, entry 95) | FAIL 3.53 (n4, claim check 104) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n4 metrics.or_hiv_status_Test_not_done, entry 95) | pass 2.3 via tolerance (n4, claim check 104) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n4 metrics.or_lo_hiv_status_Test_not_done, entry 95) | pass 1.5 via tolerance (n4, claim check 104) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n4 metrics.or_hi_hiv_status_Test_not_done, entry 95) | pass 3.54 via tolerance (n4, claim check 104) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n4 metrics.or_hiv_status_Positive, entry 95) | pass 1.39 via tolerance (n4, claim check 104) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n4 metrics.or_lo_hiv_status_Positive, entry 95) | pass 0.42 via tolerance (n4, claim check 104) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n4 metrics.or_hi_hiv_status_Positive, entry 95) | pass 4.65 via tolerance (n4, claim check 104) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n4 metrics.or_secondary_education_No, entry 95) | pass 1.55 via tolerance (n4, claim check 104) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n4 metrics.or_lo_secondary_education_No, entry 95) | pass 1.03 via tolerance (n4, claim check 104) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n4 metrics.or_hi_secondary_education_No, entry 95) | pass 2.33 via tolerance (n4, claim check 104) |

### lazear2023-sage | ollama:qwen3:8b | run 1

Status: answer. 117 s. 6 requests, 3 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-045004-24b9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/lazear2023-sage/run1/home/sessions/20261009-045004-24b9/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/lazear2023-sage/run1/home/sessions/20261009-045004-24b9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 14) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 14) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 20) | pass 207 via tolerance (n3, claim check 41) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 20) | pass 47 via tolerance (n3, claim check 41) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 20) | not asked |
| target_psms_fdr5 | 242 exact | FAIL 260 (n1 metrics.n_target_psm, entry 14) | FAIL 260 (n1, claim check 41) |

### li2009-samtools | ollama:qwen3:8b | run 1

Status: answer. 73 s. 7 requests, 5 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-045201-cbde. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/li2009-samtools/run1/home/sessions/20261009-045201-cbde/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/li2009-samtools/run1/home/sessions/20261009-045201-cbde/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 10) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 28) | pass 3271 via tolerance (n4, claim check 65) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 28) | pass 3144 via tolerance (n4, claim check 65) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 28) | not asked |
| reads_seq1 | 1482 exact | FAIL 1653 (n4 metrics.read2, entry 28) | not asked |
| reads_seq2 | 1789 exact | FAIL 1654 (n4 metrics.read1, entry 28) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n9 metrics.count, entry 58) | pass 79 via tolerance (n9, claim check 65) |

### liao2025-scanpy-bone-marrow | ollama:qwen3:8b | run 1

Status: answer. 110 s. 9 requests, 7 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-045315-99b2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/liao2025-scanpy-bone-marrow/run1/home/sessions/20261009-045315-99b2/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/liao2025-scanpy-bone-marrow/run1/home/sessions/20261009-045315-99b2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 9) | pass 10608 via tolerance (n6, claim check 65) |
| chase_cells_loaded | 10046 exact | pass 10046 (n3 metrics.n_cells, entry 21) | pass 10046 via tolerance (n7, claim check 65) |
| pulse_cells_after_qc | 9612 exact | FAIL 10046 (n3 metrics.n_cells, entry 21) | FAIL 10046 (n7, claim check 65) |
| chase_cells_after_qc | 8887 exact | FAIL 8330 (n7 metrics.max_genes_per_cell, entry 54) | FAIL 10046 (n7, claim check 65) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 9) | not asked |

### ljosa2012-bbbc005 | ollama:qwen3:8b | run 1

Status: answer. 722 s. 18 requests, 7 tool calls (0 failed), 8 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-045509-d2f8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/ljosa2012-bbbc005/run1/home/sessions/20261009-045509-d2f8/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/ljosa2012-bbbc005/run1/home/sessions/20261009-045509-d2f8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9399 (n10 metrics.detected_to_true_ratio, entry 59) | pass 0.94 via tolerance (n10, claim check 142) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n10 metrics.mean_abs_error, entry 59) | pass 3.01 via tolerance (n10, claim check 142) |
| true_total_sample | 5007 exact | pass 5007 (n10 metrics.true_total, entry 59) | not asked |

### love2014-deseq2-airway | ollama:qwen3:8b | run 1

Status: answer. 712 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050717-9672. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/love2014-deseq2-airway/run1/home/sessions/20261009-050717-9672/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/love2014-deseq2-airway/run1/home/sessions/20261009-050717-9672/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 45) | pass 16637 via tolerance (n7, claim check 68) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 45) | pass 4381 via tolerance (n7, claim check 68) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 45) | pass 2362 via tolerance (n7, claim check 68) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 45) | pass 2019 via tolerance (n7, claim check 68) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 36) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 45) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 45) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 51) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 45) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 45) | not asked |

### mahbod2024-nuinsseg | ollama:qwen3:8b | run 1

Status: answer. 209 s. 5 requests, 3 tool calls (9 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051909-16c3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/mahbod2024-nuinsseg/run1/home/sessions/20261009-051909-16c3/log.jsonl
Leak check: 2 paths read, 1 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/mahbod2024-nuinsseg/run1/home/sessions/20261009-051909-16c3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n2 metrics.mean_dice, entry 41) | pass 0.538 via tolerance (n2, claim check 55) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 9) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n2 metrics.total_truth, entry 41) | not asked |

### makrai2023-colonies | ollama:qwen3:8b | run 1

Status: answer. 425 s. 20 requests, 10 tool calls (11 failed), 8 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-052239-b95c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/makrai2023-colonies/run1/home/sessions/20261009-052239-b95c/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/makrai2023-colonies/run1/home/sessions/20261009-052239-b95c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n1 metrics.n_images, entry 122) | not asked |
| total_colonies | 88 ±9 | pass 88 (n1 metrics.total_colonies, entry 122) | pass 88 via tolerance (n1, claim check 137) |

### manders1993-coloc | ollama:qwen3:8b | run 1

Status: answer. 552 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-052945-9d6a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/manders1993-coloc/run1/home/sessions/20261009-052945-9d6a/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/manders1993-coloc/run1/home/sessions/20261009-052945-9d6a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n1 metrics.pearson_r, entry 19) | pass 0.721 via tolerance (n1, claim check 47) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n2 metrics.pearson_r, entry 26) | pass 0.443 via tolerance (n2, claim check 47) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n3 metrics.pearson_r, entry 33) | pass 0.164 via tolerance (n3, claim check 47) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n1 metrics.manders_m1, entry 19) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n2 metrics.manders_m1, entry 26) | pass 0.5 via tolerance (n2, claim check 47) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n3 metrics.manders_m1, entry 33) | pass 0.25 via tolerance (n3, claim check 47) |

### minh2020-iqtree2 | ollama:qwen3:8b | run 1

Status: answer. 150 s. 4 requests, 2 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-053857-157c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/minh2020-iqtree2/run1/home/sessions/20261009-053857-157c/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/minh2020-iqtree2/run1/home/sessions/20261009-053857-157c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 14) | pass -21152.54 via tolerance (n1, claim check 29) |

### nair2024-plasmid-growth | ollama:qwen3:8b | run 1

Status: timeout. 1801 s. 25 requests, 14 tool calls (12 failed), 11 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-054128-e947. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/nair2024-plasmid-growth/run1/home/sessions/20261009-054128-e947/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/nair2024-plasmid-growth/run1/home/sessions/20261009-054128-e947/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 38) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 38) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 38) | not asked |
| rel_p1 | 1.005299 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 38) | FAIL - |
| rel_p2 | 1.027756 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 38) | FAIL - |
| rel_p3 | 1.032948 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 38) | FAIL - |
| rel_p4 | 0.965689 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 38) | FAIL - |
| rel_p5 | 1.072459 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 38) | FAIL - |
| rel_p6 | 1.008294 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 38) | FAIL - |
| rel_p7 | 0.961198 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 38) | FAIL - |
| rel_p8 | 0.97545 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 38) | FAIL - |
| rel_p9 | 1.042573 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 38) | FAIL - |
| rel_p10 | 0.990162 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 38) | FAIL - |
| rel_p11 | 0.946554 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 38) | FAIL - |
| rel_p14 | 1.082055 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 38) | FAIL - |
| ci_low_p11 | 0.742365 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 38) | FAIL - |
| ci_high_p11 | 1.150742 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 38) | FAIL - |
| p_p5 | 0.243208 ±0.0005 | FAIL 0.2881358 (n3 metrics.r_W36, entry 38) | FAIL - |
| p_p11 | 0.507637 ±0.0005 | pass 0.5074041 (n3 metrics.k_W45, entry 38) | FAIL - |
| mean_of_means | 1.009203 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 38) | FAIL - |
| mean_printed (reference) | 0.996 ±0.0005 | differs 0.5683573 (n3 metrics.k_W01, entry 38) | differs - |

### oksanen-vegan-dune | ollama:qwen3:8b | run 1

Status: answer. 292 s. 9 requests, 5 tool calls (0 failed), 3 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061128-6208. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/oksanen-vegan-dune/run1/home/sessions/20261009-061128-6208/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/oksanen-vegan-dune/run1/home/sessions/20261009-061128-6208/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 24) | pass 1.44 via tolerance (n2, claim check 96) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 87) | pass 0.118 via tolerance (n10, claim check 96) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 56) | pass 0.34 via rounding (n6, claim check 96) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 56) | pass 2.77 via tolerance (n6, claim check 96) |
| permanova_p | 0.003 ±0.003 | pass 0.005 (n6 metrics.p, entry 56) | pass 0.005 via tolerance (n6, claim check 96) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 66) | not asked |

### oreshkova2024-qmp-honeybee | ollama:qwen3:8b | run 1

Status: answer. 468 s. 12 requests, 8 tool calls (1 failed), 0 nudges, 2 plan reminders, 2 unsourced.
Session: 20261009-061621-7549. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/oreshkova2024-qmp-honeybee/run1/home/sessions/20261009-061621-7549/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/oreshkova2024-qmp-honeybee/run1/home/sessions/20261009-061621-7549/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 44) | pass 35.69 via rounding (n6, claim check 106) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 44) | pass 0.0316 via tolerance (n6, claim check 106) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 44) | pass 36 via tolerance (n5, claim check 106) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 44) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 44) | pass 0.8596 via tolerance (n5, claim check 106) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 44) | pass 1.057 via tolerance (n4, claim check 106) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 44) | pass 2.809 via tolerance (n6, claim check 106) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 44) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 57) | pass 27.78 via tolerance (n7, claim check 106) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 57) | pass 29.16 via rounding (n7, claim check 106) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 57) | pass 6.853 via tolerance (n7, claim check 106) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 57) | pass 0.0021 via tolerance (n7, claim check 106) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 57) | pass 4.457 via tolerance (n7, claim check 106) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n7 metrics.p_Age_x_Treatment_x_Replicate, entry 57) | pass 0.0157 via rounding (n7, claim check 106) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n8 metrics.H, entry 67) | pass 9.35 via rounding (n8, claim check 106) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 15) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n8 metrics.p_value, entry 67) | pass 0.025 via rounding (n8, claim check 106) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n8 metrics.min_p_adjusted, entry 67) | pass 0.0397 via tolerance (n8, claim check 106) |
| fas_replicate_chi2 | 23.87 ±0.005 | FAIL 25.44444 (n8 table.rows[1][3], entry 67) | FAIL 27.78 (n7, claim check 106) |

### palmer2017-metaspace-fdr | ollama:qwen3:8b | run 1

Status: answer. 103 s. 8 requests, 6 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062409-26f5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/palmer2017-metaspace-fdr/run1/home/sessions/20261009-062409-26f5/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/palmer2017-metaspace-fdr/run1/home/sessions/20261009-062409-26f5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs 10 (n2, claim check 64) |
| unique_formulas_three_sections (reference) | 66 exact | differs 61 (n3 metrics.n_databases, entry 27) | not asked |
| total_formulas (reference) | 103 ±20 | differs 61 (n3 metrics.n_databases, entry 27) | not asked |

### quinlan2010-bedtools | ollama:qwen3:8b | run 1

Status: answer. 44 s. 4 requests, 2 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062552-2171. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/quinlan2010-bedtools/run1/home/sessions/20261009-062552-2171/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/quinlan2010-bedtools/run1/home/sessions/20261009-062552-2171/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 10) | pass 126 via tolerance (n1, claim check 28) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 10) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 10) | pass 33713 via tolerance (n1, claim check 28) |
| merged_intervals | 11270 exact | pass 11270 (n2 metrics.n_merged, entry 20) | pass 11270 via tolerance (n2, claim check 28) |

### rees2019-uptake | ollama:qwen3:8b | run 1

Status: answer. 482 s. 4 requests, 3 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062636-9f52. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/rees2019-uptake/run1/home/sessions/20261009-062636-9f52/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/rees2019-uptake/run1/home/sessions/20261009-062636-9f52/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n4 metrics.n_images, entry 75) | not asked |
| nuclei | 582 ±35 | pass 566 (n4 metrics.total_nuclei, entry 75) | pass 566 via tolerance (n4, claim check 84) |
| vesicles | 461 ±35 | pass 459 (n4 metrics.total_cells, entry 75) | pass 448 via tolerance (n4, claim check 84) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n4 table.rows[1][5], entry 75) | pass 0.769 via tolerance (n4, claim check 84) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.46512 (n4 table.rows[1][3], entry 75) | pass 0.501 via tolerance (n4, claim check 84) |
| cells (reference) | 572 ±35 | match 566 (n4 metrics.total_nuclei, entry 75) | match 566 via tolerance (n4, claim check 84) |

### rossi1980-recidivism | ollama:qwen3:8b | run 1

Status: answer. 252 s. 9 requests, 6 tool calls (2 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063438-a995. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/rossi1980-recidivism/run1/home/sessions/20261009-063438-a995/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/rossi1980-recidivism/run1/home/sessions/20261009-063438-a995/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 9) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 55) | not asked |
| coef_fin | -0.3794 ±0.0005 | FAIL -0.3787611 (n2 metrics.coef_mar_1, entry 55) | not asked |
| coef_age | -0.0574 ±0.0005 | FAIL -0.09559877 (n2 metrics.coef_wexp_1, entry 55) | not asked |
| coef_prio | 0.0915 ±0.0005 | FAIL 0.09361026 (n2 metrics.or_lo_age_20, entry 55) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6838638 (n2 metrics.p_age_35, entry 55) | FAIL 0.6486 (n2, claim check 78) |
| p_fin | 0.0474 ±0.001 | pass 0.04688014 (n2 metrics.or_lo_age_29, entry 55) | FAIL 0.05 (n2, claim check 78) |
| concordance | 0.64 ±0.005 | pass 0.640955 (n2 metrics.p_race_1, entry 55) | FAIL 0.6486 (n2, claim check 78) |
| logrank_chi2_fin | 3.838 ±0.01 | FAIL 3.820604 (n2 metrics.or_hi_age_29, entry 55) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05 (n2 data.data.alpha, entry 55) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | FAIL 7.076249e-10 (n2 metrics.or_prio_15, entry 55) | FAIL 0.008577 (n2, claim check 78) |

### rost2016-openms | ollama:qwen3:8b | run 1

Status: answer. 108 s. 4 requests, 2 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063850-0649. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/rost2016-openms/run1/home/sessions/20261009-063850-0649/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/rost2016-openms/run1/home/sessions/20261009-063850-0649/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 9) | FAIL 1887 (n8, claim check 67) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 9) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 57) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 57) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 57) | pass 1887 via tolerance (n8, claim check 67) |

### rouault-gdal-autotest | ollama:qwen3:8b | run 1

Status: answer. 32 s. 2 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-064039-05ab. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/rouault-gdal-autotest/run1/home/sessions/20261009-064039-05ab/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/rouault-gdal-autotest/run1/home/sessions/20261009-064039-05ab/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| width | 20 exact | pass 20 (n1 metrics.width, entry 9) | pass 20 via tolerance (n1, claim check 16) |
| height | 20 exact | pass 20 (n1 metrics.width, entry 9) | pass 20 via tolerance (n1, claim check 16) |
| epsg | 26711 exact | pass 26711 (n1 metrics.epsg, entry 9) | pass 26711 via code |
| pixel_size_m | 60 exact | pass 60 (n1 metrics.pixel_x, entry 9) | pass 60 via tolerance (n1, claim check 16) |
| band_min | 74 exact | pass 74 (n1 metrics.min, entry 9) | pass 74 via tolerance (n1, claim check 16) |
| band_max | 255 exact | pass 255 (n1 metrics.max, entry 9) | pass 255 via tolerance (n1, claim check 16) |
| band_mean | 126.765 ±0.01 | pass 126.765 (n1 metrics.mean, entry 9) | pass 126.765 via tolerance (n1, claim check 16) |
| band_std | 22.93 ±0.05 | pass 22.928 (n1 metrics.stddev, entry 9) | pass 22.928 via tolerance (n1, claim check 16) |
| warp_width | 22 exact | FAIL 22.928 (n1 metrics.stddev, entry 9) | FAIL 22.928 (n1, claim check 16) |
| warp_height | 18 exact | FAIL 20 (n1 metrics.width, entry 9) | FAIL 20 (n1, claim check 16) |
| zone_a_pixels | 100 exact | FAIL 74 (n1 metrics.min, entry 9) | FAIL 74 (n1, claim check 16) |
| zone_a_mean | 129.5 ±0.01 | FAIL 126.765 (n1 metrics.mean, entry 9) | FAIL 126.765 (n1, claim check 16) |
| zone_b_pixels_centers | 42 exact | FAIL 60 (n1 metrics.pixel_x, entry 9) | FAIL 60 (n1, claim check 16) |
| zone_b_mean_centers | 135 ±0.01 | FAIL 126.765 (n1 metrics.mean, entry 9) | FAIL 126.765 (n1, claim check 16) |

### schindelin2012-fiji-blobs | ollama:qwen3:8b | run 1

Status: answer. 62 s. 3 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-064112-e048. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/schindelin2012-fiji-blobs/run1/home/sessions/20261009-064112-e048/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/schindelin2012-fiji-blobs/run1/home/sessions/20261009-064112-e048/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 42) | pass 64 via tolerance (n10, claim check 52) |

### schramm2012-imzml-pyimzml | ollama:qwen3:8b | run 1

Status: answer. 51 s. 5 requests, 3 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-064215-c20b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/schramm2012-imzml-pyimzml/run1/home/sessions/20261009-064215-c20b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/schramm2012-imzml-pyimzml/run1/home/sessions/20261009-064215-c20b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 9) | pass 9 via tolerance (n3, claim check 32) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 9) | pass 100.083 via rounding (n2, claim check 32) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 9) | pass 799.917 via rounding (n2, claim check 32) |
| max_pixel_tic | 243.5395 ±0.001 | FAIL 100.0833 (n1 metrics.mz_min, entry 9) | FAIL 100.083 (n2, claim check 32) |
| mean_tic | 161.1444 ±0.001 | FAIL 100.0833 (n1 metrics.mz_min, entry 9) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 9) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 15) | not asked |

### sriphoosanaphan2021-sample-size | ollama:qwen3:8b | run 1

Status: answer. 46 s. 3 requests, 1 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-064306-865d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/sriphoosanaphan2021-sample-size/run1/home/sessions/20261009-064306-865d/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/sriphoosanaphan2021-sample-size/run1/home/sessions/20261009-064306-865d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 10) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 10) | pass 30 via tolerance (n1, claim check 23) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 10) | pass 60 via tolerance (n1, claim check 23) |

### sriphoosanaphan2021-vitd-hcv | ollama:qwen3:8b | run 1

Status: answer. 85 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-064352-8abc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-064352-8abc/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-064352-8abc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n2 metrics.n_b, entry 29) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 29) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 29) | pass 23.09 via tolerance (n2, claim check 44) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 29) | pass 19.73 via tolerance (n2, claim check 44) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 29) | pass 26.44 via tolerance (n2, claim check 44) |
| tgf_diff | -0.554 ±0.005 | FAIL 0 (n1 table.rows[0][2], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| tgf_ci_lo | -2.839 ±0.005 | FAIL 0 (n1 table.rows[0][2], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| tgf_ci_hi | 1.731 ±0.005 | FAIL 1.497368 (n2 metrics.mean_a, entry 29) | FAIL 6.62e-22 (n1, claim check 44) |
| tgf_p | 0.6302 ±0.001 | FAIL 0.64 (n1 table.rows[7][4], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| timp_diff | -5.51 ±0.01 | FAIL 0 (n1 table.rows[0][2], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| timp_ci_lo | -26.361 ±0.01 | FAIL 0 (n1 table.rows[0][2], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| timp_ci_hi | 15.341 ±0.01 | FAIL 16.38 (n1 table.rows[6][4], entry 9) | FAIL 19.73 (n2, claim check 44) |
| timp_p | 0.6 ±0.001 | FAIL 0.64 (n1 table.rows[7][4], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| mmp_diff | 122.92 ±0.05 | FAIL 103 (n1 table.rows[4][5], entry 9) | FAIL 26.44 (n2, claim check 44) |
| mmp_ci_lo | -68.96 ±0.05 | FAIL 0 (n1 table.rows[0][2], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| mmp_ci_hi | 314.81 ±0.05 | FAIL 357 (n1 table.rows[12][5], entry 9) | FAIL 26.44 (n2, claim check 44) |
| mmp_p | 0.2058 ±0.001 | FAIL 0.14 (n1 table.rows[8][4], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| p3np_diff | -0.11 ±0.005 | FAIL 0 (n1 table.rows[0][2], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| p3np_ci_lo | -2.372 ±0.005 | FAIL 0 (n1 table.rows[0][2], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| p3np_ci_hi | 2.151 ±0.005 | FAIL 2 (n1 table.rows[1][3], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |
| p3np_p | 0.9228 ±0.001 | FAIL 1 (n1 table.rows[0][4], entry 9) | FAIL 6.62e-22 (n1, claim check 44) |

### student1908-sleep | ollama:qwen3:8b | run 1

Status: answer. 55 s. 3 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-064517-4311. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/student1908-sleep/run1/home/sessions/20261009-064517-4311/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/student1908-sleep/run1/home/sessions/20261009-064517-4311/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 29) | pass 1.58 via tolerance (n2, claim check 36) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 29) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 29) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 29) | pass 0.0028 via tolerance (n2, claim check 36) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 29) | pass 0.7 via tolerance (n2, claim check 36) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 29) | pass 2.46 via tolerance (n2, claim check 36) |

### wang2023-cuproptosis-oa | ollama:qwen3:8b | run 1

Status: answer. 252 s. 9 requests, 5 tool calls (7 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-064612-409b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/wang2023-cuproptosis-oa/run1/home/sessions/20261009-064612-409b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/wang2023-cuproptosis-oa/run1/home/sessions/20261009-064612-409b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n2 metrics.top_overlap, entry 67) | pass 3 via tolerance (n2, claim check 106) |
| set_size_1 | 1578 exact | pass 1578 (n2 metrics.top_set_size, entry 67) | pass 1578 via tolerance (n2, claim check 106) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n2 metrics.top_p_value, entry 67) | pass 0.00185 via rounding (n2, claim check 106) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n2 metrics.top_p_adjusted, entry 67) | pass 0.112 via rounding (n2, claim check 106) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n2 metrics.top_odds_ratio, entry 67) | pass 35.09 via rounding (n2, claim check 106) |
| set_size_2 | 24 exact | pass 24 (n2 metrics.set_size_2, entry 67) | pass 24 via tolerance (n2, claim check 106) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n2 metrics.p_value_2, entry 67) | pass 0.0048 via rounding (n2, claim check 106) |
| set_size_3 | 30 exact | pass 30 (n2 metrics.set_size_3, entry 67) | pass 30 via tolerance (n2, claim check 106) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n2 metrics.p_value_3, entry 67) | pass 0.006 via rounding (n2, claim check 106) |
| set_size_4 | 649 exact | pass 649 (n2 metrics.set_size_4, entry 67) | pass 649 via tolerance (n2, claim check 106) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n2 metrics.p_value_4, entry 67) | pass 0.006 via rounding (n2, claim check 106) |
| set_size_5 | 37 exact | pass 37 (n2 metrics.set_size_5, entry 67) | pass 37 via tolerance (n2, claim check 106) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n2 metrics.p_value_5, entry 67) | pass 0.0074 via rounding (n2, claim check 106) |
| n_sets_tested | 4026 exact | pass 4026 (n2 metrics.n_sets_tested, entry 67) | not asked |

### weber2023-nnsvg-dlpfc | ollama:qwen3:8b | run 1

Status: answer. 132 s. 7 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-065025-b550. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/weber2023-nnsvg-dlpfc/run1/home/sessions/20261009-065025-b550/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/weber2023-nnsvg-dlpfc/run1/home/sessions/20261009-065025-b550/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 9) | pass 3639 via tolerance (n8, claim check 79) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_genes, entry 68) | pass 2 via tolerance (n8, claim check 79) |
| mobp_rank | 4 ±2 | pass 2 (n8 metrics.n_genes, entry 68) | pass 2 via tolerance (n8, claim check 79) |
| snap25_rank | 19 ±3 | FAIL 2 (n8 metrics.n_genes, entry 68) | FAIL 2 (n8, claim check 79) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 31) | differs 3309 (n3, claim check 79) |

### white2021-flowkit | ollama:qwen3:8b | run 1

Status: answer. 141 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-065238-6f68. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/white2021-flowkit/run1/home/sessions/20261009-065238-6f68/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/white2021-flowkit/run1/home/sessions/20261009-065238-6f68/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 9) | pass 290172 via tolerance (n3, claim check 44) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 29) | pass 133670 via tolerance (n3, claim check 44) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 29) | FAIL 133670 (n3, claim check 44) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 29) | pass 82484 via tolerance (n3, claim check 44) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 29) | FAIL 82484 (n3, claim check 44) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 29) | pass 47165 via tolerance (n3, claim check 44) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 29) | FAIL 47165 (n3, claim check 44) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 29) | not asked |
| cd3_no_compensation | 135381 exact | FAIL 133860 (n3 table.rows[3][6], entry 29) | FAIL 133670 (n3, claim check 44) |
| cd4_no_compensation | 85369 exact | FAIL 82636 (n3 table.rows[4][6], entry 29) | FAIL 82484 (n3, claim check 44) |
| cd8_no_compensation | 47694 exact | FAIL 47241 (n3 table.rows[5][6], entry 29) | FAIL 47165 (n3, claim check 44) |
| cd8_ifng_no_compensation | 672 exact | FAIL 690 (n3 metrics.max_abs_diff_vs_flowjo, entry 29) | not asked |

### wolf2018-scanpy | ollama:qwen3:8b | run 1

Status: answer. 903 s. 14 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-065501-3a08. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/wolf2018-scanpy/run1/home/sessions/20261009-065501-3a08/log.jsonl
Leak check: 12 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/wolf2018-scanpy/run1/home/sessions/20261009-065501-3a08/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 9) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 9) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n3 metrics.n_genes_after, entry 25) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 47) | pass 2638 via tolerance (n16, claim check 151) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 67) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 131) | pass 7 via tolerance (n17, claim check 151) |

### yun2026-lasv-elisa | ollama:qwen3:8b | run 1

Status: answer. 328 s. 4 requests, 2 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071007-abee. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/yun2026-lasv-elisa/run1/home/sessions/20261009-071007-abee/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/yun2026-lasv-elisa/run1/home/sessions/20261009-071007-abee/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n1 metrics.n_plates, entry 44) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n1 metrics.mean_conc_STD_1, entry 44) | pass 7.587 via tolerance (n1, claim check 62) |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n1 metrics.mean_conc_STD_2, entry 44) | pass 3.707 via tolerance (n1, claim check 62) |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n1 metrics.mean_conc_STD_3, entry 44) | pass 1.872 via tolerance (n1, claim check 62) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n1 metrics.mean_conc_STD_4, entry 44) | pass 0.9171 via tolerance (n1, claim check 62) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n1 metrics.mean_conc_STD_5, entry 44) | pass 0.4637 via tolerance (n1, claim check 62) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334023 (n1 metrics.mean_conc_STD_6, entry 44) | pass 0.2334 via tolerance (n1, claim check 62) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n1 metrics.mean_conc_STD_7, entry 44) | pass 0.1205 via tolerance (n1, claim check 62) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n1 metrics.mean_conc_STD_8, entry 44) | pass 0.05579 via tolerance (n1, claim check 62) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n1 metrics.mean_conc_STD_9, entry 44) | pass 0.02661 via tolerance (n1, claim check 62) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n1 metrics.mean_conc_STD_10, entry 44) | pass 0.01388 via tolerance (n1, claim check 62) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07001 (n1 metrics.cv_conc_pct_STD_1, entry 44) | pass 11.07 via tolerance (n1, claim check 62) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n1 metrics.cv_conc_pct_STD_4, entry 44) | pass 10.93 via tolerance (n1, claim check 62) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n1 metrics.cv_conc_pct_STD_7, entry 44) | pass 15.71 via tolerance (n1, claim check 62) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n1 metrics.cv_conc_pct_STD_8, entry 44) | pass 15.55 via tolerance (n1, claim check 62) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n1 metrics.cv_conc_pct_STD_9, entry 44) | pass 25.89 via tolerance (n1, claim check 62) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n1 table.rows[9][6], entry 44) | FAIL 22.45 (n1, claim check 62) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n1 table.rows[10][6], entry 44) | FAIL 25.89 (n1, claim check 62) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.886722 (n1 table.rows[3][5], entry 44) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97182 (n1 metrics.recovery_pct_STD_1, entry 44) | pass 97.97 via tolerance (n1, claim check 62) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n1 metrics.recovery_pct_STD_4, entry 44) | pass 94.74 via tolerance (n1, claim check 62) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n1 metrics.recovery_pct_STD_7, entry 44) | pass 99.55 via tolerance (n1, claim check 62) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71061 (n1 metrics.recovery_pct_STD_9, entry 44) | pass 88.71 via tolerance (n1, claim check 62) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n1 metrics.recovery_pct_STD_10, entry 44) | differs 92.56 (n1, claim check 62) |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n1 metrics.mean_conc_HPC, entry 44) | pass 1.993 via tolerance (n1, claim check 62) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n1 metrics.cv_conc_pct_HPC, entry 44) | pass 22.45 via tolerance (n1, claim check 62) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n1 metrics.recovery_pct_HPC, entry 44) | pass 107.3 via tolerance (n1, claim check 62) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n1 metrics.mean_conc_LPC, entry 44) | pass 0.4569 via tolerance (n1, claim check 62) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n1 metrics.recovery_pct_LPC, entry 44) | pass 98.25 via tolerance (n1, claim check 62) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.02798 (n1 metrics.cv_conc_pct_LPC, entry 44) | differs 20.03 (n1, claim check 62) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n1 metrics.series_lloq_sample, entry 44) | pass 0.1205 via tolerance (n1, claim check 62) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n1 metrics.series_uloq_sample, entry 44) | FAIL 7.587 (n1, claim check 62) |

