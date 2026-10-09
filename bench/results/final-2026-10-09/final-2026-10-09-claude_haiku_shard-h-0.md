# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 337/340 | 275/280 | 35 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| alexandrov2019-metaspace | 15/15 / 10/12 |
| andrews-fastqc | 21/21 / 9/9 |
| bates2015-lme4-sleepstudy | 27/27 / 21/21 |
| bemis2015-cardinal | 12/15 / 12/15 |
| caicedo2019-bbbc039 | 3/3 / 3/3 |
| cooley2020-splitluc-zprime | 57/57 / 57/57 |
| delaney2004-esol | 18/18 / 12/12 |
| gowers2016-mdanalysis | 21/21 / 21/21 |
| hackshaw1997-ets-lung-cancer | 12/12 / 9/9 |
| jang2016-hcc-biomarkers | 66/66 / 60/60 |
| kasurinen2018-mmp14-gastric | 75/75 / 51/51 |
| korsunsky2019-harmony | 10/10 / 10/10 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 35 | 7420 | 393 | 988 | 455076 | 9310640 | 456 | 15 | 1 | 19 | 32 | 104 | 145 | 73 | 40 | 22 | 22 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.50 for 35 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alexandrov2019-metaspace | claude:claude-haiku-5-5 | 1 | on | 0 | 0 | 0 | 0 | 0 |
| alexandrov2019-metaspace | claude:claude-haiku-5-5 | 2 | on | 0 | 0 | 0 | 0 | 0 |
| alexandrov2019-metaspace | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| andrews-fastqc | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 1 | 0 |
| andrews-fastqc | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 3 | 0 |
| andrews-fastqc | claude:claude-haiku-5-5 | 3 | on | 8 | 0 | 2 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 1 | 0 |
| bemis2015-cardinal | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-haiku-5-5 | 1 | on | 9 | 0 | 1 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-haiku-5-5 | 2 | on | 9 | 0 | 1 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-haiku-5-5 | 3 | on | 9 | 0 | 0 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 1 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 1 | 4 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 1 | 0 | 0 |
| delaney2004-esol | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 4 | 0 |
| delaney2004-esol | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 8 | 0 |
| delaney2004-esol | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 3 | 0 |
| jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 1 | on | 19 | 0 | 0 | 15 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 2 | on | 24 | 0 | 0 | 1 | 0 |

## Details

### alexandrov2019-metaspace | claude:claude-haiku-5-5 | run 1

Status: answer. 86 s. 7 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-045914-c724. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/alexandrov2019-metaspace/run1/home/sessions/20261009-045914-c724/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/alexandrov2019-metaspace/run1/home/sessions/20261009-045914-c724/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 49) | pass 414 via tolerance (n13, claim check 126) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 40) | FAIL 191 (n14, claim check 126) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n8 metrics.n_fdr_10, entry 56) | pass 191 via tolerance (n14, claim check 126) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n15 metrics.n_annotations, entry 90) | FAIL 144 (n7, claim check 126) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 49) | not asked |

### alexandrov2019-metaspace | claude:claude-haiku-5-5 | run 2

Status: answer. 117 s. 7 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050041-ea0f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/alexandrov2019-metaspace/run2/home/sessions/20261009-050041-ea0f/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/alexandrov2019-metaspace/run2/home/sessions/20261009-050041-ea0f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 42) | pass 414 via tolerance (n8, claim check 109) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 33) | pass 263 via tolerance (n4, claim check 109) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n7 metrics.n_fdr_10, entry 45) | pass 191 via tolerance (n9, claim check 109) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 61) | pass 123 via tolerance (n12, claim check 109) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 42) | not asked |

### alexandrov2019-metaspace | claude:claude-haiku-5-5 | run 3

Status: answer. 177 s. 14 requests, 19 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-050239-0ff3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/alexandrov2019-metaspace/run3/home/sessions/20261009-050239-0ff3/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/alexandrov2019-metaspace/run3/home/sessions/20261009-050239-0ff3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 41) | pass 414 via tolerance (n17, claim check 184) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 32) | pass 263 via tolerance (n19, claim check 184) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n8 metrics.n_fdr_10, entry 48) | pass 191 via tolerance (n9, claim check 184) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 60) | pass 123 via tolerance (n10, claim check 184) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 41) | not asked |

### andrews-fastqc | claude:claude-haiku-5-5 | run 1

Status: answer. 82 s. 5 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-050536-09ad. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andrews-fastqc/run1/home/sessions/20261009-050536-09ad/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andrews-fastqc/run1/home/sessions/20261009-050536-09ad/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 13) | pass 250000 via tolerance (n1, claim check 62) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 16) | pass 395288 via tolerance (n2, claim check 62) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 13) | pass 40 via tolerance (n2, claim check 62) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 13) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 16) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 13) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 16) | not asked |

### andrews-fastqc | claude:claude-haiku-5-5 | run 2

