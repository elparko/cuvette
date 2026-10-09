# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 232/237 | 201/207 | 21 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| astapova2021-deseq2-kgn | 12/12 / 9/9 |
| cooley2020-splitluc-zprime | 57/57 / 57/57 |
| hildyard2021-embryo-refgenes | 54/54 / 48/48 |
| lazear2023-sage | 13/18 / 3/9 |
| manders1993-coloc | 18/18 / 15/15 |
| rees2019-uptake | 15/15 / 12/12 |
| sriphoosanaphan2021-vitd-hcv | 63/63 / 57/57 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 21 | 2998 | 209 | 528 | 170523 | 4269001 | 239 | 18 | 4 | 4 | 20 | 102 | 66 | 19 | 35 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $7.81 for 21 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| astapova2021-deseq2-kgn | claude:claude-opus-5-5 | 1 | on | 3 | 0 | 0 | 2 | 0 |
| astapova2021-deseq2-kgn | claude:claude-opus-5-5 | 2 | on | 3 | 0 | 0 | 2 | 0 |
| astapova2021-deseq2-kgn | claude:claude-opus-5-5 | 3 | on | 3 | 0 | 0 | 2 | 0 |
| cooley2020-splitluc-zprime | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 1 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-opus-5-5 | 2 | on | 3 | 0 | 1 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-opus-5-5 | 3 | on | 1 | 0 | 1 | 0 | 1 |
| hildyard2021-embryo-refgenes | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 2 | 11 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 2 | 0 | 0 |
| hildyard2021-embryo-refgenes | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 2 | 1 | 0 |
| lazear2023-sage | claude:claude-opus-5-5 | 1 | on | 7 | 0 | 0 | 4 | 0 |
| lazear2023-sage | claude:claude-opus-5-5 | 2 | on | 7 | 0 | 1 | 0 | 0 |
| lazear2023-sage | claude:claude-opus-5-5 | 3 | on | 6 | 0 | 1 | 0 | 0 |
| manders1993-coloc | claude:claude-opus-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-opus-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-opus-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| rees2019-uptake | claude:claude-opus-5-5 | 1 | on | 3 | 0 | 0 | 3 | 0 |
| rees2019-uptake | claude:claude-opus-5-5 | 2 | on | 5 | 0 | 1 | 3 | 0 |
| rees2019-uptake | claude:claude-opus-5-5 | 3 | on | 5 | 0 | 1 | 5 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-opus-5-5 | 1 | on | 3 | 0 | 0 | 2 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-opus-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-opus-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |

## Details

### astapova2021-deseq2-kgn | claude:claude-opus-5-5 | run 1

Status: answer. 200 s. 8 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-071104-aec8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261009-071104-aec8/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261009-071104-aec8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 60) | pass 173 via tolerance (n7, claim check 105) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 60) | pass 125 via tolerance (n7, claim check 105) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 60) | pass 48 via tolerance (n7, claim check 105) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 11) | not asked |

### astapova2021-deseq2-kgn | claude:claude-opus-5-5 | run 2

Status: answer. 206 s. 8 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-071424-e3c2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261009-071424-e3c2/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261009-071424-e3c2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 62) | pass 173 via tolerance (n7, claim check 113) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 62) | pass 125 via tolerance (n7, claim check 113) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 62) | pass 48 via tolerance (n7, claim check 113) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 14) | not asked |

### astapova2021-deseq2-kgn | claude:claude-opus-5-5 | run 3

Status: answer. 204 s. 10 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261009-071751-919e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261009-071751-919e/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261009-071751-919e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 68) | pass 173 via tolerance (n7, claim check 121) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 68) | pass 125 via tolerance (n7, claim check 121) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 68) | pass 48 via tolerance (n7, claim check 121) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 14) | not asked |

### cooley2020-splitluc-zprime | claude:claude-opus-5-5 | run 1

