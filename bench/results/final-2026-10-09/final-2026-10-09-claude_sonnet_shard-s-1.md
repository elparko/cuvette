# Paper benchmark 2026-10-09

Models: claude:claude-sonnet-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 327/327 | 255/257 | 32 | 2 timeout |

## Matrix

| Paper | claude:claude-sonnet-5-5 |
| --- | --- |
| aledo2022-renz-onpg | 6/6 / 6/6 |
| andrews-fastqc | 21/21 / 9/9 |
| belenky2003-sleepstudy | 18/18 / 6/6 |
| caicedo2019-bbbc039 | 3/3 / 1/3 (2 timeout) |
| danecek2021-bcftools | 18/18 / 15/15 |
| gowers2016-mdanalysis | 21/21 / 21/21 |
| hildyard2021-embryo-refgenes | 54/54 / 48/48 |
| kasurinen2018-mmp14-gastric | 75/75 / 51/51 |
| lackey2015-tb-default | 90/90 / 84/84 |
| liao2025-scanpy-bone-marrow | 15/15 / 12/12 |
| mahbod2024-nuinsseg | 6/6 / 2/2 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 32 | 7092 | 223 | 578 | 131532 | 3490641 | 299 | 15 | 1 | 0 | 28 | 91 | 92 | 17 | 44 | 16 | 16 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-sonnet-5-5: $4.35 for 32 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aledo2022-renz-onpg | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 1 | 10 | 0 |
| aledo2022-renz-onpg | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 1 | 0 | 0 |
| aledo2022-renz-onpg | claude:claude-sonnet-5-5 | 3 | on | 1 | 0 | 1 | 0 | 0 |
| andrews-fastqc | claude:claude-sonnet-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| andrews-fastqc | claude:claude-sonnet-5-5 | 2 | on | 4 | 0 | 0 | 7 | 0 |
| andrews-fastqc | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 0 | 6 | 0 |
| belenky2003-sleepstudy | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| belenky2003-sleepstudy | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-sonnet-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-sonnet-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| caicedo2019-bbbc039 | claude:claude-sonnet-5-5 | 3 | on | 6 | 0 | 0 | 0 | 0 |
| danecek2021-bcftools | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |
| danecek2021-bcftools | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| danecek2021-bcftools | claude:claude-sonnet-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-sonnet-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-sonnet-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-sonnet-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 2 | 2 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-sonnet-5-5 | 2 | on | 3 | 0 | 2 | 2 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 2 | 1 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-sonnet-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-sonnet-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| kasurinen2018-mmp14-gastric | claude:claude-sonnet-5-5 | 3 | on | 6 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-sonnet-5-5 | 2 | on | 3 | 0 | 1 | 0 | 0 |
| lackey2015-tb-default | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 5 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-sonnet-5-5 | 2 | on | 9 | 0 | 0 | 10 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-sonnet-5-5 | 3 | on | 9 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |

## Details

### aledo2022-renz-onpg | claude:claude-sonnet-5-5 | run 1

Status: answer. 40 s. 6 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 10 unsourced.
Session: 20261009-045914-c9ed. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/aledo2022-renz-onpg/run1/home/sessions/20261009-045914-c9ed/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 10 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/aledo2022-renz-onpg/run1/home/sessions/20261009-045914-c9ed/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 27) | pass 2.479 via tolerance (n1, claim check 54) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 27) | pass 0.1841 via tolerance (n1, claim check 54) |

### aledo2022-renz-onpg | claude:claude-sonnet-5-5 | run 2

Status: answer. 36 s. 6 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-045954-ba66. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/aledo2022-renz-onpg/run2/home/sessions/20261009-045954-ba66/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/aledo2022-renz-onpg/run2/home/sessions/20261009-045954-ba66/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 29) | pass 2.479 via tolerance (n1, claim check 58) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 29) | pass 0.1841 via tolerance (n1, claim check 58) |

### aledo2022-renz-onpg | claude:claude-sonnet-5-5 | run 3

Status: answer. 30 s. 5 requests, 4 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050030-5b25. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/aledo2022-renz-onpg/run3/home/sessions/20261009-050030-5b25/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/aledo2022-renz-onpg/run3/home/sessions/20261009-050030-5b25/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 27) | pass 2.479 via tolerance (n1, claim check 46) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 27) | pass 0.1841 via tolerance (n1, claim check 46) |

### andrews-fastqc | claude:claude-sonnet-5-5 | run 1

Status: answer. 69 s. 6 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050100-6668. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andrews-fastqc/run1/home/sessions/20261009-050100-6668/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andrews-fastqc/run1/home/sessions/20261009-050100-6668/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 18) | pass 250000 via tolerance (n6, claim check 64) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 21) | pass 395288 via tolerance (n6, claim check 64) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 18) | pass 40 via tolerance (n6, claim check 64) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 18) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 21) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 18) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 21) | not asked |

