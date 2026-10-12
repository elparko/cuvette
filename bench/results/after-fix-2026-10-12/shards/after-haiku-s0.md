# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 105/105 | 89/90 | 18 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| aledo2022-renz-onpg | 6/6 / 6/6 |
| astapova2021-deseq2-kgn | 12/12 / 9/9 |
| bradley-photutils-100gaussians | 18/18 / 18/18 |
| danecek2021-bcftools | 18/18 / 15/15 |
| gramfort2013-mne-sample | 42/42 / 35/36 |
| kanetis2022-iqtree-sporocadaceae | 9/9 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 18 | 2013 | 137 | 376 | 162220 | 2083203 | 119 | 0 | 0 | 3 | 16 | 56 | 53 | 33 | 65 | 3 | 3 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.16 for 18 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 1 | 0 |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 1 | 0 |
| aledo2022-renz-onpg | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 1 | 0 |
| astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-haiku-5-5 | 1 | on | 3 | 0 | 0 | 1 | 0 |
| bradley-photutils-100gaussians | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 0 | 0 |
| bradley-photutils-100gaussians | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 1 | 0 |
| danecek2021-bcftools | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 0 | 0 | 0 |
| danecek2021-bcftools | claude:claude-haiku-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| danecek2021-bcftools | claude:claude-haiku-5-5 | 3 | on | 1 | 0 | 0 | 0 | 0 |
| gramfort2013-mne-sample | claude:claude-haiku-5-5 | 1 | on | 10 | 0 | 0 | 15 | 0 |
| gramfort2013-mne-sample | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 0 | 5 | 0 |
| gramfort2013-mne-sample | claude:claude-haiku-5-5 | 3 | on | 6 | 0 | 0 | 6 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 10 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 12 | 0 |
| kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 12 | 0 |

## Details

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 1

Status: answer. 60 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-020617-b136. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run1/home/sessions/20261012-020617-b136/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run1/home/sessions/20261012-020617-b136/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 27) | pass 2.48 via tolerance (n1, claim check 57) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 27) | pass 0.184 via tolerance (n1, claim check 57) |

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 2

Status: answer. 50 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-020718-576a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run2/home/sessions/20261012-020718-576a/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run2/home/sessions/20261012-020718-576a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 25) | pass 2.479 via tolerance (n1, claim check 52) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 25) | pass 0.1841 via tolerance (n1, claim check 52) |

### aledo2022-renz-onpg | claude:claude-haiku-5-5 | run 3

Status: answer. 50 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-020808-ded1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run3/home/sessions/20261012-020808-ded1/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/aledo2022-renz-onpg/run3/home/sessions/20261012-020808-ded1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| km | 2.4793 ±0.005 | pass 2.479264 (n1 metrics.Km, entry 25) | pass 2.48 via tolerance (n3, claim check 56) |
| vmax | 0.18407 ±0.0005 | pass 0.1840735 (n1 metrics.Vmax, entry 25) | pass 0.184 via tolerance (n3, claim check 56) |

### astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | run 1

Status: answer. 155 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-020858-1c3a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261012-020858-1c3a/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run1/home/sessions/20261012-020858-1c3a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 50) | pass 173 via tolerance (n7, claim check 96) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 50) | pass 125 via tolerance (n7, claim check 96) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 50) | pass 48 via tolerance (n7, claim check 96) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 12) | not asked |

### astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | run 2

Status: answer. 176 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021133-fd02. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261012-021133-fd02/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run2/home/sessions/20261012-021133-fd02/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 50) | pass 173 via tolerance (n10, claim check 98) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 50) | pass 125 via tolerance (n10, claim check 98) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 50) | pass 48 via tolerance (n10, claim check 98) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 12) | not asked |

### astapova2021-deseq2-kgn | claude:claude-haiku-5-5 | run 3

Status: answer. 200 s. 7 requests, 5 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021429-a4dc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261012-021429-a4dc/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/astapova2021-deseq2-kgn/run3/home/sessions/20261012-021429-a4dc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 50) | pass 173 via tolerance (n7, claim check 95) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 50) | pass 125 via tolerance (n7, claim check 95) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 50) | pass 48 via tolerance (n7, claim check 95) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 12) | not asked |