Status: answer. 88 s. 5 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072114-816e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261009-072114-816e/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261009-072114-816e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n1 metrics.p1_z_prime, entry 36) | pass 0.541 via tolerance (n1, claim check 57) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n1 metrics.p2_z_prime, entry 36) | pass 0.61 via tolerance (n1, claim check 57) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n1 metrics.p3_z_prime, entry 36) | pass 0.728 via tolerance (n2, claim check 57) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n1 metrics.p4_z_prime, entry 36) | pass 0.73 via tolerance (n1, claim check 57) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n1 metrics.p5_z_prime, entry 36) | pass 0.664 via tolerance (n1, claim check 57) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n1 metrics.p6_z_prime, entry 36) | pass 0.632 via tolerance (n1, claim check 57) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n1 metrics.p7_z_prime, entry 36) | pass 0.767 via tolerance (n1, claim check 57) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n1 metrics.p8_z_prime, entry 36) | pass 0.742 via tolerance (n1, claim check 57) |
| z10_p9 | 0.621 ±0.004 | pass 0.6209891 (n1 metrics.p9_z_prime, entry 36) | pass 0.621 via tolerance (n1, claim check 57) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n1 metrics.p10_z_prime, entry 36) | pass 0.722 via tolerance (n1, claim check 57) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.p2_z_prime, entry 39) | pass 0.522 via tolerance (n2, claim check 57) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.p4_z_prime, entry 39) | pass 0.786 via tolerance (n2, claim check 57) |
| z20_p6 | 0.643 ±0.004 | pass 0.6429603 (n2 metrics.p6_z_prime, entry 39) | pass 0.643 via tolerance (n2, claim check 57) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.p7_z_prime, entry 39) | pass 0.671 via tolerance (n2, claim check 57) |
| z20_p8 | 0.685 ±0.004 | pass 0.6850474 (n2 metrics.p8_z_prime, entry 39) | pass 0.685 via tolerance (n2, claim check 57) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.p9_z_prime, entry 39) | pass 0.8 via tolerance (n2, claim check 57) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.p10_z_prime, entry 39) | pass 0.728 via tolerance (n2, claim check 57) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n1 metrics.p1_mean_high, entry 36) | pass 2471.2 via tolerance (n1, claim check 57) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1216 (n1 metrics.p1_sd_high, entry 36) | pass 268.1 via tolerance (n1, claim check 57) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.6429603 (n2 metrics.p6_z_prime, entry 39) | differs 0.643 (n2, claim check 57) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.8524462 (n2 metrics.p5_z_prime, entry 39) | differs 0.852 (n2, claim check 57) |

### cooley2020-splitluc-zprime | claude:claude-opus-5-5 | run 2

Status: answer. 97 s. 9 requests, 9 tool calls (1 failed), 1 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-072242-4272. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261009-072242-4272/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261009-072242-4272/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n2 metrics.p1_z_prime, entry 48) | pass 0.541 via tolerance (n4, claim check 89) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n2 metrics.p2_z_prime, entry 48) | pass 0.61 via tolerance (n4, claim check 89) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n2 metrics.p3_z_prime, entry 48) | pass 0.728 via tolerance (n4, claim check 89) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n2 metrics.p4_z_prime, entry 48) | pass 0.73 via tolerance (n4, claim check 89) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n2 metrics.p5_z_prime, entry 48) | pass 0.664 via tolerance (n4, claim check 89) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n2 metrics.p6_z_prime, entry 48) | pass 0.632 via tolerance (n4, claim check 89) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n2 metrics.p7_z_prime, entry 48) | pass 0.767 via tolerance (n4, claim check 89) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n2 metrics.p8_z_prime, entry 48) | pass 0.742 via tolerance (n4, claim check 89) |
| z10_p9 | 0.621 ±0.004 | pass 0.621 (n4 stdout, entry 60) | pass 0.621 via tolerance (n4, claim check 89) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n2 metrics.p10_z_prime, entry 48) | pass 0.722 via tolerance (n4, claim check 89) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n3 metrics.p2_z_prime, entry 51) | pass 0.522 via tolerance (n4, claim check 89) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n3 metrics.p4_z_prime, entry 51) | pass 0.786 via tolerance (n4, claim check 89) |
| z20_p6 | 0.643 ±0.004 | pass 0.643 (n4 stdout, entry 60) | pass 0.643 via tolerance (n4, claim check 89) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n3 metrics.p7_z_prime, entry 51) | pass 0.671 via tolerance (n4, claim check 89) |
| z20_p8 | 0.685 ±0.004 | pass 0.685 (n4 stdout, entry 60) | pass 0.685 via tolerance (n4, claim check 89) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n3 metrics.p9_z_prime, entry 51) | pass 0.8 via tolerance (n4, claim check 89) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n3 metrics.p10_z_prime, entry 51) | pass 0.728 via tolerance (n4, claim check 89) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n2 metrics.p1_mean_high, entry 48) | pass 2471.2 via tolerance (n4, claim check 89) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1 (n4 stdout, entry 60) | pass 268.1 via tolerance (n4, claim check 89) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.643 (n4 stdout, entry 60) | differs 0.643 (n4, claim check 89) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.852 (n4 stdout, entry 60) | differs 0.852 (n4, claim check 89) |

