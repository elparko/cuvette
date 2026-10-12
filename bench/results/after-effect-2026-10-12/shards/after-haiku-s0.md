# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 463/465 | 370/390 | 42 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| aledo2022-renz-onpg | 6/6 / 6/6 |
| astapova2021-deseq2-kgn | 12/12 / 9/9 |
| bradley-photutils-100gaussians | 18/18 / 18/18 |
| danecek2021-bcftools | 18/18 / 15/15 |
| gramfort2013-mne-sample | 42/42 / 31/36 |
| kanetis2022-iqtree-sporocadaceae | 9/9 / 6/6 |
| lackey2015-tb-default | 90/90 / 81/84 |
| ljosa2012-bbbc005 | 9/9 / 6/6 |
| manders1993-coloc | 18/18 / 15/15 |
| oreshkova2024-qmp-honeybee | 57/57 / 36/48 |
| rossi1980-recidivism | 31/33 / 12/12 |
| schramm2012-imzml-pyimzml | 21/21 / 12/12 |
| wang2023-cuproptosis-oa | 42/42 / 39/39 |
| yun2026-lasv-elisa | 90/90 / 84/84 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 42 | 6357 | 391 | 1026 | 507883 | 8174630 | 392 | 19 | 0 | 18 | 35 | 133 | 173 | 70 | 47 | 15 | 15 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.50 for 42 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 6 | 0 |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 1 | 0 |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 2 | 0 |
| bradley-photutils-100gaussians | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 1 | 0 |
| bradley-photutils-100gaussians | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 1 | 0 |
| danecek2021-bcftools | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |
| danecek2021-bcftools | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| danecek2021-bcftools | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| gramfort2013-mne-sample | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 3 | 0 |
| gramfort2013-mne-sample | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 3 | 0 |
| gramfort2013-mne-sample | claude:claude-haiku-5-5 | 3 | on | 7 | 0 | 0 | 7 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 8 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 5 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 1 | 0 |
| lackey2015-tb-default | claude:claude-haiku-5-5 | 1 | on | 7 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 2 | 0 |
| ljosa2012-bbbc005 | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| ljosa2012-bbbc005 | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-haiku-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| manders1993-coloc | claude:claude-haiku-5-5 | 3 | on | 4 | 0 | 0 | 0 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 1 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 2 | on | 6 | 0 | 0 | 1 | 0 |
| oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | 3 | on | 6 | 0 | 0 | 3 | 0 |
| rossi1980-recidivism | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| rossi1980-recidivism | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 0 | 0 |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 1 | 0 |
| wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| yun2026-lasv-elisa | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |

## Details

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 1

Status: answer. 63 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261011-234259-8392. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run1/home/sessions/20261011-234259-8392/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run1/home/sessions/20261011-234259-8392/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 23) | pass 2.48 via tolerance (n1, claim check 59) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 23) | pass 0.184 via tolerance (n1, claim check 59) |

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 2

Status: answer. 61 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261011-234403-cebd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run2/home/sessions/20261011-234403-cebd/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run2/home/sessions/20261011-234403-cebd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 25) | pass 2.479 via tolerance (n1, claim check 55) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 25) | pass 0.1841 via tolerance (n1, claim check 55) |

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 3

Status: answer. 47 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-234503-9384. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run3/home/sessions/20261011-234503-9384/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run3/home/sessions/20261011-234503-9384/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 25) | pass 2.479 via tolerance (n1, claim check 50) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 25) | pass 0.1841 via tolerance (n1, claim check 50) |

### astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | run 1

Status: answer. 336 s. 9 requests, 7 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261011-234551-2b9f. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261011-234551-2b9f/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261011-234551-2b9f/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 53) | pass 173 via tolerance (n7, claim check 113) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 53) | pass 125 via tolerance (n7, claim check 113) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 53) | pass 48 via tolerance (n7, claim check 113) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 12) | not asked |

### astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | run 2

Status: answer. 261 s. 8 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-235127-2634. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261011-235127-2634/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261011-235127-2634/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 50) | pass 173 via tolerance (n7, claim check 104) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 50) | pass 125 via tolerance (n7, claim check 104) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 50) | pass 48 via tolerance (n7, claim check 104) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 12) | not asked |

### astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | run 3

Status: answer. 176 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261011-235548-0e43. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261011-235548-0e43/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261011-235548-0e43/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 50) | pass 173 via tolerance (n7, claim check 96) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 50) | pass 125 via tolerance (n7, claim check 96) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 50) | pass 48 via tolerance (n7, claim check 96) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 12) | not asked |

### bradley-photutils-100gaussians | claude:claude-haiku-5-5 | run 1

Status: answer. 130 s. 14 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261011-235844-e6c3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261011-235844-e6c3/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261011-235844-e6c3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 44) | pass 5.152 via tolerance (n11, claim check 218) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 44) | pass 2.094 via tolerance (n11, claim check 218) |
| sources_detected | 82 exact | pass 82 (n22 metrics.n_sources, entry 142) | pass 82 via tolerance (n22, claim check 218) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n23 metrics.median_net_flux, entry 163) | pass 925.2 via tolerance (n23, claim check 218) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n23 table.rows[1][5], entry 163) | pass 760.2 via tolerance (n23, claim check 218) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n23 metrics.median_net_flux, entry 163) | pass 925.2 via tolerance (n23, claim check 218) |

### bradley-photutils-100gaussians | claude:claude-haiku-5-5 | run 2

Status: answer. 130 s. 12 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-000054-932d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261012-000054-932d/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261012-000054-932d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 41) | pass 5.152 via tolerance (n11, claim check 192) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 41) | pass 2.094 via tolerance (n11, claim check 192) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 116) | pass 82 via tolerance (n20, claim check 192) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 137) | pass 925.2 via tolerance (n21, claim check 192) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 137) | pass 760.2 via tolerance (n21, claim check 192) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 852.7649 (n23 metrics.star2_high, entry 159) | pass 852.8 via tolerance (n23, claim check 192) |

### bradley-photutils-100gaussians | claude:claude-haiku-5-5 | run 3

Status: answer. 222 s. 14 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261012-000304-43fa. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261012-000304-43fa/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261012-000304-43fa/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 49) | pass 5.15 via tolerance (n11, claim check 209) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 49) | pass 2.09 via tolerance (n11, claim check 209) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 138) | pass 82 via tolerance (n20, claim check 209) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 159) | pass 925.2 via tolerance (n21, claim check 209) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 159) | pass 760.2 via tolerance (n21, claim check 209) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 159) | pass 925.2 via tolerance (n21, claim check 209) |

### danecek2021-bcftools | claude:claude-haiku-5-5 | run 1

Status: answer. 83 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-000647-8e0d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run1/home/sessions/20261012-000647-8e0d/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run1/home/sessions/20261012-000647-8e0d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n2 metrics.n_snps, entry 15) | pass 1955 via tolerance (n2, claim check 52) |
| indel_records | 248 exact | pass 248 (n2 metrics.n_indels, entry 15) | pass 248 via tolerance (n2, claim check 52) |
| total_records | 2210 exact | pass 2210 (n2 metrics.n_records, entry 15) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n2 metrics.ts_tv, entry 15) | pass 2.2 via tolerance (n2, claim check 52) |
| records_in_region | 1137 exact | pass 1137 (n1 metrics.n_records, entry 12) | pass 1137 via tolerance (n1, claim check 52) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 18) | pass 328 via tolerance (n3, claim check 52) |

