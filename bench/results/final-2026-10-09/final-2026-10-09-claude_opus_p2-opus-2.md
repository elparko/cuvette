# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 198/198 | 177/177 | 24 | 0 |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| alexandrov2019-metaspace | 15/15 / 12/12 |
| bradley-photutils-100gaussians | 18/18 / 18/18 |
| gowers2016-mdanalysis | 21/21 / 21/21 |
| klindworth2013-16s-primers | 33/33 / 33/33 |
| love2014-deseq2-airway | 15/15 / 12/12 |
| oreshkova2024-qmp-honeybee | 57/57 / 48/48 |
| schindelin2012-fiji-blobs | 3/3 / 3/3 |
| white2021-flowkit | 36/36 / 30/30 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 24 | 3509 | 248 | 652 | 199107 | 4750269 | 327 | 4 | 5 | 4 | 23 | 103 | 63 | 36 | 28 | 11 | 11 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $8.26 for 24 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alexandrov2019-metaspace | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |
| alexandrov2019-metaspace | claude:claude-opus-5-5 | 2 | on | 0 | 0 | 0 | 1 | 0 |
| alexandrov2019-metaspace | claude:claude-opus-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-opus-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-opus-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-opus-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-opus-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-opus-5-5 | 2 | on | 4 | 0 | 0 | 0 | 0 |
| gowers2016-mdanalysis | claude:claude-opus-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| klindworth2013-16s-primers | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 0 | 6 | 0 |
| klindworth2013-16s-primers | claude:claude-opus-5-5 | 2 | on | 1 | 0 | 0 | 7 | 0 |
| klindworth2013-16s-primers | claude:claude-opus-5-5 | 3 | on | 1 | 0 | 0 | 3 | 0 |
| love2014-deseq2-airway | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| love2014-deseq2-airway | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| love2014-deseq2-airway | claude:claude-opus-5-5 | 3 | on | 6 | 0 | 0 | 8 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-opus-5-5 | 1 | on | 12 | 0 | 0 | 1 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-opus-5-5 | 2 | on | 8 | 0 | 0 | 0 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-opus-5-5 | 3 | on | 9 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| schindelin2012-fiji-blobs | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 0 | 1 | 0 |
| white2021-flowkit | claude:claude-opus-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| white2021-flowkit | claude:claude-opus-5-5 | 2 | on | 6 | 0 | 0 | 0 | 0 |
| white2021-flowkit | claude:claude-opus-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |

## Details

### alexandrov2019-metaspace | claude:claude-opus-5-5 | run 1

Status: answer. 224 s. 17 requests, 26 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-071104-6250. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/alexandrov2019-metaspace/run1/home/sessions/20261009-071104-6250/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/alexandrov2019-metaspace/run1/home/sessions/20261009-071104-6250/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n5 metrics.n_fdr_10, entry 65) | pass 414 via tolerance (n17, claim check 215) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n3 metrics.n_fdr_10, entry 56) | pass 263 via tolerance (n13, claim check 215) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n7 metrics.n_fdr_10, entry 72) | pass 191 via tolerance (n18, claim check 215) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 88) | pass 123 via tolerance (n10, claim check 215) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n5 metrics.n_fdr_05, entry 65) | not asked |

### alexandrov2019-metaspace | claude:claude-opus-5-5 | run 2

Status: answer. 246 s. 16 requests, 23 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-071450-d49f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/alexandrov2019-metaspace/run2/home/sessions/20261009-071450-d49f/log.jsonl
Leak check: 0 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/alexandrov2019-metaspace/run2/home/sessions/20261009-071450-d49f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n5 metrics.n_fdr_10, entry 47) | pass 414 via tolerance (n24, claim check 200) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n24 stdout, entry 164) | pass 263 via tolerance (n24, claim check 200) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n7 metrics.n_fdr_10, entry 54) | pass 191 via tolerance (n18, claim check 200) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n10 metrics.n_fdr_10, entry 67) | pass 123 via tolerance (n10, claim check 200) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n5 metrics.n_fdr_05, entry 47) | not asked |