### cooley2020-splitluc-zprime | claude:claude-opus-5-5 | run 3

Status: answer. 124 s. 7 requests, 6 tool calls (1 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072419-d1b9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261009-072419-d1b9/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261009-072419-d1b9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n1 metrics.p1_z_prime, entry 36) | pass 0.541 via tolerance (n1, claim check 74) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n1 metrics.p2_z_prime, entry 36) | pass 0.61 via tolerance (n1, claim check 74) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n1 metrics.p3_z_prime, entry 36) | pass 0.728 via tolerance (n2, claim check 74) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n1 metrics.p4_z_prime, entry 36) | pass 0.73 via tolerance (n1, claim check 74) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n1 metrics.p5_z_prime, entry 36) | pass 0.664 via tolerance (n1, claim check 74) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n1 metrics.p6_z_prime, entry 36) | pass 0.632 via tolerance (n1, claim check 74) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n1 metrics.p7_z_prime, entry 36) | pass 0.767 via tolerance (n1, claim check 74) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n1 metrics.p8_z_prime, entry 36) | pass 0.742 via tolerance (n1, claim check 74) |
| z10_p9 | 0.621 ±0.004 | pass 0.6209891 (n1 metrics.p9_z_prime, entry 36) | pass 0.621 via tolerance (n1, claim check 74) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n1 metrics.p10_z_prime, entry 36) | pass 0.722 via tolerance (n1, claim check 74) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.p2_z_prime, entry 39) | pass 0.522 via tolerance (n2, claim check 74) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.p4_z_prime, entry 39) | pass 0.786 via tolerance (n2, claim check 74) |
| z20_p6 | 0.643 ±0.004 | pass 0.6429603 (n2 metrics.p6_z_prime, entry 39) | pass 0.643 via tolerance (n2, claim check 74) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.p7_z_prime, entry 39) | pass 0.671 via tolerance (n2, claim check 74) |
| z20_p8 | 0.685 ±0.004 | pass 0.6850474 (n2 metrics.p8_z_prime, entry 39) | pass 0.685 via tolerance (n2, claim check 74) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.p9_z_prime, entry 39) | pass 0.8 via tolerance (n2, claim check 74) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.p10_z_prime, entry 39) | pass 0.728 via tolerance (n2, claim check 74) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n1 metrics.p1_mean_high, entry 36) | pass 2471.2 via tolerance (n1, claim check 74) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1216 (n1 metrics.p1_sd_high, entry 36) | pass 268.1 via tolerance (n1, claim check 74) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.6429603 (n2 metrics.p6_z_prime, entry 39) | differs 0.643 (n2, claim check 74) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.8524462 (n2 metrics.p5_z_prime, entry 39) | differs 0.852 (n2, claim check 74) |

### hildyard2021-embryo-refgenes | claude:claude-opus-5-5 | run 1