### danecek2021-bcftools | claude:claude-haiku-5-5 | run 2

Status: answer. 50 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-000810-a120. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run2/home/sessions/20261012-000810-a120/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run2/home/sessions/20261012-000810-a120/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 12) | pass 1955 via tolerance (n1, claim check 35) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 12) | pass 248 via tolerance (n1, claim check 35) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 12) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 12) | pass 2.2 via tolerance (n1, claim check 35) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 15) | pass 1137 via tolerance (n2, claim check 35) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 18) | pass 328 via tolerance (n3, claim check 35) |

### danecek2021-bcftools | claude:claude-haiku-5-5 | run 3

Status: answer. 66 s. 6 requests, 5 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-000900-89d2. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run3/home/sessions/20261012-000900-89d2/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run3/home/sessions/20261012-000900-89d2/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 15) | pass 1955 via tolerance (n1, claim check 56) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 15) | pass 248 via tolerance (n1, claim check 56) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 15) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 15) | pass 2.2 via tolerance (n1, claim check 56) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 18) | pass 1137 via tolerance (n2, claim check 56) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 26) | pass 328 via tolerance (n3, claim check 56) |

### gramfort2013-mne-sample | claude:claude-haiku-5-5 | run 1

Status: answer. 141 s. 11 requests, 11 tool calls (2 failed), 0 nudges, 0 plan reminders, 3 unsourced.
Session: 20261012-001006-9780. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run1/home/sessions/20261012-001006-9780/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run1/home/sessions/20261012-001006-9780/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 15) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 15) | pass 72 via tolerance (n2, claim check 168) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 15) | pass 73 via tolerance (n7, claim check 168) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 15) | pass 73 via tolerance (n7, claim check 168) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 15) | pass 70 via tolerance (n7, claim check 168) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 15) | pass 15 via tolerance (n2, claim check 168) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 15) | pass 16 via tolerance (n7, claim check 168) |
| epochs_dropped | 10 exact | pass 10 (n7 metrics.n_dropped, entry 70) | not asked |
| epochs_kept | 309 exact | pass 309 (n7 metrics.n_epochs, entry 70) | pass 309 via tolerance (n7, claim check 168) |
| auditory_left_kept | 68 exact | pass 68 (n7 metrics.count_auditory_left, entry 70) | pass 68 via tolerance (n8, claim check 168) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n12 metrics.gfp_latency_s, entry 104) | pass 0.093 via tolerance (n12, claim check 168) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.10613 (n12 metrics.gfp_amplitude, entry 104) | pass 42.11 via tolerance (n12, claim check 168) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n12 metrics.peak_latency_s, entry 104) | pass 0.087 via tolerance (n12, claim check 168) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.9631 (n12 metrics.peak_amplitude, entry 104) | pass 198.96 via tolerance (n12, claim check 168) |

### gramfort2013-mne-sample | claude:claude-haiku-5-5 | run 2

Status: answer. 148 s. 14 requests, 16 tool calls (2 failed), 0 nudges, 1 plan reminders, 3 unsourced.
Session: 20261012-001228-6d3a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run2/home/sessions/20261012-001228-6d3a/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run2/home/sessions/20261012-001228-6d3a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 30) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 30) | pass 72 via tolerance (n2, claim check 207) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 30) | pass 73 via tolerance (n9, claim check 207) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 30) | pass 73 via tolerance (n9, claim check 207) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 30) | pass 70 via tolerance (n9, claim check 207) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 30) | pass 15 via tolerance (n2, claim check 207) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 30) | pass 16 via tolerance (n9, claim check 207) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 101) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 101) | pass 309 via tolerance (n9, claim check 207) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 101) | pass 68 via tolerance (n10, claim check 207) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n14 metrics.gfp_latency_s, entry 133) | pass 0.1 via tolerance (n4, claim check 207) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.10613 (n14 metrics.gfp_amplitude, entry 133) | pass 42.11 via tolerance (n14, claim check 207) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n14 metrics.peak_latency_s, entry 133) | pass 0.08 via tolerance (n14, claim check 207) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.9631 (n14 metrics.peak_amplitude, entry 133) | pass 198.96 via tolerance (n14, claim check 207) |

### gramfort2013-mne-sample | claude:claude-haiku-5-5 | run 3

Status: answer. 147 s. 16 requests, 14 tool calls (1 failed), 0 nudges, 1 plan reminders, 7 unsourced.
Session: 20261012-001457-3734. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run3/home/sessions/20261012-001457-3734/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 7 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run3/home/sessions/20261012-001457-3734/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 26) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 26) | pass 72 via tolerance (n2, claim check 208) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 26) | FAIL 72 (n2, claim check 208) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 26) | FAIL 72 (n2, claim check 208) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 26) | FAIL 68 (n10, claim check 208) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 26) | FAIL 10 (n15, claim check 208) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 26) | FAIL 10 (n15, claim check 208) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 115) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 115) | pass 309 via tolerance (n9, claim check 208) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 115) | pass 68 via tolerance (n10, claim check 208) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n14 metrics.gfp_latency_s, entry 149) | pass 0.0932 via tolerance (n14, claim check 208) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n14 metrics.gfp_amplitude, entry 149) | pass 42.07 via tolerance (n14, claim check 208) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n14 metrics.peak_latency_s, entry 149) | pass 0.0866 via tolerance (n14, claim check 208) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n14 metrics.peak_amplitude, entry 149) | pass 198.8 via tolerance (n14, claim check 208) |

### kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | run 1

Status: answer. 172 s. 10 requests, 9 tool calls (0 failed), 0 nudges, 1 plan reminders, 8 unsourced.
Session: 20261012-001724-ec05. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261012-001724-ec05/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 8 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261012-001724-ec05/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 23) | pass -15895.48 via tolerance (n2, claim check 94) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 12) | pass 2375 via tolerance (n2, claim check 94) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 12) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 23) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | run 2

Status: answer. 161 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 5 unsourced.
Session: 20261012-002016-f4dd. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261012-002016-f4dd/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261012-002016-f4dd/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 20) | pass -15895.48 via tolerance (n2, claim check 61) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 12) | pass 2375 via tolerance (n2, claim check 61) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 12) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 20) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | run 3

Status: answer. 143 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-002257-5eb3. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261012-002257-5eb3/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261012-002257-5eb3/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 15) | pass -15895.48 via tolerance (n2, claim check 60) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 12) | pass 2375 via tolerance (n2, claim check 60) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 12) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 15) | not asked |

### lackey2015-tb-default | claude:claude-haiku-5-5 | run 1

