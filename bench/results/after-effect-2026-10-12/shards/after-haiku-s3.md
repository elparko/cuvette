# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 281/288 | 235/240 | 39 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| andrews-fastqc | 21/21 / 9/9 |
| bemis2015-cardinal | 8/15 / 10/15 |
| cooley2020-splitluc-zprime | 57/57 / 57/57 |
| gowers2016-mdanalysis | 21/21 / 21/21 |
| jang2016-hcc-biomarkers | 66/66 / 60/60 |
| korsunsky2019-harmony | 15/15 / 15/15 |
| liao2025-scanpy-bone-marrow | 15/15 / 12/12 |
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
| claude:claude-haiku-5-5 | 39 | 6103 | 420 | 1046 | 388492 | 8929440 | 465 | 10 | 0 | 16 | 33 | 104 | 149 | 48 | 18 | 31 | 31 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.44 for 39 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| andrews-fastqc | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| andrews-fastqc | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| andrews-fastqc | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 1 | 0 |
| bemis2015-cardinal | claude:claude-haiku-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-haiku-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 3 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 1 | on | 18 | 0 | 0 | 2 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 2 | on | 22 | 0 | 0 | 2 | 0 |
| korsunsky2019-harmony | claude:claude-haiku-5-5 | 3 | on | 17 | 0 | 0 | 0 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | 1 | on | 9 | 0 | 0 | 0 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | 2 | on | 9 | 0 | 0 | 0 | 0 |
| liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | 3 | on | 11 | 0 | 0 | 0 | 0 |
| makrai2023-colonies | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| makrai2023-colonies | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 1 | 0 |
| makrai2023-colonies | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-haiku-5-5 | 1 | on | 12 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| oksanen-vegan-dune | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| rees2019-uptake | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| rees2019-uptake | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| rees2019-uptake | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| student1908-sleep | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| wolf2018-scanpy | claude:claude-haiku-5-5 | 1 | on | 16 | 0 | 0 | 4 | 0 |
| wolf2018-scanpy | claude:claude-haiku-5-5 | 2 | on | 13 | 0 | 0 | 5 | 0 |
| wolf2018-scanpy | claude:claude-haiku-5-5 | 3 | on | 15 | 0 | 0 | 0 | 0 |

## Details

### andrews-fastqc | claude:claude-haiku-5-5 | run 1

Status: answer. 81 s. 6 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-234259-189d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run1/home/sessions/20261011-234259-189d/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run1/home/sessions/20261011-234259-189d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 21) | pass 250000 via tolerance (n1, claim check 63) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 24) | pass 395288 via tolerance (n2, claim check 63) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 21) | pass 40 via tolerance (n2, claim check 63) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 21) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run1/home/sessions/20261011-234259-189d/work/run_fastqc-1/report/good_sequence_short_fastqc/fastqc_data.txt, entry 21) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 21) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run1/home/sessions/20261011-234259-189d/work/run_fastqc-1/report/good_sequence_short_fastqc/fastqc_data.txt, entry 21) | not asked |

### andrews-fastqc | claude:claude-haiku-5-5 | run 2

Status: answer. 80 s. 5 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-234428-1b7b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run2/home/sessions/20261011-234428-1b7b/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run2/home/sessions/20261011-234428-1b7b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 14) | pass 250000 via tolerance (n1, claim check 58) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 17) | pass 395288 via tolerance (n2, claim check 58) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 14) | pass 40 via tolerance (n2, claim check 58) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 14) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run2/home/sessions/20261011-234428-1b7b/work/run_fastqc-1/report/good_sequence_short_fastqc/fastqc_data.txt, entry 14) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 14) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run2/home/sessions/20261011-234428-1b7b/work/run_fastqc-1/report/good_sequence_short_fastqc/fastqc_data.txt, entry 14) | not asked |

### andrews-fastqc | claude:claude-haiku-5-5 | run 3

Status: answer. 91 s. 5 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-234551-d85a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run3/home/sessions/20261011-234551-d85a/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/andrews-fastqc/run3/home/sessions/20261011-234551-d85a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| good_total_sequences | 250000 exact | pass 250000 (n1 metrics.total_sequences, entry 14) | pass 250000 via tolerance (n1, claim check 53) |
| bad_total_sequences | 395288 exact | pass 395288 (n2 metrics.total_sequences, entry 17) | pass 395288 via tolerance (n2, claim check 53) |
| sequence_length | 40 exact | pass 40 (n1 metrics.sequence_length, entry 14) | pass 40 via tolerance (n2, claim check 53) |
| good_gc_percent | 45 ±1 | pass 45 (n1 metrics.gc_percent, entry 14) | not asked |
| bad_gc_percent | 47 ±1 | pass 47 (n2 metrics.gc_percent, entry 17) | not asked |
| good_modules_not_pass | 0 exact | pass 0 (n1 metrics.n_warn, entry 14) | not asked |
| bad_modules_warning | 4 exact | pass 4 (n2 metrics.n_warn, entry 17) | not asked |

### bemis2015-cardinal | claude:claude-haiku-5-5 | run 1