### andrews-fastqc | claude:claude-sonnet-5-5 | run 2

Status: answer. 85 s. 7 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 7 unsourced.
Session: 20261009-050209-9331. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andrews-fastqc/run2/home/sessions/20261009-050209-9331/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 7 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andrews-fastqc/run2/home/sessions/20261009-050209-9331/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 18) | pass 250000 via tolerance (n4, claim check 71) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 21) | pass 395288 via tolerance (n4, claim check 71) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 18) | pass 40 via tolerance (n4, claim check 71) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 18) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 21) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 18) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 21) | not asked |

### andrews-fastqc | claude:claude-sonnet-5-5 | run 3

Status: answer. 76 s. 7 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-050335-1ab7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andrews-fastqc/run3/home/sessions/20261009-050335-1ab7/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/andrews-fastqc/run3/home/sessions/20261009-050335-1ab7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 19) | pass 250000 via tolerance (n1, claim check 76) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 23) | pass 395288 via tolerance (n2, claim check 76) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 19) | pass 40 via tolerance (n5, claim check 76) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 19) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 23) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 19) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 23) | not asked |

### belenky2003-sleepstudy | claude:claude-sonnet-5-5 | run 1

Status: answer. 42 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050451-663a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/belenky2003-sleepstudy/run1/home/sessions/20261009-050451-663a/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/belenky2003-sleepstudy/run1/home/sessions/20261009-050451-663a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.467 (n3 stdout, entry 45) | pass 10.47 via tolerance (n2, claim check 67) |
| intercept | 251.405 ±0.01 | pass 251.405 (n3 stdout, entry 45) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 35) | pass 1.55 via tolerance (n2, claim check 67) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 35) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 35) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 35) | not asked |

### belenky2003-sleepstudy | claude:claude-sonnet-5-5 | run 2

Status: answer. 31 s. 4 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050533-e125. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/belenky2003-sleepstudy/run2/home/sessions/20261009-050533-e125/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/belenky2003-sleepstudy/run2/home/sessions/20261009-050533-e125/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 30) | pass 10.47 via tolerance (n3, claim check 51) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 30) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 30) | pass 1.55 via tolerance (n3, claim check 51) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 30) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 30) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 30) | not asked |

### belenky2003-sleepstudy | claude:claude-sonnet-5-5 | run 3

Status: answer. 52 s. 9 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050604-5b26. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/belenky2003-sleepstudy/run3/home/sessions/20261009-050604-5b26/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/belenky2003-sleepstudy/run3/home/sessions/20261009-050604-5b26/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| days_slope | 10.467 ±0.01 | pass 10.46729 (n2 metrics.coef_Days, entry 35) | pass 10.47 via tolerance (n4, claim check 85) |
| intercept | 251.405 ±0.01 | pass 251.4051 (n2 metrics.coef_Intercept, entry 35) | not asked |
| se_days_random_slope | 1.546 ±0.01 | pass 1.545788 (n2 metrics.se_Days, entry 35) | pass 1.546 via tolerance (n3, claim check 85) |
| intercept_variance | 612.1 ±0.5 | pass 612.0965 (n2 metrics.group_variance, entry 35) | not asked |
| slope_variance | 35.07 ±0.1 | pass 35.07162 (n2 metrics.slope_variance, entry 35) | not asked |
| residual_variance | 654.94 ±0.5 | pass 654.9405 (n2 metrics.residual_variance, entry 35) | not asked |

### caicedo2019-bbbc039 | claude:claude-sonnet-5-5 | run 1

Status: answer. 406 s. 10 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050656-2169. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/caicedo2019-bbbc039/run1/home/sessions/20261009-050656-2169/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/caicedo2019-bbbc039/run1/home/sessions/20261009-050656-2169/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n7 metrics.total_truth, entry 68) | pass 5720 via tolerance (n8, claim check 102) |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1452 (n8 stdout, entry 76) | match 0.184 via tolerance (n8, claim check 102) |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2017 (n8 stdout, entry 76) | match 0.202 via tolerance (n4, claim check 102) |

### caicedo2019-bbbc039 | claude:claude-sonnet-5-5 | run 2

Status: timeout. 1860 s. 7 requests, 12 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051343-97b1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/caicedo2019-bbbc039/run2/home/sessions/20261009-051343-97b1/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/caicedo2019-bbbc039/run2/home/sessions/20261009-051343-97b1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n7 metrics.total_truth, entry 69) | FAIL - |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1452 (n8 stdout, entry 77) | differs - |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2017 (n8 stdout, entry 77) | differs - |

### caicedo2019-bbbc039 | claude:claude-sonnet-5-5 | run 3