Status: answer. 115 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-050658-de37. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andrews-fastqc/run2/home/sessions/20261009-050658-de37/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andrews-fastqc/run2/home/sessions/20261009-050658-de37/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 13) | pass 250000 via tolerance (n1, claim check 52) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 16) | pass 395288 via tolerance (n2, claim check 52) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 13) | pass 40 via tolerance (n2, claim check 52) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 13) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 16) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 13) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 16) | not asked |

### andrews-fastqc | claude:claude-haiku-5-5 | run 3

Status: answer. 127 s. 9 requests, 15 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050856-3477. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andrews-fastqc/run3/home/sessions/20261009-050856-3477/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/andrews-fastqc/run3/home/sessions/20261009-050856-3477/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 23) | pass 250000 via tolerance (n1, claim check 100) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 26) | pass 395288 via tolerance (n2, claim check 100) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 23) | pass 40 via tolerance (n2, claim check 100) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 23) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 26) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 23) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 26) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | run 1

Status: answer. 102 s. 12 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-051105-f7ce. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261009-051105-f7ce/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run1/home/sessions/20261009-051105-f7ce/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 43) | pass 251.405 via tolerance (n9, claim check 130) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 43) | pass 10.467 via tolerance (n9, claim check 130) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 43) | pass 1743.628 via tolerance (n9, claim check 130) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 43) | pass 24.741 via tolerance (n9, claim check 130) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 43) | pass 5.922 via tolerance (n9, claim check 130) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 43) | pass 25.592 via tolerance (n9, claim check 130) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 43) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 58) | pass 23.537 via tolerance (n5, claim check 130) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 43) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | run 2

Status: answer. 126 s. 10 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051248-7c0d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261009-051248-7c0d/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run2/home/sessions/20261009-051248-7c0d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 29) | pass 251.4051 via tolerance (n11, claim check 113) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 29) | pass 10.46729 via tolerance (n11, claim check 113) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 29) | pass 1743.628 via tolerance (n11, claim check 113) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 29) | pass 24.74066 via tolerance (n11, claim check 113) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 29) | pass 5.922138 via tolerance (n11, claim check 113) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 29) | pass 25.5918 via tolerance (n11, claim check 113) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 29) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 48) | pass 23.53654 via tolerance (n5, claim check 113) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 29) | not asked |

### bates2015-lme4-sleepstudy | claude:claude-haiku-5-5 | run 3

Status: answer. 91 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-051454-95ed. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261009-051454-95ed/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bates2015-lme4-sleepstudy/run3/home/sessions/20261009-051454-95ed/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fixed_intercept | 251.405 ±0.01 | pass 251.4051 (n4 metrics.estimate_Intercept, entry 33) | pass 251.405 via tolerance (n4, claim check 79) |
| fixed_days | 10.467 ±0.01 | pass 10.46729 (n4 metrics.estimate_Days, entry 33) | pass 10.467 via tolerance (n4, claim check 79) |
| reml_criterion | 1743.6 ±0.1 | pass 1743.628 (n4 metrics.criterion, entry 33) | pass 1743.63 via tolerance (n4, claim check 79) |
| sd_subject_intercept | 24.74 ±0.05 | pass 24.74066 (n4 metrics.sd_Subject_Intercept, entry 33) | pass 24.74 via tolerance (n4, claim check 79) |
| sd_subject_days | 5.92 ±0.05 | pass 5.922138 (n4 metrics.sd_Subject_Days, entry 33) | pass 5.92 via tolerance (n4, claim check 79) |
| sd_residual | 25.59 ±0.05 | pass 25.5918 (n4 metrics.sd_residual, entry 33) | pass 25.59 via tolerance (n4, claim check 79) |
| random_correlation | 0.066 ±0.01 | pass 0.06555124 (n4 metrics.corr_Subject, entry 33) | not asked |
| lrt_chi2_days | 23.54 ±0.1 | pass 23.53654 (n5 metrics.chisq, entry 48) | pass 23.537 via tolerance (n5, claim check 79) |
| n_subjects | 18 exact | pass 18 (n4 metrics.n_groups_Subject, entry 33) | not asked |

### bemis2015-cardinal | claude:claude-haiku-5-5 | run 1

Status: answer. 264 s. 11 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-051625-783e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bemis2015-cardinal/run1/home/sessions/20261009-051625-783e/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bemis2015-cardinal/run1/home/sessions/20261009-051625-783e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 18) | pass 4959 via tolerance (n5, claim check 158) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 18) | pass 10200 via tolerance (n1, claim check 158) |
| peaks | 687 ±10 | FAIL 727 (n10 data.segment_sizes.2, entry 84) | FAIL 727 (n17, claim check 158) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 64) | pass 6 via tolerance (n17, claim check 158) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 64) | pass 3 via tolerance (n17, claim check 158) |

### bemis2015-cardinal | claude:claude-haiku-5-5 | run 2

Status: answer. 196 s. 10 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-052049-950b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bemis2015-cardinal/run2/home/sessions/20261009-052049-950b/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bemis2015-cardinal/run2/home/sessions/20261009-052049-950b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 14) | pass 4959 via tolerance (n5, claim check 130) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 14) | pass 10200 via tolerance (n1, claim check 130) |
| peaks | 687 ±10 | FAIL 721 (n5 metrics.n_peaks, entry 42) | FAIL 721 (n5, claim check 130) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 63) | pass 6 via tolerance (n10, claim check 130) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 63) | pass 3 via tolerance (n10, claim check 130) |

