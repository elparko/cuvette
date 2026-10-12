# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 222/222 | 153/156 | 39 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| alexandrov2019-metaspace | 15/15 / 9/12 |
| bates2015-lme4-sleepstudy | 27/27 / 21/21 |
| caicedo2019-bbbc039 | 3/3 / 3/3 |
| delaney2004-esol | 18/18 / 12/12 |
| hackshaw1997-ets-lung-cancer | 12/12 / 9/9 |
| kasurinen2018-mmp14-gastric | 75/75 / 51/51 |
| lazear2023-sage | 18/18 / 9/9 |
| love2014-deseq2-airway | 15/15 / 12/12 |
| minh2020-iqtree2 | 3/3 / 3/3 |
| palmer2017-metaspace-fdr | 0/0 / 0/0 |
| rost2016-openms | 15/15 / 6/6 |
| sriphoosanaphan2021-sample-size | 9/9 / 6/6 |
| weber2023-nnsvg-dlpfc | 12/12 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 39 | 5437 | 358 | 942 | 387924 | 7208458 | 364 | 28 | 1 | 15 | 34 | 122 | 171 | 54 | 12 | 27 | 27 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.42 for 39 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alexandrov2019-metaspace | claude:claude-haiku-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| alexandrov2019-metaspace | claude:claude-haiku-5-5 | 2 | on | 0 | 0 | 0 | 0 | 0 |
| alexandrov2019-metaspace | claude:claude-haiku-5-5 | 3 | on | 0 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 1 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-haiku-5-5 | 2 | on | 9 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-haiku-5-5 | 3 | on | 11 | 0 | 0 | 0 | 0 |
| delaney2004-esol | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| delaney2004-esol | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| delaney2004-esol | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 1 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | 3 | on | 7 | 0 | 0 | 0 | 0 |
| lazear2023-sage | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| lazear2023-sage | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| lazear2023-sage | claude:claude-haiku-5-5 | 3 | on | 8 | 0 | 0 | 0 | 0 |
| love2014-deseq2-airway | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| love2014-deseq2-airway | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| love2014-deseq2-airway | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| minh2020-iqtree2 | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| minh2020-iqtree2 | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| minh2020-iqtree2 | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | 2 | on | 0 | 0 | 0 | 0 | 0 |
| palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 6 | 0 |
| rost2016-openms | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |
| rost2016-openms | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 1 | 0 |
| rost2016-openms | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 2 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | 2 | on | 0 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | 3 | on | 0 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | 1 | on | 8 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | 2 | on | 7 | 1 | 1 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | 3 | on | 6 | 0 | 0 | 0 | 0 |

Paths outside the allow list:
- weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 2: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/work/filter_genes_by_spots-1/filter_genes.h5ad

## Details

### alexandrov2019-metaspace | claude:claude-haiku-5-5 | run 1

Status: answer. 139 s. 9 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-234259-7713. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run1/home/sessions/20261011-234259-7713/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run1/home/sessions/20261011-234259-7713/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 42) | pass 414 via tolerance (n15, claim check 134) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 33) | FAIL 191 (n15, claim check 134) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n8 metrics.n_fdr_10, entry 49) | pass 191 via tolerance (n15, claim check 134) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 61) | pass 123 via tolerance (n10, claim check 134) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 42) | not asked |

### alexandrov2019-metaspace | claude:claude-haiku-5-5 | run 2

Status: answer. 104 s. 7 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-234533-aca9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run2/home/sessions/20261011-234533-aca9/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run2/home/sessions/20261011-234533-aca9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 41) | pass 414 via tolerance (n14, claim check 117) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 32) | FAIL 191 (n15, claim check 117) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n7 metrics.n_fdr_10, entry 44) | pass 191 via tolerance (n15, claim check 117) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 60) | pass 123 via tolerance (n10, claim check 117) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 41) | not asked |

### alexandrov2019-metaspace | claude:claude-haiku-5-5 | run 3

Status: answer. 134 s. 7 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-234716-8de5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run3/home/sessions/20261011-234716-8de5/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/alexandrov2019-metaspace/run3/home/sessions/20261011-234716-8de5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 42) | pass 414 via tolerance (n14, claim check 126) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 33) | FAIL 191 (n15, claim check 126) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n8 metrics.n_fdr_10, entry 49) | pass 191 via tolerance (n15, claim check 126) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 61) | pass 123 via tolerance (n10, claim check 126) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 42) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | run 1