Status: answer. 166 s. 12 requests, 15 tool calls (3 failed), 0 nudges, 0 plan reminders, 11 unsourced.
Session: 20261009-072623-d26b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261009-072623-d26b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 2 blocked, 11 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hildyard2021-embryo-refgenes/run1/home/sessions/20261009-072623-d26b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 71) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 71) | pass 0.2175 via tolerance (n1, claim check 135) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 71) | pass 0.5275 via tolerance (n1, claim check 135) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 71) | pass 0.441 via tolerance (n1, claim check 135) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 71) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 71) | pass 14 via tolerance (n4, claim check 135) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 71) | pass 0.06864 via tolerance (n1, claim check 135) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 71) | pass 0.1348 via tolerance (n1, claim check 135) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 71) | pass 0.481 via tolerance (n1, claim check 135) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 79) | pass 0.08103 via tolerance (n2, claim check 135) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 79) | pass 0.1805 via tolerance (n2, claim check 135) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n3 metrics.genorm_best_pair_M, entry 89) | pass 0.1142 via tolerance (n3, claim check 135) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n4 metrics.slope_GAPDH, entry 92) | pass -3.4557 via tolerance (n4, claim check 135) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n4 metrics.slope_HTATSF1, entry 92) | pass -3.1799 via tolerance (n4, claim check 135) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n4 metrics.slope_UBC, entry 92) | pass -3.3788 via tolerance (n4, claim check 135) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n4 metrics.efficiency_CYC1, entry 92) | pass 1.945 via tolerance (n4, claim check 135) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n4 metrics.efficiency_PAK1IP1, entry 92) | pass 2.012 via tolerance (n4, claim check 135) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n4 metrics.slope_ACTB, entry 92) | pass -3.2993 via tolerance (n4, claim check 135) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n4 metrics.slope_SDHA, entry 92) | differs -3.2331 (n4, claim check 135) |

### hildyard2021-embryo-refgenes | claude:claude-opus-5-5 | run 2

Status: answer. 123 s. 10 requests, 13 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072909-6ec5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261009-072909-6ec5/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hildyard2021-embryo-refgenes/run2/home/sessions/20261009-072909-6ec5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 54) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 54) | pass 0.2175 via tolerance (n1, claim check 117) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 54) | pass 0.5275 via tolerance (n1, claim check 117) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 54) | pass 0.441 via tolerance (n1, claim check 117) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 54) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 54) | pass 14 via tolerance (n5, claim check 117) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 54) | pass 0.06864 via tolerance (n1, claim check 117) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 54) | pass 0.1348 via tolerance (n1, claim check 117) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 54) | pass 0.481 via tolerance (n1, claim check 117) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 61) | pass 0.08103 via tolerance (n2, claim check 117) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 61) | pass 0.1805 via tolerance (n2, claim check 117) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n3 metrics.genorm_best_pair_M, entry 71) | pass 0.1142 via tolerance (n3, claim check 117) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n4 metrics.slope_GAPDH, entry 74) | pass -3.4557 via tolerance (n4, claim check 117) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n4 metrics.slope_HTATSF1, entry 74) | pass -3.1799 via tolerance (n4, claim check 117) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n4 metrics.slope_UBC, entry 74) | pass -3.3788 via tolerance (n4, claim check 117) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n4 metrics.efficiency_CYC1, entry 74) | pass 1.945 via tolerance (n4, claim check 117) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n4 metrics.efficiency_PAK1IP1, entry 74) | pass 2.012 via tolerance (n4, claim check 117) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n4 metrics.slope_ACTB, entry 74) | pass -3.2993 via tolerance (n4, claim check 117) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n4 metrics.slope_SDHA, entry 74) | differs -3.2331 (n4, claim check 117) |

### hildyard2021-embryo-refgenes | claude:claude-opus-5-5 | run 3