Status: answer. 81 s. 11 requests, 16 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-002520-aca5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lackey2015-tb-default/run1/home/sessions/20261012-002520-aca5/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lackey2015-tb-default/run1/home/sessions/20261012-002520-aca5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 12) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 85) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006039 (n8 table.rows[0][0], entry 97) | pass 0.006039 via tolerance (n8, claim check 127) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 41) | pass 0.00003945 via tolerance (n8, claim check 127) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 44) | FAIL 0.707 (n7, claim check 127) |
| p_poverty | 0.03436 ±0.0005 | pass 0.034363 (n8 table.rows[3][0], entry 97) | pass 0.034363 via tolerance (n8, claim check 127) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 85) | pass 4.782 via tolerance (n7, claim check 127) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 85) | pass 3.052 via tolerance (n7, claim check 127) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 85) | pass 7.491 via tolerance (n7, claim check 127) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 85) | pass 2.08 via tolerance (n7, claim check 127) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 85) | pass 1.214 via tolerance (n7, claim check 127) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 85) | pass 3.563 via tolerance (n7, claim check 127) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 85) | pass 0.878 via tolerance (n7, claim check 127) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 85) | pass 0.444 via tolerance (n7, claim check 127) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 85) | pass 1.733 via tolerance (n7, claim check 127) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 85) | pass 3.038 via tolerance (n7, claim check 127) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 85) | pass 1.578 via tolerance (n7, claim check 127) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 85) | pass 5.851 via tolerance (n7, claim check 127) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 85) | pass 2.222 via tolerance (n7, claim check 127) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 85) | pass 1.401 via tolerance (n7, claim check 127) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 85) | pass 3.525 via tolerance (n7, claim check 127) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 85) | pass 2.303 via tolerance (n7, claim check 127) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 85) | pass 1.5 via tolerance (n7, claim check 127) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 85) | pass 3.536 via tolerance (n7, claim check 127) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 85) | pass 1.392 via tolerance (n7, claim check 127) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 85) | pass 0.417 via tolerance (n7, claim check 127) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 85) | pass 4.654 via tolerance (n7, claim check 127) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 85) | pass 1.55 via tolerance (n7, claim check 127) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 85) | pass 1.032 via tolerance (n7, claim check 127) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 85) | pass 2.329 via tolerance (n7, claim check 127) |

### lackey2015-tb-default | claude:claude-haiku-5-5 | run 2

Status: answer. 69 s. 7 requests, 11 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-002641-cce4. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lackey2015-tb-default/run2/home/sessions/20261012-002641-cce4/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lackey2015-tb-default/run2/home/sessions/20261012-002641-cce4/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 12) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 69) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 35) | pass 0.00604 via tolerance (n8, claim check 99) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 38) | pass 0.000039 via tolerance (n8, claim check 99) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 41) | FAIL 0.71 (n7, claim check 99) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 44) | pass 0.0344 via tolerance (n8, claim check 99) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 69) | pass 4.78 via tolerance (n7, claim check 99) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 69) | pass 3.05 via tolerance (n7, claim check 99) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 69) | pass 7.49 via tolerance (n7, claim check 99) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 69) | pass 2.08 via tolerance (n7, claim check 99) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 69) | pass 1.21 via tolerance (n7, claim check 99) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 69) | pass 3.56 via tolerance (n7, claim check 99) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 69) | pass 0.88 via tolerance (n7, claim check 99) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 69) | pass 0.44 via tolerance (n7, claim check 99) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 69) | pass 1.73 via tolerance (n7, claim check 99) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 69) | pass 3.04 via tolerance (n7, claim check 99) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 69) | pass 1.58 via tolerance (n7, claim check 99) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 69) | pass 5.85 via tolerance (n7, claim check 99) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 69) | pass 2.22 via tolerance (n7, claim check 99) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 69) | pass 1.4 via tolerance (n7, claim check 99) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 69) | pass 3.52 via tolerance (n7, claim check 99) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 69) | pass 2.3 via tolerance (n7, claim check 99) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 69) | pass 1.5 via tolerance (n7, claim check 99) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 69) | pass 3.54 via tolerance (n7, claim check 99) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 69) | pass 1.39 via tolerance (n7, claim check 99) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 69) | pass 0.42 via tolerance (n7, claim check 99) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 69) | pass 4.65 via tolerance (n7, claim check 99) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 69) | pass 1.55 via tolerance (n7, claim check 99) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 69) | pass 1.03 via tolerance (n7, claim check 99) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 69) | pass 2.33 via tolerance (n7, claim check 99) |

### lackey2015-tb-default | claude:claude-haiku-5-5 | run 3

Status: answer. 120 s. 12 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 2 unsourced.
Session: 20261012-002750-ee7c. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lackey2015-tb-default/run3/home/sessions/20261012-002750-ee7c/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/lackey2015-tb-default/run3/home/sessions/20261012-002750-ee7c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 12) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 72) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 38) | pass 0.006039 via tolerance (n8, claim check 131) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 41) | pass 0.00003945 via tolerance (n8, claim check 131) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 44) | FAIL 0.707 (n7, claim check 131) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 47) | pass 0.03436 via tolerance (n8, claim check 131) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 72) | pass 4.78 via tolerance (n7, claim check 131) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 72) | pass 3.05 via tolerance (n7, claim check 131) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 72) | pass 7.49 via tolerance (n7, claim check 131) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 72) | pass 2.08 via tolerance (n7, claim check 131) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 72) | pass 1.21 via tolerance (n7, claim check 131) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 72) | pass 3.56 via tolerance (n7, claim check 131) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 72) | pass 0.88 via tolerance (n7, claim check 131) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 72) | pass 0.44 via tolerance (n7, claim check 131) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 72) | pass 1.73 via tolerance (n7, claim check 131) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 72) | pass 3.04 via tolerance (n7, claim check 131) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 72) | pass 1.58 via tolerance (n7, claim check 131) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 72) | pass 5.85 via tolerance (n7, claim check 131) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 72) | pass 2.22 via tolerance (n7, claim check 131) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 72) | pass 1.4 via tolerance (n7, claim check 131) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 72) | pass 3.52 via tolerance (n7, claim check 131) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 72) | pass 2.3 via tolerance (n7, claim check 131) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 72) | pass 1.5 via tolerance (n7, claim check 131) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 72) | pass 3.54 via tolerance (n7, claim check 131) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 72) | pass 1.39 via tolerance (n7, claim check 131) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 72) | pass 0.42 via tolerance (n7, claim check 131) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 72) | pass 4.65 via tolerance (n7, claim check 131) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 72) | pass 1.55 via tolerance (n7, claim check 131) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 72) | pass 1.03 via tolerance (n7, claim check 131) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 72) | pass 2.33 via tolerance (n7, claim check 131) |

### ljosa2012-bbbc005 | claude:claude-haiku-5-5 | run 1

Status: answer. 447 s. 14 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-002951-ae7a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/ljosa2012-bbbc005/run1/home/sessions/20261012-002951-ae7a/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/ljosa2012-bbbc005/run1/home/sessions/20261012-002951-ae7a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.939884 (n17 stdout, entry 151) | pass 0.94 via tolerance (n12, claim check 185) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n12 metrics.mean_abs_error, entry 113) | pass 3.01 via tolerance (n17, claim check 185) |
| true_total_sample | 5007 exact | pass 5007 (n12 metrics.true_total, entry 113) | not asked |