Status: answer. 183 s. 7 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261011-234730-1b22. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run1/home/sessions/20261011-234730-1b22/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run1/home/sessions/20261011-234730-1b22/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 12) | pass 4959 via tolerance (n5, claim check 85) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 12) | pass 10200 via tolerance (n1, claim check 85) |
| peaks | 687 ±10 | FAIL 754 (n5 metrics.n_peaks, entry 49) | FAIL 754 (n5, claim check 85) |
| segments_s32 | 6 ±1 | FAIL - | FAIL 3 (n5, claim check 85) |
| segments_s64 | 3 ±1 | FAIL - | pass 3 via tolerance (n5, claim check 85) |

### bemis2015-cardinal | claude:claude-haiku-5-5 | run 2

Status: answer. 302 s. 8 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-235033-1a5d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run2/home/sessions/20261011-235033-1a5d/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run2/home/sessions/20261011-235033-1a5d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 12) | pass 4959 via tolerance (n5, claim check 129) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 12) | pass 10200 via tolerance (n1, claim check 129) |
| peaks | 687 ±10 | FAIL 721 (n5 metrics.n_peaks, entry 42) | FAIL 721 (n5, claim check 129) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 63) | pass 6 via tolerance (n13, claim check 129) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 63) | pass 3 via tolerance (n13, claim check 129) |

### bemis2015-cardinal | claude:claude-haiku-5-5 | run 3

Status: answer. 75 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-235535-1cac. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run3/home/sessions/20261011-235535-1cac/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bemis2015-cardinal/run3/home/sessions/20261011-235535-1cac/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 12) | pass 4959 via tolerance (n5, claim check 75) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 12) | pass 10200 via tolerance (n1, claim check 75) |
| peaks | 687 ±10 | FAIL 721 (n5 metrics.n_peaks, entry 49) | FAIL 721 (n5, claim check 75) |
| segments_s32 | 6 ±1 | FAIL - | FAIL 3 (n5, claim check 75) |
| segments_s64 | 3 ±1 | FAIL - | pass 3 via tolerance (n5, claim check 75) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 1

Status: answer. 66 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-235650-15de. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261011-235650-15de/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run1/home/sessions/20261011-235650-15de/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n2 metrics.pP1_10ul_z_prime, entry 42) | pass 0.541 via tolerance (n3, claim check 64) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n2 metrics.pP2_10ul_z_prime, entry 42) | pass 0.61 via tolerance (n3, claim check 64) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n2 metrics.pP3_10ul_z_prime, entry 42) | pass 0.728 via tolerance (n3, claim check 64) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n2 metrics.pP4_10ul_z_prime, entry 42) | pass 0.73 via tolerance (n3, claim check 64) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n2 metrics.pP5_10ul_z_prime, entry 42) | pass 0.664 via tolerance (n3, claim check 64) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n2 metrics.pP6_10ul_z_prime, entry 42) | pass 0.632 via tolerance (n3, claim check 64) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n2 metrics.pP7_10ul_z_prime, entry 42) | pass 0.767 via tolerance (n3, claim check 64) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n2 metrics.pP8_10ul_z_prime, entry 42) | pass 0.742 via tolerance (n3, claim check 64) |
| z10_p9 | 0.621 ±0.004 | pass 0.621 (n3 stdout, entry 51) | pass 0.621 via tolerance (n3, claim check 64) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n2 metrics.pP10_10ul_z_prime, entry 42) | pass 0.722 via tolerance (n3, claim check 64) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.pP2_20ul_z_prime, entry 42) | pass 0.522 via tolerance (n3, claim check 64) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.pP4_20ul_z_prime, entry 42) | pass 0.786 via tolerance (n3, claim check 64) |
| z20_p6 | 0.643 ±0.004 | pass 0.643 (n3 stdout, entry 51) | pass 0.643 via tolerance (n3, claim check 64) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.pP7_20ul_z_prime, entry 42) | pass 0.671 via tolerance (n3, claim check 64) |
| z20_p8 | 0.685 ±0.004 | pass 0.685 (n3 stdout, entry 51) | pass 0.685 via tolerance (n3, claim check 64) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.pP9_20ul_z_prime, entry 42) | pass 0.8 via tolerance (n3, claim check 64) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.pP10_20ul_z_prime, entry 42) | pass 0.728 via tolerance (n3, claim check 64) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n3 stdout, entry 51) | pass 2471.2 via tolerance (n3, claim check 64) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1 (n3 stdout, entry 51) | pass 268.1 via tolerance (n3, claim check 64) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.643 (n3 stdout, entry 51) | differs 0.643 (n3, claim check 64) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.852 (n3 stdout, entry 51) | differs 0.852 (n3, claim check 64) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 2

