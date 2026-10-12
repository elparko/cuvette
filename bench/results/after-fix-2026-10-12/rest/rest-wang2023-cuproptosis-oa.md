# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 42/42 | 39/39 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| wang2023-cuproptosis-oa | 42/42 / 39/39 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 272 | 18 | 54 | 22627 | 256777 | 14 | 9 | 0 | 0 | 3 | 11 | 10 | 2 | 1 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 1 | 0 |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 1

Status: answer. 93 s. 6 requests, 4 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-025941-0ad6. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wang2023-cuproptosis-oa/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261012-025941-0ad6/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wang2023-cuproptosis-oa/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261012-025941-0ad6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 51) | pass 3 via tolerance (n4, claim check 86) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 51) | pass 1578 via tolerance (n4, claim check 86) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 51) | pass 0.00185 via rounding (n4, claim check 86) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 51) | pass 0.112 via rounding (n4, claim check 86) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 51) | pass 35.09 via rounding (n4, claim check 86) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 51) | pass 24 via tolerance (n4, claim check 86) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 51) | pass 0.00479 via rounding (n4, claim check 86) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 51) | pass 30 via tolerance (n4, claim check 86) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 51) | pass 0.00599 via rounding (n4, claim check 86) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 51) | pass 649 via tolerance (n4, claim check 86) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 51) | pass 0.00604 via tolerance (n4, claim check 86) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 51) | pass 37 via tolerance (n4, claim check 86) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 51) | pass 0.00738 via tolerance (n4, claim check 86) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 12) | not asked |

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 2

Status: answer. 96 s. 5 requests, 4 tool calls (2 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-030114-f7c2. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wang2023-cuproptosis-oa/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261012-030114-f7c2/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wang2023-cuproptosis-oa/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261012-030114-f7c2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 53) | pass 3 via tolerance (n4, claim check 85) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 53) | pass 1578 via tolerance (n4, claim check 85) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 53) | pass 0.001845 via tolerance (n4, claim check 85) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 53) | pass 0.1119 via rounding (n4, claim check 85) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 53) | pass 35.09 via rounding (n5, claim check 85) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 53) | pass 24 via tolerance (n4, claim check 85) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 53) | pass 0.004792 via tolerance (n4, claim check 85) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 53) | pass 30 via tolerance (n4, claim check 85) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 53) | pass 0.005987 via tolerance (n4, claim check 85) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 53) | pass 649 via tolerance (n4, claim check 85) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 53) | pass 0.00604 via tolerance (n4, claim check 85) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 53) | pass 37 via tolerance (n4, claim check 85) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 53) | pass 0.00738 via tolerance (n4, claim check 85) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 12) | not asked |

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 3

Status: answer. 84 s. 7 requests, 6 tool calls (5 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-030250-3f4c. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wang2023-cuproptosis-oa/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261012-030250-3f4c/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/wang2023-cuproptosis-oa/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261012-030250-3f4c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n2 metrics.top_overlap, entry 56) | pass 3 via tolerance (n2, claim check 91) |
| set_size_1 | 1578 exact | pass 1578 (n2 metrics.top_set_size, entry 56) | pass 1578 via tolerance (n2, claim check 91) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n2 metrics.top_p_value, entry 56) | pass 0.00185 via rounding (n2, claim check 91) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n2 metrics.top_p_adjusted, entry 56) | pass 0.112 via rounding (n2, claim check 91) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n2 metrics.top_odds_ratio, entry 56) | pass 35.09 via rounding (n2, claim check 91) |
| set_size_2 | 24 exact | pass 24 (n2 metrics.set_size_2, entry 56) | pass 24 via tolerance (n2, claim check 91) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n2 metrics.p_value_2, entry 56) | pass 0.00479 via rounding (n2, claim check 91) |
| set_size_3 | 30 exact | pass 30 (n2 metrics.set_size_3, entry 56) | pass 30 via tolerance (n2, claim check 91) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n2 metrics.p_value_3, entry 56) | pass 0.00599 via rounding (n2, claim check 91) |
| set_size_4 | 649 exact | pass 649 (n2 metrics.set_size_4, entry 56) | pass 649 via tolerance (n2, claim check 91) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n2 metrics.p_value_4, entry 56) | pass 0.00604 via tolerance (n2, claim check 91) |
| set_size_5 | 37 exact | pass 37 (n2 metrics.set_size_5, entry 56) | pass 37 via tolerance (n2, claim check 91) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n2 metrics.p_value_5, entry 56) | pass 0.00738 via tolerance (n2, claim check 91) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 12) | not asked |

