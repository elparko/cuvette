# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 75/75 | 53/57 | 15 | 1 error |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| alexandrov2019-metaspace | 15/15 / 11/12 |
| bates2015-lme4-sleepstudy | 27/27 / 21/21 |
| caicedo2019-bbbc039 | 3/3 / 3/3 |
| delaney2004-esol | 18/18 / 12/12 |
| hackshaw1997-ets-lung-cancer | 12/12 / 6/9 (1 error) |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 15 | 2059 | 137 | 358 | 145235 | 2509058 | 155 | 3 | 0 | 5 | 12 | 44 | 60 | 19 | 2 | 9 | 9 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.15 for 15 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alexandrov2019-metaspace | claude:claude-haiku-5-5 | 1 | on | 8 | 0 | 0 | 0 | 0 |
| alexandrov2019-metaspace | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 2 | 0 |
| alexandrov2019-metaspace | claude:claude-haiku-5-5 | 3 | on | 0 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-haiku-5-5 | 1 | on | 9 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-haiku-5-5 | 3 | on | 10 | 0 | 0 | 0 | 0 |
| delaney2004-esol | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| delaney2004-esol | claude:claude-haiku-5-5 | 2 | on | 3 | 1 | 1 | 0 | 0 |
| delaney2004-esol | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 1 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

Paths outside the allow list:
- delaney2004-esol | claude:claude-haiku-5-5 | run 2: /Volumes/T7/guided-analysis/tools/bench-runs

## Details

### alexandrov2019-metaspace | claude:claude-haiku-5-5 | run 1

Status: answer. 107 s. 8 requests, 18 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-020617-d160. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run1/home/sessions/20261012-020617-d160/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run1/home/sessions/20261012-020617-d160/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 41) | pass 414 via tolerance (n7, claim check 120) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 32) | pass 263 via tolerance (n4, claim check 120) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n8 metrics.n_fdr_10, entry 48) | pass 191 via tolerance (n9, claim check 120) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 60) | pass 123 via tolerance (n10, claim check 120) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 41) | not asked |

### alexandrov2019-metaspace | claude:claude-haiku-5-5 | run 2

Status: answer. 138 s. 10 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-020804-a128. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run2/home/sessions/20261012-020804-a128/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run2/home/sessions/20261012-020804-a128/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 41) | pass 414 via tolerance (n12, claim check 128) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 32) | pass 263 via tolerance (n13, claim check 128) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n8 metrics.n_fdr_10, entry 48) | pass 191 via tolerance (n9, claim check 128) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 60) | pass 123 via tolerance (n10, claim check 128) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 41) | not asked |

### alexandrov2019-metaspace | claude:claude-haiku-5-5 | run 3

Status: answer. 145 s. 11 requests, 16 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-021023-0c8a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run3/home/sessions/20261012-021023-0c8a/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run3/home/sessions/20261012-021023-0c8a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n5 metrics.n_fdr_10, entry 41) | pass 414 via tolerance (n15, claim check 154) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n3 metrics.n_fdr_10, entry 32) | FAIL 191 (n15, claim check 154) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n7 metrics.n_fdr_10, entry 48) | pass 191 via tolerance (n15, claim check 154) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n9 metrics.n_fdr_10, entry 60) | pass 123 via tolerance (n9, claim check 154) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n5 metrics.n_fdr_05, entry 41) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | run 1

Status: answer. 90 s. 8 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021248-1231. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261012-021248-1231/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261012-021248-1231/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 30) | pass 251.405 via tolerance (n4, claim check 96) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 30) | pass 10.467 via tolerance (n4, claim check 96) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 30) | pass 1743.628 via tolerance (n4, claim check 96) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 30) | pass 24.741 via tolerance (n4, claim check 96) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 30) | pass 5.922 via tolerance (n4, claim check 96) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 30) | pass 25.592 via tolerance (n4, claim check 96) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 30) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 45) | pass 23.537 via tolerance (n5, claim check 96) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 30) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | run 2

Status: answer. 110 s. 10 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-021418-5cbc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261012-021418-5cbc/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261012-021418-5cbc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 33) | pass 251.405 via tolerance (n10, claim check 111) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 33) | pass 10.467 via tolerance (n10, claim check 111) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 33) | pass 1743.63 via tolerance (n10, claim check 111) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 33) | pass 24.741 via tolerance (n10, claim check 111) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 33) | pass 5.922 via tolerance (n10, claim check 111) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 33) | pass 25.592 via tolerance (n10, claim check 111) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 33) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 48) | pass 23.537 via tolerance (n5, claim check 111) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 33) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | run 3

Status: answer. 105 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021608-8247. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261012-021608-8247/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261012-021608-8247/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n7 stdout, entry 59) | pass 251.405 via tolerance (n7, claim check 100) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 32) | pass 10.467 via tolerance (n4, claim check 100) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 32) | pass 1743.6 via tolerance (n4, claim check 100) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 32) | pass 24.741 via tolerance (n4, claim check 100) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 32) | pass 5.922 via tolerance (n4, claim check 100) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 32) | pass 25.592 via tolerance (n4, claim check 100) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 32) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 47) | pass 23.537 via tolerance (n5, claim check 100) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 32) | not asked |

