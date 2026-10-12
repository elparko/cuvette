# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 21/21 | 12/12 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| schramm2012-imzml-pyimzml | 21/21 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 134 | 14 | 38 | 12463 | 170743 | 16 | 0 | 0 | 0 | 2 | 8 | 7 | 1 | 2 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 2 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | run 1

Status: answer. 48 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-031955-650e. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/schramm2012-imzml-pyimzml/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261012-031955-650e/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/schramm2012-imzml-pyimzml/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261012-031955-650e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 12) | pass 9 via tolerance (n4, claim check 54) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 12) | pass 100.083 via rounding (n2, claim check 54) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 12) | pass 799.917 via rounding (n2, claim check 54) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 23) | pass 243.54 via tolerance (n3, claim check 54) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 23) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 12) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 15) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | run 2

Status: answer. 59 s. 6 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-032043-5ea7. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/schramm2012-imzml-pyimzml/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261012-032043-5ea7/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/schramm2012-imzml-pyimzml/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261012-032043-5ea7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 12) | pass 9 via tolerance (n5, claim check 61) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 12) | pass 100.0833 via tolerance (n2, claim check 61) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 12) | pass 799.9167 via tolerance (n2, claim check 61) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 23) | pass 243.54 via tolerance (n4, claim check 61) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 23) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 12) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 15) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | run 3

Status: answer. 27 s. 3 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-032142-acb0. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/schramm2012-imzml-pyimzml/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261012-032142-acb0/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/schramm2012-imzml-pyimzml/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261012-032142-acb0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 12) | pass 9 via tolerance (n4, claim check 38) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 12) | pass 100.083 via rounding (n2, claim check 38) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 12) | pass 799.917 via rounding (n2, claim check 38) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n4 metrics.tic_max, entry 26) | pass 243.54 via tolerance (n4, claim check 38) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n4 metrics.tic_mean, entry 26) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 12) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 15) | not asked |

