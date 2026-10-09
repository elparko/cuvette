# Paper benchmark 2026-10-09

Models: claude:claude-sonnet-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 509/531 | 397/447 | 54 | 2 error |

## Matrix

| Paper | claude:claude-sonnet-5-5 |
| --- | --- |
| alexandrov2019-metaspace | 15/15 / 12/12 |
| astapova2021-deseq2-kgn | 12/12 / 9/9 |
| bemis2015-cardinal | 15/15 / 15/15 |
| chure2024-hplc-py | 36/36 / 33/33 |
| delaney2004-esol | 18/18 / 12/12 |
| gramfort2013-mne-sample | 42/42 / 36/36 |
| jang2016-hcc-biomarkers | 66/66 / 60/60 |
| klindworth2013-16s-primers | 33/33 / 33/33 |
| lazear2023-sage | 13/18 / 4/9 |
| ljosa2012-bbbc005 | 9/9 / 6/6 |
| makrai2023-colonies | 6/6 / 3/3 |
| nair2024-plasmid-growth | 44/60 / 34/51 (1 error) |
| palmer2017-metaspace-fdr | 0/0 / 0/0 |
| rossi1980-recidivism | 32/33 / 12/12 |
| schindelin2012-fiji-blobs | 3/3 / 3/3 |
| sriphoosanaphan2021-vitd-hcv | 63/63 / 57/57 |
| weber2023-nnsvg-dlpfc | 12/12 / 12/12 |
| yun2026-lasv-elisa | 90/90 / 56/84 (1 error) |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-sonnet-5-5 | 54 | 6194 | 446 | 1188 | 252982 | 7332091 | 533 | 39 | 4 | 0 | 49 | 177 | 181 | 67 | 63 | 24 | 24 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-sonnet-5-5: $7.84 for 54 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alexandrov2019-metaspace | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |
| alexandrov2019-metaspace | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| alexandrov2019-metaspace | claude:claude-sonnet-5-5 | 3 | on | 0 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | claude:claude-sonnet-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 0 | 2 | 0 |
| bemis2015-cardinal | claude:claude-sonnet-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-sonnet-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| bemis2015-cardinal | claude:claude-sonnet-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-sonnet-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-sonnet-5-5 | 2 | on | 7 | 0 | 0 | 0 | 0 |
| chure2024-hplc-py | claude:claude-sonnet-5-5 | 3 | on | 8 | 0 | 0 | 0 | 0 |
| delaney2004-esol | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 1 | 2 | 0 |
| delaney2004-esol | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 1 | 1 | 0 |
| delaney2004-esol | claude:claude-sonnet-5-5 | 3 | on | 1 | 0 | 1 | 3 | 0 |
| gramfort2013-mne-sample | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 10 | 0 |
| gramfort2013-mne-sample | claude:claude-sonnet-5-5 | 2 | on | 6 | 0 | 0 | 11 | 0 |
| gramfort2013-mne-sample | claude:claude-sonnet-5-5 | 3 | on | 6 | 0 | 0 | 2 | 0 |
| jang2016-hcc-biomarkers | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| jang2016-hcc-biomarkers | claude:claude-sonnet-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| klindworth2013-16s-primers | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 0 | 3 | 0 |
| klindworth2013-16s-primers | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 0 | 3 | 0 |
| klindworth2013-16s-primers | claude:claude-sonnet-5-5 | 3 | on | 1 | 0 | 0 | 3 | 0 |
| lazear2023-sage | claude:claude-sonnet-5-5 | 1 | on | 5 | 0 | 0 | 1 | 0 |
| lazear2023-sage | claude:claude-sonnet-5-5 | 2 | on | 6 | 0 | 0 | 10 | 0 |
| lazear2023-sage | claude:claude-sonnet-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 1 | 1 | 0 |
| ljosa2012-bbbc005 | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 1 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 1 | 0 | 0 |
| makrai2023-colonies | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| makrai2023-colonies | claude:claude-sonnet-5-5 | 2 | on | 3 | 0 | 0 | 2 | 0 |
| makrai2023-colonies | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 0 | 1 | 0 |
| nair2024-plasmid-growth | claude:claude-sonnet-5-5 | 1 | on | 6 | 0 | 2 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-sonnet-5-5 | 2 | on | 6 | 0 | 2 | 0 | 0 |
| nair2024-plasmid-growth | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 2 | 0 | 0 |
| palmer2017-metaspace-fdr | claude:claude-sonnet-5-5 | 1 | on | 0 | 0 | 0 | 0 | 1 |
| palmer2017-metaspace-fdr | claude:claude-sonnet-5-5 | 2 | on | 0 | 0 | 0 | 0 | 1 |
| palmer2017-metaspace-fdr | claude:claude-sonnet-5-5 | 3 | on | 0 | 0 | 0 | 0 | 1 |
| rossi1980-recidivism | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-sonnet-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-sonnet-5-5 | 2 | on | 1 | 0 | 0 | 1 | 0 |
| schindelin2012-fiji-blobs | claude:claude-sonnet-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-sonnet-5-5 | 1 | on | 3 | 0 | 1 | 0 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-sonnet-5-5 | 2 | on | 3 | 0 | 0 | 2 | 0 |
| sriphoosanaphan2021-vitd-hcv | claude:claude-sonnet-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-sonnet-5-5 | 1 | on | 7 | 0 | 0 | 1 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-sonnet-5-5 | 2 | on | 7 | 0 | 0 | 0 | 0 |
| weber2023-nnsvg-dlpfc | claude:claude-sonnet-5-5 | 3 | on | 7 | 0 | 0 | 1 | 0 |
| yun2026-lasv-elisa | claude:claude-sonnet-5-5 | 1 | on | 2 | 0 | 1 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-sonnet-5-5 | 2 | on | 2 | 0 | 1 | 2 | 0 |
| yun2026-lasv-elisa | claude:claude-sonnet-5-5 | 3 | on | 2 | 0 | 1 | 0 | 0 |

## Details

### alexandrov2019-metaspace | claude:claude-sonnet-5-5 | run 1

Status: answer. 103 s. 13 requests, 17 tool calls (0 failed), 1 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-045914-e048. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/alexandrov2019-metaspace/run1/home/sessions/20261009-045914-e048/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/alexandrov2019-metaspace/run1/home/sessions/20261009-045914-e048/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 38) | pass 414 via tolerance (n14, claim check 143) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 29) | pass 263 via tolerance (n12, claim check 143) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n8 metrics.n_fdr_10, entry 45) | pass 191 via tolerance (n14, claim check 143) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 56) | pass 123 via tolerance (n10, claim check 143) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 38) | not asked |

### alexandrov2019-metaspace | claude:claude-sonnet-5-5 | run 2

Status: answer. 108 s. 13 requests, 21 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050058-0c7c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/alexandrov2019-metaspace/run2/home/sessions/20261009-050058-0c7c/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/alexandrov2019-metaspace/run2/home/sessions/20261009-050058-0c7c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 38) | pass 414 via tolerance (n17, claim check 157) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 29) | pass 263 via tolerance (n18, claim check 157) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n8 metrics.n_fdr_10, entry 45) | pass 191 via tolerance (n16, claim check 157) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 57) | pass 123 via tolerance (n10, claim check 157) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 38) | not asked |

### alexandrov2019-metaspace | claude:claude-sonnet-5-5 | run 3

Status: answer. 93 s. 10 requests, 16 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050247-586f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/alexandrov2019-metaspace/run3/home/sessions/20261009-050247-586f/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/alexandrov2019-metaspace/run3/home/sessions/20261009-050247-586f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n6 metrics.n_fdr_10, entry 44) | pass 414 via tolerance (n17, claim check 130) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n4 metrics.n_fdr_10, entry 35) | pass 263 via tolerance (n13, claim check 130) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n8 metrics.n_fdr_10, entry 51) | pass 191 via tolerance (n17, claim check 130) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n11 metrics.n_fdr_10, entry 65) | pass 123 via tolerance (n11, claim check 130) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n6 metrics.n_fdr_05, entry 44) | not asked |

### astapova2021-deseq2-kgn | claude:claude-sonnet-5-5 | run 1

Status: answer. 127 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050421-dfc7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261009-050421-dfc7/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261009-050421-dfc7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 47) | pass 173 via tolerance (n7, claim check 77) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 47) | pass 125 via tolerance (n7, claim check 77) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 47) | pass 48 via tolerance (n7, claim check 77) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 9) | not asked |

### astapova2021-deseq2-kgn | claude:claude-sonnet-5-5 | run 2

Status: answer. 123 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050628-dd70. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261009-050628-dd70/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261009-050628-dd70/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 47) | pass 173 via tolerance (n7, claim check 75) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 47) | pass 125 via tolerance (n7, claim check 75) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 47) | pass 48 via tolerance (n7, claim check 75) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 9) | not asked |

### astapova2021-deseq2-kgn | claude:claude-sonnet-5-5 | run 3

Status: answer. 123 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-050831-1865. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261009-050831-1865/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261009-050831-1865/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 47) | pass 173 via tolerance (n7, claim check 74) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 47) | pass 125 via tolerance (n7, claim check 74) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 47) | pass 48 via tolerance (n7, claim check 74) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 9) | not asked |