Status: answer. 55 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-235756-5128. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261011-235756-5128/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run2/home/sessions/20261011-235756-5128/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n2 metrics.p1_10ul_z_prime, entry 44) | pass 0.541 via tolerance (n2, claim check 66) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n2 metrics.p2_10ul_z_prime, entry 44) | pass 0.61 via tolerance (n2, claim check 66) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n2 metrics.p3_10ul_z_prime, entry 44) | pass 0.728 via tolerance (n2, claim check 66) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n2 metrics.p4_10ul_z_prime, entry 44) | pass 0.73 via tolerance (n2, claim check 66) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n2 metrics.p5_10ul_z_prime, entry 44) | pass 0.664 via tolerance (n2, claim check 66) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n2 metrics.p6_10ul_z_prime, entry 44) | pass 0.632 via tolerance (n2, claim check 66) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n2 metrics.p7_10ul_z_prime, entry 44) | pass 0.767 via tolerance (n2, claim check 66) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n2 metrics.p8_10ul_z_prime, entry 44) | pass 0.742 via tolerance (n2, claim check 66) |
| z10_p9 | 0.621 ±0.004 | pass 0.6209891 (n2 metrics.p9_10ul_z_prime, entry 44) | pass 0.621 via tolerance (n2, claim check 66) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n2 metrics.p10_10ul_z_prime, entry 44) | pass 0.722 via tolerance (n2, claim check 66) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.p2_20ul_z_prime, entry 44) | pass 0.522 via tolerance (n2, claim check 66) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.p4_20ul_z_prime, entry 44) | pass 0.786 via tolerance (n2, claim check 66) |
| z20_p6 | 0.643 ±0.004 | pass 0.6429603 (n2 metrics.p6_20ul_z_prime, entry 44) | pass 0.643 via tolerance (n2, claim check 66) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.p7_20ul_z_prime, entry 44) | pass 0.671 via tolerance (n2, claim check 66) |
| z20_p8 | 0.685 ±0.004 | pass 0.6850474 (n2 metrics.p8_20ul_z_prime, entry 44) | pass 0.685 via tolerance (n2, claim check 66) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.p9_20ul_z_prime, entry 44) | pass 0.8 via tolerance (n2, claim check 66) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.p10_20ul_z_prime, entry 44) | pass 0.728 via tolerance (n2, claim check 66) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n2 metrics.p1_10ul_mean_high, entry 44) | pass 2471.2 via tolerance (n2, claim check 66) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1216 (n2 metrics.p1_10ul_sd_high, entry 44) | pass 268.1 via tolerance (n2, claim check 66) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.6429603 (n2 metrics.p6_20ul_z_prime, entry 44) | differs 0.643 (n2, claim check 66) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.8524462 (n2 metrics.p5_20ul_z_prime, entry 44) | differs 0.852 (n2, claim check 66) |

### cooley2020-splitluc-zprime | claude:claude-haiku-5-5 | run 3

Status: answer. 60 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-235851-f496. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261011-235851-f496/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/cooley2020-splitluc-zprime/run3/home/sessions/20261011-235851-f496/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| z10_p1 | 0.5413 ±0.004 | pass 0.5413071 (n2 metrics.pP1_10ul_z_prime, entry 41) | pass 0.541 via tolerance (n2, claim check 51) |
| z10_p2 | 0.6102 ±0.004 | pass 0.6102128 (n2 metrics.pP2_10ul_z_prime, entry 41) | pass 0.61 via tolerance (n2, claim check 51) |
| z10_p3 | 0.7275 ±0.004 | pass 0.7275382 (n2 metrics.pP3_10ul_z_prime, entry 41) | pass 0.728 via tolerance (n2, claim check 51) |
| z10_p4 | 0.7302 ±0.002 | pass 0.7302386 (n2 metrics.pP4_10ul_z_prime, entry 41) | pass 0.73 via tolerance (n2, claim check 51) |
| z10_p5 | 0.6643 ±0.004 | pass 0.6642998 (n2 metrics.pP5_10ul_z_prime, entry 41) | pass 0.664 via tolerance (n2, claim check 51) |
| z10_p6 | 0.6319 ±0.004 | pass 0.6318892 (n2 metrics.pP6_10ul_z_prime, entry 41) | pass 0.632 via tolerance (n2, claim check 51) |
| z10_p7 | 0.7666 ±0.004 | pass 0.7666218 (n2 metrics.pP7_10ul_z_prime, entry 41) | pass 0.767 via tolerance (n2, claim check 51) |
| z10_p8 | 0.7415 ±0.004 | pass 0.7415492 (n2 metrics.pP8_10ul_z_prime, entry 41) | pass 0.742 via tolerance (n2, claim check 51) |
| z10_p9 | 0.621 ±0.004 | pass 0.6209891 (n2 metrics.pP9_10ul_z_prime, entry 41) | pass 0.621 via tolerance (n2, claim check 51) |
| z10_p10 | 0.7217 ±0.004 | pass 0.7216555 (n2 metrics.pP10_10ul_z_prime, entry 41) | pass 0.722 via tolerance (n2, claim check 51) |
| z20_p2 | 0.5219 ±0.004 | pass 0.5218797 (n2 metrics.pP2_20ul_z_prime, entry 41) | pass 0.522 via tolerance (n2, claim check 51) |
| z20_p4 | 0.7865 ±0.004 | pass 0.7864944 (n2 metrics.pP4_20ul_z_prime, entry 41) | pass 0.786 via tolerance (n2, claim check 51) |
| z20_p6 | 0.643 ±0.004 | pass 0.6429603 (n2 metrics.pP6_20ul_z_prime, entry 41) | pass 0.643 via tolerance (n2, claim check 51) |
| z20_p7 | 0.6709 ±0.004 | pass 0.6708963 (n2 metrics.pP7_20ul_z_prime, entry 41) | pass 0.671 via tolerance (n2, claim check 51) |
| z20_p8 | 0.685 ±0.004 | pass 0.6850474 (n2 metrics.pP8_20ul_z_prime, entry 41) | pass 0.685 via tolerance (n2, claim check 51) |
| z20_p9 | 0.8005 ±0.004 | pass 0.8004509 (n2 metrics.pP9_20ul_z_prime, entry 41) | pass 0.8 via tolerance (n2, claim check 51) |
| z20_p10 | 0.7282 ±0.004 | pass 0.7282149 (n2 metrics.pP10_20ul_z_prime, entry 41) | pass 0.728 via tolerance (n2, claim check 51) |
| mean_pos10_p1 | 2471.2 ±0.6 | pass 2471.2 (n2 metrics.pP1_10ul_mean_high, entry 41) | pass 2471.2 via tolerance (n2, claim check 51) |
| sd_pos10_p1 | 268.1 ±0.6 | pass 268.1216 (n2 metrics.pP1_10ul_sd_high, entry 41) | pass 268.1 via tolerance (n2, claim check 51) |
| z20_p3_printed (reference) | 0.65 ±0.005 | differs 0.6429603 (n2 metrics.pP6_20ul_z_prime, entry 41) | differs 0.643 (n2, claim check 51) |
| z20_p5_printed (reference) | 0.83 ±0.005 | differs 0.8524462 (n2 metrics.pP5_20ul_z_prime, entry 41) | differs 0.852 (n2, claim check 51) |

