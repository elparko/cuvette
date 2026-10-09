# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 7/8 | 8/8 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| aulicino2022-baculovirus-hdr | 7/8 / 8/8 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 115 | 9 | 22 | 11960 | 132763 | 12 | 1 | 0 | 0 | 1 | 5 | 4 | 0 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aulicino2022-baculovirus-hdr | claude:claude-haiku-5-5 | 1 | on | 14 | 0 | 0 | 0 | 0 |

## Details

### aulicino2022-baculovirus-hdr | claude:claude-haiku-5-5 | run 1

Status: answer. 115 s. 9 requests, 12 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-040250-ac15. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aulicino2022-baculovirus-hdr/run1/home/sessions/20261009-040250-ac15/log.jsonl
Leak check: 14 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aulicino2022-baculovirus-hdr/run1/home/sessions/20261009-040250-ac15/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| hdr_pct_printed | 5 ±1 | pass 5.041659 (n3 table.rows[0][9], entry 81) | pass 4.59 via tolerance (n5, claim check 124) |
| hiti_pct_printed | 20 ±1.5 | pass 19.97012 (n3 table.rows[0][8], entry 81) | pass 20.12 via tolerance (n3, claim check 124) |
| control_cutoff | 3791.17 ±0.5 | pass 3791.168 (n2 table.rows[0][10], entry 66) | pass 3791.2 via tolerance (n4, claim check 124) |
| hdr_pct_mean | 4.419 ±0.01 | pass 4.419405 (n5 stdout, entry 102) | pass 4.42 via tolerance (n3, claim check 124) |
| hdr_pct_sd | 0.146 ±0.01 | pass 0.145596 (n5 stdout, entry 102) | pass 0.15 via tolerance (n5, claim check 124) |
| hiti_pct_mean | 20.903 ±0.01 | pass 20.90269 (n5 stdout, entry 102) | pass 20.9 via tolerance (n3, claim check 124) |
| hiti_pct_sd | 2.256 ±0.02 | pass 2.25575 (n5 stdout, entry 102) | pass 2.26 via tolerance (n5, claim check 124) |
| welch_p | 0.006018 ±0.0001 | FAIL 0.000005400605 (n3 metrics.p_PE_CF594_Apos_HDR_HITI_2c, entry 81) | pass 0.006 via tolerance (n5, claim check 124) |