### bemis2015-cardinal | claude:claude-sonnet-5-5 | run 1

Status: answer. 175 s. 14 requests, 19 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051035-2649. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bemis2015-cardinal/run1/home/sessions/20261009-051035-2649/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bemis2015-cardinal/run1/home/sessions/20261009-051035-2649/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 16) | pass 4959 via tolerance (n5, claim check 180) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 16) | pass 10200 via tolerance (n1, claim check 180) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 59) | pass 687 via tolerance (n5, claim check 180) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 101) | pass 6 via tolerance (n13, claim check 180) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 101) | pass 3 via tolerance (n13, claim check 180) |

### bemis2015-cardinal | claude:claude-sonnet-5-5 | run 2

Status: answer. 132 s. 9 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051329-a0bb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bemis2015-cardinal/run2/home/sessions/20261009-051329-a0bb/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bemis2015-cardinal/run2/home/sessions/20261009-051329-a0bb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 16) | pass 4959 via tolerance (n5, claim check 124) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 16) | pass 10200 via tolerance (n1, claim check 124) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 42) | pass 687 via tolerance (n5, claim check 124) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 60) | pass 6 via tolerance (n13, claim check 124) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 60) | pass 3 via tolerance (n13, claim check 124) |

### bemis2015-cardinal | claude:claude-sonnet-5-5 | run 3

Status: answer. 178 s. 8 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051541-2a4c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bemis2015-cardinal/run3/home/sessions/20261009-051541-2a4c/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/bemis2015-cardinal/run3/home/sessions/20261009-051541-2a4c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra | 4959 exact | pass 4959 (n1 metrics.n_spectra, entry 16) | pass 4959 via tolerance (n5, claim check 118) |
| mz_values | 10200 exact | pass 10200 (n1 metrics.n_features, entry 16) | pass 10200 via tolerance (n1, claim check 118) |
| peaks | 687 ±10 | pass 687 (n5 metrics.n_peaks, entry 43) | pass 687 via tolerance (n5, claim check 118) |
| segments_s32 | 6 ±1 | pass 6 (n6 metrics.n_models, entry 60) | pass 6 via tolerance (n14, claim check 118) |
| segments_s64 | 3 ±1 | pass 3 (n6 metrics.n_segments_s64, entry 60) | pass 3 via tolerance (n14, claim check 118) |

### chure2024-hplc-py | claude:claude-sonnet-5-5 | run 1

Status: answer. 97 s. 9 requests, 14 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-051839-2978. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/chure2024-hplc-py/run1/home/sessions/20261009-051839-2978/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/chure2024-hplc-py/run1/home/sessions/20261009-051839-2978/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 28) | pass 6 via tolerance (n15, claim check 127) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 28) | pass 10.9 via tolerance (n7, claim check 127) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n7 metrics.area_1, entry 63) | pass 2805655 via tolerance (n7, claim check 127) |
| peak1_amplitude | 23000 ±500 | pass 22935 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 28) | pass 23380.46 via tolerance (n3, claim check 127) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n7 table.rows[0][4], entry 63) | pass 0.1588 via tolerance (n3, claim check 127) |
| peak1_skew | 0.7 ±0.01 | pass 0.7 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 28) | pass 0.6918 via tolerance (n3, claim check 127) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n7 metrics.retention_time_3, entry 63) | pass 14.45 via tolerance (n7, claim check 127) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n7 metrics.area_1, entry 63) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n15 metrics.slope, entry 102) | pass 156586.7 via tolerance (n15, claim check 127) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n15 metrics.intercept, entry 102) | pass 14624.94 via tolerance (n15, claim check 127) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n15 metrics.r_squared, entry 102) | pass 0.998868 via tolerance (n15, claim check 127) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n16 metrics.mean_concentration, entry 108) | pass 1.899 via tolerance (n16, claim check 127) |

### chure2024-hplc-py | claude:claude-sonnet-5-5 | run 2

Status: answer. 96 s. 10 requests, 16 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-052019-e7f4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/chure2024-hplc-py/run2/home/sessions/20261009-052019-e7f4/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/chure2024-hplc-py/run2/home/sessions/20261009-052019-e7f4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n2 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 31) | pass 6 via tolerance (n16, claim check 140) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n2 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 31) | pass 10.9 via tolerance (n7, claim check 140) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n7 metrics.area_1, entry 62) | pass 2805655 via tolerance (n3, claim check 140) |
| peak1_amplitude | 23000 ±500 | pass 22935 (n2 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 31) | pass 23380.46 via tolerance (n3, claim check 140) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n7 table.rows[0][4], entry 62) | pass 0.15876 via tolerance (n7, claim check 140) |
| peak1_skew | 0.7 ±0.01 | pass 0.7 (n2 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 31) | pass 0.6918 via tolerance (n3, claim check 140) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n7 metrics.retention_time_3, entry 62) | pass 14.45 via tolerance (n7, claim check 140) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n7 metrics.area_1, entry 62) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n16 metrics.slope, entry 107) | pass 156586.7 via tolerance (n16, claim check 140) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n16 metrics.intercept, entry 107) | pass 14624.94 via tolerance (n16, claim check 140) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n16 metrics.r_squared, entry 107) | pass 0.998868 via tolerance (n16, claim check 140) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n17 metrics.mean_concentration, entry 113) | pass 1.8994 via tolerance (n17, claim check 140) |

### chure2024-hplc-py | claude:claude-sonnet-5-5 | run 3

Status: answer. 88 s. 10 requests, 16 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-052157-4e65. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/chure2024-hplc-py/run3/home/sessions/20261009-052157-4e65/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/chure2024-hplc-py/run3/home/sessions/20261009-052157-4e65/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_peaks | 6 exact | pass 6 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 21) | pass 6 via tolerance (n16, claim check 137) |
| peak1_retention_time | 10.9 ±0.005 | pass 10.9 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 21) | pass 10.9 via tolerance (n7, claim check 137) |
| peak1_area | 2800000 ±50000 | pass 2805655 (n7 metrics.area_1, entry 56) | pass 2805655 via tolerance (n3, claim check 137) |
| peak1_amplitude | 23000 ±500 | pass 22935 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 21) | pass 23380.5 via tolerance (n7, claim check 137) |
| peak1_scale | 0.16 ±0.005 | pass 0.1587619 (n7 table.rows[0][4], entry 56) | pass 0.1588 via tolerance (n3, claim check 137) |
| peak1_skew | 0.7 ±0.01 | pass 0.7 (n1 file:/Volumes/T7/guided-analysis/data/chure2024-hplc-py/sample.txt, entry 21) | pass 0.692 via tolerance (n3, claim check 137) |
| peak3_retention_time | 14.45 ±0.005 | pass 14.45 (n7 metrics.retention_time_3, entry 56) | pass 14.45 via tolerance (n7, claim check 137) |
| peak1_area_exact | 2805655.43 ±300 | pass 2805655 (n7 metrics.area_1, entry 56) | not asked |
| calibration_slope | 156586.74 ±160 | pass 156586.7 (n16 metrics.slope, entry 105) | pass 156587 via tolerance (n16, claim check 137) |
| calibration_intercept | 14624.94 ±150 | pass 14624.94 (n16 metrics.intercept, entry 105) | pass 14624.9 via tolerance (n16, claim check 137) |
| calibration_r_squared | 0.99887 ±0.00005 | pass 0.9988679 (n16 metrics.r_squared, entry 105) | pass 0.998868 via tolerance (n16, claim check 137) |
| unknown_concentration | 1.8994 ±0.005 | pass 1.899415 (n17 metrics.mean_concentration, entry 111) | pass 1.899 via tolerance (n17, claim check 137) |

### delaney2004-esol | claude:claude-sonnet-5-5 | run 1

Status: answer. 50 s. 6 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-052329-d74d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/delaney2004-esol/run1/home/sessions/20261009-052329-d74d/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/delaney2004-esol/run1/home/sessions/20261009-052329-d74d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 19) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 39) | pass 1018 via tolerance (n3, claim check 72) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 39) | pass 12 via tolerance (n3, claim check 72) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 39) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 52) | pass 0.752 via tolerance (n4, claim check 72) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 52) | pass 1.1 via tolerance (n4, claim check 72) |

### delaney2004-esol | claude:claude-sonnet-5-5 | run 2

Status: answer. 52 s. 6 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-052419-d013. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/delaney2004-esol/run2/home/sessions/20261009-052419-d013/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/delaney2004-esol/run2/home/sessions/20261009-052419-d013/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 19) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 40) | pass 1018 via tolerance (n3, claim check 75) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 40) | pass 12 via tolerance (n3, claim check 75) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 40) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 53) | pass 0.752 via tolerance (n4, claim check 75) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 53) | pass 1.1 via tolerance (n4, claim check 75) |

### delaney2004-esol | claude:claude-sonnet-5-5 | run 3