### ljosa2012-bbbc005 | claude:claude-haiku-5-5 | run 2

Status: answer. 428 s. 16 requests, 16 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-003721-7b3a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/ljosa2012-bbbc005/run2/home/sessions/20261012-003721-7b3a/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/ljosa2012-bbbc005/run2/home/sessions/20261012-003721-7b3a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9399 (n11 metrics.detected_to_true_ratio, entry 120) | pass 0.9399 via tolerance (n16, claim check 206) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n11 metrics.mean_abs_error, entry 120) | pass 3.01 via tolerance (n16, claim check 206) |
| true_total_sample | 5007 exact | pass 5007 (n11 metrics.true_total, entry 120) | not asked |

### ljosa2012-bbbc005 | claude:claude-haiku-5-5 | run 3

Status: answer. 442 s. 9 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-004431-e841. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/ljosa2012-bbbc005/run3/home/sessions/20261012-004431-e841/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/ljosa2012-bbbc005/run3/home/sessions/20261012-004431-e841/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| ratio_sample | 0.9379 ±0.02 | pass 0.9398842 (n16 metrics.ratio_otsu_shape, entry 115) | pass 0.94 via tolerance (n11, claim check 147) |
| mean_abs_error_sample | 3.11 ±0.1 | pass 3.01 (n11 metrics.mean_abs_error, entry 80) | pass 3.01 via tolerance (n17, claim check 147) |
| true_total_sample | 5007 exact | pass 5007 (n11 metrics.true_total, entry 80) | not asked |

### manders1993-coloc | claude:claude-haiku-5-5 | run 1

Status: answer. 86 s. 10 requests, 13 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005155-a7c6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/manders1993-coloc/run1/home/sessions/20261012-005155-a7c6/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/manders1993-coloc/run1/home/sessions/20261012-005155-a7c6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 39) | pass 0.721 via tolerance (n9, claim check 119) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 43) | pass 0.443 via tolerance (n11, claim check 119) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 47) | pass 0.164 via tolerance (n7, claim check 119) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 39) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 43) | pass 0.5 via tolerance (n11, claim check 119) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 47) | pass 0.25 via tolerance (n7, claim check 119) |

### manders1993-coloc | claude:claude-haiku-5-5 | run 2

Status: answer. 36 s. 4 requests, 8 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005321-98ec. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/manders1993-coloc/run2/home/sessions/20261012-005321-98ec/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/manders1993-coloc/run2/home/sessions/20261012-005321-98ec/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 39) | pass 0.721 via tolerance (n5, claim check 65) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 42) | pass 0.443 via tolerance (n6, claim check 65) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 45) | pass 0.164 via tolerance (n7, claim check 65) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 39) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 42) | pass 0.5 via tolerance (n6, claim check 65) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 45) | pass 0.25 via tolerance (n7, claim check 65) |

### manders1993-coloc | claude:claude-haiku-5-5 | run 3

Status: answer. 47 s. 5 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-005357-258d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/manders1993-coloc/run3/home/sessions/20261012-005357-258d/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/manders1993-coloc/run3/home/sessions/20261012-005357-258d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| pearson_a_b | 0.72 ±0.01 | pass 0.7212973 (n5 metrics.pearson_r, entry 40) | pass 0.721 via tolerance (n5, claim check 80) |
| pearson_a_c | 0.44 ±0.01 | pass 0.4425947 (n6 metrics.pearson_r, entry 43) | pass 0.443 via tolerance (n6, claim check 80) |
| pearson_a_d | 0.16 ±0.01 | pass 0.163892 (n7 metrics.pearson_r, entry 46) | pass 0.164 via tolerance (n7, claim check 80) |
| m1_a_b | 0.75 ±0.0001 | pass 0.75 (n5 metrics.manders_m1, entry 40) | not asked |
| m1_a_c | 0.5 ±0.0001 | pass 0.5 (n6 metrics.manders_m1, entry 43) | pass 0.5 via tolerance (n6, claim check 80) |
| m2_a_d | 0.25 ±0.0001 | pass 0.25 (n7 metrics.manders_m1, entry 46) | pass 0.25 via tolerance (n7, claim check 80) |

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 1

Status: answer. 248 s. 20 requests, 20 tool calls (1 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261012-005445-3bb5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261012-005445-3bb5/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run1/home/sessions/20261012-005445-3bb5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 62) | pass 35.69 via rounding (n6, claim check 222) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 62) | pass 0.03156 via tolerance (n5, claim check 222) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 62) | pass 36 via tolerance (n5, claim check 222) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 62) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 62) | pass 0.8596 via tolerance (n5, claim check 222) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 62) | pass 1.057 via tolerance (n4, claim check 222) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 62) | pass 2.809 via tolerance (n6, claim check 222) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 62) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n14 metrics.F_Age, entry 139) | FAIL 26.78 (n10, claim check 222) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n14 metrics.F_Treatment, entry 139) | FAIL 26.78 (n10, claim check 222) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n14 metrics.F_Replicate, entry 139) | FAIL 6.012 (n10, claim check 222) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n14 metrics.p_Replicate, entry 139) | FAIL 0.00007083 (n16, claim check 222) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n14 metrics.F_Age_x_Treatment_x_Replicate, entry 139) | FAIL 3.675 (n13, claim check 222) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n14 metrics.p_Age_x_Treatment_x_Replicate, entry 139) | pass 0.0157 via rounding (n14, claim check 222) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n15 metrics.H, entry 151) | pass 9.35 via rounding (n15, claim check 222) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 12) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n15 metrics.p_value, entry 151) | pass 0.025 via rounding (n15, claim check 222) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n15 metrics.min_p_adjusted, entry 151) | pass 0.0397 via tolerance (n15, claim check 222) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n16 metrics.H, entry 154) | pass 23.87 via tolerance (n16, claim check 222) |

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 2

Status: answer. 201 s. 14 requests, 19 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261012-005853-90f1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261012-005853-90f1/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run2/home/sessions/20261012-005853-90f1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 60) | pass 35.69 via rounding (n6, claim check 161) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 60) | pass 0.032 via tolerance (n6, claim check 161) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 60) | pass 36 via tolerance (n5, claim check 161) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 60) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 60) | pass 0.86 via rounding (n5, claim check 161) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 60) | pass 1.057 via tolerance (n4, claim check 161) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 60) | pass 2.809 via tolerance (n6, claim check 161) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 60) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 68) | FAIL 25 (n8, claim check 161) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 68) | FAIL 25 (n8, claim check 161) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 68) | FAIL 9.35 (n8, claim check 161) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 68) | FAIL 0.001 (n5, claim check 161) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n7 metrics.F_Age_x_Treatment_x_Replicate, entry 68) | FAIL 4.235 (n9, claim check 161) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n7 metrics.p_Age_x_Treatment_x_Replicate, entry 68) | FAIL 0.017 (n6, claim check 161) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n8 metrics.H, entry 75) | pass 9.35 via rounding (n8, claim check 161) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 12) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n8 metrics.p_value, entry 75) | pass 0.025 via rounding (n8, claim check 161) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n8 metrics.min_p_adjusted, entry 75) | pass 0.04 via rounding (n6, claim check 161) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n9 metrics.H, entry 78) | pass 23.87 via tolerance (n9, claim check 161) |