### alexandrov2019-metaspace | claude:claude-opus-5-5 | run 3

Status: answer. 254 s. 18 requests, 23 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-071856-124e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/alexandrov2019-metaspace/run3/home/sessions/20261009-071856-124e/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/alexandrov2019-metaspace/run3/home/sessions/20261009-071856-124e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| d1_lipidmaps_fdr10 | 414 exact | pass 414 (n5 metrics.n_fdr_10, entry 42) | pass 414 via tolerance (n21, claim check 201) |
| d1_hmdb_fdr10 | 263 exact | pass 263 (n21 stdout, entry 177) | pass 263 via tolerance (n21, claim check 201) |
| d2_lipidmaps_fdr10 | 191 exact | pass 191 (n6 metrics.n_fdr_10, entry 50) | pass 191 via tolerance (n21, claim check 201) |
| d2_hmdb_fdr10 | 123 exact | pass 123 (n21 stdout, entry 177) | pass 123 via tolerance (n21, claim check 201) |
| d1_lipidmaps_fdr5 | 144 exact | pass 144 (n5 metrics.n_fdr_05, entry 42) | not asked |

### bradley-photutils-100gaussians | claude:claude-opus-5-5 | run 1

Status: answer. 122 s. 11 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072310-fb46. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261009-072310-fb46/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261009-072310-fb46/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 41) | pass 5.152 via tolerance (n11, claim check 182) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 41) | pass 2.094 via tolerance (n11, claim check 182) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 116) | pass 82 via tolerance (n20, claim check 182) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 137) | pass 925 via tolerance (n21, claim check 182) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 137) | pass 760 via tolerance (n21, claim check 182) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 137) | pass 925 via tolerance (n21, claim check 182) |

### bradley-photutils-100gaussians | claude:claude-opus-5-5 | run 2

Status: answer. 122 s. 10 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072512-4dd8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261009-072512-4dd8/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261009-072512-4dd8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 43) | pass 5.152 via tolerance (n11, claim check 177) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 43) | pass 2.094 via tolerance (n11, claim check 177) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 117) | pass 82 via tolerance (n20, claim check 177) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 138) | pass 925.2 via tolerance (n21, claim check 177) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 138) | pass 760.2 via tolerance (n21, claim check 177) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 138) | pass 925.2 via tolerance (n21, claim check 177) |

### bradley-photutils-100gaussians | claude:claude-opus-5-5 | run 3

Status: answer. 117 s. 10 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-072715-e2f4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261009-072715-e2f4/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261009-072715-e2f4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 43) | pass 5.152 via tolerance (n11, claim check 178) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 43) | pass 2.094 via tolerance (n11, claim check 178) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 118) | pass 82 via tolerance (n20, claim check 178) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 139) | pass 925 via tolerance (n21, claim check 178) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 139) | pass 760 via tolerance (n21, claim check 178) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 139) | pass 925 via tolerance (n21, claim check 178) |

### gowers2016-mdanalysis | claude:claude-opus-5-5 | run 1

Status: answer. 111 s. 9 requests, 13 tool calls (0 failed), 1 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-072912-9f4d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gowers2016-mdanalysis/run1/home/sessions/20261009-072912-9f4d/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gowers2016-mdanalysis/run1/home/sessions/20261009-072912-9f4d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 14) | pass 3341 via tolerance (n1, claim check 99) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 14) | pass 98 via tolerance (n5, claim check 99) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n4 metrics.rmsd_last, entry 27) | pass 6.82 via tolerance (n4, claim check 99) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n5 metrics.rg_last, entry 34) | pass 19.592 via tolerance (n5, claim check 99) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 17) | pass 214 via tolerance (n6, claim check 99) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 17) | pass 214 via tolerance (n6, claim check 99) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 41) | pass 7.131 via tolerance (n6, claim check 99) |

### gowers2016-mdanalysis | claude:claude-opus-5-5 | run 2