### bradley-photutils-100gaussians | claude:claude-haiku-5-5 | run 1

Status: answer. 118 s. 13 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 1 unsourced.
Session: 20261012-021749-9cc6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261012-021749-9cc6/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run1/home/sessions/20261012-021749-9cc6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 41) | pass 5.152 via tolerance (n11, claim check 212) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 41) | pass 2.094 via tolerance (n11, claim check 212) |
| sources_detected | 82 exact | pass 82 (n22 metrics.n_sources, entry 132) | pass 82 via tolerance (n24, claim check 212) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n23 metrics.median_net_flux, entry 153) | pass 925.2 via tolerance (n23, claim check 212) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n23 table.rows[1][5], entry 153) | pass 760.2 via tolerance (n23, claim check 212) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n23 metrics.median_net_flux, entry 153) | pass 925.2 via tolerance (n23, claim check 212) |

### bradley-photutils-100gaussians | claude:claude-haiku-5-5 | run 2

Status: answer. 116 s. 11 requests, 10 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-021948-70b6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261012-021948-70b6/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run2/home/sessions/20261012-021948-70b6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 41) | pass 5.152 via tolerance (n11, claim check 185) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 41) | pass 2.094 via tolerance (n11, claim check 185) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 119) | pass 82 via tolerance (n20, claim check 185) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 140) | pass 925.2 via tolerance (n21, claim check 185) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 140) | pass 760.2 via tolerance (n21, claim check 185) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 925.2357 (n21 metrics.median_net_flux, entry 140) | pass 925.2 via tolerance (n21, claim check 185) |

### bradley-photutils-100gaussians | claude:claude-haiku-5-5 | run 3

Status: answer. 143 s. 14 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261012-022144-1f82. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261012-022144-1f82/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/bradley-photutils-100gaussians/run3/home/sessions/20261012-022144-1f82/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.1524 (n5 metrics.median, entry 42) | pass 5.152 via tolerance (n11, claim check 209) |
| sky_noise | 2.094 ±0.01 | pass 2.093725 (n5 metrics.std, entry 42) | pass 2.094 via tolerance (n11, claim check 209) |
| sources_detected | 82 exact | pass 82 (n20 metrics.n_sources, entry 120) | pass 82 via tolerance (n20, claim check 209) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 867.5663 (n21 table.rows[0][3], entry 141) | pass 925 via tolerance (n22, claim check 209) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n21 table.rows[1][5], entry 141) | pass 760 via tolerance (n21, claim check 209) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 867.5663 (n21 table.rows[0][3], entry 141) | pass 925 via tolerance (n22, claim check 209) |

### danecek2021-bcftools | claude:claude-haiku-5-5 | run 1

Status: answer. 54 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-022408-1efc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run1/home/sessions/20261012-022408-1efc/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run1/home/sessions/20261012-022408-1efc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 12) | pass 1955 via tolerance (n1, claim check 37) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 12) | pass 248 via tolerance (n1, claim check 37) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 12) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 12) | pass 2.2 via tolerance (n1, claim check 37) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 15) | pass 1137 via tolerance (n2, claim check 37) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 18) | pass 328 via tolerance (n3, claim check 37) |

### danecek2021-bcftools | claude:claude-haiku-5-5 | run 2

Status: answer. 30 s. 2 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-022502-f994. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run2/home/sessions/20261012-022502-f994/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run2/home/sessions/20261012-022502-f994/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 12) | pass 1955 via tolerance (n1, claim check 30) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 12) | pass 248 via tolerance (n1, claim check 30) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 12) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 12) | pass 2.2 via tolerance (n1, claim check 30) |
| records_in_region | 1137 exact | pass 1137 (n2 metrics.n_records, entry 15) | pass 1137 via tolerance (n2, claim check 30) |
| records_af_5pct | 328 exact | pass 328 (n3 metrics.n_after, entry 18) | pass 328 via tolerance (n3, claim check 30) |

### danecek2021-bcftools | claude:claude-haiku-5-5 | run 3

