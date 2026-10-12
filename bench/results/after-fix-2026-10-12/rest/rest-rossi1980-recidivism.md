# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 31/33 | 12/12 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| rossi1980-recidivism | 31/33 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 211 | 26 | 64 | 22442 | 512636 | 23 | 3 | 0 | 2 | 1 | 8 | 11 | 1 | 0 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rossi1980-recidivism | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### rossi1980-recidivism | claude:claude-haiku-5-5 | run 1

Status: answer. 89 s. 9 requests, 7 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-025610-df28. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rossi1980-recidivism/claude_claude-haiku-5-5/rossi1980-recidivism/run1/home/sessions/20261012-025610-df28/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rossi1980-recidivism/claude_claude-haiku-5-5/rossi1980-recidivism/run1/home/sessions/20261012-025610-df28/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 12) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 43) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n2 metrics.coef_fin, entry 43) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n2 metrics.coef_age, entry 43) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n2 metrics.coef_prio, entry 43) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6838 (n3 stdout, entry 60) | pass 0.684 via tolerance (n3, claim check 95) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n2 metrics.p_fin, entry 43) | pass 0.047 via tolerance (n3, claim check 95) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n2 metrics.concordance, entry 43) | pass 0.64 via tolerance (n2, claim check 95) |
| logrank_chi2_fin | 3.838 ±0.01 | FAIL 2.503162 (n2 table.rows[2][6], entry 43) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05 (n2 data.data.alpha, entry 43) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n2 metrics.ph_test_min_p, entry 43) | pass 0.0007 via tolerance (n2, claim check 95) |

### rossi1980-recidivism | claude:claude-haiku-5-5 | run 2

Status: answer. 51 s. 8 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-025739-2ff5. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rossi1980-recidivism/claude_claude-haiku-5-5/rossi1980-recidivism/run2/home/sessions/20261012-025739-2ff5/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rossi1980-recidivism/claude_claude-haiku-5-5/rossi1980-recidivism/run2/home/sessions/20261012-025739-2ff5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 12) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 44) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n2 metrics.coef_fin, entry 44) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n2 metrics.coef_age, entry 44) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n2 metrics.coef_prio, entry 44) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n2 metrics.hr_fin, entry 44) | pass 0.684 via tolerance (n2, claim check 85) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n2 metrics.p_fin, entry 44) | pass 0.047 via tolerance (n2, claim check 85) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n2 metrics.concordance, entry 44) | pass 0.64 via tolerance (n2, claim check 85) |
| logrank_chi2_fin | 3.838 ±0.01 | FAIL 2.503162 (n2 table.rows[2][6], entry 44) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05 (n2 data.data.alpha, entry 44) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n2 metrics.ph_test_min_p, entry 44) | pass 0.0007 via tolerance (n3, claim check 85) |

### rossi1980-recidivism | claude:claude-haiku-5-5 | run 3

Status: answer. 71 s. 9 requests, 9 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-025830-1323. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rossi1980-recidivism/claude_claude-haiku-5-5/rossi1980-recidivism/run3/home/sessions/20261012-025830-1323/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/rossi1980-recidivism/claude_claude-haiku-5-5/rossi1980-recidivism/run3/home/sessions/20261012-025830-1323/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 12) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 23) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 44) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 44) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 44) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6838 (n4 stdout, entry 84) | pass 0.684 via tolerance (n4, claim check 99) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 44) | pass 0.0474 via tolerance (n3, claim check 99) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 44) | pass 0.64 via tolerance (n3, claim check 99) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 23) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 23) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 44) | pass 0.00071 via tolerance (n3, claim check 99) |