Status: answer. 120 s. 8 requests, 11 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073105-74ef. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gowers2016-mdanalysis/run2/home/sessions/20261009-073105-74ef/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gowers2016-mdanalysis/run2/home/sessions/20261009-073105-74ef/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 14) | pass 3341 via tolerance (n1, claim check 91) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 14) | pass 98 via tolerance (n5, claim check 91) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n4 metrics.rmsd_last, entry 27) | pass 6.82 via tolerance (n4, claim check 91) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n5 metrics.rg_last, entry 34) | pass 19.59 via tolerance (n5, claim check 91) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 17) | pass 214 via tolerance (n6, claim check 91) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 17) | pass 214 via tolerance (n6, claim check 91) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 41) | pass 7.13 via tolerance (n6, claim check 91) |

### gowers2016-mdanalysis | claude:claude-opus-5-5 | run 3

Status: answer. 90 s. 6 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-073307-f369. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gowers2016-mdanalysis/run3/home/sessions/20261009-073307-f369/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/gowers2016-mdanalysis/run3/home/sessions/20261009-073307-f369/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| atoms | 3341 exact | pass 3341 (n1 metrics.n_atoms, entry 14) | pass 3341 via tolerance (n1, claim check 75) |
| frames | 98 exact | pass 98 (n1 metrics.n_frames, entry 14) | pass 98 via tolerance (n5, claim check 75) |
| backbone_rmsd_last_frame | 6.8203 ±0.01 | pass 6.820322 (n4 metrics.rmsd_last, entry 27) | pass 6.82 via tolerance (n4, claim check 75) |
| rg_last_frame | 19.592 ±0.02 | pass 19.59158 (n5 metrics.rg_last, entry 34) | pass 19.59 via tolerance (n5, claim check 75) |
| residues_chain_a | 214 exact | pass 214 (n2 metrics.residues_A, entry 17) | pass 214 via tolerance (n6, claim check 75) |
| residues_chain_b | 214 exact | pass 214 (n2 metrics.residues_A, entry 17) | pass 214 via tolerance (n6, claim check 75) |
| ca_rmsd_open_closed | 7.131 ±0.02 | pass 7.1307 (n6 metrics.rmsd_after_fit, entry 41) | pass 7.131 via tolerance (n6, claim check 75) |

### klindworth2013-16s-primers | claude:claude-opus-5-5 | run 1

Status: answer. 98 s. 4 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-073440-bc77. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/klindworth2013-16s-primers/run1/home/sessions/20261009-073440-bc77/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/klindworth2013-16s-primers/run1/home/sessions/20261009-073440-bc77/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 82) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 28) | pass 1608 via tolerance (n4, claim check 82) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 28) | pass 2072 via tolerance (n4, claim check 82) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 28) | pass 465 via tolerance (n4, claim check 82) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_fwd_gene_pos, entry 61) | pass 341 via tolerance (n7, claim check 82) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 82) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 31) | pass 1275 via tolerance (n5, claim check 82) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 31) | pass 2193 via tolerance (n5, claim check 82) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 31) | pass 919 via tolerance (n5, claim check 82) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_fwd_gene_pos, entry 61) | pass 8 via tolerance (n7, claim check 82) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 53) | pass 61.39 via tolerance (n6, claim check 82) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 28) | not asked |

### klindworth2013-16s-primers | claude:claude-opus-5-5 | run 2