### oreshkova2024-qmp-honeybee | claude:claude-haiku-5-5 | run 3

Status: answer. 212 s. 14 requests, 17 tool calls (0 failed), 0 nudges, 1 plan reminders, 3 unsourced.
Session: 20261012-010214-f7ae. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261012-010214-f7ae/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 3 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/oreshkova2024-qmp-honeybee/run3/home/sessions/20261012-010214-f7ae/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| protein_f_age | 35.693 ±0.001 | pass 35.6928 (n6 metrics.F_age, entry 55) | pass 35.69 via rounding (n6, claim check 165) |
| protein_f_treatment | 0.032 ±0.0005 | pass 0.03156445 (n6 metrics.F_treatment, entry 55) | pass 0.032 via tolerance (n6, claim check 165) |
| protein_f_replicate | 36 ±0.001 | pass 35.99952 (n6 metrics.F_replicate, entry 55) | pass 36 via tolerance (n5, claim check 165) |
| protein_p_age | 1.356e-7 ±1e-7 | pass 1.356049e-7 (n6 metrics.p_age, entry 55) | not asked |
| protein_p_treatment | 0.8596 ±0.0001 | pass 0.8595854 (n6 metrics.p_treatment, entry 55) | pass 0.86 via rounding (n5, claim check 165) |
| protein_f_age_x_treatment | 1.057 ±0.001 | pass 1.056653 (n6 metrics.F_age_x_treatment, entry 55) | pass 1.057 via tolerance (n4, claim check 165) |
| protein_f_age_x_replicate | 2.809 ±0.001 | pass 2.808506 (n6 metrics.F_age_x_replicate, entry 55) | pass 2.809 via tolerance (n6, claim check 165) |
| protein_df_residual | 60 exact | pass 60 (n6 metrics.df_residual, entry 55) | not asked |
| acini_f_age | 27.78 ±0.001 | pass 27.77991 (n7 metrics.F_Age, entry 59) | pass 27.78 via tolerance (n7, claim check 165) |
| acini_f_treatment | 29.156 ±0.001 | pass 29.15553 (n7 metrics.F_Treatment, entry 59) | pass 29.16 via rounding (n7, claim check 165) |
| acini_f_replicate | 6.853 ±0.001 | pass 6.853006 (n7 metrics.F_Replicate, entry 59) | pass 6.853 via tolerance (n7, claim check 165) |
| acini_p_replicate | 0.00209 ±0.00001 | pass 0.002086653 (n7 metrics.p_Replicate, entry 59) | FAIL 0.002 (n10, claim check 165) |
| acini_f_three_way | 4.457 ±0.001 | pass 4.457195 (n12 stdout, entry 95) | pass 4.457 via tolerance (n13, claim check 165) |
| acini_p_three_way | 0.01568 ±0.00001 | pass 0.01567617 (n7 metrics.p_Age_x_Treatment_x_Replicate, entry 59) | pass 0.016 via rounding (n7, claim check 165) |
| fas_kruskal_chi2 | 9.3498 ±0.0001 | pass 9.349822 (n8 metrics.H, entry 71) | pass 9.35 via rounding (n8, claim check 165) |
| fas_kruskal_df | 3 exact | pass 3 (n1 table.rows[0][3], entry 12) | not asked |
| fas_kruskal_p | 0.02498 ±0.00001 | pass 0.02498385 (n8 metrics.p_value, entry 71) | pass 0.025 via rounding (n8, claim check 165) |
| fas_dunn_padj | 0.0397 ±0.0001 | pass 0.03969327 (n8 metrics.min_p_adjusted, entry 71) | pass 0.04 via rounding (n6, claim check 165) |
| fas_replicate_chi2 | 23.87 ±0.005 | pass 23.87005 (n9 metrics.H, entry 74) | pass 23.87 via tolerance (n9, claim check 165) |

### rossi1980-recidivism | claude:claude-haiku-5-5 | run 1

Status: answer. 197 s. 21 requests, 18 tool calls (3 failed), 0 nudges, 2 plan reminders, 0 unsourced.
Session: 20261012-010546-5dc5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rossi1980-recidivism/run1/home/sessions/20261012-010546-5dc5/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rossi1980-recidivism/run1/home/sessions/20261012-010546-5dc5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 12) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 38) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n3 metrics.coef_fin, entry 66) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n3 metrics.coef_age, entry 66) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n3 metrics.coef_prio, entry 66) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.684 (n4 stdout, entry 93) | pass 0.684 via tolerance (n4, claim check 192) |
| p_fin | 0.0474 ±0.001 | pass 0.0474 (n4 stdout, entry 93) | pass 0.0474 via tolerance (n4, claim check 192) |
| concordance | 0.64 ±0.005 | pass 0.6403 (n4 stdout, entry 93) | pass 0.64 via tolerance (n4, claim check 192) |
| logrank_chi2_fin | 3.838 ±0.01 | pass 3.83757 (n2 metrics.logrank_chi2, entry 38) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.050116 (n7 table.rows[0][0], entry 170) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n3 metrics.ph_test_min_p, entry 66) | pass 0.0007 via tolerance (n3, claim check 192) |

### rossi1980-recidivism | claude:claude-haiku-5-5 | run 2

Status: answer. 67 s. 9 requests, 9 tool calls (3 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-010903-11eb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rossi1980-recidivism/run2/home/sessions/20261012-010903-11eb/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rossi1980-recidivism/run2/home/sessions/20261012-010903-11eb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 12) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 43) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n2 metrics.coef_fin, entry 43) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n2 metrics.coef_age, entry 43) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n2 metrics.coef_prio, entry 43) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.684 (n3 stdout, entry 69) | pass 0.684 via tolerance (n3, claim check 108) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n2 metrics.p_fin, entry 43) | pass 0.047 via tolerance (n3, claim check 108) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n2 metrics.concordance, entry 43) | pass 0.64 via tolerance (n2, claim check 108) |
| logrank_chi2_fin | 3.838 ±0.01 | FAIL 2.503162 (n2 table.rows[2][6], entry 43) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05 (n2 data.data.alpha, entry 43) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n2 metrics.ph_test_min_p, entry 43) | pass 0.00071 via tolerance (n4, claim check 108) |

### rossi1980-recidivism | claude:claude-haiku-5-5 | run 3