Status: answer. 35 s. 3 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-022532-bd3e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run3/home/sessions/20261012-022532-bd3e/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/danecek2021-bcftools/run3/home/sessions/20261012-022532-bd3e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| snp_records | 1955 exact | pass 1955 (n1 metrics.n_snps, entry 12) | pass 1955 via tolerance (n1, claim check 36) |
| indel_records | 248 exact | pass 248 (n1 metrics.n_indels, entry 12) | pass 248 via tolerance (n1, claim check 36) |
| total_records | 2210 exact | pass 2210 (n1 metrics.n_records, entry 12) | not asked |
| ts_tv_ratio | 2.2 ±0.01 | pass 2.2 (n1 metrics.ts_tv, entry 12) | pass 2.2 via tolerance (n1, claim check 36) |
| records_in_region | 1137 exact | pass 1137 (n3 metrics.n_records, entry 23) | pass 1137 via tolerance (n3, claim check 36) |
| records_af_5pct | 328 exact | pass 328 (n2 metrics.n_after, entry 15) | pass 328 via tolerance (n2, claim check 36) |

### gramfort2013-mne-sample | claude:claude-haiku-5-5 | run 1

Status: answer. 142 s. 11 requests, 13 tool calls (0 failed), 0 nudges, 0 plan reminders, 15 unsourced.
Session: 20261012-022607-31bb. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run1/home/sessions/20261012-022607-31bb/log.jsonl
Leak check: 10 paths read, 0 outside the allow list, 0 blocked, 15 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run1/home/sessions/20261012-022607-31bb/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 15) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 15) | pass 72 via tolerance (n2, claim check 175) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 15) | pass 73 via tolerance (n9, claim check 175) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 15) | pass 73 via tolerance (n9, claim check 175) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 15) | pass 70 via tolerance (n9, claim check 175) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 15) | pass 15 via tolerance (n2, claim check 175) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 15) | pass 16 via tolerance (n9, claim check 175) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 89) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 89) | pass 309 via tolerance (n15, claim check 175) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 89) | pass 68 via tolerance (n10, claim check 175) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n14 metrics.gfp_latency_s, entry 121) | pass 0.0932 via tolerance (n14, claim check 175) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.10613 (n14 metrics.gfp_amplitude, entry 121) | pass 42.11 via tolerance (n14, claim check 175) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n14 metrics.peak_latency_s, entry 121) | pass 0.0866 via tolerance (n14, claim check 175) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.9631 (n14 metrics.peak_amplitude, entry 121) | pass 198.96 via tolerance (n14, claim check 175) |

### gramfort2013-mne-sample | claude:claude-haiku-5-5 | run 2

Status: answer. 138 s. 14 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 5 unsourced.
Session: 20261012-022830-0a6a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run2/home/sessions/20261012-022830-0a6a/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 5 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run2/home/sessions/20261012-022830-0a6a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 23) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 23) | pass 72 via tolerance (n2, claim check 192) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 23) | pass 73 via tolerance (n9, claim check 192) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 23) | pass 73 via tolerance (n9, claim check 192) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 23) | pass 70 via tolerance (n9, claim check 192) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 23) | pass 15 via tolerance (n2, claim check 192) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 23) | pass 16 via tolerance (n9, claim check 192) |
| epochs_dropped | 10 exact | pass 10 (n9 metrics.n_dropped, entry 96) | not asked |
| epochs_kept | 309 exact | pass 309 (n9 metrics.n_epochs, entry 96) | pass 309 via tolerance (n9, claim check 192) |
| auditory_left_kept | 68 exact | pass 68 (n9 metrics.count_auditory_left, entry 96) | pass 68 via tolerance (n10, claim check 192) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n14 metrics.gfp_latency_s, entry 130) | pass 0.093 via tolerance (n14, claim check 192) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.07276 (n14 metrics.gfp_amplitude, entry 130) | pass 42.07 via tolerance (n14, claim check 192) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n14 metrics.peak_latency_s, entry 130) | pass 0.087 via tolerance (n14, claim check 192) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.7991 (n14 metrics.peak_amplitude, entry 130) | pass 198.8 via tolerance (n14, claim check 192) |

### gramfort2013-mne-sample | claude:claude-haiku-5-5 | run 3

