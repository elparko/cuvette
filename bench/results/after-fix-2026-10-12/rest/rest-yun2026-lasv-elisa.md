# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 90/90 | 84/84 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| yun2026-lasv-elisa | 90/90 / 84/84 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 514 | 26 | 74 | 47795 | 674892 | 19 | 1 | 0 | 2 | 3 | 7 | 17 | 7 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.05 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| yun2026-lasv-elisa | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |

## Details

### yun2026-lasv-elisa | claude:claude-haiku-5-5 | run 1

Status: answer. 162 s. 11 requests, 9 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-032209-4160. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/yun2026-lasv-elisa/claude_claude-haiku-5-5/yun2026-lasv-elisa/run1/home/sessions/20261012-032209-4160/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/yun2026-lasv-elisa/claude_claude-haiku-5-5/yun2026-lasv-elisa/run1/home/sessions/20261012-032209-4160/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 76) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n3 metrics.mean_conc_STD_1, entry 76) | pass 7.587 via tolerance (n5, claim check 126) |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n3 metrics.mean_conc_STD_2, entry 76) | pass 3.707 via tolerance (n5, claim check 126) |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n5 stdout, entry 98) | pass 1.872 via tolerance (n5, claim check 126) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n5 stdout, entry 98) | pass 0.917 via tolerance (n5, claim check 126) |
| conc_d5 | 0.46371 ±0.001 | pass 0.463713 (n5 stdout, entry 98) | pass 0.464 via tolerance (n1, claim check 126) |
| conc_d6 | 0.2334 ±0.001 | pass 0.233402 (n5 stdout, entry 98) | pass 0.233 via tolerance (n5, claim check 126) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.120456 (n5 stdout, entry 98) | pass 0.12 via tolerance (n2, claim check 126) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.055794 (n5 stdout, entry 98) | pass 0.0558 via tolerance (n1, claim check 126) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.026613 (n5 stdout, entry 98) | pass 0.0266 via tolerance (n5, claim check 126) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.013885 (n5 stdout, entry 98) | pass 0.0139 via tolerance (n1, claim check 126) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07001 (n3 metrics.cv_conc_pct_STD_1, entry 76) | pass 11.07 via tolerance (n4, claim check 126) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n5 stdout, entry 98) | pass 10.93 via tolerance (n5, claim check 126) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 76) | pass 15.71 via tolerance (n5, claim check 126) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 76) | pass 15.55 via tolerance (n4, claim check 126) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n5 stdout, entry 98) | pass 25.89 via tolerance (n4, claim check 126) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 76) | pass 21.92 via tolerance (n4, claim check 126) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n3 table.rows[10][6], entry 76) | pass 26.62 via tolerance (n5, claim check 126) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.886722 (n5 stdout, entry 98) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97182 (n5 stdout, entry 98) | pass 97.97 via tolerance (n5, claim check 126) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n5 stdout, entry 98) | pass 94.74 via tolerance (n5, claim check 126) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n5 stdout, entry 98) | pass 99.55 via tolerance (n5, claim check 126) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71061 (n3 metrics.recovery_pct_STD_9, entry 76) | pass 88.71 via tolerance (n4, claim check 126) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n3 metrics.recovery_pct_STD_10, entry 76) | differs 92.56 (n4, claim check 126) |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n3 metrics.mean_conc_HPC, entry 76) | pass 1.993 via tolerance (n4, claim check 126) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n3 metrics.cv_conc_pct_HPC, entry 76) | pass 22.45 via tolerance (n4, claim check 126) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n3 metrics.recovery_pct_HPC, entry 76) | pass 107.28 via tolerance (n4, claim check 126) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 76) | pass 0.457 via tolerance (n4, claim check 126) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n3 metrics.recovery_pct_LPC, entry 76) | pass 98.25 via tolerance (n4, claim check 126) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.02798 (n3 metrics.cv_conc_pct_LPC, entry 76) | differs 20.03 (n4, claim check 126) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 76) | pass 0.121 via tolerance (n5, claim check 126) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 76) | pass 7.744 via tolerance (n5, claim check 126) |

