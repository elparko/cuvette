# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 186/186 | 132/132 | 21 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| bates2015-lme4-sleepstudy | 27/27 / 21/21 |
| danecek2021-bcftools | 18/18 / 15/15 |
| jang2016-hcc-biomarkers | 66/66 / 60/60 |
| li2009-samtools | 21/21 / 9/9 |
| minh2020-iqtree2 | 3/3 / 3/3 |
| rossi1980-recidivism | 33/33 / 12/12 |
| student1908-sleep | 18/18 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 21 | 2084 | 174 | 442 | 122488 | 2626780 | 207 | 3 | 3 | 2 | 18 | 78 | 32 | 13 | 8 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $5.37 for 21 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bates2015-lme4-sleepstudy | claude:claude-opus-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-opus-5-5 | 2 | on | 3 | 0 | 0 | 1 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-opus-5-5 | 3 | on | 3 | 0 | 0 | 2 | 0 |
| danecek2021-bcftools | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| danecek2021-bcftools | claude:claude-opus-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| danecek2021-bcftools | claude:claude-opus-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-opus-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-opus-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-opus-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-opus-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-opus-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| minh2020-iqtree2 | claude:claude-opus-5-5 | 1 | on | 3 | 0 | 0 | 1 | 0 |
| minh2020-iqtree2 | claude:claude-opus-5-5 | 2 | on | 3 | 0 | 0 | 1 | 0 |
| minh2020-iqtree2 | claude:claude-opus-5-5 | 3 | on | 3 | 0 | 0 | 3 | 0 |
| rossi1980-recidivism | claude:claude-opus-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-opus-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-opus-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-opus-5-5 | 2 | on | 1 | 0 | 1 | 0 | 0 |
| student1908-sleep | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### bates2015-lme4-sleepstudy | claude:claude-opus-5-5 | run 1

Status: answer. 149 s. 12 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-071104-0e48. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261009-071104-0e48/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261009-071104-0e48/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 36) | pass 251.405 via tolerance (n10, claim check 128) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 36) | pass 10.467 via tolerance (n10, claim check 128) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 36) | pass 1743.628 via tolerance (n10, claim check 128) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 36) | pass 24.741 via tolerance (n10, claim check 128) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 36) | pass 5.92 via tolerance (n10, claim check 128) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 36) | pass 25.592 via tolerance (n10, claim check 128) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 36) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n7 metrics.chisq, entry 56) | pass 23.537 via tolerance (n7, claim check 128) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 36) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-opus-5-5 | run 2

Status: answer. 154 s. 10 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-071334-5c32. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261009-071334-5c32/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261009-071334-5c32/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 36) | pass 251.405 via tolerance (n11, claim check 120) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 36) | pass 10.467 via tolerance (n11, claim check 120) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 36) | pass 1743.628 via tolerance (n11, claim check 120) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 36) | pass 24.741 via tolerance (n11, claim check 120) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 36) | pass 5.92 via tolerance (n11, claim check 120) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 36) | pass 25.592 via tolerance (n11, claim check 120) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 36) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n7 metrics.chisq, entry 57) | pass 23.537 via tolerance (n7, claim check 120) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 36) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-opus-5-5 | run 3

Status: answer. 125 s. 12 requests, 17 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261009-071607-baee. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261009-071607-baee/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261009-071607-baee/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 39) | pass 251.405 via tolerance (n9, claim check 133) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 39) | pass 10.467 via tolerance (n9, claim check 133) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 39) | pass 1743.628 via tolerance (n9, claim check 133) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 39) | pass 24.741 via tolerance (n9, claim check 133) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 39) | pass 5.922 via tolerance (n9, claim check 133) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 39) | pass 25.592 via tolerance (n9, claim check 133) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 39) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n7 metrics.chisq, entry 59) | pass 23.537 via tolerance (n7, claim check 133) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 39) | not asked |

### danecek2021-bcftools | claude:claude-opus-5-5 | run 1

Status: answer. 67 s. 5 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071812-a510. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/danecek2021-bcftools/run1/home/sessions/20261009-071812-a510/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/danecek2021-bcftools/run1/home/sessions/20261009-071812-a510/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 13) | pass 1955 via tolerance (n1, claim check 52) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 13) | pass 248 via tolerance (n1, claim check 52) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 13) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 13) | pass 2.2 via tolerance (n1, claim check 52) |
| records_in_region | 1137 exact | pass 1137 (n3 metrics.n_records, entry 24) | pass 1137 via tolerance (n3, claim check 52) |
| records_af_5pct | 328 exact | pass 328 (n4 metrics.n_after, entry 27) | pass 328 via tolerance (n4, claim check 52) |