Status: timeout. 1860 s. 8 requests, 14 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-054444-2d98. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/caicedo2019-bbbc039/run3/home/sessions/20261009-054444-2d98/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/caicedo2019-bbbc039/run3/home/sessions/20261009-054444-2d98/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| true_nuclei_test | 5720 exact | pass 5720 (n7 metrics.total_truth, entry 69) | FAIL - |
| missed_fraction_advanced (reference) | 0.155 ±0.05 | match 0.1452 (n10 stdout, entry 85) | differs - |
| missed_fraction_basic (reference) | 0.201 ±0.05 | match 0.2017 (n10 stdout, entry 85) | differs - |

### danecek2021-bcftools | claude:claude-sonnet-5-5 | run 1

Status: answer. 40 s. 4 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-061544-2c71. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/danecek2021-bcftools/run1/home/sessions/20261009-061544-2c71/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/danecek2021-bcftools/run1/home/sessions/20261009-061544-2c71/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 16) | pass 1955 via tolerance (n1, claim check 41) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 16) | pass 248 via tolerance (n1, claim check 41) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 16) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 16) | pass 2.2 via tolerance (n1, claim check 41) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 19) | pass 1137 via tolerance (n2, claim check 41) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 22) | pass 328 via tolerance (n3, claim check 41) |

### danecek2021-bcftools | claude:claude-sonnet-5-5 | run 2

Status: answer. 50 s. 6 requests, 6 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061624-0c50. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/danecek2021-bcftools/run2/home/sessions/20261009-061624-0c50/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/danecek2021-bcftools/run2/home/sessions/20261009-061624-0c50/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 18) | pass 1955 via tolerance (n1, claim check 54) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 18) | pass 248 via tolerance (n1, claim check 54) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 18) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 18) | pass 2.2 via tolerance (n1, claim check 54) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 21) | pass 1137 via tolerance (n2, claim check 54) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 24) | pass 328 via tolerance (n3, claim check 54) |

### danecek2021-bcftools | claude:claude-sonnet-5-5 | run 3

Status: answer. 21 s. 2 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061715-cc96. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/danecek2021-bcftools/run3/home/sessions/20261009-061715-cc96/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/danecek2021-bcftools/run3/home/sessions/20261009-061715-cc96/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 11) | pass 1955 via tolerance (n1, claim check 28) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 11) | pass 248 via tolerance (n1, claim check 28) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 11) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 11) | pass 2.2 via tolerance (n1, claim check 28) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 14) | pass 1137 via tolerance (n2, claim check 28) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 17) | pass 328 via tolerance (n3, claim check 28) |

### gowers2016-mdanalysis | claude:claude-sonnet-5-5 | run 1

Status: answer. 47 s. 4 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061735-8578. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gowers2016-mdanalysis/run1/home/sessions/20261009-061735-8578/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gowers2016-mdanalysis/run1/home/sessions/20261009-061735-8578/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 11) | pass 3341 via tolerance (n1, claim check 56) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 11) | pass 98 via tolerance (n4, claim check 56) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n3 metrics.rmsd_last, entry 22) | pass 6.82 via tolerance (n3, claim check 56) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n4 metrics.rg_last, entry 29) | pass 19.59 via tolerance (n4, claim check 56) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n5, claim check 56) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n5, claim check 56) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n5 metrics.rmsd_after_fit, entry 36) | pass 7.13 via tolerance (n5, claim check 56) |

### gowers2016-mdanalysis | claude:claude-sonnet-5-5 | run 2

Status: answer. 49 s. 4 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061823-cf19. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gowers2016-mdanalysis/run2/home/sessions/20261009-061823-cf19/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gowers2016-mdanalysis/run2/home/sessions/20261009-061823-cf19/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 11) | pass 3341 via tolerance (n1, claim check 57) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 11) | pass 98 via tolerance (n4, claim check 57) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n3 metrics.rmsd_last, entry 22) | pass 6.82 via tolerance (n3, claim check 57) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n4 metrics.rg_last, entry 29) | pass 19.59 via tolerance (n4, claim check 57) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n5, claim check 57) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n5, claim check 57) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n5 metrics.rmsd_after_fit, entry 36) | pass 7.13 via tolerance (n5, claim check 57) |

### gowers2016-mdanalysis | claude:claude-sonnet-5-5 | run 3

Status: answer. 41 s. 4 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061913-37e0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gowers2016-mdanalysis/run3/home/sessions/20261009-061913-37e0/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gowers2016-mdanalysis/run3/home/sessions/20261009-061913-37e0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 11) | pass 3341 via tolerance (n1, claim check 58) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 11) | pass 98 via tolerance (n4, claim check 58) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n3 metrics.rmsd_last, entry 21) | pass 6.82 via tolerance (n3, claim check 58) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n4 metrics.rg_last, entry 28) | pass 19.59 via tolerance (n4, claim check 58) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n5, claim check 58) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 14) | pass 214 via tolerance (n5, claim check 58) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n5 metrics.rmsd_after_fit, entry 35) | pass 7.13 via tolerance (n5, claim check 58) |