Status: answer. 100 s. 4 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 7 unsourced.
Session: 20261009-073618-d6c4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/klindworth2013-16s-primers/run2/home/sessions/20261009-073618-d6c4/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 7 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/klindworth2013-16s-primers/run2/home/sessions/20261009-073618-d6c4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 80) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 28) | pass 1608 via tolerance (n4, claim check 80) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 28) | pass 2072 via tolerance (n4, claim check 80) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 28) | pass 465 via tolerance (n4, claim check 80) |
| pair1_ecoli_position | 341 exact | pass 341 (n7 metrics.pair1_fwd_gene_start, entry 61) | pass 341 via tolerance (n7, claim check 80) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 11) | pass 1 via tolerance (n6, claim check 80) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 31) | pass 1275 via tolerance (n5, claim check 80) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 31) | pass 2193 via tolerance (n5, claim check 80) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 31) | pass 919 via tolerance (n5, claim check 80) |
| pair2_ecoli_position | 8 exact | pass 8 (n7 metrics.pair2_fwd_gene_start, entry 61) | pass 8 via tolerance (n7, claim check 80) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n6 metrics.tm_c_1, entry 53) | pass 61.39 via tolerance (n6, claim check 80) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 28) | not asked |

### klindworth2013-16s-primers | claude:claude-opus-5-5 | run 3

Status: answer. 105 s. 9 requests, 9 tool calls (1 failed), 0 nudges, 1 plan reminders, 3 unsourced.
Session: 20261009-073759-3b7a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/klindworth2013-16s-primers/run3/home/sessions/20261009-073759-3b7a/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/klindworth2013-16s-primers/run3/home/sessions/20261009-073759-3b7a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pair1_products | 1 exact | pass 1 (n1 metrics.n_records, entry 14) | pass 1 via tolerance (n8, claim check 113) |
| pair1_start | 1608 exact | pass 1608 (n4 metrics.start_1based, entry 35) | pass 1608 via tolerance (n4, claim check 113) |
| pair1_end | 2072 exact | pass 2072 (n4 metrics.end_1based, entry 35) | pass 2072 via tolerance (n4, claim check 113) |
| pair1_length | 465 exact | pass 465 (n4 metrics.product_bp, entry 35) | pass 465 via tolerance (n4, claim check 113) |
| pair1_ecoli_position | 341 exact | pass 341 (n6 metrics.pair1_fwd_gene_start, entry 46) | pass 341 via tolerance (n6, claim check 113) |
| pair2_products | 1 exact | pass 1 (n1 metrics.n_records, entry 14) | pass 1 via tolerance (n8, claim check 113) |
| pair2_start | 1275 exact | pass 1275 (n5 metrics.start_1based, entry 38) | pass 1275 via tolerance (n8, claim check 113) |
| pair2_end | 2193 exact | pass 2193 (n5 metrics.end_1based, entry 38) | pass 2193 via tolerance (n8, claim check 113) |
| pair2_length | 919 exact | pass 919 (n5 metrics.product_bp, entry 38) | pass 919 via tolerance (n8, claim check 113) |
| pair2_ecoli_position | 8 exact | pass 8 (n6 metrics.pair2_fwd_gene_start, entry 46) | pass 8 via tolerance (n6, claim check 113) |
| tm_primer3 | 61.39 ±0.01 | pass 61.386 (n7 metrics.tm_c_1, entry 68) | pass 61.39 via tolerance (n7, claim check 113) |
| pair1_coordinate_difference (reference) | 464 exact | differs 465 (n4 metrics.product_bp, entry 35) | not asked |

### love2014-deseq2-airway | claude:claude-opus-5-5 | run 1

Status: answer. 166 s. 8 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-073944-4906. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/love2014-deseq2-airway/run1/home/sessions/20261009-073944-4906/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/love2014-deseq2-airway/run1/home/sessions/20261009-073944-4906/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 54) | pass 16637 via tolerance (n7, claim check 98) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 54) | pass 4381 via tolerance (n7, claim check 98) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 54) | pass 2362 via tolerance (n7, claim check 98) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 54) | pass 2019 via tolerance (n7, claim check 98) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 45) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 54) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 54) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 62) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 54) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 54) | not asked |

### love2014-deseq2-airway | claude:claude-opus-5-5 | run 2

Status: answer. 144 s. 7 requests, 7 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-074230-866b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/love2014-deseq2-airway/run2/home/sessions/20261009-074230-866b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/love2014-deseq2-airway/run2/home/sessions/20261009-074230-866b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 61) | pass 16637 via tolerance (n7, claim check 95) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 61) | pass 4381 via tolerance (n7, claim check 95) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 61) | pass 2362 via tolerance (n7, claim check 95) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 61) | pass 2019 via tolerance (n7, claim check 95) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 52) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 61) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 61) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 69) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 61) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 61) | not asked |