### danecek2021-bcftools | claude:claude-opus-5-5 | run 2

Status: answer. 69 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071919-0db0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/danecek2021-bcftools/run2/home/sessions/20261009-071919-0db0/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/danecek2021-bcftools/run2/home/sessions/20261009-071919-0db0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 11) | pass 1955 via tolerance (n1, claim check 51) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 11) | pass 248 via tolerance (n1, claim check 51) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 11) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 11) | pass 2.2 via tolerance (n1, claim check 51) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 19) | pass 1137 via tolerance (n2, claim check 51) |
| records_af_5pct | 328 exact | pass 328 (n4 metrics.n_after, entry 25) | pass 328 via tolerance (n4, claim check 51) |

### danecek2021-bcftools | claude:claude-opus-5-5 | run 3

Status: answer. 74 s. 5 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072028-875f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/danecek2021-bcftools/run3/home/sessions/20261009-072028-875f/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/danecek2021-bcftools/run3/home/sessions/20261009-072028-875f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 11) | pass 1955 via tolerance (n1, claim check 52) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 11) | pass 248 via tolerance (n1, claim check 52) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 11) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 11) | pass 2.2 via tolerance (n1, claim check 52) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 21) | pass 1137 via tolerance (n2, claim check 52) |
| records_af_5pct | 328 exact | pass 328 (n4 metrics.n_after, entry 27) | pass 328 via tolerance (n4, claim check 52) |

### jang2016-hcc-biomarkers | claude:claude-opus-5-5 | run 1

Status: answer. 150 s. 8 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072142-2dce. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261009-072142-2dce/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261009-072142-2dce/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 13) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 13) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 35) | pass 0.7856 via tolerance (n2, claim check 105) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 35) | pass 0.7404 via tolerance (n2, claim check 105) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 35) | pass 0.8309 via tolerance (n2, claim check 105) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 42) | pass 0.7294 via tolerance (n3, claim check 105) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 42) | pass 0.6799 via tolerance (n3, claim check 105) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 42) | pass 0.7789 via tolerance (n3, claim check 105) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 45) | pass 0.6596 via tolerance (n4, claim check 105) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 45) | pass 0.6061 via tolerance (n4, claim check 105) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 45) | pass 0.7131 via tolerance (n4, claim check 105) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 48) | pass 0.665 via tolerance (n5, claim check 105) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 48) | pass 0.612 via tolerance (n5, claim check 105) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 48) | pass 0.718 via tolerance (n5, claim check 105) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 59) | pass 0.6202 via tolerance (n6, claim check 105) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 59) | pass 0.9016 via tolerance (n6, claim check 105) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 62) | pass 0.5096 via tolerance (n7, claim check 105) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 62) | pass 0.9119 via tolerance (n7, claim check 105) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 65) | pass 0.4615 via tolerance (n8, claim check 105) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 65) | pass 0.8031 via tolerance (n8, claim check 105) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 68) | pass 0.5 via tolerance (n9, claim check 105) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 68) | pass 0.8083 via tolerance (n9, claim check 105) |

### jang2016-hcc-biomarkers | claude:claude-opus-5-5 | run 2

Status: answer. 66 s. 7 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072412-803d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261009-072412-803d/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261009-072412-803d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 13) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 13) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 35) | pass 0.7856 via tolerance (n2, claim check 100) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 35) | pass 0.7404 via tolerance (n2, claim check 100) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 35) | pass 0.8309 via tolerance (n2, claim check 100) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 42) | pass 0.7294 via tolerance (n3, claim check 100) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 42) | pass 0.6799 via tolerance (n3, claim check 100) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 42) | pass 0.7789 via tolerance (n3, claim check 100) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 45) | pass 0.6596 via tolerance (n4, claim check 100) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 45) | pass 0.6061 via tolerance (n4, claim check 100) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 45) | pass 0.7131 via tolerance (n4, claim check 100) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 48) | pass 0.665 via tolerance (n5, claim check 100) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 48) | pass 0.612 via tolerance (n5, claim check 100) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 48) | pass 0.718 via tolerance (n5, claim check 100) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 63) | pass 0.6202 via tolerance (n6, claim check 100) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 63) | pass 0.9016 via tolerance (n6, claim check 100) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 66) | pass 0.5096 via tolerance (n7, claim check 100) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 66) | pass 0.9119 via tolerance (n7, claim check 100) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 69) | pass 0.4615 via tolerance (n8, claim check 100) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 69) | pass 0.8031 via tolerance (n8, claim check 100) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 72) | pass 0.5 via tolerance (n9, claim check 100) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 72) | pass 0.8083 via tolerance (n9, claim check 100) |