Status: answer. 80 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011010-494b. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rossi1980-recidivism/run3/home/sessions/20261012-011010-494b/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/rossi1980-recidivism/run3/home/sessions/20261012-011010-494b/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| subjects | 432 exact | pass 432 (n1 metrics.n_rows, entry 12) | not asked |
| events | 114 exact | pass 114 (n2 metrics.events, entry 41) | not asked |
| coef_fin | -0.3794 ±0.0005 | pass -0.3794222 (n2 metrics.coef_fin, entry 41) | not asked |
| coef_age | -0.0574 ±0.0005 | pass -0.05743774 (n2 metrics.coef_age, entry 41) | not asked |
| coef_prio | 0.0915 ±0.0005 | pass 0.09149708 (n2 metrics.coef_prio, entry 41) | not asked |
| hazard_ratio_fin | 0.684 ±0.002 | pass 0.6842567 (n2 metrics.hr_fin, entry 41) | pass 0.684 via tolerance (n2, claim check 58) |
| p_fin | 0.0474 ±0.001 | pass 0.0474161 (n2 metrics.p_fin, entry 41) | pass 0.047 via tolerance (n2, claim check 58) |
| concordance | 0.64 ±0.005 | pass 0.6403292 (n2 metrics.concordance, entry 41) | pass 0.64 via tolerance (n2, claim check 58) |
| logrank_chi2_fin | 3.838 ±0.01 | FAIL 2.503162 (n2 table.rows[2][6], entry 41) | not asked |
| logrank_p_fin | 0.0501 ±0.001 | pass 0.05 (n2 data.data.alpha, entry 41) | not asked |
| ph_test_p_age | 0.0007 ±0.0005 | pass 0.000713596 (n2 metrics.ph_test_min_p, entry 41) | pass 0.00071 via tolerance (n2, claim check 58) |

### schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | run 1

Status: answer. 39 s. 4 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011130-a6e9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261012-011130-a6e9/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261012-011130-a6e9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 12) | pass 9 via tolerance (n4, claim check 45) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 12) | pass 100.083 via rounding (n2, claim check 45) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 12) | pass 799.917 via rounding (n2, claim check 45) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 23) | pass 243.54 via tolerance (n3, claim check 45) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 23) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 12) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 15) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | run 2

Status: answer. 36 s. 4 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011210-c785. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261012-011210-c785/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261012-011210-c785/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 12) | pass 9 via tolerance (n4, claim check 44) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 12) | pass 100.083 via rounding (n2, claim check 44) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 12) | pass 799.917 via rounding (n2, claim check 44) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 23) | pass 243.54 via tolerance (n3, claim check 44) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 23) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 12) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 15) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-haiku-5-5 | run 3

Status: answer. 57 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011246-68a5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261012-011246-68a5/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261012-011246-68a5/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 12) | pass 9 via tolerance (n4, claim check 52) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 12) | pass 100.083 via rounding (n2, claim check 52) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 12) | pass 799.917 via rounding (n2, claim check 52) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 23) | pass 243.54 via tolerance (n3, claim check 52) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 23) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 12) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 15) | not asked |

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 1

Status: answer. 119 s. 7 requests, 8 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011343-c904. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261012-011343-c904/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run1/home/sessions/20261012-011343-c904/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 53) | pass 3 via tolerance (n4, claim check 111) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 53) | pass 1578 via tolerance (n4, claim check 111) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 53) | pass 0.001845384 via tolerance (n4, claim check 111) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 53) | pass 0.1118672 via tolerance (n4, claim check 111) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 53) | pass 35.08762 via tolerance (n6, claim check 111) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 53) | pass 24 via tolerance (n4, claim check 111) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 53) | pass 0.004791726 via tolerance (n4, claim check 111) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 53) | pass 30 via tolerance (n4, claim check 111) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 53) | pass 0.005986962 via tolerance (n4, claim check 111) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 53) | pass 649 via tolerance (n4, claim check 111) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 53) | pass 0.006039754 via tolerance (n4, claim check 111) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 53) | pass 37 via tolerance (n4, claim check 111) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 53) | pass 0.007380042 via tolerance (n4, claim check 111) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 12) | not asked |

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 2

Status: answer. 90 s. 5 requests, 4 tool calls (2 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-011542-5c2d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261012-011542-5c2d/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run2/home/sessions/20261012-011542-5c2d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 53) | pass 3 via tolerance (n4, claim check 85) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 53) | pass 1578 via tolerance (n4, claim check 85) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 53) | pass 0.00185 via rounding (n4, claim check 85) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 53) | pass 0.112 via rounding (n4, claim check 85) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 53) | pass 35.09 via rounding (n5, claim check 85) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 53) | pass 24 via tolerance (n4, claim check 85) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 53) | pass 0.00479 via rounding (n4, claim check 85) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 53) | pass 30 via tolerance (n4, claim check 85) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 53) | pass 0.00599 via rounding (n4, claim check 85) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 53) | pass 649 via tolerance (n4, claim check 85) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 53) | pass 0.00604 via tolerance (n4, claim check 85) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 53) | pass 37 via tolerance (n4, claim check 85) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 53) | pass 0.00738 via tolerance (n4, claim check 85) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 12) | not asked |

### wang2023-cuproptosis-oa | claude:claude-haiku-5-5 | run 3