### gowers2016-mdanalysis | claude:claude-haiku-5-5 | run 1

Status: answer. 67 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-235951-8e3b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run1/home/sessions/20261011-235951-8e3b/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run1/home/sessions/20261011-235951-8e3b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 12) | pass 3341 via tolerance (n1, claim check 77) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 12) | pass 98 via tolerance (n5, claim check 77) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n4 metrics.rmsd_last, entry 32) | pass 6.82 via tolerance (n4, claim check 77) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n5 metrics.rg_last, entry 39) | pass 19.592 via tolerance (n5, claim check 77) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n6, claim check 77) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n6, claim check 77) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 51) | pass 7.131 via tolerance (n6, claim check 77) |

### gowers2016-mdanalysis | claude:claude-haiku-5-5 | run 2

Status: answer. 84 s. 7 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-000058-94ba. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run2/home/sessions/20261012-000058-94ba/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run2/home/sessions/20261012-000058-94ba/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 12) | pass 3341 via tolerance (n1, claim check 79) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 12) | pass 98 via tolerance (n3, claim check 79) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n2 metrics.rmsd_last, entry 20) | pass 6.82 via tolerance (n2, claim check 79) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n3 metrics.rg_last, entry 32) | pass 19.592 via tolerance (n3, claim check 79) |
| residues_chain_a | 214 exact | pass 214 (n4 metrics.residues_A, entry 35) | pass 214 via tolerance (n6, claim check 79) |
| residues_chain_b | 214 exact | pass 214 (n4 metrics.residues_A, entry 35) | pass 214 via tolerance (n6, claim check 79) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 50) | pass 7.131 via tolerance (n6, claim check 79) |

### gowers2016-mdanalysis | claude:claude-haiku-5-5 | run 3

Status: answer. 65 s. 6 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-000223-45ff. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run3/home/sessions/20261012-000223-45ff/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gowers2016-mdanalysis/run3/home/sessions/20261012-000223-45ff/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 12) | pass 3341 via tolerance (n1, claim check 68) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 12) | pass 98 via tolerance (n4, claim check 68) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n3 metrics.rmsd_last, entry 23) | pass 6.82 via tolerance (n3, claim check 68) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n4 metrics.rg_last, entry 30) | pass 19.592 via tolerance (n4, claim check 68) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n5, claim check 68) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 15) | pass 214 via tolerance (n5, claim check 68) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n5 metrics.rmsd_after_fit, entry 42) | pass 7.131 via tolerance (n5, claim check 68) |

### jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | run 1

Status: answer. 132 s. 9 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-000329-2d5e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261012-000329-2d5e/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261012-000329-2d5e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 12) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 12) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 41) | pass 0.7856 via tolerance (n2, claim check 110) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 41) | pass 0.7404 via tolerance (n2, claim check 110) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 41) | pass 0.8309 via tolerance (n2, claim check 110) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 44) | pass 0.7294 via tolerance (n3, claim check 110) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 44) | pass 0.6799 via tolerance (n3, claim check 110) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 44) | pass 0.7789 via tolerance (n3, claim check 110) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 47) | pass 0.6596 via tolerance (n4, claim check 110) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 47) | pass 0.6061 via tolerance (n4, claim check 110) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 47) | pass 0.7131 via tolerance (n4, claim check 110) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 50) | pass 0.665 via tolerance (n5, claim check 110) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 50) | pass 0.612 via tolerance (n5, claim check 110) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 50) | pass 0.718 via tolerance (n5, claim check 110) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 62) | pass 0.6202 via tolerance (n6, claim check 110) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 62) | pass 0.9016 via tolerance (n6, claim check 110) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 65) | pass 0.5096 via tolerance (n7, claim check 110) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 65) | pass 0.9119 via tolerance (n7, claim check 110) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 68) | pass 0.4615 via tolerance (n8, claim check 110) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 68) | pass 0.8031 via tolerance (n8, claim check 110) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 71) | pass 0.5 via tolerance (n9, claim check 110) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 71) | pass 0.8083 via tolerance (n9, claim check 110) |

### jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | run 2