Status: answer. 158 s. 10 requests, 15 tool calls (3 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-073112-c7b7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261009-073112-c7b7/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 2 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/hildyard2021-embryo-refgenes/run3/home/sessions/20261009-073112-c7b7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| samples | 44 exact | pass 44 (n1 metrics.n_samples, entry 50) | not asked |
| genorm_best_pair_m | 0.217549 ±0.0005 | pass 0.2175489 (n1 metrics.genorm_best_pair_M, entry 50) | pass 0.2175 via tolerance (n1, claim check 126) |
| genorm_m_all_genes | 0.527538 ±0.0005 | pass 0.5275384 (n1 metrics.genorm_average_M_HPRT1, entry 50) | pass 0.5275 via tolerance (n1, claim check 126) |
| genorm_m_13_genes | 0.440995 ±0.0005 | pass 0.4409948 (n1 metrics.genorm_average_M_GAPDH, entry 50) | pass 0.441 via tolerance (n1, claim check 126) |
| genorm_m_actb_step | 0.227746 ±0.0005 | pass 0.2277458 (n1 metrics.genorm_average_M_ActB, entry 50) | not asked |
| genorm_n_below_0_5 | 14 exact | pass 14 (n1 metrics.genorm_n_genes_M_below_0_5, entry 50) | pass 14 via tolerance (n4, claim check 126) |
| genorm_v2_3 | 0.06864 ±0.0003 | pass 0.06863984 (n1 metrics.genorm_V2_3, entry 50) | pass 0.0686 via tolerance (n1, claim check 126) |
| normfinder_ap3d1 | 0.134827 ±0.0005 | pass 0.1348269 (n1 metrics.normfinder_AP3D1, entry 50) | pass 0.1348 via tolerance (n1, claim check 126) |
| normfinder_hprt1 | 0.480987 ±0.0005 | pass 0.480987 (n1 metrics.normfinder_HPRT1, entry 50) | pass 0.481 via tolerance (n1, claim check 126) |
| normfinder_tissue_ubc | 0.081032 ±0.0005 | pass 0.08103166 (n2 metrics.normfinder_UBC, entry 57) | pass 0.081 via tolerance (n2, claim check 126) |
| normfinder_tissue_b2m | 0.180476 ±0.0005 | pass 0.1804759 (n2 metrics.normfinder_B2M, entry 57) | pass 0.1805 via tolerance (n2, claim check 126) |
| heads_best_pair_m | 0.114216 ±0.0005 | pass 0.1142158 (n4 metrics.genorm_best_pair_M, entry 72) | pass 0.1142 via tolerance (n4, claim check 126) |
| slope_gapdh | -3.4557 ±0.0006 | pass -3.455719 (n3 metrics.slope_GAPDH, entry 64) | pass -3.4557 via tolerance (n3, claim check 126) |
| slope_htatsf1 | -3.1799 ±0.0006 | pass -3.179886 (n3 metrics.slope_HTATSF1, entry 64) | pass -3.1799 via tolerance (n3, claim check 126) |
| slope_ubc | -3.3788 ±0.0006 | pass -3.37875 (n3 metrics.slope_UBC, entry 64) | pass -3.3788 via tolerance (n3, claim check 126) |
| efficiency_cyc1 | 1.945026 ±0.0005 | pass 1.945012 (n3 metrics.efficiency_CYC1, entry 64) | pass 1.945 via tolerance (n3, claim check 126) |
| efficiency_pak1ip1 | 2.012002 ±0.0005 | pass 2.011994 (n3 metrics.efficiency_PAK1IP1, entry 64) | pass 2.012 via tolerance (n3, claim check 126) |
| slope_actb_computed | -3.2993 ±0.0006 | pass -3.299324 (n3 metrics.slope_ACTB, entry 64) | pass -3.2993 via tolerance (n3, claim check 126) |
| slope_actb_printed (reference) | -3.2293 ±0.0006 | differs -3.233121 (n3 metrics.slope_SDHA, entry 64) | differs -3.2331 (n3, claim check 126) |

### lazear2023-sage | claude:claude-opus-5-5 | run 1

Status: answer. 163 s. 12 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 4 unsourced.
Session: 20261009-073350-5d35. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lazear2023-sage/run1/home/sessions/20261009-073350-5d35/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lazear2023-sage/run1/home/sessions/20261009-073350-5d35/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 38) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 38) | not asked |
| target_psms_fdr1 | 207 exact | FAIL 206 (n2 metrics.n_psm_pass, entry 46) | FAIL 206 (n5, claim check 114) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 46) | pass 47 via tolerance (n5, claim check 114) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 46) | not asked |
| target_psms_fdr5 | 242 exact | FAIL 244 (n5 stdout, entry 66) | FAIL 244 (n5, claim check 114) |

### lazear2023-sage | claude:claude-opus-5-5 | run 2