Status: answer. 41 s. 6 requests, 7 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-052512-b64f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/delaney2004-esol/run3/home/sessions/20261009-052512-b64f/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/delaney2004-esol/run3/home/sessions/20261009-052512-b64f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| molecules_parsed | 1128 exact | pass 1128 (n1 metrics.n_read, entry 19) | not asked |
| zero_violations | 1018 ±5 | pass 1018 (n3 metrics.n_zero_violations, entry 40) | pass 1018 via tolerance (n3, claim check 76) |
| two_or_more_violations | 12 ±3 | pass 12 (n3 metrics.n_two_or_more_violations, entry 40) | pass 12 via tolerance (n3, claim check 76) |
| logp_above_5 | 97 ±5 | pass 97 (n3 metrics.n_logp_over_5, entry 40) | not asked |
| esol_r2 | 0.752 ±0.03 | pass 0.7519385 (n4 metrics.all_r_squared_correlation, entry 53) | pass 0.7519 via tolerance (n4, claim check 76) |
| esol_rmse | 1.1 ±0.1 | pass 1.099372 (n4 metrics.all_rmse, entry 53) | pass 1.099 via tolerance (n4, claim check 76) |

### gramfort2013-mne-sample | claude:claude-sonnet-5-5 | run 1

Status: answer. 100 s. 14 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 10 unsourced.
Session: 20261009-052553-28d7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gramfort2013-mne-sample/run1/home/sessions/20261009-052553-28d7/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 10 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gramfort2013-mne-sample/run1/home/sessions/20261009-052553-28d7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 17) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 17) | pass 72 via tolerance (n2, claim check 179) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 17) | pass 73 via tolerance (n9, claim check 179) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 17) | pass 73 via tolerance (n9, claim check 179) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 17) | pass 70 via tolerance (n9, claim check 179) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 17) | pass 15 via tolerance (n2, claim check 179) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 17) | pass 16 via tolerance (n9, claim check 179) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 93) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 93) | pass 309 via tolerance (n9, claim check 179) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 93) | pass 68 via tolerance (n14, claim check 179) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n18 metrics.gfp_latency_s, entry 145) | pass 0.093 via tolerance (n18, claim check 179) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n18 metrics.gfp_amplitude, entry 145) | pass 42.07 via tolerance (n18, claim check 179) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n18 metrics.peak_latency_s, entry 145) | pass 0.087 via tolerance (n18, claim check 179) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n18 metrics.peak_amplitude, entry 145) | pass 198.8 via tolerance (n18, claim check 179) |

### gramfort2013-mne-sample | claude:claude-sonnet-5-5 | run 2

Status: answer. 79 s. 12 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 11 unsourced.
Session: 20261009-052734-ed5a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gramfort2013-mne-sample/run2/home/sessions/20261009-052734-ed5a/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 11 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gramfort2013-mne-sample/run2/home/sessions/20261009-052734-ed5a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 22) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 22) | pass 72 via tolerance (n2, claim check 163) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 22) | pass 73 via tolerance (n9, claim check 163) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 22) | pass 73 via tolerance (n9, claim check 163) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 22) | pass 70 via tolerance (n9, claim check 163) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 22) | pass 15 via tolerance (n2, claim check 163) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 22) | pass 16 via tolerance (n9, claim check 163) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 92) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 92) | pass 309 via tolerance (n9, claim check 163) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 92) | pass 68 via tolerance (n13, claim check 163) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n17 metrics.gfp_latency_s, entry 136) | pass 0.093 via tolerance (n17, claim check 163) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n17 metrics.gfp_amplitude, entry 136) | pass 42.07 via tolerance (n17, claim check 163) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n17 metrics.peak_latency_s, entry 136) | pass 0.087 via tolerance (n17, claim check 163) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n17 metrics.peak_amplitude, entry 136) | pass 198.8 via tolerance (n17, claim check 163) |

### gramfort2013-mne-sample | claude:claude-sonnet-5-5 | run 3

Status: answer. 108 s. 14 requests, 20 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-052854-dbd8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gramfort2013-mne-sample/run3/home/sessions/20261009-052854-dbd8/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/gramfort2013-mne-sample/run3/home/sessions/20261009-052854-dbd8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 22) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 22) | pass 72 via tolerance (n2, claim check 205) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 22) | pass 73 via tolerance (n15, claim check 205) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 22) | pass 73 via tolerance (n15, claim check 205) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 22) | pass 70 via tolerance (n15, claim check 205) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 22) | pass 15 via tolerance (n2, claim check 205) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 22) | pass 16 via tolerance (n15, claim check 205) |
| epochs_dropped | 10 exact | pass 10 (n11 metrics.n_dropped, entry 103) | not asked |
| epochs_kept | 309 exact | pass 309 (n11 metrics.n_epochs, entry 103) | pass 309 via tolerance (n16, claim check 205) |
| auditory_left_kept | 68 exact | pass 68 (n11 metrics.count_auditory_left, entry 103) | pass 68 via tolerance (n21, claim check 205) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n25 metrics.gfp_latency_s, entry 175) | pass 0.093 via tolerance (n25, claim check 205) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n25 metrics.gfp_amplitude, entry 175) | pass 42.07 via tolerance (n25, claim check 205) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n25 metrics.peak_latency_s, entry 175) | pass 0.087 via tolerance (n25, claim check 205) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n25 metrics.peak_amplitude, entry 175) | pass 198.8 via tolerance (n25, claim check 205) |

### jang2016-hcc-biomarkers | claude:claude-sonnet-5-5 | run 1

Status: answer. 52 s. 5 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-053044-1564. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261009-053044-1564/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/jang2016-hcc-biomarkers/run1/home/sessions/20261009-053044-1564/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 11) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 11) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 30) | pass 0.7856 via tolerance (n2, claim check 78) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 30) | pass 0.7404 via tolerance (n2, claim check 78) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 30) | pass 0.8309 via tolerance (n2, claim check 78) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 33) | pass 0.7294 via tolerance (n3, claim check 78) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 33) | pass 0.6799 via tolerance (n3, claim check 78) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 33) | pass 0.7789 via tolerance (n3, claim check 78) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 36) | pass 0.6596 via tolerance (n4, claim check 78) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 36) | pass 0.6061 via tolerance (n4, claim check 78) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 36) | pass 0.7131 via tolerance (n4, claim check 78) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 39) | pass 0.665 via tolerance (n5, claim check 78) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 39) | pass 0.612 via tolerance (n5, claim check 78) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 39) | pass 0.718 via tolerance (n5, claim check 78) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 50) | pass 0.6202 via tolerance (n6, claim check 78) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 50) | pass 0.9016 via tolerance (n6, claim check 78) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 53) | pass 0.5096 via tolerance (n7, claim check 78) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 53) | pass 0.9119 via tolerance (n7, claim check 78) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 56) | pass 0.4615 via tolerance (n8, claim check 78) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 56) | pass 0.8031 via tolerance (n8, claim check 78) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 59) | pass 0.5 via tolerance (n9, claim check 78) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 59) | pass 0.8083 via tolerance (n9, claim check 78) |

### jang2016-hcc-biomarkers | claude:claude-sonnet-5-5 | run 2

Status: answer. 54 s. 5 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-053137-dd97. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261009-053137-dd97/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/jang2016-hcc-biomarkers/run2/home/sessions/20261009-053137-dd97/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 11) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 11) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 30) | pass 0.7856 via tolerance (n2, claim check 77) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 30) | pass 0.7404 via tolerance (n2, claim check 77) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 30) | pass 0.8309 via tolerance (n2, claim check 77) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 33) | pass 0.7294 via tolerance (n3, claim check 77) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 33) | pass 0.6799 via tolerance (n3, claim check 77) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 33) | pass 0.7789 via tolerance (n3, claim check 77) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 36) | pass 0.6596 via tolerance (n4, claim check 77) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 36) | pass 0.6061 via tolerance (n4, claim check 77) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 36) | pass 0.7131 via tolerance (n4, claim check 77) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 39) | pass 0.665 via tolerance (n5, claim check 77) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 39) | pass 0.612 via tolerance (n5, claim check 77) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 39) | pass 0.718 via tolerance (n5, claim check 77) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 50) | pass 0.6202 via tolerance (n6, claim check 77) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 50) | pass 0.9016 via tolerance (n6, claim check 77) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 53) | pass 0.5096 via tolerance (n7, claim check 77) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 53) | pass 0.9119 via tolerance (n7, claim check 77) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 56) | pass 0.4615 via tolerance (n8, claim check 77) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 56) | pass 0.8031 via tolerance (n8, claim check 77) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 59) | pass 0.5 via tolerance (n9, claim check 77) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 59) | pass 0.8083 via tolerance (n9, claim check 77) |

### jang2016-hcc-biomarkers | claude:claude-sonnet-5-5 | run 3