Status: answer. 112 s. 8 requests, 16 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-000541-2906. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261012-000541-2906/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261012-000541-2906/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 12) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 12) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 38) | pass 0.786 via tolerance (n12, claim check 119) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 38) | pass 0.74 via tolerance (n8, claim check 119) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 38) | pass 0.831 via tolerance (n2, claim check 119) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 41) | pass 0.729 via tolerance (n10, claim check 119) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 41) | pass 0.68 via tolerance (n3, claim check 119) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 41) | pass 0.779 via tolerance (n3, claim check 119) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 44) | pass 0.66 via tolerance (n9, claim check 119) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 44) | pass 0.606 via tolerance (n4, claim check 119) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 44) | pass 0.713 via tolerance (n4, claim check 119) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 47) | pass 0.665 via tolerance (n13, claim check 119) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 47) | pass 0.612 via tolerance (n5, claim check 119) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 47) | pass 0.718 via tolerance (n5, claim check 119) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 59) | pass 0.62 via tolerance (n6, claim check 119) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 59) | pass 0.902 via tolerance (n6, claim check 119) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 62) | pass 0.51 via tolerance (n7, claim check 119) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 62) | pass 0.912 via tolerance (n7, claim check 119) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 65) | pass 0.462 via tolerance (n8, claim check 119) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 65) | pass 0.803 via tolerance (n8, claim check 119) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 68) | pass 0.5 via tolerance (n9, claim check 119) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 68) | pass 0.808 via tolerance (n9, claim check 119) |

### jang2016-hcc-biomarkers | claude:claude-haiku-5-5 | run 3

Status: answer. 87 s. 6 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261012-000733-862e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261012-000733-862e/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261012-000733-862e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 12) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 12) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 33) | pass 0.786 via tolerance (n2, claim check 92) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 33) | pass 0.74 via tolerance (n8, claim check 92) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 33) | pass 0.831 via tolerance (n2, claim check 92) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 36) | pass 0.729 via tolerance (n3, claim check 92) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 36) | pass 0.68 via tolerance (n3, claim check 92) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 36) | pass 0.779 via tolerance (n3, claim check 92) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 39) | pass 0.66 via tolerance (n9, claim check 92) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 39) | pass 0.606 via tolerance (n4, claim check 92) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 39) | pass 0.713 via tolerance (n4, claim check 92) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 42) | pass 0.665 via tolerance (n5, claim check 92) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 42) | pass 0.612 via tolerance (n5, claim check 92) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 42) | pass 0.718 via tolerance (n5, claim check 92) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 54) | pass 0.62 via tolerance (n6, claim check 92) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 54) | pass 0.902 via tolerance (n6, claim check 92) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 57) | pass 0.51 via tolerance (n7, claim check 92) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 57) | pass 0.912 via tolerance (n7, claim check 92) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 60) | pass 0.462 via tolerance (n8, claim check 92) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 60) | pass 0.803 via tolerance (n8, claim check 92) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 63) | pass 0.5 via tolerance (n10, claim check 92) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 63) | pass 0.808 via tolerance (n9, claim check 92) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 1

Status: answer. 424 s. 22 requests, 31 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261012-000900-e125. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261012-000900-e125/log.jsonl
Leak check: 18 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run1/home/sessions/20261012-000900-e125/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.011594 (n13 table.rows[1][3], entry 137) | pass 1.06 via tolerance (n13, claim check 290) |
| ilisi_after | 1.59 ±0.1 | pass 1.617978 (n13 metrics.q75, entry 137) | pass 1.66 via tolerance (n35, claim check 290) |
| clisi_before | 1 ±0.02 | pass 1 (n14 metrics.median, entry 145) | pass 1 via tolerance (n35, claim check 290) |
| clisi_after | 1 ±0.02 | pass 1 (n14 metrics.median, entry 145) | pass 1 via tolerance (n35, claim check 290) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n7 table.rows[0][1], entry 81) | pass 3255 via tolerance (n35, claim check 290) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n7 table.rows[2][1], entry 81) | differs 2885 (n35, claim check 290) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n21 table.rows[0][2], entry 182) | differs 1773 (n21, claim check 290) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n21 table.rows[1][2], entry 182) | differs 1615 (n21, claim check 290) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 2

Status: answer. 494 s. 31 requests, 35 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261012-001607-7c5a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261012-001607-7c5a/log.jsonl
Leak check: 22 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run2/home/sessions/20261012-001607-7c5a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.006729 (n13 table.rows[3][3], entry 152) | pass 1.056 via tolerance (n35, claim check 346) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n12 table.rows[2][3], entry 148) | pass 1.657 via tolerance (n18, claim check 346) |
| clisi_before | 1 ±0.02 | pass 1 (n13 metrics.median, entry 152) | pass 1 via tolerance (n35, claim check 346) |
| clisi_after | 1 ±0.02 | pass 1 (n13 metrics.median, entry 152) | pass 1 via tolerance (n35, claim check 346) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n6 table.rows[0][1], entry 74) | pass 3255 via tolerance (n35, claim check 346) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n6 table.rows[2][1], entry 74) | differs 2885 (n35, claim check 346) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1859 (n28 table.rows[4][2], entry 258) | differs 1960 (n11, claim check 346) |
| mix_t293_cells (reference) | 1565 exact | differs 1645 (n27 table.rows[5][3], entry 250) | differs 1960 (n11, claim check 346) |

