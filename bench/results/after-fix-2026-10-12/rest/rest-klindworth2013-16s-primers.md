# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 33/33 | 33/33 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| klindworth2013-16s-primers | 33/33 / 33/33 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 241 | 16 | 50 | 17184 | 231650 | 17 | 4 | 0 | 0 | 3 | 11 | 14 | 2 | 5 | 2 | 2 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 2 | 0 |
| klindworth2013-16s-primers | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 3 | 0 |

## Details

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 1

Status: answer. 90 s. 7 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-035400-05f9. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/klindworth2013-16s-primers/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261012-035400-05f9/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/klindworth2013-16s-primers/claude_claude-haiku-5-5/klindworth2013-16s-primers/run1/home/sessions/20261012-035400-05f9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n8, claim check 102) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 34) | pass 1608 via tolerance (n8, claim check 102) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 34) | pass 2072 via tolerance (n8, claim check 102) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 34) | pass 465 via tolerance (n8, claim check 102) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_fwd_16S_pos, entry 73) | pass 341 via tolerance (n7, claim check 102) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n8, claim check 102) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 38) | pass 1275 via tolerance (n5, claim check 102) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 38) | pass 2193 via tolerance (n5, claim check 102) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 38) | pass 919 via tolerance (n7, claim check 102) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_fwd_16S_pos, entry 73) | pass 8 via tolerance (n7, claim check 102) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 65) | pass 61.39 via tolerance (n6, claim check 102) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 34) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 2

Status: answer. 81 s. 5 requests, 6 tool calls (2 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261012-035530-2aa8. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/klindworth2013-16s-primers/claude_claude-haiku-5-5/klindworth2013-16s-primers/run2/home/sessions/20261012-035530-2aa8/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/klindworth2013-16s-primers/claude_claude-haiku-5-5/klindworth2013-16s-primers/run2/home/sessions/20261012-035530-2aa8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n7, claim check 93) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 29) | pass 1608 via tolerance (n4, claim check 93) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 29) | pass 2072 via tolerance (n4, claim check 93) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 29) | pass 465 via tolerance (n6, claim check 93) |
| pair1_ecoli_position | 341 exact | pass 341 (n6 metrics.pair1_fwd_16S_start, entry 63) | pass 341 via tolerance (n6, claim check 93) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n7, claim check 93) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 33) | pass 1275 via tolerance (n5, claim check 93) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 33) | pass 2193 via tolerance (n5, claim check 93) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 33) | pass 919 via tolerance (n6, claim check 93) |
| pair2_ecoli_position | 8 exact | pass 8 (n6 metrics.pair2_fwd_16S_start, entry 63) | pass 8 via tolerance (n6, claim check 93) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n7 metrics.tm_c_1, entry 71) | pass 61.39 via tolerance (n7, claim check 93) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 29) | not asked |

### klindworth2013-16s-primers | claude:claude-haiku-5-5 | run 3

Status: answer. 70 s. 4 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261012-035651-7c86. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/klindworth2013-16s-primers/claude_claude-haiku-5-5/klindworth2013-16s-primers/run3/home/sessions/20261012-035651-7c86/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/klindworth2013-16s-primers/claude_claude-haiku-5-5/klindworth2013-16s-primers/run3/home/sessions/20261012-035651-7c86/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n7, claim check 84) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 29) | pass 1608 via tolerance (n4, claim check 84) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 29) | pass 2072 via tolerance (n4, claim check 84) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 29) | pass 465 via tolerance (n6, claim check 84) |
| pair1_ecoli_position | 341 exact | pass 341 (n6 metrics.pair1_fwd_pos_in_16S, entry 40) | pass 341 via tolerance (n6, claim check 84) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 12) | pass 1 via tolerance (n7, claim check 84) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 32) | pass 1275 via tolerance (n5, claim check 84) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 32) | pass 2193 via tolerance (n5, claim check 84) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 32) | pass 919 via tolerance (n6, claim check 84) |
| pair2_ecoli_position | 8 exact | pass 8 (n6 metrics.pair2_fwd_pos_in_16S, entry 40) | pass 8 via tolerance (n6, claim check 84) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n7 metrics.tm_c_1, entry 62) | pass 61.39 via tolerance (n7, claim check 84) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 29) | not asked |