Status: answer. 127 s. 9 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-234933-0530. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261011-234933-0530/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261011-234933-0530/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 30) | pass 251.405 via tolerance (n4, claim check 104) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 30) | pass 10.467 via tolerance (n4, claim check 104) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 30) | pass 1743.628 via tolerance (n4, claim check 104) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 30) | pass 24.741 via tolerance (n4, claim check 104) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 30) | pass 5.922 via tolerance (n4, claim check 104) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 30) | pass 25.592 via tolerance (n4, claim check 104) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 30) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 45) | pass 23.537 via tolerance (n5, claim check 104) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 30) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | run 2

Status: answer. 138 s. 9 requests, 8 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261011-235140-fc05. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261011-235140-fc05/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261011-235140-fc05/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n7 stdout, entry 57) | pass 251.405 via tolerance (n7, claim check 106) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 30) | pass 10.467 via tolerance (n4, claim check 106) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 30) | pass 1743.628 via tolerance (n4, claim check 106) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 30) | pass 24.741 via tolerance (n4, claim check 106) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 30) | pass 5.922 via tolerance (n4, claim check 106) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 30) | pass 25.592 via tolerance (n4, claim check 106) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 30) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 45) | pass 23.537 via tolerance (n5, claim check 106) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 30) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | run 3

Status: answer. 145 s. 13 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-235358-6952. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261011-235358-6952/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261011-235358-6952/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 33) | pass 251.405 via tolerance (n10, claim check 145) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 33) | pass 10.467 via tolerance (n10, claim check 145) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 33) | pass 1743.628 via tolerance (n4, claim check 145) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 33) | pass 24.741 via tolerance (n4, claim check 145) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 33) | pass 5.922 via tolerance (n4, claim check 145) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 33) | pass 25.592 via tolerance (n4, claim check 145) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 33) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n7 metrics.chisq, entry 63) | pass 23.537 via tolerance (n8, claim check 145) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 33) | not asked |

### caicedo2019-bbbc039 | claude:claude-haiku-5-5 | run 1

Status: answer. 244 s. 11 requests, 13 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-235623-1255. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run1/home/sessions/20261011-235623-1255/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run1/home/sessions/20261011-235623-1255/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n8 metrics.total_truth, entry 86) | pass 5720 via tolerance (n9, claim check 125) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n8 table.rows[12][8], entry 86) | match 0.1053 via tolerance (n9, claim check 125) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.1837 (n8 table.rows[12][8], entry 86) | differs 0.1053 (n9, claim check 125) |

### caicedo2019-bbbc039 | claude:claude-haiku-5-5 | run 2

Status: answer. 290 s. 12 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-000027-4214. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run2/home/sessions/20261012-000027-4214/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run2/home/sessions/20261012-000027-4214/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n10 metrics.total_truth, entry 97) | pass 5720 via tolerance (n12, claim check 136) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n10 table.rows[12][8], entry 97) | match 0.1053 via tolerance (n11, claim check 136) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.1837 (n10 table.rows[12][8], entry 97) | differs 0.1053 (n11, claim check 136) |

### caicedo2019-bbbc039 | claude:claude-haiku-5-5 | run 3

Status: answer. 913 s. 18 requests, 21 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-000517-8c1c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run3/home/sessions/20261012-000517-8c1c/log.jsonl
Leak check: 11 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run3/home/sessions/20261012-000517-8c1c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n10 metrics.total_truth, entry 111) | pass 5720 via tolerance (n17, claim check 195) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n10 table.rows[12][8], entry 111) | match 0.1053 via tolerance (n11, claim check 195) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2 (n8 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/caicedo2019-bbbc039/run3/home/sessions/20261012-000517-8c1c/work/segment_cells-3/IXMtest_A09_s1_w1CE70AD49-290D-4312-82E6-CDC717F32637_outlines.png, entry 88) | differs 0.1053 (n11, claim check 195) |

### delaney2004-esol | claude:claude-haiku-5-5 | run 1

Status: answer. 91 s. 9 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-002035-db99. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run1/home/sessions/20261012-002035-db99/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run1/home/sessions/20261012-002035-db99/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 16) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 38) | pass 1018 via tolerance (n3, claim check 106) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 38) | pass 12 via tolerance (n3, claim check 106) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 38) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 56) | pass 0.749 via tolerance (n5, claim check 106) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 56) | pass 1.099 via tolerance (n5, claim check 106) |

### delaney2004-esol | claude:claude-haiku-5-5 | run 2