### bemis2015-cardinal | claude:claude-haiku-5-5 | run 3

Status: answer. 359 s. 15 requests, 19 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-052405-0dd2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bemis2015-cardinal/run3/home/sessions/20261009-052405-0dd2/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/bemis2015-cardinal/run3/home/sessions/20261009-052405-0dd2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 18) | pass 4959 via tolerance (n5, claim check 191) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 18) | pass 10200 via tolerance (n1, claim check 191) |
| peaks | 687 ±10 | FAIL 723 (n10 data.segment_sizes.3, entry 99) | FAIL 723 (n16, claim check 191) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 76) | pass 6 via tolerance (n16, claim check 191) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 76) | pass 3 via tolerance (n13, claim check 191) |

### caicedo2019-bbbc039 | claude:claude-haiku-5-5 | run 1

Status: answer. 608 s. 15 requests, 15 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-053005-6b17. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/caicedo2019-bbbc039/run1/home/sessions/20261009-053005-6b17/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/caicedo2019-bbbc039/run1/home/sessions/20261009-053005-6b17/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n7 metrics.total_truth, entry 94) | pass 5720 via tolerance (n8, claim check 151) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n7 table.rows[12][8], entry 94) | match 0.2 via tolerance (n8, claim check 151) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2 (n8 stdout, entry 103) | match 0.2 via tolerance (n8, claim check 151) |

### caicedo2019-bbbc039 | claude:claude-haiku-5-5 | run 2

Status: answer. 1452 s. 18 requests, 18 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-054013-ffb4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/caicedo2019-bbbc039/run2/home/sessions/20261009-054013-ffb4/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/caicedo2019-bbbc039/run2/home/sessions/20261009-054013-ffb4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n8 metrics.total_truth, entry 98) | pass 5720 via tolerance (n9, claim check 177) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1837 (n8 table.rows[12][8], entry 98) | differs 0.0855 (n9, claim check 177) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2 (n5 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/caicedo2019-bbbc039/run2/home/sessions/20261009-054013-ffb4/work/segment_cells-3/IXMtest_A02_s1_w1051DAA7C-7042-435F-99F0-1E847D9B42CB_outlines.png, entry 66) | differs 0.0855 (n9, claim check 177) |

### caicedo2019-bbbc039 | claude:claude-haiku-5-5 | run 3

Status: answer. 602 s. 18 requests, 18 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-060429-4001. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/caicedo2019-bbbc039/run3/home/sessions/20261009-060429-4001/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/caicedo2019-bbbc039/run3/home/sessions/20261009-060429-4001/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n9 metrics.total_truth, entry 93) | pass 5720 via tolerance (n10, claim check 176) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1416 (n12 stdout, entry 138) | differs 0.0855 (n10, claim check 176) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2017 (n10 stdout, entry 102) | differs 0.0855 (n10, claim check 176) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 1

Status: answer. 102 s. 9 requests, 8 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061432-609f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261009-061432-609f/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261009-061432-609f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n2 metrics.pP1_10ul_z_prime, entry 49) | pass 0.541 via tolerance (n4, claim check 90) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n2 metrics.pP2_10ul_z_prime, entry 49) | pass 0.61 via tolerance (n3, claim check 90) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n2 metrics.pP3_10ul_z_prime, entry 49) | pass 0.728 via tolerance (n3, claim check 90) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n2 metrics.pP4_10ul_z_prime, entry 49) | pass 0.73 via tolerance (n3, claim check 90) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n2 metrics.pP5_10ul_z_prime, entry 49) | pass 0.664 via tolerance (n3, claim check 90) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n2 metrics.pP6_10ul_z_prime, entry 49) | pass 0.632 via tolerance (n3, claim check 90) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n2 metrics.pP7_10ul_z_prime, entry 49) | pass 0.767 via tolerance (n3, claim check 90) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n2 metrics.pP8_10ul_z_prime, entry 49) | pass 0.742 via tolerance (n3, claim check 90) |
| z10_p9 | 0.621 ±0.004 | pass 0.621 (n3 stdout, entry 58) | pass 0.621 via tolerance (n3, claim check 90) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n2 metrics.pP10_10ul_z_prime, entry 49) | pass 0.722 via tolerance (n3, claim check 90) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.pP2_20ul_z_prime, entry 49) | pass 0.522 via tolerance (n4, claim check 90) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.pP4_20ul_z_prime, entry 49) | pass 0.786 via tolerance (n3, claim check 90) |
| z20_p6 | 0.643 ±0.004 | pass 0.643 (n3 stdout, entry 58) | pass 0.643 via tolerance (n3, claim check 90) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.pP7_20ul_z_prime, entry 49) | pass 0.671 via tolerance (n3, claim check 90) |
| z20_p8 | 0.685 ±0.004 | pass 0.685 (n3 stdout, entry 58) | pass 0.685 via tolerance (n3, claim check 90) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.pP9_20ul_z_prime, entry 49) | pass 0.8 via tolerance (n3, claim check 90) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.pP10_20ul_z_prime, entry 49) | pass 0.728 via tolerance (n3, claim check 90) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n3 stdout, entry 58) | pass 2471.2 via tolerance (n3, claim check 90) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1 (n3 stdout, entry 58) | pass 268.1 via tolerance (n3, claim check 90) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.643 (n3 stdout, entry 58) | differs 0.643 (n3, claim check 90) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.852 (n3 stdout, entry 58) | differs 0.852 (n3, claim check 90) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 2

