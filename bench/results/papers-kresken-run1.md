# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 16/24 | 17/24 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| kresken2021-temocillin | 16/24 / 17/24 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 103 | 12 | 30 | 12534 | 217963 | 14 | 9 | 1 | 0 | 1 | 4 | 9 | 2 | 3 | 1 | 1 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kresken2021-temocillin | claude:claude-haiku-5-5 | 1 | on | 3 | 1 | 3 | 3 | 0 |

Paths outside the allow list:
- kresken2021-temocillin | claude:claude-haiku-5-5 | run 1: /Volumes/T7/guided-analysis/tools/R-library-micro

## Details

### kresken2021-temocillin | claude:claude-haiku-5-5 | run 1

Status: answer. 103 s. 12 requests, 14 tool calls (9 failed), 1 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-032643-b18d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kresken2021-temocillin/run1/home/sessions/20261009-032643-b18d/log.jsonl
Leak check: 3 paths read, 1 outside the allow list, 3 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kresken2021-temocillin/run1/home/sessions/20261009-032643-b18d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ecoli_r_tzp_pct | 79.3 ±0.06 | FAIL 79 (n1 stdout, entry 78) | pass 79 via rounding (n1, claim check 136) |
| ecoli_r_tzp_mic50 | 2 ±0.001 | pass 2 (n1 stdout, entry 78) | pass 2 via tolerance (n1, claim check 136) |
| ecoli_r_tzp_mic90 | 32 ±0.001 | pass 32 (n1 stdout, entry 78) | pass 32 via tolerance (n1, claim check 136) |
| ecoli_r_tmo_pct | 94.8 ±0.06 | FAIL 109 (n1 stdout, entry 78) | FAIL 109 (n1, claim check 136) |
| ecoli_r_tmo_mic50 | 8 ±0.001 | pass 8 (n1 stdout, entry 78) | pass 8 via tolerance (n1, claim check 136) |
| ecoli_r_tmo_mic90 | 16 ±0.001 | pass 16 (n1 stdout, entry 78) | pass 16 via tolerance (n1, claim check 136) |
| ecoli_s_tzp_pct | 93.3 ±0.06 | FAIL 79 (n1 stdout, entry 78) | FAIL 79 (n1, claim check 136) |
| ecoli_s_tzp_mic50 | 1 ±0.001 | pass 1 (n1 stdout, entry 78) | pass 1 via tolerance (n1, claim check 136) |
| ecoli_s_tzp_mic90 | 4 ±0.001 | pass 4 (n1 stdout, entry 78) | pass 4 via tolerance (n1, claim check 136) |
| ecoli_s_tmo_pct | 100 ±0.06 | FAIL 109 (n1 stdout, entry 78) | FAIL 109 (n1, claim check 136) |
| ecoli_s_tmo_mic50 | 4 ±0.001 | pass 4 (n1 stdout, entry 78) | pass 4 via tolerance (n1, claim check 136) |
| ecoli_s_tmo_mic90 | 16 ±0.001 | pass 16 (n1 stdout, entry 78) | pass 16 via tolerance (n1, claim check 136) |
| kp_r_tzp_pct | 57.1 ±0.06 | FAIL 58 (n1 stdout, entry 78) | FAIL 58 (n1, claim check 136) |
| kp_r_tzp_mic50 | 8 ±0.001 | pass 8 (n1 stdout, entry 78) | pass 8 via tolerance (n1, claim check 136) |
| kp_r_tzp_mic90 | 128 ±0.001 | pass 128 (n1 stdout, entry 78) | pass 128 via tolerance (n1, claim check 136) |
| kp_r_tmo_pct | 90.5 ±0.06 | FAIL 79 (n1 stdout, entry 78) | FAIL 79 (n1, claim check 136) |
| kp_r_tmo_mic50 | 8 ±0.001 | pass 8 (n1 stdout, entry 78) | pass 8 via tolerance (n1, claim check 136) |
| kp_r_tmo_mic90 | 16 ±0.001 | pass 16 (n1 stdout, entry 78) | pass 16 via tolerance (n1, claim check 136) |
| kp_s_tzp_pct | 93.3 ±0.06 | FAIL 79 (n1 stdout, entry 78) | FAIL 79 (n1, claim check 136) |
| kp_s_tzp_mic50 | 1 ±0.001 | pass 1 (n1 stdout, entry 78) | pass 1 via tolerance (n1, claim check 136) |
| kp_s_tzp_mic90 | 8 ±0.001 | pass 8 (n1 stdout, entry 78) | pass 8 via tolerance (n1, claim check 136) |
| kp_s_tmo_pct | 100 ±0.06 | FAIL 109 (n1 stdout, entry 78) | FAIL 109 (n1, claim check 136) |
| kp_s_tmo_mic50 | 2 ±0.001 | pass 2 (n1 stdout, entry 78) | pass 2 via tolerance (n1, claim check 136) |
| kp_s_tmo_mic90 | 8 ±0.001 | pass 8 (n1 stdout, entry 78) | pass 8 via tolerance (n1, claim check 136) |

