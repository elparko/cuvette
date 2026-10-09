# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 99/99 | 87/87 | 6 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| sriphoosanaphan2021-vitd-hcv | 63/63 / 57/57 |
| white2021-flowkit | 36/36 / 30/30 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 6 | 712 | 57 | 146 | 72290 | 1185428 | 63 | 3 | 2 | 3 | 5 | 16 | 25 | 10 | 10 | 4 | 4 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.07 for 6 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 1 | 0 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 1 | 1 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 1 | 9 | 0 |
| white2021-flowkit | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| white2021-flowkit | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| white2021-flowkit | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |

## Details

### sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | run 1

Status: answer. 88 s. 13 requests, 13 tool calls (1 failed), 2 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-081432-11e3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-081432-11e3/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-081432-11e3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n2 metrics.n_b, entry 54) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 54) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.0864 (n7 stdout, entry 75) | pass 23.09 via tolerance (n2, claim check 131) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 54) | pass 19.73 via tolerance (n2, claim check 131) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 54) | pass 26.44 via tolerance (n2, claim check 131) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 57) | pass -0.55 via tolerance (n3, claim check 131) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 57) | pass -2.84 via tolerance (n3, claim check 131) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 57) | pass 1.73 via tolerance (n3, claim check 131) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 57) | pass 0.63 via tolerance (n7, claim check 131) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 60) | pass -5.51 via tolerance (n4, claim check 131) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 60) | pass -26.36 via tolerance (n4, claim check 131) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 60) | pass 15.34 via tolerance (n4, claim check 131) |
| timp_p | 0.6 ±0.001 | pass 0.6 (n7 stdout, entry 75) | pass 0.6 via tolerance (n7, claim check 131) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n7 stdout, entry 75) | pass 122.92 via tolerance (n7, claim check 131) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.9633 (n7 stdout, entry 75) | pass -68.96 via tolerance (n7, claim check 131) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 63) | pass 314.81 via tolerance (n5, claim check 131) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 63) | pass 0.206 via tolerance (n8, claim check 131) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 66) | pass -0.11 via tolerance (n6, claim check 131) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 66) | pass -2.37 via tolerance (n7, claim check 131) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 66) | pass 2.15 via tolerance (n7, claim check 131) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 66) | pass 0.923 via tolerance (n8, claim check 131) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | run 2

Status: answer. 122 s. 9 requests, 12 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-081601-d17d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261009-081601-d17d/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261009-081601-d17d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n2 metrics.n_b, entry 48) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 48) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08641 (n8 stdout, entry 80) | pass 23.086 via tolerance (n8, claim check 118) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 48) | pass 19.734 via tolerance (n2, claim check 118) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 48) | pass 26.439 via tolerance (n2, claim check 118) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 52) | pass -0.554 via tolerance (n3, claim check 118) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 52) | pass -2.839 via tolerance (n3, claim check 118) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 52) | pass 1.731 via tolerance (n3, claim check 118) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 52) | pass 0.63 via tolerance (n7, claim check 118) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n8 stdout, entry 80) | pass -5.51 via tolerance (n8, claim check 118) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 56) | pass -26.361 via tolerance (n4, claim check 118) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 56) | pass 15.341 via tolerance (n4, claim check 118) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 56) | pass 0.6 via tolerance (n7, claim check 118) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n8 stdout, entry 80) | pass 122.921 via tolerance (n5, claim check 118) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96333 (n8 stdout, entry 80) | pass -68.963 via tolerance (n8, claim check 118) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 60) | pass 314.806 via tolerance (n5, claim check 118) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 60) | pass 0.206 via tolerance (n7, claim check 118) |
| p3np_diff | -0.11 ±0.005 | pass -0.110391 (n8 stdout, entry 80) | pass -0.11 via tolerance (n8, claim check 118) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 64) | pass -2.372 via tolerance (n6, claim check 118) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 64) | pass 2.151 via tolerance (n6, claim check 118) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 64) | pass 0.923 via tolerance (n7, claim check 118) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-haiku-5-5 | run 3