Status: answer. 99 s. 7 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-061614-1a7d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261009-061614-1a7d/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261009-061614-1a7d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n1 metrics.p1_z_prime, entry 36) | pass 0.541 via tolerance (n1, claim check 78) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n1 metrics.p2_z_prime, entry 36) | pass 0.61 via tolerance (n3, claim check 78) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n1 metrics.p3_z_prime, entry 36) | pass 0.728 via tolerance (n2, claim check 78) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n1 metrics.p4_z_prime, entry 36) | pass 0.73 via tolerance (n3, claim check 78) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n1 metrics.p5_z_prime, entry 36) | pass 0.664 via tolerance (n1, claim check 78) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n1 metrics.p6_z_prime, entry 36) | pass 0.632 via tolerance (n1, claim check 78) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n1 metrics.p7_z_prime, entry 36) | pass 0.767 via tolerance (n1, claim check 78) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n1 metrics.p8_z_prime, entry 36) | pass 0.742 via tolerance (n1, claim check 78) |
| z10_p9 | 0.621 ±0.004 | pass 0.6209891 (n1 metrics.p9_z_prime, entry 36) | pass 0.621 via tolerance (n1, claim check 78) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n1 metrics.p10_z_prime, entry 36) | pass 0.722 via tolerance (n1, claim check 78) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.p2_z_prime, entry 39) | pass 0.522 via tolerance (n2, claim check 78) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.p4_z_prime, entry 39) | pass 0.786 via tolerance (n2, claim check 78) |
| z20_p6 | 0.643 ±0.004 | pass 0.6429603 (n2 metrics.p6_z_prime, entry 39) | pass 0.643 via tolerance (n2, claim check 78) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.p7_z_prime, entry 39) | pass 0.671 via tolerance (n2, claim check 78) |
| z20_p8 | 0.685 ±0.004 | pass 0.6850474 (n2 metrics.p8_z_prime, entry 39) | pass 0.685 via tolerance (n2, claim check 78) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.p9_z_prime, entry 39) | pass 0.8 via tolerance (n3, claim check 78) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.p10_z_prime, entry 39) | pass 0.728 via tolerance (n2, claim check 78) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n1 metrics.p1_mean_high, entry 36) | pass 2471.2 via tolerance (n3, claim check 78) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.12 (n3 stdout, entry 48) | pass 268.1 via tolerance (n3, claim check 78) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.6429603 (n2 metrics.p6_z_prime, entry 39) | differs 0.643 (n2, claim check 78) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.85 (n3 stdout, entry 48) | differs 0.852 (n2, claim check 78) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 3

Status: answer. 61 s. 7 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061753-bc49. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261009-061753-bc49/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261009-061753-bc49/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n2 metrics.pP1_10ul_z_prime, entry 46) | pass 0.541 via tolerance (n3, claim check 78) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n2 metrics.pP2_10ul_z_prime, entry 46) | pass 0.61 via tolerance (n3, claim check 78) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n2 metrics.pP3_10ul_z_prime, entry 46) | pass 0.728 via tolerance (n3, claim check 78) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n2 metrics.pP4_10ul_z_prime, entry 46) | pass 0.73 via tolerance (n3, claim check 78) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n2 metrics.pP5_10ul_z_prime, entry 46) | pass 0.664 via tolerance (n3, claim check 78) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n2 metrics.pP6_10ul_z_prime, entry 46) | pass 0.632 via tolerance (n3, claim check 78) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n2 metrics.pP7_10ul_z_prime, entry 46) | pass 0.767 via tolerance (n3, claim check 78) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n2 metrics.pP8_10ul_z_prime, entry 46) | pass 0.742 via tolerance (n3, claim check 78) |
| z10_p9 | 0.621 ±0.004 | pass 0.621 (n3 stdout, entry 55) | pass 0.621 via tolerance (n3, claim check 78) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n2 metrics.pP10_10ul_z_prime, entry 46) | pass 0.722 via tolerance (n3, claim check 78) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.pP2_20ul_z_prime, entry 46) | pass 0.522 via tolerance (n4, claim check 78) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.pP4_20ul_z_prime, entry 46) | pass 0.786 via tolerance (n3, claim check 78) |
| z20_p6 | 0.643 ±0.004 | pass 0.643 (n3 stdout, entry 55) | pass 0.643 via tolerance (n3, claim check 78) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.pP7_20ul_z_prime, entry 46) | pass 0.671 via tolerance (n3, claim check 78) |
| z20_p8 | 0.685 ±0.004 | pass 0.685 (n3 stdout, entry 55) | pass 0.685 via tolerance (n3, claim check 78) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.pP9_20ul_z_prime, entry 46) | pass 0.8 via tolerance (n3, claim check 78) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.pP10_20ul_z_prime, entry 46) | pass 0.728 via tolerance (n3, claim check 78) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n2 metrics.pP1_10ul_mean_high, entry 46) | pass 2471.2 via tolerance (n3, claim check 78) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1 (n3 stdout, entry 55) | pass 268.1 via tolerance (n3, claim check 78) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.643 (n3 stdout, entry 55) | differs 0.643 (n3, claim check 78) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.852 (n3 stdout, entry 55) | differs 0.852 (n3, claim check 78) |