### hildyard2021-embryo-refgenes | claude:claude-sonnet-5-5 | run 1

Status: answer. 76 s. 6 requests, 9 tool calls (2 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-061955-248f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261009-061955-248f/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 2 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261009-061955-248f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 46) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 46) | pass 0.2175 via tolerance (n2, claim check 85) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 46) | pass 0.5275 via tolerance (n2, claim check 85) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 46) | pass 0.441 via tolerance (n2, claim check 85) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 46) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 46) | pass 14 via tolerance (n4, claim check 85) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 46) | pass 0.06864 via tolerance (n2, claim check 85) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 46) | pass 0.1348 via tolerance (n1, claim check 85) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 46) | pass 0.481 via tolerance (n1, claim check 85) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 54) | pass 0.08103 via tolerance (n2, claim check 85) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 54) | pass 0.1805 via tolerance (n2, claim check 85) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n3 metrics.genorm_best_pair_M, entry 57) | pass 0.1142 via tolerance (n3, claim check 85) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n4 metrics.slope_GAPDH, entry 60) | pass -3.4557 via tolerance (n4, claim check 85) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n4 metrics.slope_HTATSF1, entry 60) | pass -3.1799 via tolerance (n4, claim check 85) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n4 metrics.slope_UBC, entry 60) | pass -3.3788 via tolerance (n4, claim check 85) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n4 metrics.efficiency_CYC1, entry 60) | pass 1.945 via tolerance (n4, claim check 85) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n4 metrics.efficiency_PAK1IP1, entry 60) | pass 2.012 via tolerance (n4, claim check 85) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n4 metrics.slope_ACTB, entry 60) | pass -3.2993 via tolerance (n4, claim check 85) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n4 metrics.slope_SDHA, entry 60) | differs -3.2331 (n4, claim check 85) |

### hildyard2021-embryo-refgenes | claude:claude-sonnet-5-5 | run 2

Status: answer. 81 s. 8 requests, 9 tool calls (2 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-062111-f733. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261009-062111-f733/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 2 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261009-062111-f733/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 42) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 42) | pass 0.2175 via tolerance (n1, claim check 91) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 42) | pass 0.5275 via tolerance (n1, claim check 91) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 42) | pass 0.441 via tolerance (n1, claim check 91) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 42) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 42) | pass 14 via tolerance (n4, claim check 91) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 42) | pass 0.06864 via tolerance (n1, claim check 91) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 42) | pass 0.1348 via tolerance (n1, claim check 91) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 42) | pass 0.481 via tolerance (n1, claim check 91) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 57) | pass 0.081 via tolerance (n2, claim check 91) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 57) | pass 0.1805 via tolerance (n2, claim check 91) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n3 metrics.genorm_best_pair_M, entry 64) | pass 0.1142 via tolerance (n3, claim check 91) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n4 metrics.slope_GAPDH, entry 67) | pass -3.4557 via tolerance (n4, claim check 91) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n4 metrics.slope_HTATSF1, entry 67) | pass -3.1799 via tolerance (n4, claim check 91) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n4 metrics.slope_UBC, entry 67) | pass -3.3788 via tolerance (n4, claim check 91) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n4 metrics.efficiency_CYC1, entry 67) | pass 1.945 via tolerance (n4, claim check 91) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n4 metrics.efficiency_PAK1IP1, entry 67) | pass 2.012 via tolerance (n4, claim check 91) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n4 metrics.slope_ACTB, entry 67) | pass -3.2993 via tolerance (n4, claim check 91) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n4 metrics.slope_SDHA, entry 67) | differs -3.2331 (n4, claim check 91) |

### hildyard2021-embryo-refgenes | claude:claude-sonnet-5-5 | run 3

Status: answer. 84 s. 7 requests, 8 tool calls (2 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-062232-0492. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261009-062232-0492/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 2 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261009-062232-0492/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 43) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 43) | pass 0.2175 via tolerance (n1, claim check 86) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 43) | pass 0.5275 via tolerance (n1, claim check 86) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 43) | pass 0.441 via tolerance (n1, claim check 86) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 43) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 43) | pass 14 via tolerance (n4, claim check 86) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 43) | pass 0.0686 via tolerance (n1, claim check 86) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 43) | pass 0.1348 via tolerance (n1, claim check 86) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 43) | pass 0.481 via tolerance (n1, claim check 86) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 51) | pass 0.081 via tolerance (n2, claim check 86) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 51) | pass 0.1805 via tolerance (n2, claim check 86) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n3 metrics.genorm_best_pair_M, entry 58) | pass 0.1142 via tolerance (n3, claim check 86) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n4 metrics.slope_GAPDH, entry 61) | pass -3.456 via tolerance (n4, claim check 86) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n4 metrics.slope_HTATSF1, entry 61) | pass -3.18 via tolerance (n4, claim check 86) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n4 metrics.slope_UBC, entry 61) | pass -3.379 via tolerance (n4, claim check 86) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n4 metrics.efficiency_CYC1, entry 61) | pass 1.945 via tolerance (n4, claim check 86) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n4 metrics.efficiency_PAK1IP1, entry 61) | pass 2.012 via tolerance (n4, claim check 86) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n4 metrics.slope_ACTB, entry 61) | pass -3.299 via tolerance (n4, claim check 86) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n4 metrics.slope_SDHA, entry 61) | differs -3.233 (n4, claim check 86) |