Status: answer. 160 s. 13 requests, 13 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073634-1d29. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lazear2023-sage/run2/home/sessions/20261009-073634-1d29/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lazear2023-sage/run2/home/sessions/20261009-073634-1d29/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n2 metrics.n_psm, entry 38) | not asked |
| decoy_psms | 43 exact | pass 43 (n2 metrics.n_decoy_psm, entry 38) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n6 stdout, entry 66) | FAIL 206 (n6, claim check 124) |
| distinct_peptides | 47 exact | pass 47 (n3 metrics.n_peptides_pass, entry 46) | pass 47 via tolerance (n6, claim check 124) |
| decoy_psms_kept | 1 exact | pass 1 (n3 metrics.n_decoy_pass, entry 46) | not asked |
| target_psms_fdr5 | 242 exact | FAIL 260 (n2 metrics.n_target_psm, entry 38) | FAIL 244 (n5, claim check 124) |

### lazear2023-sage | claude:claude-opus-5-5 | run 3

Status: answer. 171 s. 14 requests, 17 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073914-2a09. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lazear2023-sage/run3/home/sessions/20261009-073914-2a09/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/lazear2023-sage/run3/home/sessions/20261009-073914-2a09/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n2 metrics.n_psm, entry 60) | not asked |
| decoy_psms | 43 exact | pass 43 (n2 metrics.n_decoy_psm, entry 60) | not asked |
| target_psms_fdr1 | 207 exact | FAIL 206 (n3 metrics.n_psm_pass, entry 68) | FAIL 206 (n6, claim check 137) |
| distinct_peptides | 47 exact | pass 47 (n3 metrics.n_peptides_pass, entry 68) | pass 47 via tolerance (n6, claim check 137) |
| decoy_psms_kept | 1 exact | pass 1 (n3 metrics.n_decoy_pass, entry 68) | not asked |
| target_psms_fdr5 | 242 exact | FAIL 244 (n6 stdout, entry 89) | FAIL 244 (n6, claim check 137) |

### manders1993-coloc | claude:claude-opus-5-5 | run 1

Status: answer. 90 s. 9 requests, 12 tool calls (1 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074206-a485. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/manders1993-coloc/run1/home/sessions/20261009-074206-a485/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/manders1993-coloc/run1/home/sessions/20261009-074206-a485/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 40) | pass 0.721 via tolerance (n5, claim check 104) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 43) | pass 0.4425947 via tolerance (n6, claim check 104) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 46) | pass 0.163892 via tolerance (n7, claim check 104) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 40) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 43) | pass 0.5 via tolerance (n6, claim check 104) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 46) | pass 0.25 via tolerance (n7, claim check 104) |

### manders1993-coloc | claude:claude-opus-5-5 | run 2

Status: answer. 75 s. 7 requests, 11 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074336-b8a3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/manders1993-coloc/run2/home/sessions/20261009-074336-b8a3/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/manders1993-coloc/run2/home/sessions/20261009-074336-b8a3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 40) | pass 0.721 via tolerance (n5, claim check 91) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 43) | pass 0.4426 via tolerance (n6, claim check 91) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 46) | pass 0.1639 via tolerance (n7, claim check 91) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 40) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 43) | pass 0.5 via tolerance (n6, claim check 91) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 46) | pass 0.25 via tolerance (n7, claim check 91) |

### manders1993-coloc | claude:claude-opus-5-5 | run 3

Status: answer. 75 s. 6 requests, 10 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074451-3755. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/manders1993-coloc/run3/home/sessions/20261009-074451-3755/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/manders1993-coloc/run3/home/sessions/20261009-074451-3755/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 40) | pass 0.721 via tolerance (n5, claim check 83) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 43) | pass 0.4426 via tolerance (n6, claim check 83) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 46) | pass 0.1639 via tolerance (n7, claim check 83) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 40) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 43) | pass 0.5 via tolerance (n6, claim check 83) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 46) | pass 0.25 via tolerance (n7, claim check 83) |

### rees2019-uptake | claude:claude-opus-5-5 | run 1

Status: answer. 121 s. 9 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-074606-82d7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rees2019-uptake/run1/home/sessions/20261009-074606-82d7/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rees2019-uptake/run1/home/sessions/20261009-074606-82d7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 82) | not asked |
| nuclei | 582 ±35 | pass 566 (n7 metrics.total_nuclei, entry 89) | pass 566 via tolerance (n7, claim check 134) |
| vesicles | 461 ±35 | pass 459 (n7 metrics.total_cells, entry 89) | pass 459 via tolerance (n7, claim check 134) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n7 table.rows[1][5], entry 89) | pass 0.64 via tolerance (n7, claim check 134) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.46512 (n7 table.rows[1][3], entry 89) | pass 0.465 via tolerance (n7, claim check 134) |
| cells (reference) | 572 ±35 | match 566 (n7 metrics.total_nuclei, entry 89) | match 566 via tolerance (n7, claim check 134) |