### delaney2004-esol | claude:claude-haiku-5-5 | run 1

Status: answer. 111 s. 10 requests, 9 tool calls (0 failed), 0 nudges, 1 plan reminders, 4 unsourced.
Session: 20261009-061854-ff7d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/delaney2004-esol/run1/home/sessions/20261009-061854-ff7d/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/delaney2004-esol/run1/home/sessions/20261009-061854-ff7d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 14) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 38) | pass 1018 via tolerance (n3, claim check 113) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 38) | pass 12 via tolerance (n3, claim check 113) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 38) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 56) | pass 0.7519 via tolerance (n5, claim check 113) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 56) | pass 1.0994 via tolerance (n5, claim check 113) |

### delaney2004-esol | claude:claude-haiku-5-5 | run 2

Status: answer. 131 s. 14 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 8 unsourced.
Session: 20261009-062046-b7d9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/delaney2004-esol/run2/home/sessions/20261009-062046-b7d9/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 8 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/delaney2004-esol/run2/home/sessions/20261009-062046-b7d9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 19) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 39) | pass 1018 via tolerance (n7, claim check 136) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 39) | pass 12 via tolerance (n7, claim check 136) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 39) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 57) | pass 0.7519 via tolerance (n5, claim check 136) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 57) | pass 1.0994 via tolerance (n5, claim check 136) |

### delaney2004-esol | claude:claude-haiku-5-5 | run 3

Status: answer. 97 s. 10 requests, 9 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-062256-62e2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/delaney2004-esol/run3/home/sessions/20261009-062256-62e2/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/delaney2004-esol/run3/home/sessions/20261009-062256-62e2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 14) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 36) | pass 1018 via tolerance (n3, claim check 108) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 36) | pass 12 via tolerance (n3, claim check 108) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 36) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 54) | pass 0.7519 via tolerance (n5, claim check 108) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 54) | pass 1.0994 via tolerance (n6, claim check 108) |

### gowers2016-mdanalysis | claude:claude-haiku-5-5 | run 1

Status: answer. 84 s. 7 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062433-8837. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gowers2016-mdanalysis/run1/home/sessions/20261009-062433-8837/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gowers2016-mdanalysis/run1/home/sessions/20261009-062433-8837/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 11) | pass 3341 via tolerance (n1, claim check 85) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 11) | pass 98 via tolerance (n5, claim check 85) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n4 metrics.rmsd_last, entry 29) | pass 6.82 via tolerance (n4, claim check 85) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n5 metrics.rg_last, entry 41) | pass 19.592 via tolerance (n5, claim check 85) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n6, claim check 85) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n6, claim check 85) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 48) | pass 7.131 via tolerance (n6, claim check 85) |

### gowers2016-mdanalysis | claude:claude-haiku-5-5 | run 2

Status: answer. 75 s. 9 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062559-5c03. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gowers2016-mdanalysis/run2/home/sessions/20261009-062559-5c03/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gowers2016-mdanalysis/run2/home/sessions/20261009-062559-5c03/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 11) | pass 3341 via tolerance (n1, claim check 97) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 11) | pass 98 via tolerance (n5, claim check 97) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n4 metrics.rmsd_last, entry 25) | pass 6.82 via tolerance (n4, claim check 97) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n5 metrics.rg_last, entry 46) | pass 19.592 via tolerance (n5, claim check 97) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n6, claim check 97) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n6, claim check 97) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 67) | pass 7.131 via tolerance (n6, claim check 97) |

### gowers2016-mdanalysis | claude:claude-haiku-5-5 | run 3

Status: answer. 76 s. 6 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062714-4227. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gowers2016-mdanalysis/run3/home/sessions/20261009-062714-4227/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gowers2016-mdanalysis/run3/home/sessions/20261009-062714-4227/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 11) | pass 3341 via tolerance (n1, claim check 76) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 11) | pass 98 via tolerance (n4, claim check 76) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n3 metrics.rmsd_last, entry 26) | pass 6.82 via tolerance (n3, claim check 76) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n4 metrics.rg_last, entry 38) | pass 19.592 via tolerance (n4, claim check 76) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n5, claim check 76) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n5, claim check 76) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n5 metrics.rmsd_after_fit, entry 45) | pass 7.131 via tolerance (n5, claim check 76) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 1

