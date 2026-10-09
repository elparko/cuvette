# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 96/96 | 60/60 | 21 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| lazear2023-sage | 18/18 / 9/9 |
| makrai2023-colonies | 6/6 / 3/3 |
| oksanen-vegan-dune | 18/18 / 15/15 |
| rees2019-uptake | 15/15 / 12/12 |
| schindelin2012-fiji-blobs | 3/3 / 3/3 |
| student1908-sleep | 18/18 / 12/12 |
| wolf2018-scanpy | 18/18 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 21 | 3443 | 254 | 634 | 260786 | 5077190 | 253 | 9 | 2 | 7 | 21 | 54 | 102 | 49 | 9 | 19 | 19 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.27 for 21 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lazear2023-sage | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 1 | 0 |
| lazear2023-sage | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 0 | 2 | 0 |
| lazear2023-sage | claude:claude-haiku-5-5 | 3 | on | 8 | 0 | 0 | 1 | 0 |
| makrai2023-colonies | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 1 | 0 | 0 |
| makrai2023-colonies | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| makrai2023-colonies | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| rees2019-uptake | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 1 | 0 | 0 |
| rees2019-uptake | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 1 | 2 | 0 |
| rees2019-uptake | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 1 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 3 | 0 |
| student1908-sleep | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| wolf2018-scanpy | claude:claude-haiku-5-5 | 1 | on | 16 | 0 | 0 | 0 | 0 |
| wolf2018-scanpy | claude:claude-haiku-5-5 | 2 | on | 15 | 0 | 0 | 0 | 0 |
| wolf2018-scanpy | claude:claude-haiku-5-5 | 3 | on | 16 | 0 | 0 | 0 | 0 |

## Details

### lazear2023-sage | claude:claude-haiku-5-5 | run 1

Status: answer. 150 s. 14 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-071104-4b36. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lazear2023-sage/run1/home/sessions/20261009-071104-4b36/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lazear2023-sage/run1/home/sessions/20261009-071104-4b36/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 19) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 19) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 27) | pass 207 via tolerance (n9, claim check 128) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 27) | pass 47 via tolerance (n5, claim check 128) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 27) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n5 stdout, entry 58) | pass 242 via tolerance (n9, claim check 128) |

### lazear2023-sage | claude:claude-haiku-5-5 | run 2

Status: answer. 130 s. 12 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261009-071335-45aa. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lazear2023-sage/run2/home/sessions/20261009-071335-45aa/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lazear2023-sage/run2/home/sessions/20261009-071335-45aa/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 19) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 19) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 27) | pass 207 via tolerance (n5, claim check 111) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 27) | pass 47 via tolerance (n5, claim check 111) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 27) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n5 stdout, entry 57) | pass 242 via tolerance (n5, claim check 111) |

### lazear2023-sage | claude:claude-haiku-5-5 | run 3

Status: answer. 188 s. 11 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-071547-c2d6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lazear2023-sage/run3/home/sessions/20261009-071547-c2d6/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lazear2023-sage/run3/home/sessions/20261009-071547-c2d6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 11) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 11) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 17) | pass 207 via tolerance (n6, claim check 116) |
| distinct_peptides | 47 exact | pass 47 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/lazear2023-sage/run3/home/sessions/20261009-071547-c2d6/work/search_sage-1/results.tsv, entry 11) | pass 47 via tolerance (n6, claim check 116) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 17) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n6 stdout, entry 57) | pass 242 via tolerance (n6, claim check 116) |

### makrai2023-colonies | claude:claude-haiku-5-5 | run 1

Status: answer. 145 s. 13 requests, 11 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071858-1662. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/makrai2023-colonies/run1/home/sessions/20261009-071858-1662/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/makrai2023-colonies/run1/home/sessions/20261009-071858-1662/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 72) | not asked |
| total_colonies | 88 ±9 | pass 88 (n8 metrics.total_colonies, entry 102) | pass 88 via tolerance (n9, claim check 147) |

### makrai2023-colonies | claude:claude-haiku-5-5 | run 2

Status: answer. 359 s. 11 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072124-c60b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/makrai2023-colonies/run2/home/sessions/20261009-072124-c60b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/makrai2023-colonies/run2/home/sessions/20261009-072124-c60b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 65) | not asked |
| total_colonies | 88 ±9 | pass 88 (n8 metrics.total_colonies, entry 81) | pass 88 via tolerance (n17, claim check 164) |

### makrai2023-colonies | claude:claude-haiku-5-5 | run 3

Status: answer. 332 s. 11 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072724-9678. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/makrai2023-colonies/run3/home/sessions/20261009-072724-9678/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/makrai2023-colonies/run3/home/sessions/20261009-072724-9678/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 72) | not asked |
| total_colonies | 88 ±9 | pass 88 (n7 metrics.total_colonies, entry 80) | pass 88 via tolerance (n12, claim check 144) |

