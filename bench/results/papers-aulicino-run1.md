# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 5/8 | 5/8 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| aulicino2022-baculovirus-hdr | 5/8 / 5/8 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 115 | 12 | 28 | 14797 | 247023 | 16 | 0 | 0 | 1 | 0 | 3 | 6 | 0 | 0 | 3 | 3 |

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

Status: answer. 115 s. 12 requests, 16 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-040024-8040. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aulicino2022-baculovirus-hdr/run1/home/sessions/20261009-040024-8040/log.jsonl
Leak check: 14 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aulicino2022-baculovirus-hdr/run1/home/sessions/20261009-040024-8040/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| hdr_pct_printed | 5 ±1 | pass 4.981563 (n7 metrics.mean_PEnegCF594negApos_HDR, entry 114) | pass 4.98 via tolerance (n7, claim check 153) |
| hiti_pct_printed | 20 ±1.5 | pass 20.1604 (n4 metrics.pct_bv_hiti2c_rep1_PEnegCF594negApos, entry 79) | pass 20.4 via tolerance (n6, claim check 153) |
| control_cutoff | 3791.17 ±0.5 | FAIL 3762.942 (n4 table.rows[0][10], entry 79) | FAIL 3633 (n2, claim check 153) |
| hdr_pct_mean | 4.419 ±0.01 | FAIL 4.430946 (n8 metrics.mean_PEnegCF594negApos_HDR, entry 117) | FAIL 4.43 (n8, claim check 153) |
| hdr_pct_sd | 0.146 ±0.01 | pass 0.1507457 (n8 metrics.sd_PEnegCF594negApos_HDR, entry 117) | pass 0.15 via tolerance (n8, claim check 153) |
| hiti_pct_mean | 20.903 ±0.01 | FAIL 20.94504 (n8 metrics.mean_PEnegCF594negApos_HITI_2c, entry 117) | FAIL 20.95 (n8, claim check 153) |
| hiti_pct_sd | 2.256 ±0.02 | pass 2.251833 (n6 metrics.sd_PEnegCF594negApos_HITI_2c, entry 106) | pass 2.25 via tolerance (n6, claim check 153) |
| welch_p | 0.006018 ±0.0001 | pass 0.00606023 (n8 metrics.p_PEnegCF594negApos_HDR_HITI_2c, entry 117) | pass 0.00606 via tolerance (n8, claim check 153) |

