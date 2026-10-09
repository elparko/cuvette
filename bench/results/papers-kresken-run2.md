# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 24/24 | 24/24 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| kresken2021-temocillin | 24/24 / 24/24 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 155 | 10 | 26 | 14599 | 293599 | 10 | 1 | 0 | 1 | 1 | 3 | 5 | 3 | 1 | 1 | 1 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kresken2021-temocillin | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 1 | 1 | 0 |

## Details

### kresken2021-temocillin | claude:claude-haiku-5-5 | run 1

Status: answer. 155 s. 10 requests, 10 tool calls (1 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-032859-0ef4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kresken2021-temocillin/run1/home/sessions/20261009-032859-0ef4/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kresken2021-temocillin/run1/home/sessions/20261009-032859-0ef4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ecoli_r_tzp_pct | 79.3 ±0.06 | pass 79.31034 (n4 metrics.pct_S_Escherichia_coli_Piperacillin_tazobactam_Escherichia_coli_3GC_resistant, entry 69) | pass 79.3 via tolerance (n4, claim check 124) |
| ecoli_r_tzp_mic50 | 2 ±0.001 | pass 2 (n1 metrics.n_drugs, entry 43) | pass 2 via tolerance (n4, claim check 124) |
| ecoli_r_tzp_mic90 | 32 ±0.001 | pass 32 (n3 metrics.mic90_Escherichia_coli_Piperacillin_tazobactam_Escherichia_coli_3GC_resistant, entry 59) | pass 32 via tolerance (n3, claim check 124) |
| ecoli_r_tmo_pct | 94.8 ±0.06 | pass 94.82759 (n4 metrics.pct_susceptible_Escherichia_coli_Temocillin_Escherichia_coli_3GC_resistant, entry 69) | pass 94.8 via tolerance (n4, claim check 124) |
| ecoli_r_tmo_mic50 | 8 ±0.001 | pass 8 (n1 metrics.s_max_Piperacillin_tazobactam, entry 43) | pass 8 via tolerance (n4, claim check 124) |
| ecoli_r_tmo_mic90 | 16 ±0.001 | pass 16 (n1 metrics.r_above_Temocillin, entry 43) | pass 16 via tolerance (n3, claim check 124) |
| ecoli_s_tzp_pct | 93.3 ±0.06 | pass 93.33333 (n4 metrics.pct_S_Escherichia_coli_Piperacillin_tazobactam_Escherichia_coli_3GC_susceptible, entry 69) | pass 93.3 via tolerance (n4, claim check 124) |
| ecoli_s_tzp_mic50 | 1 ±0.001 | pass 1 (n3 metrics.mic50_Escherichia_coli_Piperacillin_tazobactam_Escherichia_coli_3GC_susceptible, entry 59) | pass 1 via tolerance (n4, claim check 124) |
| ecoli_s_tzp_mic90 | 4 ±0.001 | pass 4 (n3 metrics.mic90_Escherichia_coli_Piperacillin_tazobactam_Escherichia_coli_3GC_susceptible, entry 59) | pass 4 via tolerance (n3, claim check 124) |
| ecoli_s_tmo_pct | 100 ±0.06 | pass 100 (n4 metrics.pct_susceptible_Escherichia_coli_Temocillin_Escherichia_coli_3GC_susceptible, entry 69) | pass 100 via tolerance (n4, claim check 124) |
| ecoli_s_tmo_mic50 | 4 ±0.001 | pass 4 (n3 metrics.mic90_Escherichia_coli_Piperacillin_tazobactam_Escherichia_coli_3GC_susceptible, entry 59) | pass 4 via tolerance (n3, claim check 124) |
| ecoli_s_tmo_mic90 | 16 ±0.001 | pass 16 (n1 metrics.r_above_Temocillin, entry 43) | pass 16 via tolerance (n3, claim check 124) |
| kp_r_tzp_pct | 57.1 ±0.06 | pass 57.14286 (n4 metrics.pct_S_Klebsiella_pneumoniae_Piperacillin_tazobactam_Klebsiella_pneumoniae_3GC_resistant, entry 69) | pass 57.1 via tolerance (n4, claim check 124) |
| kp_r_tzp_mic50 | 8 ±0.001 | pass 8 (n1 metrics.s_max_Piperacillin_tazobactam, entry 43) | pass 8 via tolerance (n4, claim check 124) |
| kp_r_tzp_mic90 | 128 ±0.001 | pass 128 (n3 metrics.mic90_Klebsiella_pneumoniae_Piperacillin_tazobactam_Klebsiella_pneumoniae_3GC_resistant, entry 59) | pass 128 via tolerance (n3, claim check 124) |
| kp_r_tmo_pct | 90.5 ±0.06 | pass 90.47619 (n4 metrics.pct_susceptible_Klebsiella_pneumoniae_Temocillin_Klebsiella_pneumoniae_3GC_resistant, entry 69) | pass 90.5 via tolerance (n4, claim check 124) |
| kp_r_tmo_mic50 | 8 ±0.001 | pass 8 (n1 metrics.s_max_Piperacillin_tazobactam, entry 43) | pass 8 via tolerance (n4, claim check 124) |
| kp_r_tmo_mic90 | 16 ±0.001 | pass 16 (n1 metrics.r_above_Temocillin, entry 43) | pass 16 via tolerance (n3, claim check 124) |
| kp_s_tzp_pct | 93.3 ±0.06 | pass 93.33333 (n4 metrics.pct_S_Escherichia_coli_Piperacillin_tazobactam_Escherichia_coli_3GC_susceptible, entry 69) | pass 93.3 via tolerance (n4, claim check 124) |
| kp_s_tzp_mic50 | 1 ±0.001 | pass 1 (n3 metrics.mic50_Escherichia_coli_Piperacillin_tazobactam_Escherichia_coli_3GC_susceptible, entry 59) | pass 1 via tolerance (n4, claim check 124) |
| kp_s_tzp_mic90 | 8 ±0.001 | pass 8 (n1 metrics.s_max_Piperacillin_tazobactam, entry 43) | pass 8 via tolerance (n4, claim check 124) |
| kp_s_tmo_pct | 100 ±0.06 | pass 100 (n4 metrics.pct_susceptible_Escherichia_coli_Temocillin_Escherichia_coli_3GC_susceptible, entry 69) | pass 100 via tolerance (n4, claim check 124) |
| kp_s_tmo_mic50 | 2 ±0.001 | pass 2 (n1 metrics.n_drugs, entry 43) | pass 2 via tolerance (n4, claim check 124) |
| kp_s_tmo_mic90 | 8 ±0.001 | pass 8 (n1 metrics.s_max_Piperacillin_tazobactam, entry 43) | pass 8 via tolerance (n4, claim check 124) |