### rees2019-uptake | claude:claude-opus-5-5 | run 2

Status: answer. 240 s. 12 requests, 12 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-074807-9a5d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rees2019-uptake/run2/home/sessions/20261009-074807-9a5d/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 1 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rees2019-uptake/run2/home/sessions/20261009-074807-9a5d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 82) | not asked |
| nuclei | 582 ±35 | pass 591.667 (n6 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rees2019-uptake/run2/home/sessions/20261009-074807-9a5d/work/count_cell_uptake-4/1_BEAS_0.5nM_1h_1_cells.csv, entry 82) | pass 566 via tolerance (n9, claim check 174) |
| vesicles | 461 ±35 | pass 459 (n9 metrics.total_cells, entry 106) | pass 459 via tolerance (n9, claim check 174) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n9 table.rows[1][5], entry 106) | pass 0.656 via tolerance (n12, claim check 174) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.46512 (n9 table.rows[1][3], entry 106) | pass 0.44 via tolerance (n13, claim check 174) |
| cells (reference) | 572 ±35 | match 566 (n9 metrics.total_nuclei, entry 106) | match 566 via tolerance (n9, claim check 174) |

### rees2019-uptake | claude:claude-opus-5-5 | run 3

Status: answer. 162 s. 10 requests, 12 tool calls (1 failed), 0 nudges, 0 plan reminders, 5 unsourced.
Session: 20261009-075207-b606. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rees2019-uptake/run3/home/sessions/20261009-075207-b606/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 1 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/rees2019-uptake/run3/home/sessions/20261009-075207-b606/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 84) | not asked |
| nuclei | 582 ±35 | pass 566 (n8 metrics.total_nuclei, entry 98) | pass 566 via tolerance (n8, claim check 156) |
| vesicles | 461 ±35 | pass 459 (n8 metrics.total_cells, entry 98) | pass 459 via tolerance (n8, claim check 156) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n8 table.rows[1][5], entry 98) | pass 0.64 via tolerance (n8, claim check 156) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.442 (n10 data.duration_s, entry 134) | pass 0.465 via tolerance (n8, claim check 156) |
| cells (reference) | 572 ±35 | match 566 (n8 metrics.total_nuclei, entry 98) | match 566 via tolerance (n8, claim check 156) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-opus-5-5 | run 1

Status: answer. 128 s. 13 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261009-075450-9b16. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-075450-9b16/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-075450-9b16/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-075450-9b16/work/inspect_table-1/columns.csv, entry 11) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 53) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.086 (n8 stdout, entry 95) | pass 23.086 via tolerance (n8, claim check 128) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 53) | pass 19.73 via tolerance (n2, claim check 128) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 53) | pass 26.44 via tolerance (n2, claim check 128) |
| tgf_diff | -0.554 ±0.005 | pass -0.554 (n8 stdout, entry 95) | pass -0.554 via tolerance (n8, claim check 128) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 61) | pass -2.839 via tolerance (n3, claim check 128) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 61) | pass 1.731 via tolerance (n3, claim check 128) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 61) | pass 0.63 via tolerance (n8, claim check 128) |
| timp_diff | -5.51 ±0.01 | pass -5.51 (n8 stdout, entry 95) | pass -5.51 via tolerance (n8, claim check 128) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 64) | pass -26.36 via tolerance (n4, claim check 128) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 64) | pass 15.34 via tolerance (n4, claim check 128) |
| timp_p | 0.6 ±0.001 | pass 0.6 (n8 stdout, entry 95) | pass 0.6 via tolerance (n8, claim check 128) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 67) | pass 122.92 via tolerance (n5, claim check 128) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.963 (n8 stdout, entry 95) | pass -68.96 via tolerance (n8, claim check 128) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 67) | pass 314.81 via tolerance (n5, claim check 128) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 67) | pass 0.206 via tolerance (n7, claim check 128) |
| p3np_diff | -0.11 ±0.005 | pass -0.11 (n8 stdout, entry 95) | pass -0.11 via tolerance (n8, claim check 128) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 70) | pass -2.372 via tolerance (n6, claim check 128) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 70) | pass 2.151 via tolerance (n6, claim check 128) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 70) | pass 0.923 via tolerance (n7, claim check 128) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-opus-5-5 | run 2