### kasurinen2018-mmp14-gastric | claude:claude-sonnet-5-5 | run 1

Status: answer. 58 s. 6 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062356-b83e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261009-062356-b83e/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kasurinen2018-mmp14-gastric/run1/home/sessions/20261009-062356-b83e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 11) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 24) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n2 table.rows[0][4], entry 24) | pass 0.492 via tolerance (n2, claim check 75) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n2 table.rows[1][4], entry 24) | pass 0.221 via tolerance (n2, claim check 75) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 24) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 24) | pass 0.00138 via tolerance (n2, claim check 75) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 40) | pass 1.92 via tolerance (n3, claim check 75) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 40) | pass 1.28 via tolerance (n3, claim check 75) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 40) | pass 2.88 via tolerance (n3, claim check 75) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 40) | pass 0.00167 via tolerance (n3, claim check 75) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 49) | pass 1.55 via tolerance (n4, claim check 75) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 49) | pass 1.02 via tolerance (n4, claim check 75) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 49) | pass 2.35 via tolerance (n4, claim check 75) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 49) | pass 0.0399 via tolerance (n4, claim check 75) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 49) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 49) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 49) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 49) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 49) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n5 metrics.hr_mmp14_high, entry 52) | pass 3.54 via tolerance (n5, claim check 75) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n5 table.rows[0][5], entry 52) | pass 1.51 via tolerance (n5, claim check 75) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n5 table.rows[0][6], entry 52) | pass 8.33 via tolerance (n5, claim check 75) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n5 metrics.p_mmp14_high, entry 52) | pass 0.00374 via tolerance (n5, claim check 75) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n6 metrics.hr_mmp14_high, entry 55) | pass 1.54 via tolerance (n6, claim check 75) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n6 metrics.p_mmp14_high, entry 55) | pass 0.0711 via tolerance (n6, claim check 75) |

### kasurinen2018-mmp14-gastric | claude:claude-sonnet-5-5 | run 2

Status: answer. 58 s. 6 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062454-7a2d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261009-062454-7a2d/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kasurinen2018-mmp14-gastric/run2/home/sessions/20261009-062454-7a2d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 11) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 24) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n2 table.rows[0][4], entry 24) | pass 0.492 via tolerance (n2, claim check 76) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n2 table.rows[1][4], entry 24) | pass 0.221 via tolerance (n2, claim check 76) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 24) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 24) | pass 0.00138 via tolerance (n2, claim check 76) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n3 metrics.hr_mmp14_high, entry 40) | pass 1.92 via tolerance (n3, claim check 76) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n3 table.rows[0][5], entry 40) | pass 1.28 via tolerance (n3, claim check 76) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n3 table.rows[0][6], entry 40) | pass 2.88 via tolerance (n3, claim check 76) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n3 metrics.p_mmp14_high, entry 40) | pass 0.00167 via tolerance (n3, claim check 76) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n4 metrics.hr_mmp14_high, entry 43) | pass 1.55 via tolerance (n4, claim check 76) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n4 table.rows[0][5], entry 43) | pass 1.02 via tolerance (n4, claim check 76) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n4 table.rows[0][6], entry 43) | pass 2.35 via tolerance (n4, claim check 76) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n4 metrics.p_mmp14_high, entry 43) | pass 0.0399 via tolerance (n4, claim check 76) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n4 metrics.hr_age_ge67, entry 43) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n4 metrics.hr_stage2, entry 43) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n4 metrics.hr_stage3, entry 43) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n4 metrics.hr_stage4, entry 43) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n4 metrics.hr_diffuse, entry 43) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n5 metrics.hr_mmp14_high, entry 46) | pass 3.54 via tolerance (n5, claim check 76) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n5 table.rows[0][5], entry 46) | pass 1.51 via tolerance (n5, claim check 76) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n5 table.rows[0][6], entry 46) | pass 8.33 via tolerance (n5, claim check 76) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n5 metrics.p_mmp14_high, entry 46) | pass 0.00374 via tolerance (n5, claim check 76) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n6 metrics.hr_mmp14_high, entry 49) | pass 1.54 via tolerance (n6, claim check 76) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n6 metrics.p_mmp14_high, entry 49) | pass 0.0711 via tolerance (n6, claim check 76) |

### kasurinen2018-mmp14-gastric | claude:claude-sonnet-5-5 | run 3

