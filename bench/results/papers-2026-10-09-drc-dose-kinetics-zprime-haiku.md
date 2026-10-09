# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 21/30 | 21/29 | 3 | 1 timeout |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| desveaux2026-pcrv-ic50 | 0/9 / 0/8 (1 timeout) |
| aledo2022-renz-onpg | 2/2 / 2/2 |
| cooley2020-splitluc-zprime | 19/19 / 19/19 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 1951 | 21 | 52 | 20319 | 404340 | 21 | 3 | 0 | 0 | 2 | 5 | 8 | 5 | 3 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.03 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 1 | 0 | 0 |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 1 | 3 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 1 | 0 | 0 |

## Details

### desveaux2026-pcrv-ic50 | claude:claude-haiku-5-5 | run 1

Status: timeout. 1801 s. 7 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-234200-0e2b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261008-234200-0e2b/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/desveaux2026-pcrv-ic50/run1/home/sessions/20261008-234200-0e2b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ic50_medi3902 | 0.11725 ±0.0006 | FAIL 0.283 (n1 data.duration_s, entry 53) | FAIL - |
| ic50_30b8 | 0.021307 ±0.0001 | FAIL 0.283 (n1 data.duration_s, entry 53) | FAIL - |
| ic50_p3d6 | 3.6534 ±0.006 | FAIL 0.283 (n1 data.duration_s, entry 53) | FAIL - |
| ic50_p3d6_cytotox | 11.792 ±0.06 | FAIL 0.283 (n1 data.duration_s, entry 53) | FAIL - |
| ic50_30b8_v2 | 0.012782 ±0.00006 | FAIL 0.283 (n1 data.duration_s, entry 53) | FAIL - |
| ic50_30b8_v3 | 0.011202 ±0.00006 | FAIL 0.283 (n1 data.duration_s, entry 53) | FAIL - |
| ic50_30b8_v4 | 0.01305 ±0.00006 | FAIL 0.283 (n1 data.duration_s, entry 53) | FAIL - |
| ic50_30b8_v5 | 0.010452 ±0.00006 | FAIL 0.283 (n1 data.duration_s, entry 53) | FAIL - |
| ic50_30b8_cytotox_3pl | 6.6996 ±0.05 | FAIL 0.283 (n1 data.duration_s, entry 53) | not asked |
| ic50_30b8_cytotox_printed (reference) | 0.0452 ±0.0002 | differs 0.283 (n1 data.duration_s, entry 53) | differs - |

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 1

Status: answer. 59 s. 6 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-001200-4c2a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aledo2022-renz-onpg/run1/home/sessions/20261009-001200-4c2a/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/aledo2022-renz-onpg/run1/home/sessions/20261009-001200-4c2a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 32) | pass 2.479 via tolerance (n1, claim check 66) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 32) | pass 0.1841 via tolerance (n1, claim check 66) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 1

Status: answer. 91 s. 8 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-001300-fd5f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261009-001300-fd5f/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261009-001300-fd5f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n2 metrics.p1_10ul_z_prime, entry 46) | pass 0.541 via tolerance (n2, claim check 82) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n2 metrics.p2_10ul_z_prime, entry 46) | pass 0.61 via tolerance (n2, claim check 82) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n2 metrics.p3_10ul_z_prime, entry 46) | pass 0.728 via tolerance (n2, claim check 82) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n2 metrics.p4_10ul_z_prime, entry 46) | pass 0.73 via tolerance (n2, claim check 82) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n2 metrics.p5_10ul_z_prime, entry 46) | pass 0.664 via tolerance (n2, claim check 82) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n2 metrics.p6_10ul_z_prime, entry 46) | pass 0.632 via tolerance (n2, claim check 82) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n2 metrics.p7_10ul_z_prime, entry 46) | pass 0.767 via tolerance (n2, claim check 82) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n2 metrics.p8_10ul_z_prime, entry 46) | pass 0.742 via tolerance (n2, claim check 82) |
| z10_p9 | 0.621 ±0.004 | pass 0.6209891 (n2 metrics.p9_10ul_z_prime, entry 46) | pass 0.621 via tolerance (n2, claim check 82) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n2 metrics.p10_10ul_z_prime, entry 46) | pass 0.722 via tolerance (n2, claim check 82) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.p2_20ul_z_prime, entry 46) | pass 0.522 via tolerance (n2, claim check 82) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.p4_20ul_z_prime, entry 46) | pass 0.786 via tolerance (n2, claim check 82) |
| z20_p6 | 0.643 ±0.004 | pass 0.6429603 (n2 metrics.p6_20ul_z_prime, entry 46) | pass 0.643 via tolerance (n2, claim check 82) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.p7_20ul_z_prime, entry 46) | pass 0.671 via tolerance (n2, claim check 82) |
| z20_p8 | 0.685 ±0.004 | pass 0.6850474 (n2 metrics.p8_20ul_z_prime, entry 46) | pass 0.685 via tolerance (n2, claim check 82) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.p9_20ul_z_prime, entry 46) | pass 0.8 via tolerance (n2, claim check 82) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.p10_20ul_z_prime, entry 46) | pass 0.728 via tolerance (n2, claim check 82) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n2 metrics.p1_10ul_mean_high, entry 46) | pass 2471.2 via tolerance (n2, claim check 82) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1216 (n2 metrics.p1_10ul_sd_high, entry 46) | pass 268.1 via tolerance (n2, claim check 82) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.6429603 (n2 metrics.p6_20ul_z_prime, entry 46) | differs 0.643 (n2, claim check 82) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.8524462 (n2 metrics.p5_20ul_z_prime, entry 46) | differs 0.852 (n2, claim check 82) |