Status: answer. 88 s. 5 requests, 3 tool calls (2 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011712-613a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261012-011712-613a/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/wang2023-cuproptosis-oa/run3/home/sessions/20261012-011712-613a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| overlap_1 | 3 exact | pass 3 (n4 metrics.top_overlap, entry 51) | pass 3 via tolerance (n4, claim check 81) |
| set_size_1 | 1578 exact | pass 1578 (n4 metrics.top_set_size, entry 51) | pass 1578 via tolerance (n4, claim check 81) |
| p_value_1 | 0.0018453476993364856 ±0.000001 | pass 0.001845384 (n4 metrics.top_p_value, entry 51) | pass 0.00185 via rounding (n4, claim check 81) |
| p_adjusted_1 | 0.11186607610867805 ±0.00001 | pass 0.1118672 (n4 metrics.top_p_adjusted, entry 51) | pass 0.112 via rounding (n4, claim check 81) |
| odds_ratio_1 | 35.08761904761905 ±0.001 | pass 35.08762 (n4 metrics.top_odds_ratio, entry 51) | pass 35.09 via rounding (n5, claim check 81) |
| set_size_2 | 24 exact | pass 24 (n4 metrics.set_size_2, entry 51) | pass 24 via tolerance (n4, claim check 81) |
| p_value_2 | 0.004791660011821214 ±0.000001 | pass 0.004791726 (n4 metrics.p_value_2, entry 51) | pass 0.00479 via rounding (n4, claim check 81) |
| set_size_3 | 30 exact | pass 30 (n4 metrics.set_size_3, entry 51) | pass 30 via tolerance (n4, claim check 81) |
| p_value_3 | 0.0059868860535258585 ±0.000001 | pass 0.005986962 (n4 metrics.p_value_3, entry 51) | pass 0.00599 via rounding (n4, claim check 81) |
| set_size_4 | 649 exact | pass 649 (n4 metrics.set_size_4, entry 51) | pass 649 via tolerance (n4, claim check 81) |
| p_value_4 | 0.0060396749482483575 ±0.000001 | pass 0.006039754 (n4 metrics.p_value_4, entry 51) | pass 0.00604 via tolerance (n4, claim check 81) |
| set_size_5 | 37 exact | pass 37 (n4 metrics.set_size_5, entry 51) | pass 37 via tolerance (n4, claim check 81) |
| p_value_5 | 0.007379956522320185 ±0.000001 | pass 0.007380042 (n4 metrics.p_value_5, entry 51) | pass 0.00738 via tolerance (n4, claim check 81) |
| n_sets_tested | 4026 exact | pass 4026 (n1 metrics.n_gene_sets, entry 12) | not asked |

### yun2026-lasv-elisa | claude:claude-haiku-5-5 | run 1

Status: answer. 207 s. 10 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-011840-cdee. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/yun2026-lasv-elisa/run1/home/sessions/20261012-011840-cdee/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/yun2026-lasv-elisa/run1/home/sessions/20261012-011840-cdee/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 62) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.5869 (n4 stdout, entry 83) | pass 7.5869 via tolerance (n4, claim check 126) |
| conc_d2 | 3.7072 ±0.001 | pass 3.7072 (n4 stdout, entry 83) | pass 3.7072 via tolerance (n4, claim check 126) |
| conc_d3 | 1.8719 ±0.001 | pass 1.8719 (n4 stdout, entry 83) | pass 1.8719 via tolerance (n4, claim check 126) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n3 metrics.mean_conc_STD_4, entry 62) | pass 0.9171 via tolerance (n4, claim check 126) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n3 metrics.mean_conc_STD_5, entry 62) | pass 0.4637 via tolerance (n4, claim check 126) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334 (n4 stdout, entry 83) | pass 0.2334 via tolerance (n4, claim check 126) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n3 metrics.mean_conc_STD_7, entry 62) | pass 0.1205 via tolerance (n4, claim check 126) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n3 metrics.mean_conc_STD_8, entry 62) | pass 0.0558 via tolerance (n4, claim check 126) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n3 metrics.mean_conc_STD_9, entry 62) | pass 0.0266 via tolerance (n4, claim check 126) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n3 metrics.mean_conc_STD_10, entry 62) | pass 0.0139 via tolerance (n4, claim check 126) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07 (n4 stdout, entry 83) | pass 11.07 via tolerance (n4, claim check 126) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n3 metrics.cv_conc_pct_STD_4, entry 62) | pass 10.93 via tolerance (n4, claim check 126) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 62) | pass 15.71 via tolerance (n4, claim check 126) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 62) | pass 15.55 via tolerance (n4, claim check 126) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n3 metrics.cv_conc_pct_STD_9, entry 62) | pass 25.89 via tolerance (n4, claim check 126) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 62) | pass 21.92 via tolerance (n4, claim check 126) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n3 table.rows[10][6], entry 62) | pass 26.62 via tolerance (n4, claim check 126) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.8867 (n4 stdout, entry 83) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97 (n4 stdout, entry 83) | pass 97.97 via tolerance (n4, claim check 126) |
| recovery_d4 | 94.74 ±0.06 | pass 94.74 (n4 stdout, entry 83) | pass 94.74 via tolerance (n4, claim check 126) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55 (n4 stdout, entry 83) | pass 99.55 via tolerance (n4, claim check 126) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71 (n4 stdout, entry 83) | pass 88.71 via tolerance (n4, claim check 126) |
| recovery_d8_printed (reference) | 92 ±0.06 | match 91.99465 (n3 file:/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/yun2026-lasv-elisa/run1/home/sessions/20261012-011840-cdee/work/fit_standard_curve-3/samples.csv, entry 62) | differs 92.56 (n4, claim check 126) |
| hpc_conc | 1.9932 ±0.001 | pass 1.9932 (n4 stdout, entry 83) | pass 1.9932 via tolerance (n4, claim check 126) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n3 metrics.cv_conc_pct_HPC, entry 62) | pass 22.45 via tolerance (n4, claim check 126) |
| hpc_recovery | 107.28 ±0.06 | pass 107.28 (n4 stdout, entry 83) | pass 107.28 via tolerance (n4, claim check 126) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 62) | pass 0.4569 via tolerance (n4, claim check 126) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25 (n4 stdout, entry 83) | pass 98.25 via tolerance (n4, claim check 126) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.03 (n4 stdout, entry 83) | differs 20.03 (n4, claim check 126) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 62) | pass 0.121 via tolerance (n4, claim check 126) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 62) | pass 7.744 via tolerance (n4, claim check 126) |

### yun2026-lasv-elisa | claude:claude-haiku-5-5 | run 2

Status: answer. 189 s. 11 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-012208-3b76. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/yun2026-lasv-elisa/run2/home/sessions/20261012-012208-3b76/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/yun2026-lasv-elisa/run2/home/sessions/20261012-012208-3b76/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n4 metrics.n_plates, entry 76) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.5869 (n6 stdout, entry 99) | pass 7.5869 via tolerance (n6, claim check 138) |
| conc_d2 | 3.7072 ±0.001 | pass 3.7072 (n6 stdout, entry 99) | pass 3.7072 via tolerance (n6, claim check 138) |
| conc_d3 | 1.8719 ±0.001 | pass 1.8719 (n6 stdout, entry 99) | pass 1.8719 via tolerance (n6, claim check 138) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n4 metrics.mean_conc_STD_4, entry 76) | pass 0.9171 via tolerance (n6, claim check 138) |
| conc_d5 | 0.46371 ±0.001 | pass 0.4637134 (n4 metrics.mean_conc_STD_5, entry 76) | pass 0.4637 via tolerance (n6, claim check 138) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334 (n6 stdout, entry 99) | pass 0.2334 via tolerance (n6, claim check 138) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.1204556 (n4 metrics.mean_conc_STD_7, entry 76) | pass 0.1205 via tolerance (n6, claim check 138) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.05579413 (n4 metrics.mean_conc_STD_8, entry 76) | pass 0.0558 via tolerance (n6, claim check 138) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.02661318 (n4 metrics.mean_conc_STD_9, entry 76) | pass 0.0266 via tolerance (n6, claim check 138) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.01388456 (n4 metrics.mean_conc_STD_10, entry 76) | pass 0.0139 via tolerance (n6, claim check 138) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07 (n6 stdout, entry 99) | pass 11.07 via tolerance (n6, claim check 138) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n4 metrics.cv_conc_pct_STD_4, entry 76) | pass 10.93 via tolerance (n6, claim check 138) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n4 metrics.cv_conc_pct_STD_7, entry 76) | pass 15.71 via tolerance (n6, claim check 138) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n4 metrics.cv_conc_pct_STD_8, entry 76) | pass 15.55 via tolerance (n6, claim check 138) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n4 metrics.cv_conc_pct_STD_9, entry 76) | pass 25.89 via tolerance (n6, claim check 138) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n4 table.rows[9][6], entry 76) | pass 21.92 via tolerance (n6, claim check 138) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n4 table.rows[10][6], entry 76) | pass 26.62 via tolerance (n6, claim check 138) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.8867 (n6 stdout, entry 99) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97 (n6 stdout, entry 99) | pass 97.97 via tolerance (n6, claim check 138) |
| recovery_d4 | 94.74 ±0.06 | pass 94.74 (n6 stdout, entry 99) | pass 94.74 via tolerance (n6, claim check 138) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55 (n6 stdout, entry 99) | pass 99.55 via tolerance (n6, claim check 138) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71 (n6 stdout, entry 99) | pass 88.71 via tolerance (n6, claim check 138) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56 (n6 stdout, entry 99) | differs 92.56 (n6, claim check 138) |
| hpc_conc | 1.9932 ±0.001 | pass 1.9932 (n6 stdout, entry 99) | pass 1.9932 via tolerance (n6, claim check 138) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n4 metrics.cv_conc_pct_HPC, entry 76) | pass 22.45 via tolerance (n6, claim check 138) |
| hpc_recovery | 107.28 ±0.06 | pass 107.28 (n6 stdout, entry 99) | pass 107.28 via tolerance (n6, claim check 138) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n4 metrics.mean_conc_LPC, entry 76) | pass 0.4569 via tolerance (n6, claim check 138) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25 (n6 stdout, entry 99) | pass 98.25 via tolerance (n6, claim check 138) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.03 (n6 stdout, entry 99) | differs 20.03 (n6, claim check 138) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n1 stdout, entry 24) | pass 0.121 via tolerance (n6, claim check 138) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n1 stdout, entry 24) | pass 7.744 via tolerance (n6, claim check 138) |