Status: answer. 59 s. 6 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062552-e474. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261009-062552-e474/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/kasurinen2018-mmp14-gastric/run3/home/sessions/20261009-062552-e474/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 11) | not asked |
| events | 138 exact | pass 138 (n4 metrics.events, entry 32) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n4 table.rows[0][4], entry 32) | pass 0.492 via tolerance (n4, claim check 84) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n4 table.rows[1][4], entry 32) | pass 0.221 via tolerance (n4, claim check 84) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n4 metrics.logrank_chi2, entry 32) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n4 metrics.logrank_p, entry 32) | pass 0.00138 via tolerance (n4, claim check 84) |
| hr_unadjusted | 1.918 ±0.005 | pass 1.918004 (n5 metrics.hr_mmp14_high, entry 48) | pass 1.92 via tolerance (n5, claim check 84) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | pass 1.277805 (n5 table.rows[0][5], entry 48) | pass 1.28 via tolerance (n5, claim check 84) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | pass 2.878953 (n5 table.rows[0][6], entry 48) | pass 2.88 via tolerance (n5, claim check 84) |
| p_unadjusted | 0.00167 ±0.0002 | pass 0.001672369 (n5 metrics.p_mmp14_high, entry 48) | pass 0.00167 via tolerance (n5, claim check 84) |
| hr_adjusted | 1.5487 ±0.005 | pass 1.548716 (n6 metrics.hr_mmp14_high, entry 51) | pass 1.55 via tolerance (n6, claim check 84) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | pass 1.020453 (n6 table.rows[0][5], entry 51) | pass 1.02 via tolerance (n6, claim check 84) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | pass 2.35045 (n6 table.rows[0][6], entry 51) | pass 2.35 via tolerance (n6, claim check 84) |
| p_adjusted | 0.0399 ±0.0005 | pass 0.03987094 (n6 metrics.p_mmp14_high, entry 51) | pass 0.0399 via tolerance (n6, claim check 84) |
| hr_age_ge67 | 2.516 ±0.01 | pass 2.515643 (n6 metrics.hr_age_ge67, entry 51) | not asked |
| hr_stage2 | 6.876 ±0.02 | pass 6.875289 (n6 metrics.hr_stage2, entry 51) | not asked |
| hr_stage3 | 22.01 ±0.05 | pass 22.01381 (n6 metrics.hr_stage3, entry 51) | not asked |
| hr_stage4 | 74.45 ±0.2 | pass 74.45261 (n6 metrics.hr_stage4, entry 51) | not asked |
| hr_diffuse | 2.232 ±0.005 | pass 2.232204 (n6 metrics.hr_diffuse, entry 51) | not asked |
| hr_intestinal | 3.542 ±0.005 | pass 3.542426 (n7 metrics.hr_mmp14_high, entry 54) | pass 3.54 via tolerance (n7, claim check 84) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | pass 1.50659 (n7 table.rows[0][5], entry 54) | pass 1.51 via tolerance (n7, claim check 84) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | pass 8.329265 (n7 table.rows[0][6], entry 54) | pass 8.33 via tolerance (n7, claim check 84) |
| p_intestinal | 0.00374 ±0.0005 | pass 0.003737309 (n7 metrics.p_mmp14_high, entry 54) | pass 0.00374 via tolerance (n7, claim check 84) |
| hr_diffuse_type | 1.5355 ±0.005 | pass 1.535523 (n8 metrics.hr_mmp14_high, entry 57) | pass 1.54 via tolerance (n8, claim check 84) |
| p_diffuse_type | 0.0711 ±0.001 | pass 0.07105189 (n8 metrics.p_mmp14_high, entry 57) | pass 0.0711 via tolerance (n8, claim check 84) |

### lackey2015-tb-default | claude:claude-sonnet-5-5 | run 1

