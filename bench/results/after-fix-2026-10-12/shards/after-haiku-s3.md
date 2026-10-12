# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 182/190 | 164/172 | 17 | 1 error |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| andrews-fastqc | 21/21 / 9/9 |
| bemis2015-cardinal | 12/15 / 12/15 |
| cooley2020-splitluc-zprime | 57/57 / 57/57 |
| gowers2016-mdanalysis | 21/21 / 21/21 |
| jang2016-hcc-biomarkers | 66/66 / 60/60 |
| korsunsky2019-harmony | 5/10 / 5/10 (1 error) |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 17 | 2015 | 138 | 352 | 162555 | 2784696 | 172 | 6 | 0 | 6 | 12 | 48 | 47 | 22 | 10 | 7 | 7 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.18 for 17 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| andrews-fastqc | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| andrews-fastqc | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| andrews-fastqc | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 1 | 0 |
| bemis2015-cardinal | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 3 | 0 |
| jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 1 | on | 20 | 0 | 0 | 6 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 0 | 0 | 0 |

## Details

### andrews-fastqc | claude:claude-haiku-5-5 | run 1

Status: answer. 75 s. 5 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-020617-23b4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run1/home/sessions/20261012-020617-23b4/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run1/home/sessions/20261012-020617-23b4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 14) | pass 250000 via tolerance (n1, claim check 55) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 17) | pass 395288 via tolerance (n2, claim check 55) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 14) | pass 40 via tolerance (n2, claim check 55) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 14) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 17) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 14) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 17) | not asked |

### andrews-fastqc | claude:claude-haiku-5-5 | run 2

Status: answer. 95 s. 6 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-020734-a47f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run2/home/sessions/20261012-020734-a47f/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run2/home/sessions/20261012-020734-a47f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 16) | pass 250000 via tolerance (n1, claim check 68) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 19) | pass 395288 via tolerance (n2, claim check 68) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 16) | pass 40 via tolerance (n2, claim check 68) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 16) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 19) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 16) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 19) | not asked |

### andrews-fastqc | claude:claude-haiku-5-5 | run 3

Status: answer. 62 s. 4 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-020911-0490. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run3/home/sessions/20261012-020911-0490/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run3/home/sessions/20261012-020911-0490/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 14) | pass 250000 via tolerance (n1, claim check 48) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 17) | pass 395288 via tolerance (n2, claim check 48) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 14) | pass 40 via tolerance (n2, claim check 48) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 14) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 17) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 14) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 17) | not asked |

### bemis2015-cardinal | claude:claude-haiku-5-5 | run 1

Status: answer. 180 s. 10 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021013-83bd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run1/home/sessions/20261012-021013-83bd/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run1/home/sessions/20261012-021013-83bd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 12) | pass 4959 via tolerance (n5, claim check 145) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 12) | pass 10200 via tolerance (n1, claim check 145) |
| peaks | 687 ±10 | FAIL 723 (n10 data.segment_sizes.3, entry 82) | FAIL 723 (n15, claim check 145) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 62) | pass 6 via tolerance (n15, claim check 145) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 62) | pass 3 via tolerance (n6, claim check 145) |

### bemis2015-cardinal | claude:claude-haiku-5-5 | run 2

Status: answer. 178 s. 10 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021313-e816. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run2/home/sessions/20261012-021313-e816/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run2/home/sessions/20261012-021313-e816/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 12) | pass 4959 via tolerance (n5, claim check 140) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 12) | pass 10200 via tolerance (n1, claim check 140) |
| peaks | 687 ±10 | FAIL 723 (n10 data.segment_sizes.3, entry 87) | FAIL 723 (n13, claim check 140) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 67) | pass 6 via tolerance (n13, claim check 140) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 67) | pass 3 via tolerance (n6, claim check 140) |

### bemis2015-cardinal | claude:claude-haiku-5-5 | run 3