Status: answer. 62 s. 5 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-053231-5451. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261009-053231-5451/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/jang2016-hcc-biomarkers/run3/home/sessions/20261009-053231-5451/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_hcc | 208 exact | pass 208 (n1 data.binary_columns.HCC_studyGr.1, entry 11) | not asked |
| n_cirrhosis | 193 exact | pass 193 (n1 data.binary_columns.HCC_studyGr.0, entry 11) | not asked |
| auc_afp | 0.7856 ±0.001 | pass 0.7856342 (n2 metrics.auc, entry 29) | pass 0.7856 via tolerance (n2, claim check 79) |
| auc_afp_lo | 0.7404 ±0.001 | pass 0.7403953 (n2 metrics.auc_ci_lo, entry 29) | pass 0.7404 via tolerance (n2, claim check 79) |
| auc_afp_hi | 0.8309 ±0.001 | pass 0.8308731 (n2 metrics.auc_ci_hi, entry 29) | pass 0.8309 via tolerance (n2, claim check 79) |
| auc_pivka | 0.7294 ±0.001 | pass 0.7293867 (n3 metrics.auc, entry 32) | pass 0.7294 via tolerance (n3, claim check 79) |
| auc_pivka_lo | 0.6799 ±0.001 | pass 0.6798585 (n3 metrics.auc_ci_lo, entry 32) | pass 0.6799 via tolerance (n3, claim check 79) |
| auc_pivka_hi | 0.7789 ±0.001 | pass 0.778915 (n3 metrics.auc_ci_hi, entry 32) | pass 0.7789 via tolerance (n3, claim check 79) |
| auc_opn | 0.6596 ±0.001 | pass 0.6596004 (n4 metrics.auc, entry 35) | pass 0.6596 via tolerance (n4, claim check 79) |
| auc_opn_lo | 0.6061 ±0.001 | pass 0.6061004 (n4 metrics.auc_ci_lo, entry 35) | pass 0.6061 via tolerance (n4, claim check 79) |
| auc_opn_hi | 0.7131 ±0.001 | pass 0.7131004 (n4 metrics.auc_ci_hi, entry 35) | pass 0.7131 via tolerance (n4, claim check 79) |
| auc_dkk | 0.665 ±0.001 | pass 0.6649811 (n5 metrics.auc, entry 38) | pass 0.665 via tolerance (n5, claim check 79) |
| auc_dkk_lo | 0.612 ±0.001 | pass 0.6120051 (n5 metrics.auc_ci_lo, entry 38) | pass 0.612 via tolerance (n5, claim check 79) |
| auc_dkk_hi | 0.718 ±0.001 | pass 0.7179571 (n5 metrics.auc_ci_hi, entry 38) | pass 0.718 via tolerance (n5, claim check 79) |
| sens_afp | 0.6202 ±0.001 | pass 0.6201923 (n6 metrics.sensitivity, entry 49) | pass 0.6202 via tolerance (n6, claim check 79) |
| spec_afp | 0.9016 ±0.001 | pass 0.9015544 (n6 metrics.specificity, entry 49) | pass 0.9016 via tolerance (n6, claim check 79) |
| sens_pivka | 0.5096 ±0.001 | pass 0.5096154 (n7 metrics.sensitivity, entry 52) | pass 0.5096 via tolerance (n7, claim check 79) |
| spec_pivka | 0.9119 ±0.001 | pass 0.9119171 (n7 metrics.specificity, entry 52) | pass 0.9119 via tolerance (n7, claim check 79) |
| sens_opn | 0.4615 ±0.001 | pass 0.4615385 (n8 metrics.sensitivity, entry 55) | pass 0.4615 via tolerance (n8, claim check 79) |
| spec_opn | 0.8031 ±0.001 | pass 0.8031088 (n8 metrics.specificity, entry 55) | pass 0.8031 via tolerance (n8, claim check 79) |
| sens_dkk | 0.5 ±0.001 | pass 0.5 (n9 metrics.sensitivity, entry 58) | pass 0.5 via tolerance (n9, claim check 79) |
| spec_dkk | 0.8083 ±0.001 | pass 0.8082902 (n9 metrics.specificity, entry 58) | pass 0.8083 via tolerance (n9, claim check 79) |

### klindworth2013-16s-primers | claude:claude-sonnet-5-5 | run 1

Status: answer. 52 s. 5 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-053333-8fa2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/klindworth2013-16s-primers/run1/home/sessions/20261009-053333-8fa2/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/klindworth2013-16s-primers/run1/home/sessions/20261009-053333-8fa2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 83) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 32) | pass 1608 via tolerance (n4, claim check 83) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 32) | pass 2072 via tolerance (n4, claim check 83) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 32) | pass 465 via tolerance (n4, claim check 83) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_fwd_pos, entry 64) | pass 341 via tolerance (n7, claim check 83) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 83) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 35) | pass 1275 via tolerance (n5, claim check 83) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 35) | pass 2193 via tolerance (n5, claim check 83) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 35) | pass 919 via tolerance (n5, claim check 83) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_fwd_pos, entry 64) | pass 8 via tolerance (n7, claim check 83) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 57) | pass 61.39 via tolerance (n6, claim check 83) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 32) | not asked |

### klindworth2013-16s-primers | claude:claude-sonnet-5-5 | run 2

Status: answer. 54 s. 4 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-053426-fbec. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/klindworth2013-16s-primers/run2/home/sessions/20261009-053426-fbec/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/klindworth2013-16s-primers/run2/home/sessions/20261009-053426-fbec/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 82) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 28) | pass 1608 via tolerance (n4, claim check 82) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 28) | pass 2072 via tolerance (n4, claim check 82) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 28) | pass 465 via tolerance (n7, claim check 82) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_fwd_gene_pos, entry 60) | pass 341 via tolerance (n7, claim check 82) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 82) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 31) | pass 1275 via tolerance (n5, claim check 82) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 31) | pass 2193 via tolerance (n5, claim check 82) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 31) | pass 919 via tolerance (n7, claim check 82) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_fwd_gene_pos, entry 60) | pass 8 via tolerance (n7, claim check 82) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 53) | pass 61.39 via tolerance (n6, claim check 82) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 28) | not asked |

### klindworth2013-16s-primers | claude:claude-sonnet-5-5 | run 3

Status: answer. 53 s. 4 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261009-053520-a9de. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/klindworth2013-16s-primers/run3/home/sessions/20261009-053520-a9de/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/klindworth2013-16s-primers/run3/home/sessions/20261009-053520-a9de/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 79) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 28) | pass 1608 via tolerance (n4, claim check 79) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 28) | pass 2072 via tolerance (n4, claim check 79) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 28) | pass 465 via tolerance (n4, claim check 79) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_fwd_gene_pos, entry 60) | pass 341 via tolerance (n7, claim check 79) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 79) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 31) | pass 1275 via tolerance (n5, claim check 79) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 31) | pass 2193 via tolerance (n5, claim check 79) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 31) | pass 919 via tolerance (n5, claim check 79) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_fwd_gene_pos, entry 60) | pass 8 via tolerance (n7, claim check 79) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 53) | pass 61.39 via tolerance (n6, claim check 79) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 28) | not asked |

### lazear2023-sage | claude:claude-sonnet-5-5 | run 1

Status: answer. 60 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-053613-f4db. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lazear2023-sage/run1/home/sessions/20261009-053613-f4db/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lazear2023-sage/run1/home/sessions/20261009-053613-f4db/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 18) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 18) | not asked |
| target_psms_fdr1 | 207 exact | FAIL 206 (n2 metrics.n_psm_pass, entry 26) | FAIL 206 (n5, claim check 72) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 26) | pass 47 via tolerance (n5, claim check 72) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 26) | not asked |
| target_psms_fdr5 | 242 exact | FAIL 244 (n5 stdout, entry 42) | FAIL 244 (n5, claim check 72) |

### lazear2023-sage | claude:claude-sonnet-5-5 | run 2

Status: answer. 79 s. 9 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 10 unsourced.
Session: 20261009-053714-9953. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lazear2023-sage/run2/home/sessions/20261009-053714-9953/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 10 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lazear2023-sage/run2/home/sessions/20261009-053714-9953/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 18) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 18) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n7 metrics.total_pass_1pct, entry 70) | pass 207 via tolerance (n7, claim check 86) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 25) | pass 47 via tolerance (n6, claim check 86) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 25) | not asked |
| target_psms_fdr5 | 242 exact | FAIL 244 (n6 stdout, entry 49) | FAIL 244 (n6, claim check 86) |

### lazear2023-sage | claude:claude-sonnet-5-5 | run 3

Status: answer. 63 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-053832-99a4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lazear2023-sage/run3/home/sessions/20261009-053832-99a4/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/lazear2023-sage/run3/home/sessions/20261009-053832-99a4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 18) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 18) | not asked |
| target_psms_fdr1 | 207 exact | FAIL 206 (n2 metrics.n_psm_pass, entry 26) | FAIL 206 (n5, claim check 81) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 26) | pass 47 via tolerance (n5, claim check 81) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 26) | not asked |
| target_psms_fdr5 | 242 exact | FAIL 244 (n5 stdout, entry 42) | FAIL 244 (n5, claim check 81) |

### ljosa2012-bbbc005 | claude:claude-sonnet-5-5 | run 1