### yun2026-lasv-elisa | claude:claude-haiku-5-5 | run 2

Status: answer. 180 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-032451-77a0. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/yun2026-lasv-elisa/claude_claude-haiku-5-5/yun2026-lasv-elisa/run2/home/sessions/20261012-032451-77a0/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/yun2026-lasv-elisa/claude_claude-haiku-5-5/yun2026-lasv-elisa/run2/home/sessions/20261012-032451-77a0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n4 metrics.n_plates, entry 62) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n4 metrics.mean_conc_STD_1, entry 62) | pass 7.5869 via tolerance (n4, claim check 95) |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n4 metrics.mean_conc_STD_2, entry 62) | pass 3.7072 via tolerance (n4, claim check 95) |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n4 metrics.mean_conc_STD_3, entry 62) | pass 1.8719 via tolerance (n4, claim check 95) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n4 metrics.mean_conc_STD_4, entry 62) | pass 0.9171 via tolerance (n4, claim check 95) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n4 metrics.mean_conc_STD_5, entry 62) | pass 0.4637 via tolerance (n4, claim check 95) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334023 (n4 metrics.mean_conc_STD_6, entry 62) | pass 0.2334 via tolerance (n4, claim check 95) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n4 metrics.mean_conc_STD_7, entry 62) | pass 0.1205 via tolerance (n2, claim check 95) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n4 metrics.mean_conc_STD_8, entry 62) | pass 0.0558 via tolerance (n2, claim check 95) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n4 metrics.mean_conc_STD_9, entry 62) | pass 0.0266 via tolerance (n4, claim check 95) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n4 metrics.mean_conc_STD_10, entry 62) | pass 0.0139 via tolerance (n2, claim check 95) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07001 (n4 metrics.cv_conc_pct_STD_1, entry 62) | pass 11.07 via tolerance (n4, claim check 95) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n4 metrics.cv_conc_pct_STD_4, entry 62) | pass 10.93 via tolerance (n4, claim check 95) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n4 metrics.cv_conc_pct_STD_7, entry 62) | pass 15.71 via tolerance (n4, claim check 95) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n4 metrics.cv_conc_pct_STD_8, entry 62) | pass 15.55 via tolerance (n4, claim check 95) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n4 metrics.cv_conc_pct_STD_9, entry 62) | pass 25.89 via tolerance (n4, claim check 95) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n4 table.rows[9][6], entry 62) | pass 21.92 via tolerance (n4, claim check 95) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n4 table.rows[10][6], entry 62) | pass 26.62 via tolerance (n4, claim check 95) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.886722 (n4 table.rows[3][5], entry 62) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97182 (n4 metrics.recovery_pct_STD_1, entry 62) | pass 97.97 via tolerance (n4, claim check 95) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n4 metrics.recovery_pct_STD_4, entry 62) | pass 94.74 via tolerance (n4, claim check 95) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n4 metrics.recovery_pct_STD_7, entry 62) | pass 99.55 via tolerance (n4, claim check 95) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71061 (n4 metrics.recovery_pct_STD_9, entry 62) | pass 88.71 via tolerance (n4, claim check 95) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n4 metrics.recovery_pct_STD_10, entry 62) | differs 92.56 (n4, claim check 95) |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n4 metrics.mean_conc_HPC, entry 62) | pass 1.9932 via tolerance (n4, claim check 95) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n4 metrics.cv_conc_pct_HPC, entry 62) | pass 22.45 via tolerance (n4, claim check 95) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n4 metrics.recovery_pct_HPC, entry 62) | pass 107.28 via tolerance (n4, claim check 95) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n4 metrics.mean_conc_LPC, entry 62) | pass 0.4569 via tolerance (n4, claim check 95) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n4 metrics.recovery_pct_LPC, entry 62) | pass 98.25 via tolerance (n4, claim check 95) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.02798 (n4 metrics.cv_conc_pct_LPC, entry 62) | differs 20.03 (n4, claim check 95) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n1 stdout, entry 22) | pass 0.121 via tolerance (n4, claim check 95) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n1 stdout, entry 22) | pass 7.744 via tolerance (n4, claim check 95) |