Status: answer. 194 s. 13 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-021611-dd41. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run3/home/sessions/20261012-021611-dd41/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run3/home/sessions/20261012-021611-dd41/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 12) | pass 4959 via tolerance (n5, claim check 168) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 12) | pass 10200 via tolerance (n1, claim check 168) |
| peaks | 687 ±10 | FAIL 709 (n10 data.segment_sizes.2, entry 85) | FAIL 709 (n15, claim check 168) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 65) | pass 6 via tolerance (n15, claim check 168) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 65) | pass 3 via tolerance (n14, claim check 168) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 1

Status: answer. 80 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021925-24ba. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261012-021925-24ba/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261012-021925-24ba/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n1 metrics.p1_z_prime, entry 31) | pass 0.541 via tolerance (n3, claim check 63) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n1 metrics.p2_z_prime, entry 31) | pass 0.61 via tolerance (n3, claim check 63) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n1 metrics.p3_z_prime, entry 31) | pass 0.728 via tolerance (n3, claim check 63) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n1 metrics.p4_z_prime, entry 31) | pass 0.73 via tolerance (n3, claim check 63) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n1 metrics.p5_z_prime, entry 31) | pass 0.664 via tolerance (n3, claim check 63) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n1 metrics.p6_z_prime, entry 31) | pass 0.632 via tolerance (n3, claim check 63) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n1 metrics.p7_z_prime, entry 31) | pass 0.767 via tolerance (n3, claim check 63) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n1 metrics.p8_z_prime, entry 31) | pass 0.742 via tolerance (n3, claim check 63) |
| z10_p9 | 0.621 ±0.004 | pass 0.621 (n3 stdout, entry 43) | pass 0.621 via tolerance (n3, claim check 63) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n1 metrics.p10_z_prime, entry 31) | pass 0.722 via tolerance (n3, claim check 63) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.p2_z_prime, entry 34) | pass 0.522 via tolerance (n3, claim check 63) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.p4_z_prime, entry 34) | pass 0.786 via tolerance (n3, claim check 63) |
| z20_p6 | 0.643 ±0.004 | pass 0.643 (n3 stdout, entry 43) | pass 0.643 via tolerance (n3, claim check 63) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.p7_z_prime, entry 34) | pass 0.671 via tolerance (n3, claim check 63) |
| z20_p8 | 0.685 ±0.004 | pass 0.685 (n3 stdout, entry 43) | pass 0.685 via tolerance (n3, claim check 63) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.p9_z_prime, entry 34) | pass 0.8 via tolerance (n3, claim check 63) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.p10_z_prime, entry 34) | pass 0.728 via tolerance (n3, claim check 63) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n1 metrics.p1_mean_high, entry 31) | pass 2471.2 via tolerance (n3, claim check 63) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1 (n3 stdout, entry 43) | pass 268.1 via tolerance (n3, claim check 63) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.643 (n3 stdout, entry 43) | differs 0.643 (n3, claim check 63) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.852 (n3 stdout, entry 43) | differs 0.852 (n3, claim check 63) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 2

Status: answer. 71 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-022045-7b7e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261012-022045-7b7e/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261012-022045-7b7e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n2 metrics.p1_z_prime, entry 44) | pass 0.541 via tolerance (n4, claim check 80) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n2 metrics.p2_z_prime, entry 44) | pass 0.61 via tolerance (n4, claim check 80) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n2 metrics.p3_z_prime, entry 44) | pass 0.728 via tolerance (n4, claim check 80) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n2 metrics.p4_z_prime, entry 44) | pass 0.73 via tolerance (n4, claim check 80) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n2 metrics.p5_z_prime, entry 44) | pass 0.664 via tolerance (n4, claim check 80) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n2 metrics.p6_z_prime, entry 44) | pass 0.632 via tolerance (n4, claim check 80) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n2 metrics.p7_z_prime, entry 44) | pass 0.767 via tolerance (n4, claim check 80) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n2 metrics.p8_z_prime, entry 44) | pass 0.742 via tolerance (n4, claim check 80) |
| z10_p9 | 0.621 ±0.004 | pass 0.621 (n4 stdout, entry 56) | pass 0.621 via tolerance (n4, claim check 80) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n2 metrics.p10_z_prime, entry 44) | pass 0.722 via tolerance (n4, claim check 80) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n3 metrics.p2_z_prime, entry 47) | pass 0.522 via tolerance (n4, claim check 80) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n3 metrics.p4_z_prime, entry 47) | pass 0.786 via tolerance (n4, claim check 80) |
| z20_p6 | 0.643 ±0.004 | pass 0.643 (n4 stdout, entry 56) | pass 0.643 via tolerance (n4, claim check 80) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n3 metrics.p7_z_prime, entry 47) | pass 0.671 via tolerance (n4, claim check 80) |
| z20_p8 | 0.685 ±0.004 | pass 0.685 (n4 stdout, entry 56) | pass 0.685 via tolerance (n4, claim check 80) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n3 metrics.p9_z_prime, entry 47) | pass 0.8 via tolerance (n4, claim check 80) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n3 metrics.p10_z_prime, entry 47) | pass 0.728 via tolerance (n4, claim check 80) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n2 metrics.p1_mean_high, entry 44) | pass 2471.2 via tolerance (n4, claim check 80) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1216 (n2 metrics.p1_sd_high, entry 44) | pass 268.1 via tolerance (n2, claim check 80) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.643 (n4 stdout, entry 56) | differs 0.643 (n4, claim check 80) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.852 (n4 stdout, entry 56) | differs 0.852 (n4, claim check 80) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 3