Status: answer. 725 s. 7 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-053936-dd10. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/ljosa2012-bbbc005/run1/home/sessions/20261009-053936-dd10/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/ljosa2012-bbbc005/run1/home/sessions/20261009-053936-dd10/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n18 metrics.otsu, entry 105) | pass 0.94 via tolerance (n11, claim check 132) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n11 metrics.mean_abs_error, entry 74) | pass 3.01 via tolerance (n11, claim check 132) |
| true_total_sample | 5007 exact | pass 5007 (n11 metrics.true_total, entry 74) | not asked |

### ljosa2012-bbbc005 | claude:claude-sonnet-5-5 | run 2

Status: answer. 559 s. 7 requests, 9 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-055210-4cf8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/ljosa2012-bbbc005/run2/home/sessions/20261009-055210-4cf8/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/ljosa2012-bbbc005/run2/home/sessions/20261009-055210-4cf8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n19 metrics.shape, entry 109) | pass 0.9399 via tolerance (n11, claim check 133) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.192463 (n18 stdout, entry 101) | pass 3.01 via tolerance (n11, claim check 133) |
| true_total_sample | 5007 exact | pass 5007 (n11 metrics.true_total, entry 74) | not asked |

### ljosa2012-bbbc005 | claude:claude-sonnet-5-5 | run 3

Status: answer. 604 s. 7 requests, 8 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-060134-a9e4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/ljosa2012-bbbc005/run3/home/sessions/20261009-060134-a9e4/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/ljosa2012-bbbc005/run3/home/sessions/20261009-060134-a9e4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9399 (n11 metrics.detected_to_true_ratio, entry 74) | pass 0.9399 via tolerance (n11, claim check 129) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n11 metrics.mean_abs_error, entry 74) | pass 3.01 via tolerance (n11, claim check 129) |
| true_total_sample | 5007 exact | pass 5007 (n11 metrics.true_total, entry 74) | not asked |

### makrai2023-colonies | claude:claude-sonnet-5-5 | run 1

Status: answer. 227 s. 12 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-061142-a600. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/makrai2023-colonies/run1/home/sessions/20261009-061142-a600/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/makrai2023-colonies/run1/home/sessions/20261009-061142-a600/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 68) | not asked |
| total_colonies | 88 ±9 | pass 88 (n7 metrics.total_colonies, entry 76) | pass 88 via tolerance (n12, claim check 134) |

### makrai2023-colonies | claude:claude-sonnet-5-5 | run 2

Status: answer. 200 s. 8 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-061529-021b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/makrai2023-colonies/run2/home/sessions/20261009-061529-021b/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/makrai2023-colonies/run2/home/sessions/20261009-061529-021b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 58) | not asked |
| total_colonies | 88 ±9 | pass 88 (n7 metrics.total_colonies, entry 66) | pass 88 via tolerance (n11, claim check 113) |

### makrai2023-colonies | claude:claude-sonnet-5-5 | run 3

Status: answer. 118 s. 9 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-061850-bf1b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/makrai2023-colonies/run3/home/sessions/20261009-061850-bf1b/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/makrai2023-colonies/run3/home/sessions/20261009-061850-bf1b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| images | 6 exact | pass 6 (n6 table.rows[5][0], entry 63) | not asked |
| total_colonies | 88 ±9 | pass 88 (n8 metrics.total_colonies, entry 74) | pass 88 via tolerance (n8, claim check 118) |

### nair2024-plasmid-growth | claude:claude-sonnet-5-5 | run 1

Status: answer. 83 s. 10 requests, 11 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062048-082a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/nair2024-plasmid-growth/run1/home/sessions/20261009-062048-082a/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/nair2024-plasmid-growth/run1/home/sessions/20261009-062048-082a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 55) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 55) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 55) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_DA49828_P1, entry 86) | pass 1.005 via tolerance (n4, claim check 118) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_DA49828_P2, entry 86) | pass 1.028 via tolerance (n4, claim check 118) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_DA49828_P3, entry 86) | pass 1.033 via tolerance (n4, claim check 118) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_DA49828_P4, entry 86) | pass 0.9657 via tolerance (n4, claim check 118) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_DA49828_P5, entry 86) | pass 1.072 via tolerance (n4, claim check 118) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_DA49828_P6, entry 86) | pass 1.008 via tolerance (n4, claim check 118) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_DA49828_P7, entry 86) | pass 0.9612 via tolerance (n4, claim check 118) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_DA49828_P8, entry 86) | pass 0.9754 via tolerance (n4, claim check 118) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_DA49828_P9, entry 86) | pass 1.043 via tolerance (n4, claim check 118) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_DA49828_P10, entry 86) | pass 0.9902 via tolerance (n4, claim check 118) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_DA49828_P11, entry 86) | pass 0.9466 via tolerance (n4, claim check 118) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_DA49828_P14, entry 86) | pass 1.082 via tolerance (n4, claim check 118) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][9], entry 86) | pass 0.7424 via tolerance (n4, claim check 118) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][10], entry 86) | pass 1.151 via tolerance (n4, claim check 118) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_DA49828_P5, entry 86) | pass 0.2432 via tolerance (n4, claim check 118) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_DA49828_P11, entry 86) | pass 0.5076 via tolerance (n4, claim check 118) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n4 metrics.rel_mean_by_DA49828, entry 86) | pass 1.009 via tolerance (n4, claim check 118) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_DA49828_Host, entry 86) | differs 0.9902 (n4, claim check 118) |

### nair2024-plasmid-growth | claude:claude-sonnet-5-5 | run 2

Status: answer. 64 s. 9 requests, 10 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062211-a039. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/nair2024-plasmid-growth/run2/home/sessions/20261009-062211-a039/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/nair2024-plasmid-growth/run2/home/sessions/20261009-062211-a039/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 55) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 55) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 55) | not asked |
| rel_p1 | 1.005299 ±0.0005 | pass 1.005299 (n4 metrics.rel_mean_DA49828_P1, entry 85) | pass 1.005 via tolerance (n4, claim check 106) |
| rel_p2 | 1.027756 ±0.0005 | pass 1.027756 (n4 metrics.rel_mean_DA49828_P2, entry 85) | pass 1.028 via tolerance (n4, claim check 106) |
| rel_p3 | 1.032948 ±0.0005 | pass 1.032948 (n4 metrics.rel_mean_DA49828_P3, entry 85) | pass 1.033 via tolerance (n4, claim check 106) |
| rel_p4 | 0.965689 ±0.0005 | pass 0.9656891 (n4 metrics.rel_mean_DA49828_P4, entry 85) | pass 0.966 via tolerance (n4, claim check 106) |
| rel_p5 | 1.072459 ±0.0005 | pass 1.072459 (n4 metrics.rel_mean_DA49828_P5, entry 85) | pass 1.072 via tolerance (n4, claim check 106) |
| rel_p6 | 1.008294 ±0.0005 | pass 1.008294 (n4 metrics.rel_mean_DA49828_P6, entry 85) | pass 1.008 via tolerance (n4, claim check 106) |
| rel_p7 | 0.961198 ±0.0005 | pass 0.9611976 (n4 metrics.rel_mean_DA49828_P7, entry 85) | pass 0.961 via tolerance (n4, claim check 106) |
| rel_p8 | 0.97545 ±0.0005 | pass 0.9754496 (n4 metrics.rel_mean_DA49828_P8, entry 85) | pass 0.975 via tolerance (n4, claim check 106) |
| rel_p9 | 1.042573 ±0.0005 | pass 1.042573 (n4 metrics.rel_mean_DA49828_P9, entry 85) | pass 1.043 via tolerance (n4, claim check 106) |
| rel_p10 | 0.990162 ±0.0005 | pass 0.9901624 (n4 metrics.rel_mean_DA49828_P10, entry 85) | pass 0.99 via tolerance (n4, claim check 106) |
| rel_p11 | 0.946554 ±0.0005 | pass 0.9465535 (n4 metrics.rel_mean_DA49828_P11, entry 85) | pass 0.947 via tolerance (n4, claim check 106) |
| rel_p14 | 1.082055 ±0.0005 | pass 1.082055 (n4 metrics.rel_mean_DA49828_P14, entry 85) | pass 1.082 via tolerance (n4, claim check 106) |
| ci_low_p11 | 0.742365 ±0.0005 | pass 0.7423649 (n4 table.rows[11][9], entry 85) | pass 0.742 via tolerance (n4, claim check 106) |
| ci_high_p11 | 1.150742 ±0.0005 | pass 1.150742 (n4 table.rows[11][10], entry 85) | pass 1.151 via tolerance (n4, claim check 106) |
| p_p5 | 0.243208 ±0.0005 | pass 0.2432082 (n4 metrics.p_DA49828_P5, entry 85) | pass 0.243 via tolerance (n4, claim check 106) |
| p_p11 | 0.507637 ±0.0005 | pass 0.5076367 (n4 metrics.p_DA49828_P11, entry 85) | pass 0.508 via tolerance (n4, claim check 106) |
| mean_of_means | 1.009203 ±0.0005 | pass 1.009203 (n4 metrics.rel_mean_by_DA49828, entry 85) | pass 1.009 via tolerance (n4, claim check 106) |
| mean_printed (reference) | 0.996 ±0.0005 | differs 1 (n4 metrics.rel_mean_DA49828_Host, entry 85) | differs 0.99 (n4, claim check 106) |