### korsunsky2019-harmony | claude:claude-haiku-5-5 | run 3

Status: answer. 416 s. 24 requests, 26 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-002424-e926. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run3/home/sessions/20261012-002424-e926/log.jsonl
Leak check: 17 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/korsunsky2019-harmony/run3/home/sessions/20261012-002424-e926/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ilisi_before | 1.01 ±0.1 | pass 1.006729 (n15 table.rows[3][3], entry 150) | pass 1.056 via tolerance (n30, claim check 283) |
| ilisi_after | 1.59 ±0.1 | pass 1.611606 (n14 table.rows[2][3], entry 146) | pass 1.644 via tolerance (n30, claim check 283) |
| clisi_before | 1 ±0.02 | pass 1 (n15 metrics.median, entry 150) | pass 1 via tolerance (n30, claim check 283) |
| clisi_after | 1 ±0.02 | pass 1 (n15 metrics.median, entry 150) | pass 1 via tolerance (n30, claim check 283) |
| jurkat_pure_cells_after_qc | 3255 exact | pass 3255 (n7 table.rows[0][1], entry 74) | pass 3255 via tolerance (n30, claim check 283) |
| t293_pure_cells_after_qc (reference) | 2859 exact | differs 2885 (n7 table.rows[2][1], entry 74) | differs 2885 (n30, claim check 283) |
| mix_jurkat_cells (reference) | 1799 exact | differs 1773 (n13 table.rows[0][2], entry 134) | differs 1773 (n13, claim check 283) |
| mix_t293_cells (reference) | 1565 exact | differs 1615 (n13 table.rows[1][2], entry 134) | differs 1615 (n13, claim check 283) |

### liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | run 1

Status: answer. 115 s. 11 requests, 15 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-003122-033c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261012-003122-033c/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run1/home/sessions/20261012-003122-033c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 17) | pass 10608 via tolerance (n8, claim check 128) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 20) | pass 10046 via tolerance (n9, claim check 128) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 86) | pass 9612 via tolerance (n8, claim check 128) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 94) | pass 8887 via tolerance (n9, claim check 128) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 17) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | run 2

Status: answer. 104 s. 12 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-003320-0e80. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261012-003320-0e80/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run2/home/sessions/20261012-003320-0e80/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 20) | pass 10608 via tolerance (n11, claim check 127) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 23) | pass 10046 via tolerance (n11, claim check 127) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 78) | pass 9612 via tolerance (n11, claim check 127) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 86) | pass 8887 via tolerance (n11, claim check 127) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 20) | not asked |

### liao2025-scanpy-bone-marrow | claude:claude-haiku-5-5 | run 3

Status: answer. 171 s. 15 requests, 18 tool calls (2 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-003506-fe6d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261012-003506-fe6d/log.jsonl
Leak check: 11 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/liao2025-scanpy-bone-marrow/run3/home/sessions/20261012-003506-fe6d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pulse_cells_loaded | 10608 exact | pass 10608 (n1 metrics.n_cells, entry 15) | pass 10608 via tolerance (n14, claim check 159) |
| chase_cells_loaded | 10046 exact | pass 10046 (n2 metrics.n_cells, entry 18) | pass 10046 via tolerance (n13, claim check 159) |
| pulse_cells_after_qc | 9612 exact | pass 9612 (n8 metrics.n_cells_after, entry 84) | pass 9612 via tolerance (n14, claim check 159) |
| chase_cells_after_qc | 8887 exact | pass 8887 (n9 metrics.n_cells_after, entry 92) | pass 8887 via tolerance (n13, claim check 159) |
| genes_in_matrix | 32286 exact | pass 32286 (n1 metrics.n_genes, entry 15) | not asked |

### makrai2023-colonies | claude:claude-haiku-5-5 | run 1

Status: answer. 345 s. 14 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-003759-910d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/makrai2023-colonies/run1/home/sessions/20261012-003759-910d/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/makrai2023-colonies/run1/home/sessions/20261012-003759-910d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 77) | not asked |
| total_colonies | 88 ±9 | pass 88 (n8 metrics.total_colonies, entry 101) | pass 88 via tolerance (n14, claim check 175) |

### makrai2023-colonies | claude:claude-haiku-5-5 | run 2

Status: answer. 286 s. 13 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-004345-0424. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/makrai2023-colonies/run2/home/sessions/20261012-004345-0424/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/makrai2023-colonies/run2/home/sessions/20261012-004345-0424/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 73) | not asked |
| total_colonies | 88 ±9 | pass 88 (n8 metrics.total_colonies, entry 104) | pass 88 via tolerance (n12, claim check 162) |

### makrai2023-colonies | claude:claude-haiku-5-5 | run 3

Status: answer. 273 s. 11 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-004831-a30c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/makrai2023-colonies/run3/home/sessions/20261012-004831-a30c/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/makrai2023-colonies/run3/home/sessions/20261012-004831-a30c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n5 table.rows[5][0], entry 66) | not asked |
| total_colonies | 88 ±9 | pass 88 (n6 metrics.total_colonies, entry 74) | pass 88 via tolerance (n11, claim check 149) |

### oksanen-vegan-dune | claude:claude-haiku-5-5 | run 1