### love2014-deseq2-airway | claude:claude-opus-5-5 | run 3

Status: answer. 219 s. 9 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 8 unsourced.
Session: 20261009-074454-8611. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/love2014-deseq2-airway/run3/home/sessions/20261009-074454-8611/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 8 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/love2014-deseq2-airway/run3/home/sessions/20261009-074454-8611/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n8 metrics.n_genes_tested, entry 57) | pass 16637 via tolerance (n11, claim check 117) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n8 metrics.n_significant, entry 57) | pass 4381 via tolerance (n11, claim check 117) |
| up_padj_01 | 2362 ±10 | pass 2362 (n8 metrics.n_up, entry 57) | pass 2362 via tolerance (n11, claim check 117) |
| down_padj_01 | 2019 ±3 | pass 2019 (n8 metrics.n_down, entry 57) | pass 2019 via tolerance (n11, claim check 117) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n6 metrics.n_significant, entry 48) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n8 metrics.n_genes_tested, entry 57) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n8 metrics.n_significant, entry 57) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n9 table.rows[14][1], entry 64) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n8 metrics.n_up, entry 57) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n8 metrics.n_significant, entry 57) | not asked |

### oreshkova2024-qmp-honeybee | claude:claude-opus-5-5 | run 1

Status: answer. 249 s. 22 requests, 30 tool calls (1 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261009-074834-12da. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261009-074834-12da/log.jsonl
Leak check: 12 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261009-074834-12da/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 74) | pass 35.69 via rounding (n6, claim check 245) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03219331 (n14 table.rows[1][3], entry 188) | pass 0.0316 via tolerance (n6, claim check 245) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 74) | pass 36 via tolerance (n5, claim check 245) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 74) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 74) | pass 0.8596 via tolerance (n5, claim check 245) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 74) | pass 1.057 via tolerance (n4, claim check 245) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808638 (n13 stdout, entry 165) | pass 2.809 via tolerance (n13, claim check 245) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 74) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 88) | pass 27.78 via tolerance (n7, claim check 245) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 88) | pass 29.16 via rounding (n7, claim check 245) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 88) | pass 6.853 via tolerance (n7, claim check 245) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 88) | pass 0.0021 via tolerance (n7, claim check 245) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 88) | pass 4.457 via tolerance (n7, claim check 245) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n7 metrics.p_Age_x_Treatment_x_Replicate, entry 88) | pass 0.0157 via rounding (n7, claim check 245) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n11 metrics.H, entry 126) | pass 9.35 via rounding (n11, claim check 245) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 11) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n11 metrics.p_value, entry 126) | pass 0.025 via rounding (n11, claim check 245) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n11 metrics.min_p_adjusted, entry 126) | pass 0.0397 via tolerance (n11, claim check 245) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n12 metrics.H, entry 129) | pass 23.87 via tolerance (n12, claim check 245) |

### oreshkova2024-qmp-honeybee | claude:claude-opus-5-5 | run 2

Status: answer. 144 s. 13 requests, 20 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075243-dfb1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261009-075243-dfb1/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261009-075243-dfb1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 54) | pass 35.69 via rounding (n6, claim check 158) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 54) | pass 0.0316 via tolerance (n6, claim check 158) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 54) | pass 36 via tolerance (n5, claim check 158) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 54) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 54) | pass 0.8596 via tolerance (n5, claim check 158) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 54) | pass 1.057 via tolerance (n4, claim check 158) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 54) | pass 2.809 via tolerance (n6, claim check 158) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 54) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 62) | pass 27.78 via tolerance (n7, claim check 158) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 62) | pass 29.16 via rounding (n7, claim check 158) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 62) | pass 6.853 via tolerance (n7, claim check 158) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 62) | pass 0.00209 via tolerance (n7, claim check 158) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 62) | pass 4.457 via tolerance (n7, claim check 158) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01568 (n10 stdout, entry 86) | pass 0.01568 via tolerance (n10, claim check 158) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n11 metrics.H, entry 99) | pass 9.35 via rounding (n11, claim check 158) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 14) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n11 metrics.p_value, entry 99) | pass 0.02498 via tolerance (n11, claim check 158) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n11 metrics.min_p_adjusted, entry 99) | pass 0.0397 via tolerance (n11, claim check 158) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n12 metrics.H, entry 102) | pass 23.87 via tolerance (n12, claim check 158) |