### caicedo2019-bbbc039 | claude:claude-haiku-5-5 | run 1

Status: answer. 326 s. 17 requests, 20 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-021754-8a23. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run1/home/sessions/20261012-021754-8a23/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run1/home/sessions/20261012-021754-8a23/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n7 metrics.total_truth, entry 87) | pass 5720 via tolerance (n8, claim check 186) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1452 (n7 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run1/home/sessions/20261012-021754-8a23/work/segment_cells-4/per_image.csv, entry 87) | match 0.1053 via tolerance (n8, claim check 186) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2017 (n7 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run1/home/sessions/20261012-021754-8a23/work/segment_cells-4/per_image.csv, entry 87) | differs 0.1053 (n8, claim check 186) |

### caicedo2019-bbbc039 | claude:claude-haiku-5-5 | run 2

Status: answer. 245 s. 10 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-022320-01f6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run2/home/sessions/20261012-022320-01f6/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run2/home/sessions/20261012-022320-01f6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n7 metrics.total_truth, entry 81) | pass 5720 via tolerance (n8, claim check 117) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n7 table.rows[12][8], entry 81) | match 0.1053 via tolerance (n8, claim check 117) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.1837 (n7 table.rows[12][8], entry 81) | differs 0.1053 (n8, claim check 117) |

### caicedo2019-bbbc039 | claude:claude-haiku-5-5 | run 3

Status: answer. 253 s. 13 requests, 14 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-022725-7949. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run3/home/sessions/20261012-022725-7949/log.jsonl
Leak check: 10 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run3/home/sessions/20261012-022725-7949/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n7 metrics.total_truth, entry 93) | pass 5720 via tolerance (n8, claim check 139) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n7 table.rows[12][8], entry 93) | match 0.1053 via tolerance (n8, claim check 139) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.1837 (n7 table.rows[12][8], entry 93) | differs 0.1053 (n8, claim check 139) |

### delaney2004-esol | claude:claude-haiku-5-5 | run 1

Status: answer. 82 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-023139-1fc2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run1/home/sessions/20261012-023139-1fc2/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run1/home/sessions/20261012-023139-1fc2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 12) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 35) | pass 1018 via tolerance (n5, claim check 79) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 35) | pass 12 via tolerance (n3, claim check 79) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 35) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 48) | pass 0.752 via tolerance (n4, claim check 79) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 48) | pass 1.1 via tolerance (n4, claim check 79) |

### delaney2004-esol | claude:claude-haiku-5-5 | run 2

Status: answer. 92 s. 9 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-023301-9100. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run2/home/sessions/20261012-023301-9100/log.jsonl
Leak check: 3 paths read, 1 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run2/home/sessions/20261012-023301-9100/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 12) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 32) | pass 1018 via tolerance (n3, claim check 97) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 32) | pass 12 via tolerance (n3, claim check 97) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 32) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 50) | pass 0.752 via tolerance (n4, claim check 97) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 50) | pass 1.099 via tolerance (n4, claim check 97) |

### delaney2004-esol | claude:claude-haiku-5-5 | run 3

Status: answer. 94 s. 8 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-023433-c0af. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run3/home/sessions/20261012-023433-c0af/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run3/home/sessions/20261012-023433-c0af/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 12) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 35) | pass 1018 via tolerance (n3, claim check 95) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 35) | pass 12 via tolerance (n3, claim check 95) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 35) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 53) | pass 0.752 via tolerance (n5, claim check 95) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 53) | pass 1.099 via tolerance (n5, claim check 95) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 1

Status: answer. 107 s. 8 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-023607-16e7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261012-023607-16e7/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261012-023607-16e7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 12) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n7 metrics.effect, entry 48) | pass 1.238 via tolerance (n7, claim check 110) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n7 metrics.effect_ci_lo, entry 48) | pass 1.129 via tolerance (n7, claim check 110) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n7 metrics.effect_ci_hi, entry 48) | pass 1.358 via tolerance (n7, claim check 110) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 2

Status: answer. 78 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-023754-5ee8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261012-023754-5ee8/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261012-023754-5ee8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 12) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n7 metrics.effect, entry 48) | pass 1.24 via tolerance (n7, claim check 88) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n7 metrics.effect_ci_lo, entry 48) | pass 1.13 via tolerance (n4, claim check 88) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n7 metrics.effect_ci_hi, entry 48) | pass 1.36 via tolerance (n7, claim check 88) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 3

Status: error (Error: ENOSPC: no space left on device, write). 88 s. 5 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-023911-6068. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261012-023911-6068/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261012-023911-6068/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 12) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n9 metrics.effect, entry 72) | FAIL - |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n9 metrics.effect_ci_lo, entry 72) | FAIL - |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n9 metrics.effect_ci_hi, entry 72) | FAIL - |