Status: answer. 124 s. 10 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261012-023048-b0e0. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run3/home/sessions/20261012-023048-b0e0/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/gramfort2013-mne-sample/run3/home/sessions/20261012-023048-b0e0/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| events_total | 319 exact | pass 319 (n2 metrics.n_events, entry 15) | not asked |
| events_id1 | 72 exact | pass 72 (n2 metrics.count_1, entry 15) | pass 72 via tolerance (n2, claim check 159) |
| events_id2 | 73 exact | pass 73 (n2 metrics.count_2, entry 15) | pass 73 via tolerance (n8, claim check 159) |
| events_id3 | 73 exact | pass 73 (n2 metrics.count_2, entry 15) | pass 73 via tolerance (n8, claim check 159) |
| events_id4 | 70 exact | pass 70 (n2 metrics.count_4, entry 15) | pass 70 via tolerance (n8, claim check 159) |
| events_id5 | 15 exact | pass 15 (n2 metrics.count_5, entry 15) | pass 15 via tolerance (n2, claim check 159) |
| events_id32 | 16 exact | pass 16 (n2 metrics.count_32, entry 15) | pass 16 via tolerance (n8, claim check 159) |
| epochs_dropped | 10 exact | pass 10 (n8 metrics.n_dropped, entry 76) | not asked |
| epochs_kept | 309 exact | pass 309 (n8 metrics.n_epochs, entry 76) | pass 309 via tolerance (n8, claim check 159) |
| auditory_left_kept | 68 exact | pass 68 (n8 metrics.count_auditory_left, entry 76) | pass 68 via tolerance (n9, claim check 159) |
| n100_latency_gfp | 0.0932 ±0.007 | pass 0.09323776 (n13 metrics.gfp_latency_s, entry 110) | pass 0.1 via tolerance (n1, claim check 159) |
| n100_amplitude_gfp | 42.1 ±2 | pass 42.10613 (n13 metrics.gfp_amplitude, entry 110) | pass 42.11 via tolerance (n13, claim check 159) |
| strongest_grad_latency | 0.0866 ±0.007 | pass 0.08657792 (n13 metrics.peak_latency_s, entry 110) | FAIL 0.1 (n1, claim check 159) |
| strongest_grad_amplitude | abs 199 ±8 | pass 198.9631 (n13 metrics.peak_amplitude, entry 110) | pass 198.96 via tolerance (n13, claim check 159) |

### kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | run 1

Status: answer. 139 s. 6 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 10 unsourced.
Session: 20261012-023252-df00. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261012-023252-df00/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 10 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run1/home/sessions/20261012-023252-df00/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 20) | pass -15895.48 via tolerance (n2, claim check 58) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 12) | pass 2375 via tolerance (n2, claim check 58) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 12) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 20) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | run 2

Status: answer. 162 s. 10 requests, 8 tool calls (0 failed), 0 nudges, 1 plan reminders, 12 unsourced.
Session: 20261012-023512-447a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261012-023512-447a/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 12 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run2/home/sessions/20261012-023512-447a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 23) | pass -15895.48 via tolerance (n2, claim check 88) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 12) | pass 2375 via tolerance (n2, claim check 88) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 12) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 23) | not asked |

### kanetis2022-iqtree-sporocadaceae | claude:claude-haiku-5-5 | run 3

Status: answer. 120 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 12 unsourced.
Session: 20261012-023754-6794. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261012-023754-6794/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 12 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-12/claude_claude-haiku-5-5/kanetis2022-iqtree-sporocadaceae/run3/home/sessions/20261012-023754-6794/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| log_likelihood | -15895.468 ±0.1 | pass -15895.48 (n2 metrics.log_likelihood, entry 20) | pass -15895.48 via tolerance (n2, claim check 39) |
| alignment_sites | 2375 exact | pass 2375 (n1 metrics.alignment_length, entry 12) | pass 2375 via tolerance (n2, claim check 39) |
| sequences | 55 exact | pass 55 (n1 metrics.n_sequences, entry 12) | not asked |
| log_likelihood_iqtree3_modelfinder (reference) | -15891.367 ±0.1 | differs -15895.48 (n2 metrics.log_likelihood, entry 20) | not asked |