### jang2016-hcc-biomarkers | claude:claude-opus-5-5 | run 3

Status: answer. 141 s. 11 requests, 15 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072519-b8d5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261009-072519-b8d5/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261009-072519-b8d5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 13) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 13) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 39) | pass 0.7856 via tolerance (n2, claim check 124) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 39) | pass 0.7404 via tolerance (n2, claim check 124) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 39) | pass 0.8309 via tolerance (n2, claim check 124) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 46) | pass 0.7294 via tolerance (n3, claim check 124) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 46) | pass 0.6799 via tolerance (n3, claim check 124) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 46) | pass 0.7789 via tolerance (n3, claim check 124) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 49) | pass 0.6596 via tolerance (n4, claim check 124) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 49) | pass 0.6061 via tolerance (n4, claim check 124) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 49) | pass 0.7131 via tolerance (n4, claim check 124) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 52) | pass 0.665 via tolerance (n5, claim check 124) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 52) | pass 0.612 via tolerance (n5, claim check 124) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 52) | pass 0.718 via tolerance (n5, claim check 124) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 66) | pass 0.6202 via tolerance (n6, claim check 124) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 66) | pass 0.9016 via tolerance (n6, claim check 124) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 74) | pass 0.5096 via tolerance (n7, claim check 124) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 74) | pass 0.9119 via tolerance (n7, claim check 124) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 77) | pass 0.4615 via tolerance (n8, claim check 124) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 77) | pass 0.8031 via tolerance (n8, claim check 124) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 80) | pass 0.5 via tolerance (n9, claim check 124) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 80) | pass 0.8083 via tolerance (n9, claim check 124) |

### li2009-samtools | claude:claude-opus-5-5 | run 1

Status: answer. 106 s. 12 requests, 12 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072740-e8ee. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/li2009-samtools/run1/home/sessions/20261009-072740-e8ee/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/li2009-samtools/run1/home/sessions/20261009-072740-e8ee/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 27) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 48) | pass 3271 via tolerance (n5, claim check 120) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 48) | pass 3144 via tolerance (n4, claim check 120) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 48) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 51) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 51) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 79) | pass 79 via tolerance (n10, claim check 120) |

### li2009-samtools | claude:claude-opus-5-5 | run 2

Status: answer. 104 s. 11 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072926-51de. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/li2009-samtools/run2/home/sessions/20261009-072926-51de/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/li2009-samtools/run2/home/sessions/20261009-072926-51de/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 27) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 48) | pass 3271 via tolerance (n5, claim check 116) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 48) | pass 3144 via tolerance (n4, claim check 116) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 48) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 51) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 51) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 79) | pass 79 via tolerance (n10, claim check 116) |

### li2009-samtools | claude:claude-opus-5-5 | run 3

Status: answer. 80 s. 11 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073110-ccdb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/li2009-samtools/run3/home/sessions/20261009-073110-ccdb/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/li2009-samtools/run3/home/sessions/20261009-073110-ccdb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 27) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 48) | pass 3271 via tolerance (n5, claim check 119) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 48) | pass 3144 via tolerance (n4, claim check 119) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 48) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 51) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 51) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 79) | pass 79 via tolerance (n10, claim check 119) |

### minh2020-iqtree2 | claude:claude-opus-5-5 | run 1

Status: answer. 143 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-073230-e019. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/minh2020-iqtree2/run1/home/sessions/20261009-073230-e019/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/minh2020-iqtree2/run1/home/sessions/20261009-073230-e019/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 13) | pass -21152.54 via tolerance (n3, claim check 51) |

### minh2020-iqtree2 | claude:claude-opus-5-5 | run 2

Status: answer. 130 s. 7 requests, 5 tool calls (0 failed), 2 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-073454-322e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/minh2020-iqtree2/run2/home/sessions/20261009-073454-322e/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/minh2020-iqtree2/run2/home/sessions/20261009-073454-322e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 19) | pass -21152.54 via tolerance (n2, claim check 59) |