### nair2024-plasmid-growth | claude:claude-sonnet-5-5 | run 3

Status: error (Cannot reach the Claude API. Check the network.). 12 s. 3 requests, 6 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062315-5352. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/nair2024-plasmid-growth/run3/home/sessions/20261009-062315-5352/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 2 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/nair2024-plasmid-growth/run3/home/sessions/20261009-062315-5352/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_wells | 70 exact | pass 70 (n3 metrics.n_wells, entry 55) | not asked |
| r_w01 | 0.371065 ±0.000005 | pass 0.3710652 (n3 metrics.r_W01, entry 55) | not asked |
| r_w24 | 0.479446 ±0.000005 | pass 0.4794457 (n3 metrics.r_W24, entry 55) | not asked |
| rel_p1 | 1.005299 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 55) | FAIL - |
| rel_p2 | 1.027756 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 55) | FAIL - |
| rel_p3 | 1.032948 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 55) | FAIL - |
| rel_p4 | 0.965689 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 55) | FAIL - |
| rel_p5 | 1.072459 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 55) | FAIL - |
| rel_p6 | 1.008294 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 55) | FAIL - |
| rel_p7 | 0.961198 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 55) | FAIL - |
| rel_p8 | 0.97545 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 55) | FAIL - |
| rel_p9 | 1.042573 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 55) | FAIL - |
| rel_p10 | 0.990162 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 55) | FAIL - |
| rel_p11 | 0.946554 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 55) | FAIL - |
| rel_p14 | 1.082055 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 55) | FAIL - |
| ci_low_p11 | 0.742365 ±0.0005 | FAIL 0.5683573 (n3 metrics.k_W01, entry 55) | FAIL - |
| ci_high_p11 | 1.150742 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 55) | FAIL - |
| p_p5 | 0.243208 ±0.0005 | FAIL 0.2881358 (n3 metrics.r_W36, entry 55) | FAIL - |
| p_p11 | 0.507637 ±0.0005 | pass 0.5074041 (n3 metrics.k_W45, entry 55) | FAIL - |
| mean_of_means | 1.009203 ±0.0005 | FAIL 1.445726 (n3 metrics.t_gen_W24, entry 55) | FAIL - |
| mean_printed (reference) | 0.996 ±0.0005 | differs 0.5683573 (n3 metrics.k_W01, entry 55) | differs - |

### palmer2017-metaspace-fdr | claude:claude-sonnet-5-5 | run 1

Status: answer. 103 s. 15 requests, 18 tool calls (5 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062327-320d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261009-062327-320d/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261009-062327-320d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs 30 (n9, claim check 143) |
| unique_formulas_three_sections (reference) | 66 exact | differs 61 (n2 metrics.n_databases, entry 18) | not asked |
| total_formulas (reference) | 103 ±20 | differs 61 (n2 metrics.n_databases, entry 18) | not asked |

### palmer2017-metaspace-fdr | claude:claude-sonnet-5-5 | run 2

Status: answer. 81 s. 12 requests, 17 tool calls (4 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062511-12d9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261009-062511-12d9/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261009-062511-12d9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs 30 (n8, claim check 141) |
| unique_formulas_three_sections (reference) | 66 exact | differs 61 (n1 metrics.n_databases, entry 13) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n9 metrics.n_found, entry 114) | not asked |

### palmer2017-metaspace-fdr | claude:claude-sonnet-5-5 | run 3

Status: answer. 72 s. 13 requests, 17 tool calls (5 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062632-9aef. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261009-062632-9aef/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 1 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261009-062632-9aef/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs 36 (n1, claim check 128) |
| unique_formulas_three_sections (reference) | 66 exact | differs 36 (n1 metrics.n_found, entry 15) | not asked |
| total_formulas (reference) | 103 ±20 | differs 36 (n1 metrics.n_found, entry 15) | not asked |

### rossi1980-recidivism | claude:claude-sonnet-5-5 | run 1

Status: answer. 45 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062744-0bf4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rossi1980-recidivism/run1/home/sessions/20261009-062744-0bf4/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rossi1980-recidivism/run1/home/sessions/20261009-062744-0bf4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 11) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 24) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 40) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 40) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 40) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n3 metrics.hr_fin, entry 40) | pass 0.684 via tolerance (n3, claim check 71) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 40) | pass 0.0474 via tolerance (n3, claim check 71) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 40) | pass 0.64 via tolerance (n3, claim check 71) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 24) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 24) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 40) | pass 0.000714 via tolerance (n3, claim check 71) |

### rossi1980-recidivism | claude:claude-sonnet-5-5 | run 2

Status: answer. 42 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062829-33b4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rossi1980-recidivism/run2/home/sessions/20261009-062829-33b4/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rossi1980-recidivism/run2/home/sessions/20261009-062829-33b4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 11) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 37) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n2 metrics.coef_fin, entry 37) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n2 metrics.coef_age, entry 37) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n2 metrics.coef_prio, entry 37) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n2 metrics.hr_fin, entry 37) | pass 0.684 via tolerance (n2, claim check 55) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n2 metrics.p_fin, entry 37) | pass 0.0474 via tolerance (n2, claim check 55) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n2 metrics.concordance, entry 37) | pass 0.6403 via tolerance (n2, claim check 55) |
| logrank_chi2_fin | 3.838 ±0.01 | FAIL 2.503162 (n2 table.rows[2][6], entry 37) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05 (n2 data.data.alpha, entry 37) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n2 metrics.ph_test_min_p, entry 37) | pass 0.000714 via tolerance (n2, claim check 55) |

### rossi1980-recidivism | claude:claude-sonnet-5-5 | run 3

Status: answer. 33 s. 6 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062911-3779. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rossi1980-recidivism/run3/home/sessions/20261009-062911-3779/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/rossi1980-recidivism/run3/home/sessions/20261009-062911-3779/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 11) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 24) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 40) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 40) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 40) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n3 metrics.hr_fin, entry 40) | pass 0.684 via tolerance (n3, claim check 62) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n3 metrics.p_fin, entry 40) | pass 0.0474 via tolerance (n3, claim check 62) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n3 metrics.concordance, entry 40) | pass 0.64 via tolerance (n3, claim check 62) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 24) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05011612 (n2 metrics.logrank_p, entry 24) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 40) | pass 0.000714 via tolerance (n3, claim check 62) |

### schindelin2012-fiji-blobs | claude:claude-sonnet-5-5 | run 1

Status: answer. 62 s. 8 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-062944-c164. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261009-062944-c164/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261009-062944-c164/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 52) | pass 64 via tolerance (n17, claim check 116) |

### schindelin2012-fiji-blobs | claude:claude-sonnet-5-5 | run 2

Status: answer. 43 s. 9 requests, 8 tool calls (0 failed), 1 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-063046-af7c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261009-063046-af7c/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261009-063046-af7c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 45) | pass 64 via tolerance (n19, claim check 122) |

### schindelin2012-fiji-blobs | claude:claude-sonnet-5-5 | run 3

Status: answer. 45 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063130-f69c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261009-063130-f69c/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261009-063130-f69c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 45) | pass 64 via tolerance (n10, claim check 97) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-sonnet-5-5 | run 1

Status: answer. 58 s. 9 requests, 13 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063215-ca79. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-063215-ca79/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-063215-ca79/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-vitd-hcv/run1/home/sessions/20261009-063215-ca79/work/inspect_table-1/columns.csv, entry 9) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 40) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 40) | pass 23.09 via tolerance (n2, claim check 101) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 40) | pass 19.73 via tolerance (n2, claim check 101) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 40) | pass 26.44 via tolerance (n2, claim check 101) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 43) | pass -0.55 via tolerance (n3, claim check 101) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 43) | pass -2.84 via tolerance (n3, claim check 101) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 43) | pass 1.73 via tolerance (n3, claim check 101) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 43) | pass 0.63 via tolerance (n7, claim check 101) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 50) | pass -5.51 via tolerance (n4, claim check 101) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 50) | pass -26.36 via tolerance (n4, claim check 101) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 50) | pass 15.34 via tolerance (n4, claim check 101) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 50) | pass 0.6 via tolerance (n7, claim check 101) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 53) | pass 122.92 via tolerance (n5, claim check 101) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n5 metrics.ci_lo, entry 53) | pass -68.96 via tolerance (n5, claim check 101) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 53) | pass 314.81 via tolerance (n5, claim check 101) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 53) | pass 0.206 via tolerance (n7, claim check 101) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 56) | pass -0.11 via tolerance (n6, claim check 101) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 56) | pass -2.37 via tolerance (n6, claim check 101) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 56) | pass 2.15 via tolerance (n6, claim check 101) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 56) | pass 0.923 via tolerance (n7, claim check 101) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-sonnet-5-5 | run 2