Status: answer. 78 s. 9 requests, 9 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-062831-7f64. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261009-062831-7f64/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run1/home/sessions/20261009-062831-7f64/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 11) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n9 metrics.effect, entry 71) | pass 1.238 via tolerance (n9, claim check 118) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n9 metrics.effect_ci_lo, entry 71) | pass 1.129 via tolerance (n9, claim check 118) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n9 metrics.effect_ci_hi, entry 71) | pass 1.358 via tolerance (n9, claim check 118) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 2

Status: answer. 160 s. 14 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-062949-f06f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261009-062949-f06f/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run2/home/sessions/20261009-062949-f06f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 11) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.2385 (n14 stdout, entry 130) | pass 1.238 via tolerance (n10, claim check 165) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.1292 (n14 stdout, entry 130) | pass 1.129 via tolerance (n14, claim check 165) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.3583 (n14 stdout, entry 130) | pass 1.358 via tolerance (n14, claim check 165) |

### hackshaw1997-ets-lung-cancer | claude:claude-haiku-5-5 | run 3

Status: answer. 145 s. 16 requests, 13 tool calls (0 failed), 0 nudges, 2 plan reminders, 0 unsourced.
Session: 20261009-063230-b1c7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261009-063230-b1c7/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hackshaw1997-ets-lung-cancer/run3/home/sessions/20261009-063230-b1c7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| k | 37 exact | pass 37 (n1 metrics.n_studies, entry 11) | not asked |
| or_pooled | 1.2385 ±0.005 | pass 1.238485 (n9 metrics.effect, entry 69) | pass 1.24 via tolerance (n13, claim check 172) |
| or_ci_lo | 1.1292 ±0.005 | pass 1.129224 (n9 metrics.effect_ci_lo, entry 69) | pass 1.13 via tolerance (n16, claim check 172) |
| or_ci_hi | 1.3583 ±0.005 | pass 1.358319 (n9 metrics.effect_ci_hi, entry 69) | pass 1.36 via tolerance (n13, claim check 172) |

### jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | run 1

Status: answer. 93 s. 7 requests, 17 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-063454-4d29. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261009-063454-4d29/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261009-063454-4d29/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 11) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 11) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 32) | pass 0.7856 via tolerance (n12, claim check 117) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 32) | pass 0.7404 via tolerance (n2, claim check 117) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 32) | pass 0.8309 via tolerance (n2, claim check 117) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 35) | pass 0.7294 via tolerance (n14, claim check 117) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 35) | pass 0.6799 via tolerance (n3, claim check 117) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 35) | pass 0.7789 via tolerance (n3, claim check 117) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 38) | pass 0.6596 via tolerance (n15, claim check 117) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 38) | pass 0.6061 via tolerance (n4, claim check 117) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 38) | pass 0.7131 via tolerance (n4, claim check 117) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 41) | pass 0.665 via tolerance (n15, claim check 117) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 41) | pass 0.612 via tolerance (n5, claim check 117) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 41) | pass 0.718 via tolerance (n5, claim check 117) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 53) | pass 0.6202 via tolerance (n6, claim check 117) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 53) | pass 0.9016 via tolerance (n6, claim check 117) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 56) | pass 0.5096 via tolerance (n7, claim check 117) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 56) | pass 0.9119 via tolerance (n7, claim check 117) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 59) | pass 0.4615 via tolerance (n8, claim check 117) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 59) | pass 0.8031 via tolerance (n8, claim check 117) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 62) | pass 0.5 via tolerance (n9, claim check 117) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 62) | pass 0.8083 via tolerance (n9, claim check 117) |

### jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | run 2

Status: answer. 95 s. 6 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063628-a067. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261009-063628-a067/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261009-063628-a067/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 11) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 11) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 30) | pass 0.7856 via tolerance (n2, claim check 88) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 30) | pass 0.7404 via tolerance (n2, claim check 88) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 30) | pass 0.8309 via tolerance (n2, claim check 88) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 33) | pass 0.7294 via tolerance (n3, claim check 88) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 33) | pass 0.6799 via tolerance (n3, claim check 88) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 33) | pass 0.7789 via tolerance (n3, claim check 88) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 36) | pass 0.6596 via tolerance (n4, claim check 88) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 36) | pass 0.6061 via tolerance (n4, claim check 88) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 36) | pass 0.7131 via tolerance (n4, claim check 88) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 39) | pass 0.665 via tolerance (n5, claim check 88) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 39) | pass 0.612 via tolerance (n5, claim check 88) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 39) | pass 0.718 via tolerance (n5, claim check 88) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 51) | pass 0.6202 via tolerance (n6, claim check 88) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 51) | pass 0.9016 via tolerance (n6, claim check 88) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 54) | pass 0.5096 via tolerance (n7, claim check 88) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 54) | pass 0.9119 via tolerance (n7, claim check 88) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 57) | pass 0.4615 via tolerance (n8, claim check 88) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 57) | pass 0.8031 via tolerance (n8, claim check 88) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 60) | pass 0.5 via tolerance (n9, claim check 88) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 60) | pass 0.8083 via tolerance (n9, claim check 88) |

### jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | run 3

Status: answer. 74 s. 5 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063803-1417. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261009-063803-1417/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261009-063803-1417/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 11) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 11) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 30) | pass 0.7856 via tolerance (n2, claim check 82) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 30) | pass 0.7404 via tolerance (n2, claim check 82) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 30) | pass 0.8309 via tolerance (n2, claim check 82) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 33) | pass 0.7294 via tolerance (n3, claim check 82) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 33) | pass 0.6799 via tolerance (n3, claim check 82) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 33) | pass 0.7789 via tolerance (n3, claim check 82) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 36) | pass 0.6596 via tolerance (n4, claim check 82) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 36) | pass 0.6061 via tolerance (n4, claim check 82) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 36) | pass 0.7131 via tolerance (n4, claim check 82) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 39) | pass 0.665 via tolerance (n5, claim check 82) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 39) | pass 0.612 via tolerance (n5, claim check 82) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 39) | pass 0.718 via tolerance (n5, claim check 82) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 51) | pass 0.6202 via tolerance (n6, claim check 82) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 51) | pass 0.9016 via tolerance (n6, claim check 82) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 54) | pass 0.5096 via tolerance (n7, claim check 82) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 54) | pass 0.9119 via tolerance (n7, claim check 82) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 57) | pass 0.4615 via tolerance (n8, claim check 82) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 57) | pass 0.8031 via tolerance (n8, claim check 82) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 60) | pass 0.5 via tolerance (n9, claim check 82) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 60) | pass 0.8083 via tolerance (n9, claim check 82) |

### kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | run 1

Status: answer. 136 s. 12 requests, 16 tool calls (1 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063917-22a2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261009-063917-22a2/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261009-063917-22a2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 11) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 29) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n2 table.rows[0][4], entry 29) | pass 0.492 via tolerance (n2, claim check 147) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n2 table.rows[1][4], entry 29) | pass 0.221 via tolerance (n2, claim check 147) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 29) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 29) | pass 0.00138 via tolerance (n2, claim check 147) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 45) | pass 1.92 via tolerance (n3, claim check 147) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 45) | pass 1.28 via tolerance (n3, claim check 147) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 45) | pass 2.88 via tolerance (n3, claim check 147) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 45) | pass 0.00167 via tolerance (n3, claim check 147) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n6 metrics.hr_mmp14_high, entry 61) | pass 1.55 via tolerance (n9, claim check 147) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n6 table.rows[0][5], entry 61) | pass 1.02 via tolerance (n10, claim check 147) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n6 table.rows[0][6], entry 61) | pass 2.35 via tolerance (n10, claim check 147) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n6 metrics.p_mmp14_high, entry 61) | pass 0.0399 via tolerance (n10, claim check 147) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n6 metrics.hr_age_ge67, entry 61) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n6 metrics.hr_stage2, entry 61) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n6 metrics.hr_stage3, entry 61) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n6 metrics.hr_stage4, entry 61) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n6 metrics.hr_diffuse, entry 61) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n7 metrics.hr_mmp14_high, entry 64) | pass 3.54 via tolerance (n7, claim check 147) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n7 table.rows[0][5], entry 64) | pass 1.51 via tolerance (n7, claim check 147) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n7 table.rows[0][6], entry 64) | pass 8.33 via tolerance (n7, claim check 147) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n7 metrics.p_mmp14_high, entry 64) | pass 0.00374 via tolerance (n7, claim check 147) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n8 metrics.hr_mmp14_high, entry 67) | pass 1.54 via tolerance (n8, claim check 147) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n8 metrics.p_mmp14_high, entry 67) | pass 0.0711 via tolerance (n8, claim check 147) |

### kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | run 2

Status: answer. 124 s. 10 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-064133-0386. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261009-064133-0386/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261009-064133-0386/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 11) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 30) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n2 table.rows[0][4], entry 30) | pass 0.492 via tolerance (n2, claim check 123) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n2 table.rows[1][4], entry 30) | pass 0.221 via tolerance (n2, claim check 123) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 30) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 30) | pass 0.00138 via tolerance (n8, claim check 123) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 51) | pass 1.92 via tolerance (n3, claim check 123) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 51) | pass 1.28 via tolerance (n3, claim check 123) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 51) | pass 2.88 via tolerance (n3, claim check 123) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 51) | pass 0.00167 via tolerance (n8, claim check 123) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 55) | pass 1.55 via tolerance (n4, claim check 123) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 55) | pass 1.02 via tolerance (n4, claim check 123) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 55) | pass 2.35 via tolerance (n4, claim check 123) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 55) | pass 0.0399 via tolerance (n8, claim check 123) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 55) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 55) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 55) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 55) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 55) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n5 metrics.hr_mmp14_high, entry 59) | pass 3.54 via tolerance (n5, claim check 123) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n5 table.rows[0][5], entry 59) | pass 1.51 via tolerance (n5, claim check 123) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n5 table.rows[0][6], entry 59) | pass 8.33 via tolerance (n5, claim check 123) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n5 metrics.p_mmp14_high, entry 59) | pass 0.00374 via tolerance (n8, claim check 123) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n6 metrics.hr_mmp14_high, entry 63) | pass 1.54 via tolerance (n6, claim check 123) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n6 metrics.p_mmp14_high, entry 63) | pass 0.0711 via tolerance (n8, claim check 123) |