Status: answer. 66 s. 9 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062652-fd93. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lackey2015-tb-default/run1/home/sessions/20261009-062652-fd93/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lackey2015-tb-default/run1/home/sessions/20261009-062652-fd93/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 11) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 62) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 29) | pass 0.00604 via tolerance (n8, claim check 101) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 32) | pass 0.00003945 via tolerance (n8, claim check 101) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 35) | pass 0.6815 via tolerance (n4, claim check 101) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 38) | pass 0.0344 via tolerance (n8, claim check 101) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 62) | pass 4.782 via tolerance (n7, claim check 101) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 62) | pass 3.052 via tolerance (n7, claim check 101) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 62) | pass 7.491 via tolerance (n7, claim check 101) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 62) | pass 2.08 via tolerance (n7, claim check 101) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 62) | pass 1.214 via tolerance (n7, claim check 101) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 62) | pass 3.563 via tolerance (n7, claim check 101) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 62) | pass 0.878 via tolerance (n7, claim check 101) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 62) | pass 0.444 via tolerance (n7, claim check 101) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 62) | pass 1.733 via tolerance (n7, claim check 101) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 62) | pass 3.038 via tolerance (n7, claim check 101) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 62) | pass 1.578 via tolerance (n7, claim check 101) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 62) | pass 5.851 via tolerance (n7, claim check 101) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 62) | pass 2.222 via tolerance (n7, claim check 101) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 62) | pass 1.401 via tolerance (n7, claim check 101) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 62) | pass 3.525 via tolerance (n7, claim check 101) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 62) | pass 2.303 via tolerance (n7, claim check 101) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 62) | pass 1.5 via tolerance (n7, claim check 101) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 62) | pass 3.536 via tolerance (n7, claim check 101) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 62) | pass 1.392 via tolerance (n7, claim check 101) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 62) | pass 0.417 via tolerance (n7, claim check 101) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 62) | pass 4.654 via tolerance (n7, claim check 101) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 62) | pass 1.55 via tolerance (n7, claim check 101) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 62) | pass 1.032 via tolerance (n7, claim check 101) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 62) | pass 2.329 via tolerance (n7, claim check 101) |

### lackey2015-tb-default | claude:claude-sonnet-5-5 | run 2

Status: answer. 73 s. 10 requests, 14 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062758-7060. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lackey2015-tb-default/run2/home/sessions/20261009-062758-7060/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lackey2015-tb-default/run2/home/sessions/20261009-062758-7060/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 9) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 68) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 35) | pass 0.00604 via tolerance (n9, claim check 115) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 38) | pass 0.00003945 via tolerance (n9, claim check 115) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 41) | pass 0.6815 via tolerance (n4, claim check 115) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 44) | pass 0.03436 via tolerance (n9, claim check 115) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 68) | pass 4.782 via tolerance (n7, claim check 115) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 68) | pass 3.052 via tolerance (n7, claim check 115) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 68) | pass 7.491 via tolerance (n7, claim check 115) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 68) | pass 2.08 via tolerance (n7, claim check 115) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 68) | pass 1.214 via tolerance (n7, claim check 115) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 68) | pass 3.563 via tolerance (n7, claim check 115) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 68) | pass 0.878 via tolerance (n7, claim check 115) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 68) | pass 0.444 via tolerance (n7, claim check 115) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 68) | pass 1.733 via tolerance (n7, claim check 115) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 68) | pass 3.038 via tolerance (n7, claim check 115) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 68) | pass 1.578 via tolerance (n7, claim check 115) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 68) | pass 5.851 via tolerance (n7, claim check 115) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 68) | pass 2.222 via tolerance (n7, claim check 115) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 68) | pass 1.401 via tolerance (n7, claim check 115) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 68) | pass 3.525 via tolerance (n7, claim check 115) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 68) | pass 2.303 via tolerance (n7, claim check 115) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 68) | pass 1.5 via tolerance (n7, claim check 115) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 68) | pass 3.536 via tolerance (n7, claim check 115) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 68) | pass 1.392 via tolerance (n7, claim check 115) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 68) | pass 0.417 via tolerance (n7, claim check 115) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 68) | pass 4.654 via tolerance (n7, claim check 115) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 68) | pass 1.55 via tolerance (n7, claim check 115) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 68) | pass 1.032 via tolerance (n7, claim check 115) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 68) | pass 2.329 via tolerance (n7, claim check 115) |

### lackey2015-tb-default | claude:claude-sonnet-5-5 | run 3