### oreshkova2024-qmp-honeybee | claude:claude-opus-5-5 | run 3

Status: answer. 169 s. 15 requests, 21 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075508-6a65. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261009-075508-6a65/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261009-075508-6a65/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 57) | pass 35.69 via rounding (n16, claim check 169) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 57) | pass 0.03156 via tolerance (n16, claim check 169) |
| protein_f_replicate | 36 ±0.001 | pass 36 (n16 stdout, entry 152) | pass 36 via tolerance (n16, claim check 169) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356e-7 (n16 stdout, entry 152) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8596 (n16 stdout, entry 152) | pass 0.8596 via tolerance (n16, claim check 169) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.057 (n16 stdout, entry 152) | pass 1.057 via tolerance (n16, claim check 169) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.809 (n16 stdout, entry 152) | pass 2.809 via tolerance (n16, claim check 169) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 57) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.78 (n16 stdout, entry 152) | pass 27.78 via tolerance (n16, claim check 169) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 65) | pass 29.16 via rounding (n16, claim check 169) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853 (n16 stdout, entry 152) | pass 6.853 via tolerance (n16, claim check 169) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002087 (n16 stdout, entry 152) | pass 0.002087 via tolerance (n16, claim check 169) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457 (n16 stdout, entry 152) | pass 4.457 via tolerance (n16, claim check 169) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01568 (n11 stdout, entry 93) | pass 0.01568 via tolerance (n16, claim check 169) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n12 metrics.H, entry 106) | pass 9.35 via rounding (n12, claim check 169) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 11) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n12 metrics.p_value, entry 106) | pass 0.02498 via tolerance (n12, claim check 169) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n12 metrics.min_p_adjusted, entry 106) | pass 0.03969 via tolerance (n12, claim check 169) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n13 metrics.H, entry 112) | pass 23.87 via tolerance (n13, claim check 169) |

### schindelin2012-fiji-blobs | claude:claude-opus-5-5 | run 1

Status: answer. 90 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075757-b83f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261009-075757-b83f/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schindelin2012-fiji-blobs/run1/home/sessions/20261009-075757-b83f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n10 metrics.n_objects, entry 47) | pass 64 via tolerance (n10, claim check 105) |

### schindelin2012-fiji-blobs | claude:claude-opus-5-5 | run 2

Status: answer. 99 s. 7 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-075928-1daa. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261009-075928-1daa/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schindelin2012-fiji-blobs/run2/home/sessions/20261009-075928-1daa/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n6 metrics.n_objects, entry 45) | pass 64 via tolerance (n6, claim check 118) |

### schindelin2012-fiji-blobs | claude:claude-opus-5-5 | run 3

Status: answer. 104 s. 9 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261009-080106-79c1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261009-080106-79c1/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schindelin2012-fiji-blobs/run3/home/sessions/20261009-080106-79c1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| particles_edges_included | 64 exact | pass 64 (n6 metrics.n_objects, entry 46) | pass 64 via tolerance (n6, claim check 137) |

### white2021-flowkit | claude:claude-opus-5-5 | run 1