### yun2026-lasv-elisa | claude:claude-haiku-5-5 | run 3

Status: answer. 172 s. 9 requests, 6 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-032751-d64c. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/yun2026-lasv-elisa/claude_claude-haiku-5-5/yun2026-lasv-elisa/run3/home/sessions/20261012-032751-d64c/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/yun2026-lasv-elisa/claude_claude-haiku-5-5/yun2026-lasv-elisa/run3/home/sessions/20261012-032751-d64c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 73) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n3 metrics.mean_conc_STD_1, entry 73) | pass 7.587 via tolerance (n3, claim check 109) |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n3 metrics.mean_conc_STD_2, entry 73) | pass 3.707 via tolerance (n3, claim check 109) |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n3 metrics.mean_conc_STD_3, entry 73) | pass 1.872 via tolerance (n3, claim check 109) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n3 metrics.mean_conc_STD_4, entry 73) | pass 0.917 via tolerance (n3, claim check 109) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n3 metrics.mean_conc_STD_5, entry 73) | pass 0.464 via tolerance (n1, claim check 109) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334023 (n3 metrics.mean_conc_STD_6, entry 73) | pass 0.233 via tolerance (n3, claim check 109) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n3 metrics.mean_conc_STD_7, entry 73) | pass 0.12 via tolerance (n2, claim check 109) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n3 metrics.mean_conc_STD_8, entry 73) | pass 0.0558 via tolerance (n1, claim check 109) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n3 metrics.mean_conc_STD_9, entry 73) | pass 0.0266 via tolerance (n3, claim check 109) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n3 metrics.mean_conc_STD_10, entry 73) | pass 0.0139 via tolerance (n1, claim check 109) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07001 (n3 metrics.cv_conc_pct_STD_1, entry 73) | pass 11.1 via rounding (n1, claim check 109) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n3 metrics.cv_conc_pct_STD_4, entry 73) | pass 10.9 via rounding (n1, claim check 109) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 73) | pass 15.7 via tolerance (n3, claim check 109) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 73) | pass 15.6 via rounding (n2, claim check 109) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n3 metrics.cv_conc_pct_STD_9, entry 73) | pass 25.9 via tolerance (n1, claim check 109) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 73) | pass 21.9 via rounding (n3, claim check 109) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n3 table.rows[10][6], entry 73) | pass 26.6 via rounding (n3, claim check 109) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.886722 (n3 table.rows[3][5], entry 73) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97182 (n3 metrics.recovery_pct_STD_1, entry 73) | pass 97.97 via tolerance (n3, claim check 109) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n3 metrics.recovery_pct_STD_4, entry 73) | pass 94.74 via tolerance (n3, claim check 109) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n3 metrics.recovery_pct_STD_7, entry 73) | pass 99.55 via tolerance (n3, claim check 109) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71061 (n3 metrics.recovery_pct_STD_9, entry 73) | pass 88.71 via tolerance (n3, claim check 109) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n3 metrics.recovery_pct_STD_10, entry 73) | differs 92.56 (n3, claim check 109) |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n3 metrics.mean_conc_HPC, entry 73) | pass 1.993 via tolerance (n3, claim check 109) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n3 metrics.cv_conc_pct_HPC, entry 73) | pass 22.4 via rounding (n1, claim check 109) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n3 metrics.recovery_pct_HPC, entry 73) | pass 107.28 via tolerance (n3, claim check 109) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 73) | pass 0.457 via tolerance (n3, claim check 109) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n3 metrics.recovery_pct_LPC, entry 73) | pass 98.25 via tolerance (n3, claim check 109) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.02798 (n3 metrics.cv_conc_pct_LPC, entry 73) | differs 20 (n2, claim check 109) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 73) | pass 0.121 via tolerance (n3, claim check 109) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 73) | pass 7.744 via tolerance (n3, claim check 109) |