Status: answer. 109 s. 11 requests, 19 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-005304-7930. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oksanen-vegan-dune/run1/home/sessions/20261012-005304-7930/log.jsonl
Leak check: 12 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oksanen-vegan-dune/run1/home/sessions/20261012-005304-7930/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 27) | pass 1.4405 via tolerance (n2, claim check 156) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 71) | pass 0.1183 via tolerance (n10, claim check 156) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 51) | pass 0.3416 via tolerance (n6, claim check 156) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 51) | pass 2.767 via tolerance (n6, claim check 156) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n6 metrics.p, entry 51) | pass 0.003 via tolerance (n5, claim check 156) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 58) | not asked |

### oksanen-vegan-dune | claude:claude-haiku-5-5 | run 2

Status: answer. 92 s. 9 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-005453-2dd9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oksanen-vegan-dune/run2/home/sessions/20261012-005453-2dd9/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oksanen-vegan-dune/run2/home/sessions/20261012-005453-2dd9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 30) | pass 1.4405 via tolerance (n2, claim check 129) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n10 metrics.stress, entry 88) | pass 0.118 via tolerance (n10, claim check 129) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 68) | pass 0.342 via tolerance (n6, claim check 129) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 68) | pass 2.767 via tolerance (n6, claim check 129) |
| permanova_p | 0.003 ±0.003 | pass 0.002 (n6 metrics.p, entry 68) | pass 0.002 via tolerance (n6, claim check 129) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n7 metrics.f, entry 75) | not asked |

### oksanen-vegan-dune | claude:claude-haiku-5-5 | run 3

Status: answer. 118 s. 11 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-005625-0c06. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oksanen-vegan-dune/run3/home/sessions/20261012-005625-0c06/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oksanen-vegan-dune/run3/home/sessions/20261012-005625-0c06/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| shannon_site1 | 1.4405 ±0.001 | pass 1.440482 (n2 metrics.first_site_index, entry 31) | pass 1.4405 via tolerance (n2, claim check 156) |
| nmds_stress | 0.1183 ±0.001 | pass 0.1183186 (n9 metrics.stress, entry 75) | pass 0.1183 via tolerance (n9, claim check 156) |
| permanova_r2 | 0.3416 ±0.001 | pass 0.3416107 (n6 metrics.r2, entry 61) | pass 0.3416 via tolerance (n10, claim check 156) |
| permanova_f | 2.767 ±0.01 | pass 2.767243 (n6 metrics.f, entry 61) | pass 2.767 via tolerance (n10, claim check 156) |
| permanova_p | 0.003 ±0.003 | pass 0.003 (n6 metrics.p, entry 61) | pass 0.003 via tolerance (n10, claim check 156) |
| dispersion_f | 1.951 ±0.01 | pass 1.95064 (n11 metrics.f, entry 93) | not asked |

### rees2019-uptake | claude:claude-haiku-5-5 | run 1

Status: answer. 332 s. 15 requests, 18 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005823-340d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261012-005823-340d/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rees2019-uptake/run1/home/sessions/20261012-005823-340d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n6 table.rows[2][0], entry 93) | not asked |
| nuclei | 582 ±35 | pass 566 (n7 metrics.total_nuclei, entry 108) | pass 566 via tolerance (n21, claim check 210) |
| vesicles | 461 ±35 | pass 459 (n7 metrics.total_cells, entry 108) | pass 459 via tolerance (n19, claim check 210) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n7 table.rows[1][5], entry 108) | pass 0.645 via tolerance (n12, claim check 210) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.429 (n8 stdout, entry 124) | pass 0.442 via tolerance (n9, claim check 210) |
| cells (reference) | 572 ±35 | match 566 (n7 metrics.total_nuclei, entry 108) | match 566 via tolerance (n21, claim check 210) |

### rees2019-uptake | claude:claude-haiku-5-5 | run 2

Status: answer. 154 s. 10 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-010355-2356. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rees2019-uptake/run2/home/sessions/20261012-010355-2356/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rees2019-uptake/run2/home/sessions/20261012-010355-2356/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n5 table.rows[2][0], entry 81) | not asked |
| nuclei | 582 ±35 | pass 566 (n6 metrics.total_nuclei, entry 90) | pass 566 via tolerance (n9, claim check 148) |
| vesicles | 461 ±35 | pass 459 (n6 metrics.total_cells, entry 90) | pass 459 via tolerance (n9, claim check 148) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n6 table.rows[1][5], entry 90) | pass 0.64 via tolerance (n9, claim check 148) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.4290298 (n8 stdout, entry 118) | pass 0.442 via tolerance (n7, claim check 148) |
| cells (reference) | 572 ±35 | match 566 (n6 metrics.total_nuclei, entry 90) | match 566 via tolerance (n9, claim check 148) |

### rees2019-uptake | claude:claude-haiku-5-5 | run 3