### oksanen-vegan-dune | claude:claude-haiku-5-5 | run 1

Status: answer. 119 s. 10 requests, 9 tool calls (0 failed), 2 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-073256-3ec2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oksanen-vegan-dune/run1/home/sessions/20261009-073256-3ec2/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oksanen-vegan-dune/run1/home/sessions/20261009-073256-3ec2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 29) | pass 1.4405 via tolerance (n2, claim check 137) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 89) | pass 0.1183 via tolerance (n10, claim check 137) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 68) | pass 0.3416 via tolerance (n6, claim check 137) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 68) | pass 2.767 via tolerance (n6, claim check 137) |
| permanova_p | 0.003 ±0.003 | pass 0.003 (n6 metrics.p, entry 68) | pass 0.003 via tolerance (n6, claim check 137) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 75) | not asked |

### oksanen-vegan-dune | claude:claude-haiku-5-5 | run 2

Status: answer. 123 s. 5 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073455-a1ce. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oksanen-vegan-dune/run2/home/sessions/20261009-073455-a1ce/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oksanen-vegan-dune/run2/home/sessions/20261009-073455-a1ce/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 29) | pass 1.44048 via tolerance (n2, claim check 106) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 80) | pass 0.1183 via tolerance (n10, claim check 106) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 59) | pass 0.3416 via tolerance (n6, claim check 106) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 59) | pass 2.767 via tolerance (n6, claim check 106) |
| permanova_p | 0.003 ±0.003 | pass 0.003 (n6 metrics.p, entry 59) | pass 0.003 via tolerance (n6, claim check 106) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 66) | not asked |

### oksanen-vegan-dune | claude:claude-haiku-5-5 | run 3

Status: answer. 165 s. 9 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073659-be3f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oksanen-vegan-dune/run3/home/sessions/20261009-073659-be3f/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/oksanen-vegan-dune/run3/home/sessions/20261009-073659-be3f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 29) | pass 1.4405 via tolerance (n2, claim check 143) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 82) | pass 0.1183 via tolerance (n10, claim check 143) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 59) | pass 0.3416 via tolerance (n6, claim check 143) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 59) | pass 2.767 via tolerance (n6, claim check 143) |
| permanova_p | 0.003 ±0.003 | pass 0.003 (n6 metrics.p, entry 59) | pass 0.003 via tolerance (n6, claim check 143) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 68) | not asked |

### rees2019-uptake | claude:claude-haiku-5-5 | run 1

Status: answer. 139 s. 12 requests, 11 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-073944-7ed3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261009-073944-7ed3/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261009-073944-7ed3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 92) | not asked |
| nuclei | 582 ±35 | pass 566 (n7 metrics.total_nuclei, entry 103) | pass 566 via tolerance (n7, claim check 160) |
| vesicles | 461 ±35 | pass 459 (n7 metrics.total_cells, entry 103) | pass 459 via tolerance (n7, claim check 160) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n7 table.rows[1][5], entry 103) | pass 0.769 via tolerance (n8, claim check 160) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.4651163 (n8 metrics.frac_pos_field2, entry 111) | pass 0.465 via tolerance (n8, claim check 160) |
| cells (reference) | 572 ±35 | match 566 (n7 metrics.total_nuclei, entry 103) | match 566 via tolerance (n7, claim check 160) |

### rees2019-uptake | claude:claude-haiku-5-5 | run 2

Status: answer. 186 s. 13 requests, 14 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-074203-5d47. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run2/home/sessions/20261009-074203-5d47/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 1 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run2/home/sessions/20261009-074203-5d47/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 88) | not asked |
| nuclei | 582 ±35 | pass 566 (n8 metrics.total_nuclei, entry 111) | pass 566 via tolerance (n8, claim check 184) |
| vesicles | 461 ±35 | pass 459 (n8 metrics.total_cells, entry 111) | pass 459 via tolerance (n8, claim check 184) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n8 table.rows[1][5], entry 111) | pass 0.64 via tolerance (n8, claim check 184) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.4651163 (n9 metrics.field2_positive_fraction, entry 126) | pass 0.442 via tolerance (n11, claim check 184) |
| cells (reference) | 572 ±35 | match 566 (n8 metrics.total_nuclei, entry 111) | match 566 via tolerance (n8, claim check 184) |

### rees2019-uptake | claude:claude-haiku-5-5 | run 3

Status: answer. 135 s. 11 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074509-b00a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run3/home/sessions/20261009-074509-b00a/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/rees2019-uptake/run3/home/sessions/20261009-074509-b00a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 94) | not asked |
| nuclei | 582 ±35 | pass 566 (n7 metrics.total_nuclei, entry 102) | pass 566 via tolerance (n8, claim check 147) |
| vesicles | 461 ±35 | pass 459 (n7 metrics.total_cells, entry 102) | pass 459 via tolerance (n8, claim check 147) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n7 table.rows[1][5], entry 102) | pass 0.64 via tolerance (n7, claim check 147) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.46512 (n7 table.rows[1][3], entry 102) | pass 0.465 via tolerance (n7, claim check 147) |
| cells (reference) | 572 ±35 | match 566 (n7 metrics.total_nuclei, entry 102) | match 566 via tolerance (n8, claim check 147) |

### schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | run 1

Status: answer. 75 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074725-5162. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261009-074725-5162/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261009-074725-5162/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 46) | pass 64 via tolerance (n10, claim check 100) |

### schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | run 2

Status: answer. 147 s. 18 requests, 18 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074840-4d4a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261009-074840-4d4a/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261009-074840-4d4a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 55) | pass 64 via tolerance (n19, claim check 215) |

### schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | run 3

Status: answer. 84 s. 8 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 3 unsourced.
Session: 20261009-075107-ad7e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261009-075107-ad7e/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261009-075107-ad7e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 49) | pass 64 via tolerance (n16, claim check 115) |

### student1908-sleep | claude:claude-haiku-5-5 | run 1

Status: answer. 50 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075232-7114. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/student1908-sleep/run1/home/sessions/20261009-075232-7114/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/student1908-sleep/run1/home/sessions/20261009-075232-7114/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 40) | pass 1.58 via tolerance (n2, claim check 64) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 40) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 40) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 40) | pass 0.0028 via tolerance (n2, claim check 64) |
| ci_lower | 0.7 ±0.005 | pass 0.7 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/student1908-sleep/run1/home/sessions/20261009-075232-7114/work/inspect_table-1/columns.csv, entry 11) | pass 0.7 via tolerance (n1, claim check 64) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 40) | pass 2.46 via tolerance (n2, claim check 64) |

### student1908-sleep | claude:claude-haiku-5-5 | run 2

Status: answer. 60 s. 7 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075322-eef8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/student1908-sleep/run2/home/sessions/20261009-075322-eef8/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/student1908-sleep/run2/home/sessions/20261009-075322-eef8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 42) | pass 1.58 via tolerance (n3, claim check 78) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 42) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 42) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 42) | pass 0.0028 via tolerance (n3, claim check 78) |
| ci_lower | 0.7 ±0.005 | pass 0.7 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/student1908-sleep/run2/home/sessions/20261009-075322-eef8/work/inspect_table-1/columns.csv, entry 11) | pass 0.7 via tolerance (n1, claim check 78) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 42) | pass 2.46 via tolerance (n3, claim check 78) |

### student1908-sleep | claude:claude-haiku-5-5 | run 3

Status: answer. 45 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075422-209d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/student1908-sleep/run3/home/sessions/20261009-075422-209d/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/student1908-sleep/run3/home/sessions/20261009-075422-209d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 42) | pass 1.58 via tolerance (n2, claim check 56) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 42) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 42) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 42) | pass 0.0028 via tolerance (n2, claim check 56) |
| ci_lower | 0.7 ±0.005 | pass 0.7 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/student1908-sleep/run3/home/sessions/20261009-075422-209d/work/inspect_table-1/columns.csv, entry 11) | pass 0.7 via tolerance (n1, claim check 56) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 42) | pass 2.46 via tolerance (n2, claim check 56) |

### wolf2018-scanpy | claude:claude-haiku-5-5 | run 1

Status: answer. 247 s. 25 requests, 27 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-075507-d28d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wolf2018-scanpy/run1/home/sessions/20261009-075507-d28d/log.jsonl
Leak check: 16 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wolf2018-scanpy/run1/home/sessions/20261009-075507-d28d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 14) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 14) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 32) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 73) | pass 2638 via tolerance (n21, claim check 282) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 96) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 165) | pass 7 via tolerance (n22, claim check 282) |

### wolf2018-scanpy | claude:claude-haiku-5-5 | run 2

Status: answer. 272 s. 25 requests, 26 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-075917-fecd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wolf2018-scanpy/run2/home/sessions/20261009-075917-fecd/log.jsonl
Leak check: 15 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wolf2018-scanpy/run2/home/sessions/20261009-075917-fecd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 16) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 16) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 35) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 71) | pass 2638 via tolerance (n16, claim check 284) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 94) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 163) | pass 7 via tolerance (n20, claim check 284) |

### wolf2018-scanpy | claude:claude-haiku-5-5 | run 3

Status: answer. 293 s. 22 requests, 24 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080352-3cde. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wolf2018-scanpy/run3/home/sessions/20261009-080352-3cde/log.jsonl
Leak check: 16 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/wolf2018-scanpy/run3/home/sessions/20261009-080352-3cde/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 16) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 16) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 27) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 63) | pass 2638 via tolerance (n16, claim check 253) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 85) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 154) | pass 7 via tolerance (n20, claim check 253) |