Status: answer. 148 s. 13 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-075658-ea05. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261009-075658-ea05/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261009-075658-ea05/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261009-075658-ea05/work/inspect_table-1/columns.csv, entry 11) | not asked |
| n_placebo | 38 exact | pass 38 (n2 stdout, entry 31) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08641 (n10 stdout, entry 97) | pass 23.09 via tolerance (n3, claim check 134) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n3 metrics.ci_lo, entry 52) | pass 19.73 via tolerance (n3, claim check 134) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n3 metrics.ci_hi, entry 52) | pass 26.44 via tolerance (n3, claim check 134) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n4 metrics.mean_diff, entry 59) | pass -0.55 via tolerance (n4, claim check 134) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n4 metrics.ci_lo, entry 59) | pass -2.84 via tolerance (n4, claim check 134) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n4 metrics.ci_hi, entry 59) | pass 1.73 via tolerance (n4, claim check 134) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n4 metrics.p_value, entry 59) | pass 0.63 via tolerance (n8, claim check 134) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n10 stdout, entry 97) | pass -5.51 via tolerance (n10, claim check 134) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n5 metrics.ci_lo, entry 62) | pass -26.36 via tolerance (n5, claim check 134) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n5 metrics.ci_hi, entry 62) | pass 15.34 via tolerance (n5, claim check 134) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n5 metrics.p_value, entry 62) | pass 0.6 via tolerance (n8, claim check 134) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n10 stdout, entry 97) | pass 122.92 via tolerance (n10, claim check 134) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96333 (n10 stdout, entry 97) | pass -68.96 via tolerance (n10, claim check 134) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n6 metrics.ci_hi, entry 65) | pass 314.81 via tolerance (n6, claim check 134) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n6 metrics.p_value, entry 65) | pass 0.206 via tolerance (n8, claim check 134) |
| p3np_diff | -0.11 ±0.005 | pass -0.110391 (n10 stdout, entry 97) | pass -0.11 via tolerance (n10, claim check 134) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n7 metrics.ci_lo, entry 68) | pass -2.372 via tolerance (n7, claim check 134) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n7 metrics.ci_hi, entry 68) | pass 2.151 via tolerance (n7, claim check 134) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n7 metrics.p_value, entry 68) | pass 0.923 via tolerance (n8, claim check 134) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-opus-5-5 | run 3

Status: answer. 101 s. 12 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075926-77a5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261009-075926-77a5/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261009-075926-77a5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261009-075926-77a5/work/inspect_table-1/columns.csv, entry 11) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 54) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 54) | pass 23.09 via tolerance (n2, claim check 123) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 54) | pass 19.73 via tolerance (n2, claim check 123) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 54) | pass 26.44 via tolerance (n2, claim check 123) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 62) | pass -0.55 via tolerance (n3, claim check 123) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 62) | pass -2.84 via tolerance (n3, claim check 123) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 62) | pass 1.73 via tolerance (n3, claim check 123) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 62) | pass 0.63 via tolerance (n7, claim check 123) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 65) | pass -5.51 via tolerance (n4, claim check 123) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 65) | pass -26.36 via tolerance (n4, claim check 123) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 65) | pass 15.34 via tolerance (n4, claim check 123) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 65) | pass 0.6 via tolerance (n7, claim check 123) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 68) | pass 122.92 via tolerance (n5, claim check 123) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n5 metrics.ci_lo, entry 68) | pass -68.96 via tolerance (n5, claim check 123) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 68) | pass 314.81 via tolerance (n5, claim check 123) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 68) | pass 0.206 via tolerance (n7, claim check 123) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 71) | pass -0.11 via tolerance (n6, claim check 123) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 71) | pass -2.37 via tolerance (n6, claim check 123) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 71) | pass 2.15 via tolerance (n6, claim check 123) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 71) | pass 0.923 via tolerance (n7, claim check 123) |