### kasurinen2018-mmp14-gastric | claude:claude-haiku-5-5 | run 3

Status: answer. 133 s. 11 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-064337-6ec1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261009-064337-6ec1/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261009-064337-6ec1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 11) | not asked |
| events | 138 exact | pass 138 (n4 metrics.events, entry 31) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n4 table.rows[0][4], entry 31) | pass 0.492 via tolerance (n4, claim check 132) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n4 table.rows[1][4], entry 31) | pass 0.221 via tolerance (n9, claim check 132) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n4 metrics.logrank_chi2, entry 31) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n4 metrics.logrank_p, entry 31) | pass 0.0014 via tolerance (n4, claim check 132) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n5 metrics.hr_mmp14_high, entry 54) | pass 1.92 via tolerance (n5, claim check 132) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n5 table.rows[0][5], entry 54) | pass 1.28 via tolerance (n5, claim check 132) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n5 table.rows[0][6], entry 54) | pass 2.88 via tolerance (n5, claim check 132) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n5 metrics.p_mmp14_high, entry 54) | pass 0.0017 via tolerance (n5, claim check 132) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n6 metrics.hr_mmp14_high, entry 63) | pass 1.55 via tolerance (n10, claim check 132) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n6 table.rows[0][5], entry 63) | pass 1.02 via tolerance (n6, claim check 132) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n6 table.rows[0][6], entry 63) | pass 2.35 via tolerance (n6, claim check 132) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n6 metrics.p_mmp14_high, entry 63) | pass 0.04 via tolerance (n6, claim check 132) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n6 metrics.hr_age_ge67, entry 63) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n6 metrics.hr_stage2, entry 63) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n6 metrics.hr_stage3, entry 63) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n6 metrics.hr_stage4, entry 63) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n6 metrics.hr_diffuse, entry 63) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n7 metrics.hr_mmp14_high, entry 67) | pass 3.54 via tolerance (n10, claim check 132) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n7 table.rows[0][5], entry 67) | pass 1.51 via tolerance (n7, claim check 132) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n7 table.rows[0][6], entry 67) | pass 8.33 via tolerance (n7, claim check 132) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n7 metrics.p_mmp14_high, entry 67) | pass 0.0037 via tolerance (n7, claim check 132) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n8 metrics.hr_mmp14_high, entry 71) | pass 1.54 via tolerance (n10, claim check 132) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n8 metrics.p_mmp14_high, entry 71) | pass 0.071 via tolerance (n8, claim check 132) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 1

Status: answer. 480 s. 30 requests, 31 tool calls (2 failed), 0 nudges, 1 plan reminders, 15 unsourced.
Session: 20261009-064551-a408. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261009-064551-a408/log.jsonl
Leak check: 19 paths read, 0 outside the allow list, 0 blocked, 15 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261009-064551-a408/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.002393 (n14 metrics.mean, entry 148) | pass 1.06 via tolerance (n13, claim check 325) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n13 table.rows[2][3], entry 140) | pass 1.64 via tolerance (n13, claim check 325) |
| clisi_before | 1 ±0.02 | pass 1 (n14 metrics.median, entry 148) | pass 1 via tolerance (n27, claim check 325) |
| clisi_after | 1 ±0.02 | pass 1 (n14 metrics.median, entry 148) | pass 1 via tolerance (n27, claim check 325) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n6 table.rows[0][1], entry 73) | pass 3255 via tolerance (n12, claim check 325) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n6 table.rows[2][1], entry 73) | differs 2885 (n18, claim check 325) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n12 table.rows[0][2], entry 133) | differs 1773 (n12, claim check 325) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n12 table.rows[1][2], entry 133) | differs 1615 (n12, claim check 325) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 2

Status: answer. 561 s. 32 requests, 39 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-065354-1465. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261009-065354-1465/log.jsonl
Leak check: 24 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261009-065354-1465/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.002393 (n14 metrics.mean, entry 144) | pass 1.06 via tolerance (n13, claim check 361) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n13 table.rows[2][3], entry 140) | pass 1.64 via tolerance (n23, claim check 361) |
| clisi_before | 1 ±0.02 | pass 1 (n14 metrics.median, entry 144) | pass 1 via tolerance (n38, claim check 361) |
| clisi_after | 1 ±0.02 | pass 1 (n14 metrics.median, entry 144) | pass 1 via tolerance (n38, claim check 361) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n7 table.rows[0][1], entry 83) | pass 3255 via tolerance (n12, claim check 361) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2842 (n39 table.rows[0][1], entry 342) | differs 2842 (n39, claim check 361) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n12 table.rows[0][2], entry 133) | differs 1773 (n12, claim check 361) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n12 table.rows[1][2], entry 133) | differs 1615 (n12, claim check 361) |