Status: answer. 46 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-022157-87ad. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261012-022157-87ad/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261012-022157-87ad/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n2 metrics.pP1_10ul_z_prime, entry 41) | pass 0.541 via tolerance (n1, claim check 52) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n2 metrics.pP2_10ul_z_prime, entry 41) | pass 0.61 via tolerance (n1, claim check 52) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n2 metrics.pP3_10ul_z_prime, entry 41) | pass 0.728 via tolerance (n1, claim check 52) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n2 metrics.pP4_10ul_z_prime, entry 41) | pass 0.73 via tolerance (n1, claim check 52) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n2 metrics.pP5_10ul_z_prime, entry 41) | pass 0.664 via tolerance (n1, claim check 52) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n2 metrics.pP6_10ul_z_prime, entry 41) | pass 0.632 via tolerance (n1, claim check 52) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n2 metrics.pP7_10ul_z_prime, entry 41) | pass 0.767 via tolerance (n1, claim check 52) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n2 metrics.pP8_10ul_z_prime, entry 41) | pass 0.742 via tolerance (n1, claim check 52) |
| z10_p9 | 0.621 ±0.004 | pass 0.621 (n1 stdout, entry 22) | pass 0.621 via tolerance (n1, claim check 52) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n2 metrics.pP10_10ul_z_prime, entry 41) | pass 0.722 via tolerance (n1, claim check 52) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.pP2_20ul_z_prime, entry 41) | pass 0.522 via tolerance (n1, claim check 52) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.pP4_20ul_z_prime, entry 41) | pass 0.786 via tolerance (n1, claim check 52) |
| z20_p6 | 0.643 ±0.004 | pass 0.643 (n1 stdout, entry 22) | pass 0.643 via tolerance (n1, claim check 52) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.pP7_20ul_z_prime, entry 41) | pass 0.671 via tolerance (n1, claim check 52) |
| z20_p8 | 0.685 ±0.004 | pass 0.685 (n1 stdout, entry 22) | pass 0.685 via tolerance (n1, claim check 52) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.pP9_20ul_z_prime, entry 41) | pass 0.8 via tolerance (n1, claim check 52) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.pP10_20ul_z_prime, entry 41) | pass 0.728 via tolerance (n1, claim check 52) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n1 stdout, entry 22) | pass 2471.2 via tolerance (n2, claim check 52) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1 (n1 stdout, entry 22) | pass 268.1 via tolerance (n1, claim check 52) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.643 (n1 stdout, entry 22) | differs 0.643 (n1, claim check 52) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.852 (n1 stdout, entry 22) | differs 0.852 (n1, claim check 52) |

### gowers2016-mdanalysis | claude:claude-haiku-5-5 | run 1