Status: answer. 72 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-002206-5157. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run2/home/sessions/20261012-002206-5157/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run2/home/sessions/20261012-002206-5157/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 12) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 32) | pass 1018 via tolerance (n3, claim check 78) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 32) | pass 12 via tolerance (n3, claim check 78) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 32) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 50) | pass 0.752 via tolerance (n4, claim check 78) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 50) | pass 1.099 via tolerance (n4, claim check 78) |

### delaney2004-esol | claude:claude-haiku-5-5 | run 3

Status: answer. 100 s. 10 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261012-002319-cae3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run3/home/sessions/20261012-002319-cae3/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/delaney2004-esol/run3/home/sessions/20261012-002319-cae3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 15) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 35) | pass 1018 via tolerance (n3, claim check 110) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 35) | pass 12 via tolerance (n3, claim check 110) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 35) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 48) | pass 0.752 via tolerance (n4, claim check 110) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 48) | pass 1.0994 via tolerance (n7, claim check 110) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 1

Status: answer. 81 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-002459-632a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261012-002459-632a/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261012-002459-632a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 12) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n8 metrics.effect, entry 54) | pass 1.24 via tolerance (n8, claim check 89) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n8 metrics.effect_ci_lo, entry 54) | pass 1.129 via tolerance (n8, claim check 89) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n8 metrics.effect_ci_hi, entry 54) | pass 1.358 via tolerance (n8, claim check 89) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 2

Status: answer. 87 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-002620-a682. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261012-002620-a682/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261012-002620-a682/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 12) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n7 metrics.effect, entry 48) | pass 1.238 via tolerance (n7, claim check 92) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n7 metrics.effect_ci_lo, entry 48) | pass 1.129 via tolerance (n7, claim check 92) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n7 metrics.effect_ci_hi, entry 48) | pass 1.358 via tolerance (n7, claim check 92) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 3

Status: answer. 100 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-002747-476c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261012-002747-476c/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261012-002747-476c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 12) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n8 metrics.effect, entry 54) | pass 1.24 via tolerance (n10, claim check 95) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n8 metrics.effect_ci_lo, entry 54) | pass 1.13 via tolerance (n5, claim check 95) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n8 metrics.effect_ci_hi, entry 54) | pass 1.36 via tolerance (n10, claim check 95) |

### kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | run 1

Status: answer. 186 s. 16 requests, 17 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-002927-7d25. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261012-002927-7d25/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261012-002927-7d25/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 12) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 34) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4923 (n9 stdout, entry 105) | pass 0.492 via tolerance (n12, claim check 164) |
| surv5_high | 0.2211 ±0.001 | pass 0.2211 (n9 stdout, entry 105) | pass 0.221 via tolerance (n12, claim check 164) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 34) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 34) | pass 0.00138 via tolerance (n8, claim check 164) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 50) | pass 1.92 via tolerance (n3, claim check 164) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 50) | pass 1.28 via tolerance (n9, claim check 164) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 50) | pass 2.88 via tolerance (n9, claim check 164) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 50) | pass 0.00167 via tolerance (n9, claim check 164) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 54) | pass 1.55 via tolerance (n9, claim check 164) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 54) | pass 1.02 via tolerance (n9, claim check 164) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 54) | pass 2.35 via tolerance (n9, claim check 164) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 54) | pass 0.0399 via tolerance (n9, claim check 164) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 54) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 54) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 54) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 54) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 54) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n5 metrics.hr_mmp14_high, entry 65) | pass 3.54 via tolerance (n9, claim check 164) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n5 table.rows[0][5], entry 65) | pass 1.51 via tolerance (n9, claim check 164) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n5 table.rows[0][6], entry 65) | pass 8.33 via tolerance (n5, claim check 164) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n5 metrics.p_mmp14_high, entry 65) | pass 0.00374 via tolerance (n9, claim check 164) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n6 metrics.hr_mmp14_high, entry 69) | pass 1.54 via tolerance (n9, claim check 164) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n6 metrics.p_mmp14_high, entry 69) | pass 0.0711 via tolerance (n8, claim check 164) |

### kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | run 2

