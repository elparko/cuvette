# Paper benchmark 2026-10-09

Models: claude:claude-sonnet-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 30/30 | 28/28 | 1 | 0 |

## Matrix

| Paper | claude:claude-sonnet-5-5 |
| --- | --- |
| yun2026-lasv-elisa | 30/30 / 28/28 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 1 | 99 | 7 | 20 | 7202 | 142816 | 6 | 1 | 0 | 0 | 1 | 3 | 6 | 2 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-sonnet-5-5: $0.23 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| yun2026-lasv-elisa | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 1 | 0 | 0 |

## Details

### yun2026-lasv-elisa | claude:claude-sonnet-5-5 | run 1

Status: answer. 99 s. 7 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-084712-2345. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/yun2026-lasv-elisa/run1/home/sessions/20261009-084712-2345/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/yun2026-lasv-elisa/run1/home/sessions/20261009-084712-2345/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 54) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.5869 (n4 stdout, entry 62) | pass 7.5869 via tolerance (n4, claim check 94) |
| conc_d2 | 3.7072 ±0.001 | pass 3.7072 (n4 stdout, entry 62) | pass 3.7072 via tolerance (n4, claim check 94) |
| conc_d3 | 1.8719 ±0.001 | pass 1.8719 (n4 stdout, entry 62) | pass 1.8719 via tolerance (n4, claim check 94) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n3 metrics.mean_conc_STD_4, entry 54) | pass 0.9171 via tolerance (n4, claim check 94) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n3 metrics.mean_conc_STD_5, entry 54) | pass 0.4637 via tolerance (n4, claim check 94) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334 (n4 stdout, entry 62) | pass 0.2334 via tolerance (n4, claim check 94) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n3 metrics.mean_conc_STD_7, entry 54) | pass 0.1205 via tolerance (n4, claim check 94) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n3 metrics.mean_conc_STD_8, entry 54) | pass 0.0558 via tolerance (n4, claim check 94) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n3 metrics.mean_conc_STD_9, entry 54) | pass 0.0266 via tolerance (n4, claim check 94) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n3 metrics.mean_conc_STD_10, entry 54) | pass 0.0139 via tolerance (n4, claim check 94) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07 (n4 stdout, entry 62) | pass 11.07 via tolerance (n4, claim check 94) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.9268 (n4 stdout, entry 62) | pass 10.93 via tolerance (n4, claim check 94) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 54) | pass 15.71 via tolerance (n4, claim check 94) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 54) | pass 15.55 via tolerance (n5, claim check 94) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n3 metrics.cv_conc_pct_STD_9, entry 54) | pass 25.89 via tolerance (n4, claim check 94) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 54) | pass 21.92 via tolerance (n5, claim check 94) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.6206 (n4 stdout, entry 62) | pass 26.62 via tolerance (n5, claim check 94) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.8867 (n4 stdout, entry 62) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.9718 (n4 stdout, entry 62) | pass 97.97 via tolerance (n4, claim check 94) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n3 metrics.recovery_pct_STD_4, entry 54) | pass 94.74 via tolerance (n5, claim check 94) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n3 metrics.recovery_pct_STD_7, entry 54) | pass 99.55 via tolerance (n5, claim check 94) |
| recovery_d9 | 88.71 ±0.06 | pass 88.7106 (n4 stdout, entry 62) | pass 88.71 via tolerance (n4, claim check 94) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n3 metrics.recovery_pct_STD_10, entry 54) | differs 92.56 (n5, claim check 94) |
| hpc_conc | 1.9932 ±0.001 | pass 1.9932 (n4 stdout, entry 62) | pass 1.9932 via tolerance (n4, claim check 94) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n3 metrics.cv_conc_pct_HPC, entry 54) | pass 22.45 via tolerance (n4, claim check 94) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n4 stdout, entry 62) | pass 107.28 via tolerance (n4, claim check 94) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 54) | pass 0.4569 via tolerance (n4, claim check 94) |
| lpc_recovery | 98.25 ±0.06 | pass 98.2536 (n4 stdout, entry 62) | pass 98.25 via tolerance (n4, claim check 94) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.028 (n4 stdout, entry 62) | differs 20.03 (n4, claim check 94) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 54) | pass 0.121 via tolerance (n5, claim check 94) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 54) | pass 7.744 via tolerance (n5, claim check 94) |