Status: answer. 142 s. 9 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-010630-4c99. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rees2019-uptake/run3/home/sessions/20261012-010630-4c99/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rees2019-uptake/run3/home/sessions/20261012-010630-4c99/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| fields | 3 exact | pass 3 (n5 table.rows[2][0], entry 84) | not asked |
| nuclei | 582 ±35 | pass 566 (n6 metrics.total_nuclei, entry 92) | pass 566 via tolerance (n6, claim check 134) |
| vesicles | 461 ±35 | pass 459 (n6 metrics.total_cells, entry 92) | pass 459 via tolerance (n6, claim check 134) |
| vesicles_per_cell | 0.6766 ±0.12 | pass 0.63953 (n6 table.rows[1][5], entry 92) | pass 0.64 via tolerance (n6, claim check 134) |
| fraction_cells_with_vesicles | 0.4371 ±0.08 | pass 0.4290009 (n8 metrics.cargo_ci_low, entry 114) | pass 0.465 via tolerance (n6, claim check 134) |
| cells (reference) | 572 ±35 | match 566 (n6 metrics.total_nuclei, entry 92) | match 566 via tolerance (n6, claim check 134) |

### schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | run 1

Status: answer. 76 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-010852-e1a3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261012-010852-e1a3/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261012-010852-e1a3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 47) | pass 64 via tolerance (n10, claim check 85) |

### schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | run 2

Status: answer. 63 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011008-2b51. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261012-011008-2b51/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261012-011008-2b51/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 47) | pass 64 via tolerance (n10, claim check 89) |

### schindelin2012-fiji-blobs | claude:claude-haiku-5-5 | run 3

Status: answer. 64 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011111-b406. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261012-011111-b406/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261012-011111-b406/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 47) | pass 64 via tolerance (n11, claim check 108) |

### student1908-sleep | claude:claude-haiku-5-5 | run 1

Status: answer. 53 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011215-5e0f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/student1908-sleep/run1/home/sessions/20261012-011215-5e0f/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/student1908-sleep/run1/home/sessions/20261012-011215-5e0f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 41) | pass 1.58 via tolerance (n2, claim check 69) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 41) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 41) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 41) | pass 0.0028 via tolerance (n2, claim check 69) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 41) | pass 0.7 via tolerance (n2, claim check 69) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 41) | pass 2.46 via tolerance (n2, claim check 69) |

### student1908-sleep | claude:claude-haiku-5-5 | run 2

Status: answer. 32 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011308-5cdc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/student1908-sleep/run2/home/sessions/20261012-011308-5cdc/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/student1908-sleep/run2/home/sessions/20261012-011308-5cdc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 41) | pass 1.58 via tolerance (n2, claim check 61) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 41) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 41) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 41) | pass 0.0028 via tolerance (n2, claim check 61) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 41) | pass 0.7 via tolerance (n2, claim check 61) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 41) | pass 2.46 via tolerance (n2, claim check 61) |

### student1908-sleep | claude:claude-haiku-5-5 | run 3

Status: answer. 52 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011340-ffec. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/student1908-sleep/run3/home/sessions/20261012-011340-ffec/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/student1908-sleep/run3/home/sessions/20261012-011340-ffec/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 41) | pass 1.58 via tolerance (n2, claim check 66) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 41) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 41) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 41) | pass 0.0028 via tolerance (n2, claim check 66) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 41) | pass 0.7 via tolerance (n2, claim check 66) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 41) | pass 2.46 via tolerance (n2, claim check 66) |

### wolf2018-scanpy | claude:claude-haiku-5-5 | run 1

Status: answer. 233 s. 28 requests, 28 tool calls (2 failed), 0 nudges, 1 plan reminders, 4 unsourced.
Session: 20261012-011432-1af7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wolf2018-scanpy/run1/home/sessions/20261012-011432-1af7/log.jsonl
Leak check: 16 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wolf2018-scanpy/run1/home/sessions/20261012-011432-1af7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 14) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 14) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 34) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 70) | pass 2638 via tolerance (n16, claim check 316) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 93) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 163) | pass 7 via tolerance (n30, claim check 316) |

### wolf2018-scanpy | claude:claude-haiku-5-5 | run 2

Status: answer. 199 s. 22 requests, 23 tool calls (1 failed), 0 nudges, 1 plan reminders, 5 unsourced.
Session: 20261012-011828-a649. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wolf2018-scanpy/run2/home/sessions/20261012-011828-a649/log.jsonl
Leak check: 13 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wolf2018-scanpy/run2/home/sessions/20261012-011828-a649/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 17) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 17) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 35) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 70) | pass 2638 via tolerance (n23, claim check 251) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 93) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 162) | pass 7 via tolerance (n20, claim check 251) |

### wolf2018-scanpy | claude:claude-haiku-5-5 | run 3

Status: answer. 220 s. 23 requests, 23 tool calls (1 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-012149-a38c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wolf2018-scanpy/run3/home/sessions/20261012-012149-a38c/log.jsonl
Leak check: 15 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wolf2018-scanpy/run3/home/sessions/20261012-012149-a38c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| cells_at_load | 2700 exact | pass 2700 (n1 metrics.n_cells, entry 12) | not asked |
| genes_at_load | 32738 exact | pass 32738 (n1 metrics.n_genes, entry 12) | not asked |
| genes_after_min_cells | 13714 exact | pass 13714 (n2 metrics.n_genes_after, entry 37) | not asked |
| cells_after_qc | 2638 exact | pass 2638 (n5 metrics.n_cells_after, entry 72) | pass 2638 via tolerance (n23, claim check 253) |
| highly_variable_genes | 1838 ±20 | pass 1838 (n7 metrics.n_highly_variable, entry 94) | not asked |
| leiden_clusters | 7 ±1 | pass 7 (n16 metrics.n_clusters, entry 161) | pass 7 via tolerance (n20, claim check 253) |