Status: answer. 134 s. 13 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-003233-7f46. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261012-003233-7f46/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261012-003233-7f46/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 12) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 30) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4923 (n7 stdout, entry 74) | pass 0.492 via tolerance (n2, claim check 137) |
| surv5_high | 0.2211 ±0.001 | pass 0.2211 (n7 stdout, entry 74) | pass 0.221 via tolerance (n2, claim check 137) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 30) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 30) | pass 0.0014 via tolerance (n2, claim check 137) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 51) | pass 1.92 via tolerance (n3, claim check 137) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 51) | pass 1.28 via tolerance (n3, claim check 137) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 51) | pass 2.88 via tolerance (n3, claim check 137) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 51) | pass 0.0017 via tolerance (n3, claim check 137) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 54) | pass 1.55 via tolerance (n4, claim check 137) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 54) | pass 1.02 via tolerance (n4, claim check 137) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 54) | pass 2.35 via tolerance (n4, claim check 137) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 54) | pass 0.04 via tolerance (n4, claim check 137) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 54) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 54) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 54) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 54) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 54) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n5 metrics.hr_mmp14_high, entry 62) | pass 3.54 via tolerance (n5, claim check 137) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n5 table.rows[0][5], entry 62) | pass 1.51 via tolerance (n5, claim check 137) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n5 table.rows[0][6], entry 62) | pass 8.33 via tolerance (n5, claim check 137) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n5 metrics.p_mmp14_high, entry 62) | pass 0.0037 via tolerance (n5, claim check 137) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n6 metrics.hr_mmp14_high, entry 65) | pass 1.54 via tolerance (n6, claim check 137) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n6 metrics.p_mmp14_high, entry 65) | pass 0.071 via tolerance (n6, claim check 137) |

### kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | run 3

Status: answer. 187 s. 17 requests, 19 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-003447-0bd9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261012-003447-0bd9/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261012-003447-0bd9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 12) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 31) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4923 (n7 stdout, entry 78) | pass 0.492 via tolerance (n2, claim check 179) |
| surv5_high | 0.2211 ±0.001 | pass 0.2211 (n7 stdout, entry 78) | pass 0.221 via tolerance (n2, claim check 179) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 31) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 31) | pass 0.00138 via tolerance (n8, claim check 179) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 52) | pass 1.92 via tolerance (n3, claim check 179) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 52) | pass 1.28 via tolerance (n3, claim check 179) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 52) | pass 2.88 via tolerance (n3, claim check 179) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 52) | pass 0.00167 via tolerance (n8, claim check 179) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 61) | pass 1.55 via tolerance (n9, claim check 179) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 61) | pass 1.02 via tolerance (n4, claim check 179) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 61) | pass 2.35 via tolerance (n4, claim check 179) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 61) | pass 0.0399 via tolerance (n8, claim check 179) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 61) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 61) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 61) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 61) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 61) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n5 metrics.hr_mmp14_high, entry 65) | pass 3.54 via tolerance (n11, claim check 179) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n5 table.rows[0][5], entry 65) | pass 1.51 via tolerance (n5, claim check 179) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n5 table.rows[0][6], entry 65) | pass 8.33 via tolerance (n5, claim check 179) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n5 metrics.p_mmp14_high, entry 65) | pass 0.00374 via tolerance (n8, claim check 179) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n6 metrics.hr_mmp14_high, entry 69) | pass 1.54 via tolerance (n11, claim check 179) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n6 metrics.p_mmp14_high, entry 69) | pass 0.0711 via tolerance (n8, claim check 179) |

### lazear2023-sage | claude:claude-haiku-5-5 | run 1

Status: answer. 118 s. 12 requests, 11 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-003754-73b8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lazear2023-sage/run1/home/sessions/20261012-003754-73b8/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lazear2023-sage/run1/home/sessions/20261012-003754-73b8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 20) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 20) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 28) | pass 207 via tolerance (n6, claim check 105) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 28) | pass 47 via tolerance (n6, claim check 105) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 28) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n5 stdout, entry 51) | pass 242 via tolerance (n6, claim check 105) |

### lazear2023-sage | claude:claude-haiku-5-5 | run 2

Status: answer. 99 s. 12 requests, 11 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-003952-cdb6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lazear2023-sage/run2/home/sessions/20261012-003952-cdb6/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lazear2023-sage/run2/home/sessions/20261012-003952-cdb6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 20) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 20) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 28) | pass 207 via tolerance (n6, claim check 108) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 28) | pass 47 via tolerance (n6, claim check 108) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 28) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n6 stdout, entry 59) | pass 242 via tolerance (n6, claim check 108) |

### lazear2023-sage | claude:claude-haiku-5-5 | run 3