### minh2020-iqtree2 | claude:claude-opus-5-5 | run 3

Status: answer. 90 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-073704-eb13. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/minh2020-iqtree2/run3/home/sessions/20261009-073704-eb13/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/minh2020-iqtree2/run3/home/sessions/20261009-073704-eb13/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 11) | pass -21152.54 via tolerance (n1, claim check 42) |

### rossi1980-recidivism | claude:claude-opus-5-5 | run 1

Status: answer. 91 s. 10 requests, 13 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073834-c001. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rossi1980-recidivism/run1/home/sessions/20261009-073834-c001/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rossi1980-recidivism/run1/home/sessions/20261009-073834-c001/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 13) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 30) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 55) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 55) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 55) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.683756 (n5 stdout, entry 84) | pass 0.684 via tolerance (n5, claim check 106) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 55) | pass 0.0474 via tolerance (n3, claim check 106) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 55) | pass 0.64 via tolerance (n3, claim check 106) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 30) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 30) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000696 (n5 stdout, entry 84) | pass 0.000714 via tolerance (n3, claim check 106) |

### rossi1980-recidivism | claude:claude-opus-5-5 | run 2

Status: answer. 63 s. 8 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074006-81e5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rossi1980-recidivism/run2/home/sessions/20261009-074006-81e5/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rossi1980-recidivism/run2/home/sessions/20261009-074006-81e5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 13) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 30) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 55) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 55) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 55) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n3 metrics.hr_fin, entry 55) | pass 0.684 via tolerance (n3, claim check 86) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 55) | pass 0.0474 via tolerance (n3, claim check 86) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 55) | pass 0.64 via tolerance (n3, claim check 86) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 30) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 30) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 55) | pass 0.000714 via tolerance (n3, claim check 86) |

### rossi1980-recidivism | claude:claude-opus-5-5 | run 3

Status: answer. 103 s. 11 requests, 13 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074110-3265. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rossi1980-recidivism/run3/home/sessions/20261009-074110-3265/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rossi1980-recidivism/run3/home/sessions/20261009-074110-3265/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 11) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 31) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 56) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 56) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 56) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n3 metrics.hr_fin, entry 56) | pass 0.684 via tolerance (n3, claim check 111) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 56) | pass 0.0474 via tolerance (n3, claim check 111) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 56) | pass 0.64 via tolerance (n3, claim check 111) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 31) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 31) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 56) | pass 0.000714 via tolerance (n3, claim check 111) |

### student1908-sleep | claude:claude-opus-5-5 | run 1

Status: answer. 58 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074253-7f6b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/student1908-sleep/run1/home/sessions/20261009-074253-7f6b/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/student1908-sleep/run1/home/sessions/20261009-074253-7f6b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 34) | pass 1.58 via tolerance (n3, claim check 68) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 34) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 34) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 34) | pass 0.002833 via tolerance (n3, claim check 68) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 34) | pass 0.7 via tolerance (n3, claim check 68) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 34) | pass 2.46 via tolerance (n3, claim check 68) |

### student1908-sleep | claude:claude-opus-5-5 | run 2

Status: answer. 59 s. 8 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074351-b745. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/student1908-sleep/run2/home/sessions/20261009-074351-b745/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/student1908-sleep/run2/home/sessions/20261009-074351-b745/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 47) | pass 1.58 via tolerance (n3, claim check 86) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 47) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 47) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 47) | pass 0.0028 via tolerance (n3, claim check 86) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 47) | pass 0.7 via tolerance (n3, claim check 86) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 47) | pass 2.46 via tolerance (n3, claim check 86) |

### student1908-sleep | claude:claude-opus-5-5 | run 3

Status: answer. 61 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074450-4dd4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/student1908-sleep/run3/home/sessions/20261009-074450-4dd4/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/student1908-sleep/run3/home/sessions/20261009-074450-4dd4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 40) | pass 1.58 via tolerance (n2, claim check 66) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 40) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 40) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 40) | pass 0.0028 via tolerance (n2, claim check 66) |
| ci_lower | 0.7 ±0.005 | pass 0.7 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/student1908-sleep/run3/home/sessions/20261009-074450-4dd4/work/inspect_table-1/columns.csv, entry 13) | pass 0.7 via tolerance (n1, claim check 66) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 40) | pass 2.46 via tolerance (n2, claim check 66) |