### yun2026-lasv-elisa | claude:claude-haiku-5-5 | run 3

Status: answer. 236 s. 11 requests, 10 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-012517-58cb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/yun2026-lasv-elisa/run3/home/sessions/20261012-012517-58cb/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/yun2026-lasv-elisa/run3/home/sessions/20261012-012517-58cb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| runs | 9 exact | pass 9 (n3 metrics.n_plates, entry 65) | not asked |
| conc_d1 | 7.5869 ±0.001 | pass 7.5869 (n5 stdout, entry 84) | pass 7.5869 via tolerance (n5, claim check 139) |
| conc_d2 | 3.7072 ±0.001 | pass 3.7072 (n5 stdout, entry 84) | pass 3.7072 via tolerance (n5, claim check 139) |
| conc_d3 | 1.8719 ±0.001 | pass 1.8719 (n5 stdout, entry 84) | pass 1.8719 via tolerance (n5, claim check 139) |
| conc_d4 | 0.91706 ±0.001 | pass 0.917061 (n4 stdout, entry 74) | pass 0.9171 via tolerance (n5, claim check 139) |
| conc_d5 | 0.46371 ±0.001 | pass 0.463713 (n4 stdout, entry 74) | pass 0.4637 via tolerance (n5, claim check 139) |
| conc_d6 | 0.2334 ±0.001 | pass 0.2334 (n5 stdout, entry 84) | pass 0.2334 via tolerance (n5, claim check 139) |
| conc_d7 | 0.12046 ±0.0006 | pass 0.120456 (n4 stdout, entry 74) | pass 0.1205 via tolerance (n5, claim check 139) |
| conc_d8 | 0.055794 ±0.0006 | pass 0.055794 (n4 stdout, entry 74) | pass 0.0558 via tolerance (n5, claim check 139) |
| conc_d9 | 0.026613 ±0.0006 | pass 0.026613 (n4 stdout, entry 74) | pass 0.0266 via tolerance (n5, claim check 139) |
| conc_d10 | 0.013885 ±0.0006 | pass 0.013885 (n4 stdout, entry 74) | pass 0.0139 via tolerance (n5, claim check 139) |
| cv_conc_d1 | 11.07 ±0.015 | pass 11.07 (n5 stdout, entry 84) | pass 11.07 via tolerance (n5, claim check 139) |
| cv_conc_d4 | 10.927 ±0.015 | pass 10.92676 (n4 stdout, entry 74) | pass 10.93 via tolerance (n5, claim check 139) |
| cv_conc_d7 | 15.714 ±0.015 | pass 15.71361 (n3 metrics.cv_conc_pct_STD_7, entry 65) | pass 15.71 via tolerance (n5, claim check 139) |
| cv_conc_d8 | 15.553 ±0.015 | pass 15.55339 (n3 metrics.cv_conc_pct_STD_8, entry 65) | pass 15.55 via tolerance (n5, claim check 139) |
| cv_conc_d9 | 25.895 ±0.015 | pass 25.89455 (n4 stdout, entry 74) | pass 25.89 via tolerance (n5, claim check 139) |
| cv_od_d7 | 21.919 ±0.015 | pass 21.9188 (n3 table.rows[9][6], entry 65) | pass 21.92 via tolerance (n5, claim check 139) |
| cv_od_d8 | 26.621 ±0.015 | pass 26.62058 (n3 table.rows[10][6], entry 65) | pass 26.62 via tolerance (n5, claim check 139) |
| mean_od_d1 | 2.8867 ±0.001 | pass 2.8867 (n5 stdout, entry 84) | not asked |
| recovery_d1 | 97.97 ±0.06 | pass 97.97 (n5 stdout, entry 84) | pass 97.97 via tolerance (n5, claim check 139) |
| recovery_d4 | 94.74 ±0.06 | pass 94.74 (n5 stdout, entry 84) | pass 94.74 via tolerance (n5, claim check 139) |
| recovery_d7 | 99.55 ±0.06 | pass 99.55 (n5 stdout, entry 84) | pass 99.55 via tolerance (n5, claim check 139) |
| recovery_d9 | 88.71 ±0.06 | pass 88.71 (n5 stdout, entry 84) | pass 88.71 via tolerance (n5, claim check 139) |
| recovery_d8_printed (reference) | 92 ±0.06 | differs 92.56 (n5 stdout, entry 84) | differs 92.56 (n5, claim check 139) |
| hpc_conc | 1.9932 ±0.001 | pass 1.9932 (n5 stdout, entry 84) | pass 1.9932 via tolerance (n5, claim check 139) |
| hpc_cv | 22.447 ±0.015 | pass 22.44729 (n4 stdout, entry 74) | pass 22.45 via tolerance (n5, claim check 139) |
| hpc_recovery | 107.28 ±0.06 | pass 107.28 (n5 stdout, entry 84) | pass 107.28 via tolerance (n5, claim check 139) |
| lpc_conc | 0.45688 ±0.001 | pass 0.4568795 (n3 metrics.mean_conc_LPC, entry 65) | pass 0.4569 via tolerance (n5, claim check 139) |
| lpc_recovery | 98.25 ±0.06 | pass 98.25 (n5 stdout, entry 84) | pass 98.25 via tolerance (n5, claim check 139) |
| lpc_cv_printed (reference) | 20.09 ±0.015 | differs 20.03 (n5 stdout, entry 84) | differs 20.03 (n5, claim check 139) |
| lloq | 0.121 ±0.0005 | pass 0.121 (n3 metrics.series_lloq_sample, entry 65) | pass 0.121 via tolerance (n6, claim check 139) |
| uloq | 7.744 ±0.0005 | pass 7.744 (n3 metrics.series_uloq_sample, entry 65) | pass 7.744 via tolerance (n6, claim check 139) |