Status: answer. 139 s. 9 requests, 15 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080251-4140. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/white2021-flowkit/run1/home/sessions/20261009-080251-4140/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/white2021-flowkit/run1/home/sessions/20261009-080251-4140/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 13) | pass 290172 via tolerance (n4, claim check 100) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 38) | pass 133670 via tolerance (n8, claim check 100) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 38) | pass 133860 via tolerance (n3, claim check 100) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 38) | pass 82484 via tolerance (n7, claim check 100) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 38) | pass 82636 via tolerance (n3, claim check 100) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 38) | pass 47165 via tolerance (n6, claim check 100) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 38) | pass 47241 via tolerance (n3, claim check 100) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 38) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 41) | pass 135381 via tolerance (n4, claim check 100) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 41) | pass 85369 via tolerance (n4, claim check 100) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 41) | pass 47694 via tolerance (n4, claim check 100) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 41) | not asked |

### white2021-flowkit | claude:claude-opus-5-5 | run 2

Status: answer. 150 s. 10 requests, 14 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080513-c328. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/white2021-flowkit/run2/home/sessions/20261009-080513-c328/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/white2021-flowkit/run2/home/sessions/20261009-080513-c328/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 13) | pass 290172 via tolerance (n4, claim check 104) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 39) | pass 133670 via tolerance (n8, claim check 104) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 39) | pass 133860 via tolerance (n3, claim check 104) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 39) | pass 82484 via tolerance (n7, claim check 104) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 39) | pass 82636 via tolerance (n3, claim check 104) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 39) | pass 47165 via tolerance (n6, claim check 104) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 39) | pass 47241 via tolerance (n3, claim check 104) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 39) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 51) | pass 135381 via tolerance (n4, claim check 104) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 51) | pass 85369 via tolerance (n4, claim check 104) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 51) | pass 47694 via tolerance (n4, claim check 104) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 51) | not asked |

### white2021-flowkit | claude:claude-opus-5-5 | run 3

Status: answer. 127 s. 11 requests, 14 tool calls (0 failed), 2 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-080749-d4a3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/white2021-flowkit/run3/home/sessions/20261009-080749-d4a3/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/white2021-flowkit/run3/home/sessions/20261009-080749-d4a3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_in_file | 290172 exact | pass 290172 (n1 metrics.n_events, entry 13) | pass 290172 via tolerance (n4, claim check 106) |
| cd3_flowkit | 133670 exact | pass 133670 (n3 metrics.count_CD3, entry 39) | pass 133670 via tolerance (n8, claim check 106) |
| cd3_flowjo | 133860 exact | pass 133860 (n3 table.rows[3][6], entry 39) | pass 133860 via tolerance (n3, claim check 106) |
| cd4_flowkit | 82484 exact | pass 82484 (n3 metrics.count_CD4, entry 39) | pass 82484 via tolerance (n8, claim check 106) |
| cd4_flowjo | 82636 exact | pass 82636 (n3 table.rows[4][6], entry 39) | pass 82636 via tolerance (n3, claim check 106) |
| cd8_flowkit | 47165 exact | pass 47165 (n3 metrics.count_CD8, entry 39) | pass 47165 via tolerance (n6, claim check 106) |
| cd8_flowjo | 47241 exact | pass 47241 (n3 table.rows[5][6], entry 39) | pass 47241 via tolerance (n3, claim check 106) |
| largest_difference_percent | -0.184 ±0.02 | pass -0.1839392 (n3 table.rows[4][8], entry 39) | not asked |
| cd3_no_compensation | 135381 exact | pass 135381 (n4 metrics.count_CD3_none, entry 52) | pass 135381 via tolerance (n4, claim check 106) |
| cd4_no_compensation | 85369 exact | pass 85369 (n4 metrics.count_CD4_none, entry 52) | pass 85369 via tolerance (n4, claim check 106) |
| cd8_no_compensation | 47694 exact | pass 47694 (n4 metrics.count_CD8_none, entry 52) | pass 47694 via tolerance (n4, claim check 106) |
| cd8_ifng_no_compensation | 672 exact | pass 672 (n4 metrics.count_Time_Singlets_aAmine_CD3_CD8_IFNg_none, entry 52) | not asked |