Status: answer. 143 s. 13 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-004131-c80d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lazear2023-sage/run3/home/sessions/20261012-004131-c80d/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lazear2023-sage/run3/home/sessions/20261012-004131-c80d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 19) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 19) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 27) | pass 207 via tolerance (n6, claim check 121) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 27) | pass 47 via tolerance (n6, claim check 121) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 27) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n5 stdout, entry 57) | pass 242 via tolerance (n6, claim check 121) |

### love2014-deseq2-airway | claude:claude-haiku-5-5 | run 1

Status: answer. 173 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-004356-016a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/love2014-deseq2-airway/run1/home/sessions/20261012-004356-016a/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/love2014-deseq2-airway/run1/home/sessions/20261012-004356-016a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 50) | pass 16637 via tolerance (n10, claim check 104) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 50) | pass 4381 via tolerance (n7, claim check 104) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 50) | pass 2362 via tolerance (n7, claim check 104) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 50) | pass 2019 via tolerance (n7, claim check 104) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 41) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 15991 (n10 stdout, entry 81) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 50) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 58) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 50) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 50) | not asked |

### love2014-deseq2-airway | claude:claude-haiku-5-5 | run 2

Status: answer. 175 s. 10 requests, 8 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-004649-1edd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/love2014-deseq2-airway/run2/home/sessions/20261012-004649-1edd/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/love2014-deseq2-airway/run2/home/sessions/20261012-004649-1edd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 50) | pass 16637 via tolerance (n10, claim check 117) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 50) | pass 4381 via tolerance (n10, claim check 117) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 50) | pass 2362 via tolerance (n10, claim check 117) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 50) | pass 2019 via tolerance (n10, claim check 117) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 41) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16081 (n10 stdout, entry 102) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4406 (n10 stdout, entry 102) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 58) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2337 (n10 stdout, entry 102) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4364 (n10 stdout, entry 102) | not asked |

### love2014-deseq2-airway | claude:claude-haiku-5-5 | run 3

Status: answer. 149 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-004945-a69c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/love2014-deseq2-airway/run3/home/sessions/20261012-004945-a69c/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/love2014-deseq2-airway/run3/home/sessions/20261012-004945-a69c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 50) | pass 16637 via tolerance (n7, claim check 95) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 50) | pass 4381 via tolerance (n7, claim check 95) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 50) | pass 2362 via tolerance (n7, claim check 95) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 50) | pass 2019 via tolerance (n7, claim check 95) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 41) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 50) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 50) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 58) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 50) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 50) | not asked |

### minh2020-iqtree2 | claude:claude-haiku-5-5 | run 1

Status: answer. 81 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005214-4443. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/minh2020-iqtree2/run1/home/sessions/20261012-005214-4443/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/minh2020-iqtree2/run1/home/sessions/20261012-005214-4443/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 12) | pass -21152.54 via tolerance (n1, claim check 54) |

### minh2020-iqtree2 | claude:claude-haiku-5-5 | run 2

Status: answer. 69 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005335-74bf. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/minh2020-iqtree2/run2/home/sessions/20261012-005335-74bf/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/minh2020-iqtree2/run2/home/sessions/20261012-005335-74bf/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 12) | pass -21152.54 via tolerance (n2, claim check 48) |

### minh2020-iqtree2 | claude:claude-haiku-5-5 | run 3

Status: answer. 78 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005444-44ea. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/minh2020-iqtree2/run3/home/sessions/20261012-005444-44ea/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/minh2020-iqtree2/run3/home/sessions/20261012-005444-44ea/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -21152.54 ±1 | pass -21152.54 (n1 metrics.log_likelihood, entry 12) | pass -21152.54 via tolerance (n1, claim check 56) |

### palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | run 1

Status: answer. 75 s. 8 requests, 12 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005602-686a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261012-005602-686a/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261012-005602-686a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs - |
| unique_formulas_three_sections (reference) | 66 exact | differs 72 (n6 data.pixel_size.Xaxis, entry 37) | not asked |
| total_formulas (reference) | 103 ±20 | differs 72 (n6 data.pixel_size.Xaxis, entry 37) | not asked |

### palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | run 2

Status: answer. 141 s. 18 requests, 23 tool calls (13 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-005718-b020. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261012-005718-b020/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261012-005718-b020/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | match 50 via tolerance (n6, claim check 211) |
| unique_formulas_three_sections (reference) | 66 exact | differs 50 (n6 data.pixel_size.Xaxis, entry 60) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n1 metrics.n_found, entry 12) | not asked |

### palmer2017-metaspace-fdr | claude:claude-haiku-5-5 | run 3

