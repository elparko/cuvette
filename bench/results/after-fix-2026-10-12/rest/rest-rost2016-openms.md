# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 15/15 | 6/6 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| rost2016-openms | 15/15 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 439 | 15 | 48 | 14178 | 154431 | 11 | 0 | 0 | 0 | 3 | 9 | 7 | 7 | 4 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rost2016-openms | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |
| rost2016-openms | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 1 | 0 |
| rost2016-openms | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 2 | 0 |

## Details

### rost2016-openms | claude:claude-haiku-5-5 | run 1

Status: answer. 157 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-031828-635a. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rost2016-openms/claude_claude-haiku-5-5/rost2016-openms/run1/home/sessions/20261012-031828-635a/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rost2016-openms/claude_claude-haiku-5-5/rost2016-openms/run1/home/sessions/20261012-031828-635a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | pass 7173 via tolerance (n1, claim check 100) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 58) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 58) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 58) | pass 1887 via tolerance (n8, claim check 100) |

### rost2016-openms | claude:claude-haiku-5-5 | run 2

Status: answer. 144 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-032105-9796. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rost2016-openms/claude_claude-haiku-5-5/rost2016-openms/run2/home/sessions/20261012-032105-9796/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rost2016-openms/claude_claude-haiku-5-5/rost2016-openms/run2/home/sessions/20261012-032105-9796/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | pass 7173 via tolerance (n1, claim check 102) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 58) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 58) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 58) | pass 1887 via tolerance (n8, claim check 102) |

### rost2016-openms | claude:claude-haiku-5-5 | run 3

Status: answer. 138 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-032329-bfa0. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rost2016-openms/claude_claude-haiku-5-5/rost2016-openms/run3/home/sessions/20261012-032329-bfa0/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rost2016-openms/claude_claude-haiku-5-5/rost2016-openms/run3/home/sessions/20261012-032329-bfa0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | pass 7173 via tolerance (n1, claim check 94) |
| ms1_spectra | 7173 exact | pass 7173 (n1 metrics.n_spectra, entry 12) | not asked |
| mass_traces | 1880 ±100 | pass 1880 (n8 metrics.n_mass_traces, entry 58) | not asked |
| elution_peaks | 2255 ±120 | pass 2255 (n8 metrics.n_elution_peaks, entry 58) | not asked |
| features | 1887 ±100 | pass 1887 (n8 metrics.n_features, entry 58) | pass 1887 via tolerance (n8, claim check 94) |