Status: answer. 51 s. 7 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-063313-8315. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261009-063313-8315/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261009-063313-8315/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-vitd-hcv/run2/home/sessions/20261009-063313-8315/work/inspect_table-1/columns.csv, entry 9) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 35) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 35) | pass 23.09 via tolerance (n2, claim check 83) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 35) | pass 19.73 via tolerance (n2, claim check 83) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 35) | pass 26.44 via tolerance (n2, claim check 83) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 38) | pass -0.55 via tolerance (n3, claim check 83) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 38) | pass -2.84 via tolerance (n3, claim check 83) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 38) | pass 1.73 via tolerance (n3, claim check 83) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 38) | pass 0.63 via tolerance (n7, claim check 83) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 41) | pass -5.51 via tolerance (n4, claim check 83) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 41) | pass -26.36 via tolerance (n4, claim check 83) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 41) | pass 15.34 via tolerance (n4, claim check 83) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 41) | pass 0.6 via tolerance (n7, claim check 83) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 44) | pass 122.92 via tolerance (n5, claim check 83) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n5 metrics.ci_lo, entry 44) | pass -68.96 via tolerance (n5, claim check 83) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 44) | pass 314.81 via tolerance (n5, claim check 83) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 44) | pass 0.206 via tolerance (n7, claim check 83) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 47) | pass -0.11 via tolerance (n6, claim check 83) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 47) | pass -2.37 via tolerance (n6, claim check 83) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 47) | pass 2.15 via tolerance (n6, claim check 83) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 47) | pass 0.923 via tolerance (n7, claim check 83) |

### sriphoosanaphan2021-vitd-hcv | claude:claude-sonnet-5-5 | run 3

Status: answer. 69 s. 8 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063404-2ec7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261009-063404-2ec7/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261009-063404-2ec7/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_vitamin_d | 37 exact | pass 37 (n1 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/sriphoosanaphan2021-vitd-hcv/run3/home/sessions/20261009-063404-2ec7/work/inspect_table-1/columns.csv, entry 9) | not asked |
| n_placebo | 38 exact | pass 38 (n2 metrics.n_a, entry 36) | not asked |
| vd_diff | 23.086 ±0.01 | pass 23.08642 (n2 metrics.mean_diff, entry 36) | pass 23.09 via tolerance (n2, claim check 94) |
| vd_ci_lo | 19.734 ±0.01 | pass 19.73379 (n2 metrics.ci_lo, entry 36) | pass 19.73 via tolerance (n2, claim check 94) |
| vd_ci_hi | 26.439 ±0.01 | pass 26.43904 (n2 metrics.ci_hi, entry 36) | pass 26.44 via tolerance (n2, claim check 94) |
| tgf_diff | -0.554 ±0.005 | pass -0.5542817 (n3 metrics.mean_diff, entry 39) | pass -0.55 via tolerance (n3, claim check 94) |
| tgf_ci_lo | -2.839 ±0.005 | pass -2.839268 (n3 metrics.ci_lo, entry 39) | pass -2.84 via tolerance (n3, claim check 94) |
| tgf_ci_hi | 1.731 ±0.005 | pass 1.730704 (n3 metrics.ci_hi, entry 39) | pass 1.73 via tolerance (n3, claim check 94) |
| tgf_p | 0.6302 ±0.001 | pass 0.6302216 (n3 metrics.p_value, entry 39) | pass 0.63 via tolerance (n7, claim check 94) |
| timp_diff | -5.51 ±0.01 | pass -5.510156 (n4 metrics.mean_diff, entry 42) | pass -5.51 via tolerance (n4, claim check 94) |
| timp_ci_lo | -26.361 ±0.01 | pass -26.36133 (n4 metrics.ci_lo, entry 42) | pass -26.36 via tolerance (n4, claim check 94) |
| timp_ci_hi | 15.341 ±0.01 | pass 15.34101 (n4 metrics.ci_hi, entry 42) | pass 15.34 via tolerance (n4, claim check 94) |
| timp_p | 0.6 ±0.001 | pass 0.6000182 (n4 metrics.p_value, entry 42) | pass 0.6 via tolerance (n7, claim check 94) |
| mmp_diff | 122.92 ±0.05 | pass 122.9206 (n5 metrics.mean_diff, entry 45) | pass 122.92 via tolerance (n5, claim check 94) |
| mmp_ci_lo | -68.96 ±0.05 | pass -68.96466 (n5 metrics.ci_lo, entry 45) | pass -68.96 via tolerance (n5, claim check 94) |
| mmp_ci_hi | 314.81 ±0.05 | pass 314.8059 (n5 metrics.ci_hi, entry 45) | pass 314.81 via tolerance (n5, claim check 94) |
| mmp_p | 0.2058 ±0.001 | pass 0.2057536 (n5 metrics.p_value, entry 45) | pass 0.206 via tolerance (n7, claim check 94) |
| p3np_diff | -0.11 ±0.005 | pass -0.1103912 (n6 metrics.mean_diff, entry 48) | pass -0.11 via tolerance (n6, claim check 94) |
| p3np_ci_lo | -2.372 ±0.005 | pass -2.371921 (n6 metrics.ci_lo, entry 48) | pass -2.37 via tolerance (n6, claim check 94) |
| p3np_ci_hi | 2.151 ±0.005 | pass 2.151139 (n6 metrics.ci_hi, entry 48) | pass 2.15 via tolerance (n6, claim check 94) |
| p3np_p | 0.9228 ±0.001 | pass 0.9227679 (n6 metrics.p_value, entry 48) | pass 0.923 via tolerance (n7, claim check 94) |

### weber2023-nnsvg-dlpfc | claude:claude-sonnet-5-5 | run 1

Status: answer. 72 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-063513-5e73. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261009-063513-5e73/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/weber2023-nnsvg-dlpfc/run1/home/sessions/20261009-063513-5e73/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 14) | pass 3639 via tolerance (n8, claim check 95) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 70) | pass 2 via tolerance (n8, claim check 95) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 70) | pass 4 via tolerance (n8, claim check 95) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 70) | pass 19 via tolerance (n8, claim check 95) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 32) | differs 3309 (n8, claim check 95) |

### weber2023-nnsvg-dlpfc | claude:claude-sonnet-5-5 | run 2

Status: answer. 80 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063625-9f3f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261009-063625-9f3f/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/weber2023-nnsvg-dlpfc/run2/home/sessions/20261009-063625-9f3f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 14) | pass 3639 via tolerance (n8, claim check 92) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 69) | pass 2 via tolerance (n8, claim check 92) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 69) | pass 4 via tolerance (n8, claim check 92) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 69) | pass 19 via tolerance (n8, claim check 92) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 32) | differs 3309 (n8, claim check 92) |

### weber2023-nnsvg-dlpfc | claude:claude-sonnet-5-5 | run 3

Status: answer. 75 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-063746-c75d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261009-063746-c75d/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/weber2023-nnsvg-dlpfc/run3/home/sessions/20261009-063746-c75d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spots_in_tissue | 3639 exact | pass 3639 (n1 metrics.n_spots, entry 14) | pass 3639 via tolerance (n8, claim check 95) |
| layer_genes_in_top_100 | 2 exact | pass 2 (n8 metrics.n_report_genes_within_cutoff, entry 69) | pass 2 via tolerance (n8, claim check 95) |
| mobp_rank | 4 ±2 | pass 4 (n8 metrics.rank_MOBP, entry 69) | pass 4 via tolerance (n8, claim check 95) |
| snap25_rank | 19 ±3 | pass 19 (n8 metrics.rank_SNAP25, entry 69) | pass 19 via tolerance (n8, claim check 95) |
| genes_pass_filter (reference) | 3396 exact | differs 3309 (n2 metrics.n_genes_after, entry 31) | differs 3309 (n8, claim check 95) |

### yun2026-lasv-elisa | claude:claude-sonnet-5-5 | run 1

Status: error (Cannot reach the Claude API. Check the network.). 40 s. 6 requests, 7 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-063901-f044. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/yun2026-lasv-elisa/run1/home/sessions/20261009-063901-f044/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/yun2026-lasv-elisa/run1/home/sessions/20261009-063901-f044/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 63) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n3 metrics.mean_conc_STD_1, entry 63) | FAIL - |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n3 metrics.mean_conc_STD_2, entry 63) | FAIL - |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n3 metrics.mean_conc_STD_3, entry 63) | FAIL - |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n3 metrics.mean_conc_STD_4, entry 63) | FAIL - |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n3 metrics.mean_conc_STD_5, entry 63) | FAIL - |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334023 (n3 metrics.mean_conc_STD_6, entry 63) | FAIL - |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n3 metrics.mean_conc_STD_7, entry 63) | FAIL - |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n3 metrics.mean_conc_STD_8, entry 63) | FAIL - |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n3 metrics.mean_conc_STD_9, entry 63) | FAIL - |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n3 metrics.mean_conc_STD_10, entry 63) | FAIL - |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07001 (n3 metrics.cv_conc_pct_STD_1, entry 63) | FAIL - |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n3 metrics.cv_conc_pct_STD_4, entry 63) | FAIL - |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 63) | FAIL - |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 63) | FAIL - |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n3 metrics.cv_conc_pct_STD_9, entry 63) | FAIL - |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 63) | FAIL - |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n3 table.rows[10][6], entry 63) | FAIL - |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.886722 (n3 table.rows[3][5], entry 63) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97182 (n3 metrics.recovery_pct_STD_1, entry 63) | FAIL - |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n3 metrics.recovery_pct_STD_4, entry 63) | FAIL - |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n3 metrics.recovery_pct_STD_7, entry 63) | FAIL - |
| recovery_d9 | 88.71 ±0.06 | pass 88.71061 (n3 metrics.recovery_pct_STD_9, entry 63) | FAIL - |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n3 metrics.recovery_pct_STD_10, entry 63) | differs - |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n3 metrics.mean_conc_HPC, entry 63) | FAIL - |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n3 metrics.cv_conc_pct_HPC, entry 63) | FAIL - |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n3 metrics.recovery_pct_HPC, entry 63) | FAIL - |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 63) | FAIL - |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n3 metrics.recovery_pct_LPC, entry 63) | FAIL - |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.02798 (n3 metrics.cv_conc_pct_LPC, entry 63) | differs - |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 63) | FAIL - |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 63) | FAIL - |