Status: answer. 73 s. 5 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-022243-373f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run1/home/sessions/20261012-022243-373f/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run1/home/sessions/20261012-022243-373f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 12) | pass 3341 via tolerance (n1, claim check 68) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 12) | pass 98 via tolerance (n5, claim check 68) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n4 metrics.rmsd_last, entry 26) | pass 6.82 via tolerance (n4, claim check 68) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n5 metrics.rg_last, entry 33) | pass 19.592 via tolerance (n5, claim check 68) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n6, claim check 68) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n6, claim check 68) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 40) | pass 7.131 via tolerance (n6, claim check 68) |

### gowers2016-mdanalysis | claude:claude-haiku-5-5 | run 2

Status: answer. 47 s. 4 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-022357-aafc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run2/home/sessions/20261012-022357-aafc/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run2/home/sessions/20261012-022357-aafc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 12) | pass 3341 via tolerance (n1, claim check 58) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 12) | pass 98 via tolerance (n5, claim check 58) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n4 metrics.rmsd_last, entry 26) | pass 6.82 via tolerance (n4, claim check 58) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n5 metrics.rg_last, entry 33) | pass 19.592 via tolerance (n5, claim check 58) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n6, claim check 58) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n6, claim check 58) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 45) | pass 7.131 via tolerance (n6, claim check 58) |

### gowers2016-mdanalysis | claude:claude-haiku-5-5 | run 3

Status: answer. 41 s. 4 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-022445-a7d5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run3/home/sessions/20261012-022445-a7d5/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run3/home/sessions/20261012-022445-a7d5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 12) | pass 3341 via tolerance (n1, claim check 57) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 12) | pass 98 via tolerance (n4, claim check 57) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n3 metrics.rmsd_last, entry 23) | pass 6.82 via tolerance (n3, claim check 57) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n4 metrics.rg_last, entry 30) | pass 19.592 via tolerance (n4, claim check 57) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n6, claim check 57) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n6, claim check 57) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 45) | pass 7.131 via tolerance (n6, claim check 57) |

### jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | run 1

Status: answer. 110 s. 8 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-022527-74f2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261012-022527-74f2/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261012-022527-74f2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 12) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 12) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 34) | pass 0.7856 via tolerance (n2, claim check 110) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 34) | pass 0.7404 via tolerance (n2, claim check 110) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 34) | pass 0.8309 via tolerance (n2, claim check 110) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 37) | pass 0.7294 via tolerance (n3, claim check 110) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 37) | pass 0.6799 via tolerance (n3, claim check 110) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 37) | pass 0.7789 via tolerance (n3, claim check 110) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 40) | pass 0.6596 via tolerance (n4, claim check 110) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 40) | pass 0.6061 via tolerance (n4, claim check 110) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 40) | pass 0.7131 via tolerance (n4, claim check 110) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 43) | pass 0.665 via tolerance (n5, claim check 110) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 43) | pass 0.612 via tolerance (n5, claim check 110) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 43) | pass 0.718 via tolerance (n5, claim check 110) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 55) | pass 0.6202 via tolerance (n6, claim check 110) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 55) | pass 0.9016 via tolerance (n6, claim check 110) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 58) | pass 0.5096 via tolerance (n7, claim check 110) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 58) | pass 0.9119 via tolerance (n7, claim check 110) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 61) | pass 0.4615 via tolerance (n8, claim check 110) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 61) | pass 0.8031 via tolerance (n8, claim check 110) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 64) | pass 0.5 via tolerance (n9, claim check 110) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 64) | pass 0.8083 via tolerance (n9, claim check 110) |

### jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | run 2

Status: answer. 85 s. 6 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261012-022717-718a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261012-022717-718a/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261012-022717-718a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 12) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 12) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 33) | pass 0.786 via tolerance (n2, claim check 94) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 33) | pass 0.74 via tolerance (n8, claim check 94) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 33) | pass 0.831 via tolerance (n2, claim check 94) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 36) | pass 0.729 via tolerance (n3, claim check 94) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 36) | pass 0.68 via tolerance (n3, claim check 94) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 36) | pass 0.779 via tolerance (n3, claim check 94) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 39) | pass 0.66 via tolerance (n9, claim check 94) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 39) | pass 0.606 via tolerance (n4, claim check 94) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 39) | pass 0.713 via tolerance (n4, claim check 94) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 42) | pass 0.665 via tolerance (n5, claim check 94) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 42) | pass 0.612 via tolerance (n5, claim check 94) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 42) | pass 0.718 via tolerance (n5, claim check 94) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 54) | pass 0.62 via tolerance (n6, claim check 94) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 54) | pass 0.902 via tolerance (n6, claim check 94) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 57) | pass 0.51 via tolerance (n7, claim check 94) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 57) | pass 0.912 via tolerance (n7, claim check 94) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 60) | pass 0.462 via tolerance (n8, claim check 94) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 60) | pass 0.803 via tolerance (n8, claim check 94) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 63) | pass 0.5 via tolerance (n9, claim check 94) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 63) | pass 0.808 via tolerance (n9, claim check 94) |

### jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | run 3

Status: answer. 101 s. 9 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-022842-7991. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261012-022842-7991/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261012-022842-7991/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 12) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 12) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 39) | pass 0.7856 via tolerance (n10, claim check 111) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 39) | pass 0.7404 via tolerance (n2, claim check 111) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 39) | pass 0.8309 via tolerance (n2, claim check 111) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 42) | pass 0.7294 via tolerance (n10, claim check 111) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 42) | pass 0.6799 via tolerance (n3, claim check 111) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 42) | pass 0.7789 via tolerance (n3, claim check 111) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 45) | pass 0.6596 via tolerance (n4, claim check 111) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 45) | pass 0.6061 via tolerance (n4, claim check 111) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 45) | pass 0.7131 via tolerance (n4, claim check 111) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 48) | pass 0.665 via tolerance (n5, claim check 111) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 48) | pass 0.612 via tolerance (n5, claim check 111) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 48) | pass 0.718 via tolerance (n5, claim check 111) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 60) | pass 0.6202 via tolerance (n6, claim check 111) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 60) | pass 0.9016 via tolerance (n6, claim check 111) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 63) | pass 0.5096 via tolerance (n7, claim check 111) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 63) | pass 0.9119 via tolerance (n7, claim check 111) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 66) | pass 0.4615 via tolerance (n8, claim check 111) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 66) | pass 0.8031 via tolerance (n8, claim check 111) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 69) | pass 0.5 via tolerance (n9, claim check 111) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 69) | pass 0.8083 via tolerance (n9, claim check 111) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 1

Status: answer. 494 s. 26 requests, 31 tool calls (0 failed), 0 nudges, 1 plan reminders, 6 unsourced.
Session: 20261012-023023-7015. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261012-023023-7015/log.jsonl
Leak check: 20 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261012-023023-7015/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.006729 (n13 table.rows[3][3], entry 142) | pass 1.056 via tolerance (n29, claim check 318) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n12 table.rows[2][3], entry 138) | pass 1.644 via tolerance (n29, claim check 318) |
| clisi_before | 1 ±0.02 | pass 1 (n13 metrics.median, entry 142) | pass 1 via tolerance (n34, claim check 318) |
| clisi_after | 1 ±0.02 | pass 1 (n13 metrics.median, entry 142) | pass 1 via tolerance (n34, claim check 318) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n11 table.rows[0][1], entry 126) | pass 3255 via tolerance (n29, claim check 318) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n11 table.rows[2][2], entry 126) | differs 2885 (n29, claim check 318) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n11 table.rows[1][1], entry 126) | differs 1773 (n11, claim check 318) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n11 table.rows[1][2], entry 126) | differs 1615 (n11, claim check 318) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 2

Status: error (Error: ENOSPC: no space left on device, write). 83 s. 12 requests, 13 tool calls (5 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-023841-a661. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261012-023841-a661/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261012-023841-a661/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | FAIL - | FAIL - |
| ilisi_after | 1.59 ±0.1 | FAIL - | FAIL - |
| clisi_before | 1 ±0.02 | FAIL - | FAIL - |
| clisi_after | 1 ±0.02 | FAIL - | FAIL - |
| jurkat_pure_cells_after_qc | 3255 exact | FAIL - | FAIL - |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs - | differs - |
| mix_jurkat_cells (reference) | 1799 exact | differs - | differs - |
| mix_t293_cells (reference) | 1565 exact | differs - | differs - |