Status: answer. 161 s. 17 requests, 23 tool calls (8 failed), 0 nudges, 1 plan reminders, 6 unsourced.
Session: 20261012-005939-6d32. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261012-005939-6d32/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261012-005939-6d32/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs 69 (n8, claim check 190) |
| unique_formulas_three_sections (reference) | 66 exact | differs 50 (n5 data.pixel_size.Xaxis, entry 36) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n4 data.pixel_size.Xaxis, entry 33) | not asked |

### rost2016-openms | claude:claude-haiku-5-5 | run 1

Status: answer. 130 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-010221-ffd6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rost2016-openms/run1/home/sessions/20261012-010221-ffd6/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rost2016-openms/run1/home/sessions/20261012-010221-ffd6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | pass 7173 via tolerance (n1, claim check 98) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 63) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 63) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 63) | pass 1887 via tolerance (n8, claim check 98) |

### rost2016-openms | claude:claude-haiku-5-5 | run 2

Status: answer. 112 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-010431-421d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rost2016-openms/run2/home/sessions/20261012-010431-421d/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rost2016-openms/run2/home/sessions/20261012-010431-421d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | pass 7173 via tolerance (n1, claim check 80) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 58) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 58) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 58) | pass 1887 via tolerance (n8, claim check 80) |

### rost2016-openms | claude:claude-haiku-5-5 | run 3

Status: answer. 91 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-010624-8b37. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rost2016-openms/run3/home/sessions/20261012-010624-8b37/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rost2016-openms/run3/home/sessions/20261012-010624-8b37/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | pass 7173 via tolerance (n1, claim check 79) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 58) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 58) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 58) | pass 1887 via tolerance (n8, claim check 79) |

### sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | run 1

Status: answer. 57 s. 4 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-010754-5fba. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261012-010754-5fba/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run1/home/sessions/20261012-010754-5fba/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 12) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 12) | pass 30 via tolerance (n1, claim check 38) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 12) | pass 60 via tolerance (n1, claim check 38) |

### sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | run 2

Status: answer. 60 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-010851-98a0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261012-010851-98a0/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run2/home/sessions/20261012-010851-98a0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 12) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 12) | pass 30 via tolerance (n2, claim check 41) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 12) | pass 60 via tolerance (n2, claim check 41) |

### sriphoosanaphan2021-sample-size | claude:claude-haiku-5-5 | run 3

Status: answer. 22 s. 2 requests, 2 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-010951-e1b5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261012-010951-e1b5/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/sriphoosanaphan2021-sample-size/run3/home/sessions/20261012-010951-e1b5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_exact | 29.94 ±0.01 | pass 29.94159 (n1 metrics.n_exact, entry 12) | not asked |
| n_per_arm | 30 exact | pass 30 (n1 metrics.n, entry 12) | pass 30 via tolerance (n1, claim check 25) |
| n_total | 60 exact | pass 60 (n1 metrics.n_total, entry 12) | pass 60 via tolerance (n1, claim check 25) |

### weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 1

Status: answer. 81 s. 11 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-011013-aca6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261012-011013-aca6/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261012-011013-aca6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 20) | pass 3639 via tolerance (n8, claim check 118) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 80) | pass 2 via tolerance (n9, claim check 118) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 80) | pass 4 via tolerance (n8, claim check 118) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 80) | pass 19 via tolerance (n8, claim check 118) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 38) | differs 3309 (n8, claim check 118) |

### weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 2

Status: answer. 73 s. 9 requests, 8 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-011135-5d6e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261012-011135-5d6e/log.jsonl
Leak check: 7 paths read, 1 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261012-011135-5d6e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 15) | pass 3639 via tolerance (n8, claim check 106) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 83) | pass 2 via tolerance (n8, claim check 106) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 83) | pass 4 via tolerance (n8, claim check 106) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 83) | pass 19 via tolerance (n8, claim check 106) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 33) | differs 3309 (n8, claim check 106) |

### weber2023-nnsvg-dlpfc | claude:claude-haiku-5-5 | run 3

Status: answer. 77 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-011248-8097. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261012-011248-8097/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261012-011248-8097/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 15) | pass 3639 via tolerance (n8, claim check 105) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 75) | pass 2 via tolerance (n8, claim check 105) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 75) | pass 4 via tolerance (n8, claim check 105) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 75) | pass 19 via tolerance (n8, claim check 105) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 33) | differs 3309 (n8, claim check 105) |