Status: answer. 72 s. 8 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062911-18b7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lackey2015-tb-default/run3/home/sessions/20261009-062911-18b7/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lackey2015-tb-default/run3/home/sessions/20261009-062911-18b7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 9) | not asked |
| defaulted | 127 exact | pass 127 (n6 metrics.events, entry 51) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 29) | pass 0.00604 via tolerance (n8, claim check 98) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 32) | pass 0.00003945 via tolerance (n8, claim check 98) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 35) | pass 0.6815 via tolerance (n8, claim check 98) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 38) | pass 0.03436 via tolerance (n8, claim check 98) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n6 metrics.or_drug_use_Yes, entry 51) | pass 4.782 via tolerance (n6, claim check 98) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n6 metrics.or_lo_drug_use_Yes, entry 51) | pass 3.052 via tolerance (n6, claim check 98) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n6 metrics.or_hi_drug_use_Yes, entry 51) | pass 7.491 via tolerance (n6, claim check 98) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n6 metrics.or_bmi_Underweight, entry 51) | pass 2.08 via tolerance (n6, claim check 98) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n6 metrics.or_lo_bmi_Underweight, entry 51) | pass 1.214 via tolerance (n6, claim check 98) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n6 metrics.or_hi_bmi_Underweight, entry 51) | pass 3.563 via tolerance (n6, claim check 98) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n6 metrics.or_bmi_Overweight_Obese, entry 51) | pass 0.878 via tolerance (n6, claim check 98) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n6 metrics.or_lo_bmi_Overweight_Obese, entry 51) | pass 0.444 via tolerance (n6, claim check 98) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n6 metrics.or_hi_bmi_Overweight_Obese, entry 51) | pass 1.733 via tolerance (n6, claim check 98) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n6 metrics.or_mdr_tb_Yes, entry 51) | pass 3.038 via tolerance (n6, claim check 98) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n6 metrics.or_lo_mdr_tb_Yes, entry 51) | pass 1.578 via tolerance (n6, claim check 98) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n6 metrics.or_hi_mdr_tb_Yes, entry 51) | pass 5.851 via tolerance (n6, claim check 98) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n6 metrics.or_alcohol_weekly_Yes, entry 51) | pass 2.222 via tolerance (n6, claim check 98) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n6 metrics.or_lo_alcohol_weekly_Yes, entry 51) | pass 1.401 via tolerance (n6, claim check 98) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n6 metrics.or_hi_alcohol_weekly_Yes, entry 51) | pass 3.525 via tolerance (n6, claim check 98) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n6 metrics.or_hiv_status_Test_not_done, entry 51) | pass 2.303 via tolerance (n6, claim check 98) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n6 metrics.or_lo_hiv_status_Test_not_done, entry 51) | pass 1.5 via tolerance (n6, claim check 98) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n6 metrics.or_hi_hiv_status_Test_not_done, entry 51) | pass 3.536 via tolerance (n6, claim check 98) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n6 metrics.or_hiv_status_Positive, entry 51) | pass 1.392 via tolerance (n6, claim check 98) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n6 metrics.or_lo_hiv_status_Positive, entry 51) | pass 0.417 via tolerance (n6, claim check 98) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n6 metrics.or_hi_hiv_status_Positive, entry 51) | pass 4.654 via tolerance (n6, claim check 98) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n6 metrics.or_secondary_education_No, entry 51) | pass 1.55 via tolerance (n6, claim check 98) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n6 metrics.or_lo_secondary_education_No, entry 51) | pass 1.032 via tolerance (n6, claim check 98) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n6 metrics.or_hi_secondary_education_No, entry 51) | pass 2.329 via tolerance (n6, claim check 98) |

### liao2025-scanpy-bone-marrow | claude:claude-sonnet-5-5 | run 1

Status: answer. 109 s. 9 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 5 unsourced.
Session: 20261009-063023-e40b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261009-063023-e40b/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261009-063023-e40b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 16) | pass 10608 via tolerance (n8, claim check 97) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 19) | pass 10046 via tolerance (n9, claim check 97) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 69) | pass 9612 via tolerance (n8, claim check 97) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 72) | pass 8887 via tolerance (n9, claim check 97) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 16) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-sonnet-5-5 | run 2

Status: answer. 117 s. 11 requests, 14 tool calls (2 failed), 0 nudges, 0 plan reminders, 10 unsourced.
Session: 20261009-063217-8e7c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261009-063217-8e7c/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 10 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261009-063217-8e7c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 17) | pass 10608 via tolerance (n8, claim check 109) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 20) | pass 10046 via tolerance (n9, claim check 109) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 79) | pass 9612 via tolerance (n8, claim check 109) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 85) | pass 8887 via tolerance (n9, claim check 109) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 17) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-sonnet-5-5 | run 3

Status: answer. 99 s. 10 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063417-9c43. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261009-063417-9c43/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261009-063417-9c43/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 13) | pass 10608 via tolerance (n8, claim check 101) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 16) | pass 10046 via tolerance (n9, claim check 101) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 68) | pass 9612 via tolerance (n8, claim check 101) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 75) | pass 8887 via tolerance (n9, claim check 101) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 13) | not asked |

### mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | run 1

Status: answer. 769 s. 9 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063559-3cf6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261009-063559-3cf6/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run1/home/sessions/20261009-063559-3cf6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.5380504 (n12 metrics.mean_dice, entry 64) | pass 0.5381 via tolerance (n9, claim check 135) |
| image_patches | 665 exact | pass 665 (n1 data.data.patterns.*/label masks/*.tif.n_files, entry 11) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n12 metrics.total_truth, entry 64) | not asked |

### mahbod2024-nuinsseg | claude:claude-sonnet-5-5 | run 2

Status: answer. 537 s. 12 requests, 21 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-064848-5f49. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261009-064848-5f49/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/mahbod2024-nuinsseg/run2/home/sessions/20261009-064848-5f49/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_dice_otsu | 0.538 ±0.02 | pass 0.53805 (n26 stdout, entry 134) | pass 0.538 via tolerance (n26, claim check 169) |
| image_patches | 665 exact | pass 665 (n13 metrics.n_images, entry 75) | not asked |
| nuclei_label_masks | 35138 exact | pass 35138 (n13 metrics.total_truth, entry 75) | not asked |