### yun2026-lasv-elisa | claude:claude-sonnet-5-5 | run 2

Status: answer. 118 s. 8 requests, 8 tool calls (1 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-063942-6b0c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/yun2026-lasv-elisa/run2/home/sessions/20261009-063942-6b0c/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/yun2026-lasv-elisa/run2/home/sessions/20261009-063942-6b0c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 60) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n3 metrics.mean_conc_STD_1, entry 60) | pass 7.587 via tolerance (n4, claim check 103) |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n3 metrics.mean_conc_STD_2, entry 60) | pass 3.707 via tolerance (n4, claim check 103) |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n3 metrics.mean_conc_STD_3, entry 60) | pass 1.872 via tolerance (n4, claim check 103) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n3 metrics.mean_conc_STD_4, entry 60) | pass 0.917 via tolerance (n4, claim check 103) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n3 metrics.mean_conc_STD_5, entry 60) | pass 0.464 via tolerance (n4, claim check 103) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334023 (n3 metrics.mean_conc_STD_6, entry 60) | pass 0.233 via tolerance (n4, claim check 103) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n3 metrics.mean_conc_STD_7, entry 60) | pass 0.12 via tolerance (n4, claim check 103) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n3 metrics.mean_conc_STD_8, entry 60) | pass 0.056 via tolerance (n4, claim check 103) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n3 metrics.mean_conc_STD_9, entry 60) | pass 0.027 via tolerance (n4, claim check 103) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n3 metrics.mean_conc_STD_10, entry 60) | pass 0.014 via tolerance (n4, claim check 103) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07 (n4 stdout, entry 68) | pass 11.07 via tolerance (n4, claim check 103) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.927 (n4 stdout, entry 68) | pass 10.927 via tolerance (n4, claim check 103) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.714 (n4 stdout, entry 68) | pass 15.714 via tolerance (n4, claim check 103) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.553 (n4 stdout, entry 68) | pass 15.553 via tolerance (n4, claim check 103) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.895 (n4 stdout, entry 68) | pass 25.895 via tolerance (n4, claim check 103) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.919 (n4 stdout, entry 68) | pass 21.919 via tolerance (n4, claim check 103) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.621 (n4 stdout, entry 68) | pass 26.621 via tolerance (n4, claim check 103) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.886722 (n3 table.rows[3][5], entry 60) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97182 (n3 metrics.recovery_pct_STD_1, entry 60) | pass 97.972 via tolerance (n4, claim check 103) |
| recovery_d4 | 94.74 ±0.06 | pass 94.738 (n4 stdout, entry 68) | pass 94.738 via tolerance (n4, claim check 103) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55 (n4 stdout, entry 68) | pass 99.55 via tolerance (n4, claim check 103) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71061 (n3 metrics.recovery_pct_STD_9, entry 60) | pass 88.711 via tolerance (n4, claim check 103) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n3 metrics.recovery_pct_STD_10, entry 60) | differs 92.564 (n4, claim check 103) |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n3 metrics.mean_conc_HPC, entry 60) | pass 1.993 via tolerance (n4, claim check 103) |
| hpc_cv | 22.447 ±0.015 | pass 22.447 (n4 stdout, entry 68) | pass 22.447 via tolerance (n4, claim check 103) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n4 stdout, entry 68) | pass 107.276 via tolerance (n4, claim check 103) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 60) | pass 0.457 via tolerance (n4, claim check 103) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n3 metrics.recovery_pct_LPC, entry 60) | pass 98.254 via tolerance (n4, claim check 103) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.028 (n4 stdout, entry 68) | differs 20.028 (n4, claim check 103) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 60) | pass 0.121 via tolerance (n5, claim check 103) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 60) | pass 7.744 via tolerance (n5, claim check 103) |

### yun2026-lasv-elisa | claude:claude-sonnet-5-5 | run 3

Status: answer. 110 s. 7 requests, 6 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-064140-17d5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/yun2026-lasv-elisa/run3/home/sessions/20261009-064140-17d5/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 1 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-sonnet-5-5/yun2026-lasv-elisa/run3/home/sessions/20261009-064140-17d5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 56) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.586938 (n3 metrics.mean_conc_STD_1, entry 56) | pass 7.587 via tolerance (n4, claim check 96) |
| conc_d2 | 3.7072 ±0.001 | pass 3.707172 (n3 metrics.mean_conc_STD_2, entry 56) | pass 3.707 via tolerance (n4, claim check 96) |
| conc_d3 | 1.8719 ±0.001 | pass 1.87188 (n4 stdout, entry 64) | pass 1.872 via tolerance (n4, claim check 96) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n4 stdout, entry 64) | pass 0.9171 via tolerance (n5, claim check 96) |
| conc_d5 | 0.46371 ±0.001 | pass 0.463713 (n4 stdout, entry 64) | pass 0.4637 via tolerance (n4, claim check 96) |
| conc_d6 | 0.2334 ±0.001 | pass 0.233402 (n4 stdout, entry 64) | pass 0.2334 via tolerance (n4, claim check 96) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.120456 (n4 stdout, entry 64) | pass 0.1205 via tolerance (n1, claim check 96) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.055794 (n4 stdout, entry 64) | pass 0.05579 via tolerance (n4, claim check 96) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.026613 (n4 stdout, entry 64) | pass 0.02661 via tolerance (n4, claim check 96) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.013885 (n4 stdout, entry 64) | pass 0.01388 via tolerance (n2, claim check 96) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07001 (n3 metrics.cv_conc_pct_STD_1, entry 56) | pass 11.07 via tolerance (n5, claim check 96) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n4 stdout, entry 64) | pass 10.93 via tolerance (n4, claim check 96) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 56) | pass 15.71 via tolerance (n4, claim check 96) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 56) | pass 15.55 via tolerance (n5, claim check 96) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n4 stdout, entry 64) | pass 25.89 via tolerance (n5, claim check 96) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 56) | pass 21.92 via tolerance (n5, claim check 96) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n3 table.rows[10][6], entry 56) | pass 26.62 via tolerance (n4, claim check 96) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.886722 (n4 stdout, entry 64) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97182 (n4 stdout, entry 64) | pass 97.97 via tolerance (n4, claim check 96) |
| recovery_d4 | 94.74 ±0.06 | pass 94.73771 (n4 stdout, entry 64) | pass 94.74 via tolerance (n4, claim check 96) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55007 (n4 stdout, entry 64) | pass 99.55 via tolerance (n4, claim check 96) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71061 (n3 metrics.recovery_pct_STD_9, entry 56) | pass 88.71 via tolerance (n5, claim check 96) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56376 (n3 metrics.recovery_pct_STD_10, entry 56) | differs 92.56 (n5, claim check 96) |
| hpc_conc | 1.9932 ±0.001 | pass 1.993188 (n4 stdout, entry 64) | pass 1.993 via tolerance (n5, claim check 96) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n4 stdout, entry 64) | pass 22.45 via tolerance (n5, claim check 96) |
| hpc_recovery | 107.28 ±0.06 | pass 107.276 (n3 metrics.recovery_pct_HPC, entry 56) | pass 107.3 via tolerance (n5, claim check 96) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 56) | pass 0.4569 via tolerance (n5, claim check 96) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25365 (n3 metrics.recovery_pct_LPC, entry 56) | pass 98.25 via tolerance (n5, claim check 96) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.02798 (n4 stdout, entry 64) | match 20 via rounding (n2, claim check 96) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 56) | pass 0.121 via tolerance (n5, claim check 96) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 56) | pass 7.744 via tolerance (n5, claim check 96) |



Note (9 October): run 3 of nair2024-plasmid-growth stopped with "Cannot reach the Claude API". The JSON file holds the rerun from final-2026-10-09-rerun-claude_sonnet_p4-nair-run3.json in its place, with the field rerunOf. The table above shows the first run.


Note (9 October): run 1 of yun2026-lasv-elisa stopped with "Cannot reach the Claude API". The JSON file holds the rerun from final-2026-10-09-rerun-claude_sonnet_p4-yun-run1.json in its place, with the field rerunOf. The table above shows the first run.