Status: answer. 126 s. 12 requests, 14 tool calls (1 failed), 0 nudges, 1 plan reminders, 9 unsourced.
Session: 20261009-081803-b20d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261009-081803-b20d/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 9 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261009-081803-b20d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n2 stdout, entry 38) | not asked |
| n_placebo | 38 exact | pass 38 (n2 stdout, entry 38) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n3 metrics.mean_diff, entry 60) | pass 23.09 via tolerance (n3, claim check 134) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n3 metrics.ci_lo, entry 60) | pass 19.73 via tolerance (n3, claim check 134) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n3 metrics.ci_hi, entry 60) | pass 26.44 via tolerance (n3, claim check 134) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n4 metrics.mean_diff, entry 63) | pass -0.55 via tolerance (n4, claim check 134) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n4 metrics.ci_lo, entry 63) | pass -2.84 via tolerance (n4, claim check 134) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n4 metrics.ci_hi, entry 63) | pass 1.73 via tolerance (n4, claim check 134) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n4 metrics.p_value, entry 63) | pass 0.63 via tolerance (n8, claim check 134) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n5 metrics.mean_diff, entry 66) | pass -5.51 via tolerance (n5, claim check 134) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n5 metrics.ci_lo, entry 66) | pass -26.36 via tolerance (n5, claim check 134) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n5 metrics.ci_hi, entry 66) | pass 15.34 via tolerance (n5, claim check 134) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n5 metrics.p_value, entry 66) | pass 0.6 via tolerance (n8, claim check 134) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n6 metrics.mean_diff, entry 69) | pass 122.92 via tolerance (n6, claim check 134) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n6 metrics.ci_lo, entry 69) | pass -68.96 via tolerance (n6, claim check 134) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n6 metrics.ci_hi, entry 69) | pass 314.81 via tolerance (n6, claim check 134) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n6 metrics.p_value, entry 69) | pass 0.206 via tolerance (n8, claim check 134) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n7 metrics.mean_diff, entry 72) | pass -0.11 via tolerance (n7, claim check 134) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n7 metrics.ci_lo, entry 72) | pass -2.37 via tolerance (n7, claim check 134) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n7 metrics.ci_hi, entry 72) | pass 2.15 via tolerance (n7, claim check 134) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n7 metrics.p_value, entry 72) | pass 0.923 via tolerance (n8, claim check 134) |

### white2021-flowkit | claude:claude-haiku-5-5 | run 1

Status: answer. 100 s. 6 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-082009-723d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/white2021-flowkit/run1/home/sessions/20261009-082009-723d/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/white2021-flowkit/run1/home/sessions/20261009-082009-723d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 11) | pass 290172 via tolerance (n4, claim check 73) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 32) | pass 133670 via tolerance (n4, claim check 73) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 32) | pass 133860 via tolerance (n3, claim check 73) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 32) | pass 82484 via tolerance (n4, claim check 73) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 32) | pass 82636 via tolerance (n3, claim check 73) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 32) | pass 47165 via tolerance (n4, claim check 73) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 32) | pass 47241 via tolerance (n3, claim check 73) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 32) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 42) | pass 135381 via tolerance (n4, claim check 73) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 42) | pass 85369 via tolerance (n4, claim check 73) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 42) | pass 47694 via tolerance (n4, claim check 73) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 42) | not asked |

### white2021-flowkit | claude:claude-haiku-5-5 | run 2

Status: answer. 109 s. 9 requests, 9 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-082150-859b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/white2021-flowkit/run2/home/sessions/20261009-082150-859b/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/white2021-flowkit/run2/home/sessions/20261009-082150-859b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 11) | pass 290172 via tolerance (n4, claim check 89) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 35) | pass 133670 via tolerance (n4, claim check 89) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 35) | pass 133860 via tolerance (n3, claim check 89) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 35) | pass 82484 via tolerance (n4, claim check 89) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 35) | pass 82636 via tolerance (n3, claim check 89) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 35) | pass 47165 via tolerance (n4, claim check 89) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 35) | pass 47241 via tolerance (n3, claim check 89) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 35) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 50) | pass 135381 via tolerance (n4, claim check 89) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 50) | pass 85369 via tolerance (n4, claim check 89) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 50) | pass 47694 via tolerance (n4, claim check 89) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 50) | not asked |

### white2021-flowkit | claude:claude-haiku-5-5 | run 3

Status: answer. 168 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-082341-9957. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/white2021-flowkit/run3/home/sessions/20261009-082341-9957/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/white2021-flowkit/run3/home/sessions/20261009-082341-9957/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 11) | pass 290172 via tolerance (n4, claim check 82) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 30) | pass 133670 via tolerance (n4, claim check 82) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 30) | pass 133860 via tolerance (n3, claim check 82) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 30) | pass 82484 via tolerance (n4, claim check 82) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 30) | pass 82636 via tolerance (n3, claim check 82) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 30) | pass 47165 via tolerance (n4, claim check 82) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 30) | pass 47241 via tolerance (n3, claim check 82) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 30) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 45) | pass 135381 via tolerance (n4, claim check 82) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 45) | pass 85369 via tolerance (n4, claim check 82) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 45) | pass 47694 via tolerance (n4, claim check 82) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 45) | not asked |

