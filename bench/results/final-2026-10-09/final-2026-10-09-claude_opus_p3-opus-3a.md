# Paper benchmark 2026-10-09

Models: claude:claude-opus-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 21/21 | 12/12 | 6 | 1 error |

## Matrix

| Paper | claude:claude-opus-5-5 |
| --- | --- |
| palmer2017-metaspace-fdr | 0/0 / 0/0 (1 error) |
| schramm2012-imzml-pyimzml | 21/21 / 12/12 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-opus-5-5 | 6 | 1329 | 86 | 210 | 65169 | 2990865 | 538 | 16 | 4 | 1 | 5 | 18 | 20 | 6 | 10 | 13 | 13 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-opus-5-5: $3.39 for 6 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| palmer2017-metaspace-fdr | claude:claude-opus-5-5 | 1 | on | 1 | 0 | 0 | 4 | 0 |
| palmer2017-metaspace-fdr | claude:claude-opus-5-5 | 2 | on | 1 | 0 | 0 | 0 | 0 |
| palmer2017-metaspace-fdr | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-opus-5-5 | 1 | on | 2 | 0 | 0 | 6 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-opus-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| schramm2012-imzml-pyimzml | claude:claude-opus-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### palmer2017-metaspace-fdr | claude:claude-opus-5-5 | run 1

Status: answer. 200 s. 25 requests, 30 tool calls (7 failed), 3 nudges, 1 plan reminders, 4 unsourced.
Session: 20261009-081432-8253. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261009-081432-8253/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/palmer2017-metaspace-fdr/run1/home/sessions/20261009-081432-8253/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | differs - | differs 66 (n7, claim check 227) |
| unique_formulas_three_sections (reference) | 66 exact | match 66 (n7 metrics.n_fdr_20, entry 72) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n8 data.pixel_size.Xaxis, entry 98) | not asked |

### palmer2017-metaspace-fdr | claude:claude-opus-5-5 | run 2

Status: error (Cannot reach the Claude API. Check the network.). 346 s. 19 requests, 115 tool calls (5 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-081753-71ef. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261009-081753-71ef/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/palmer2017-metaspace-fdr/run2/home/sessions/20261009-081753-71ef/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | match 51 (n56 metrics.n_in_union, entry 289) | differs - |
| unique_formulas_three_sections (reference) | 66 exact | match 66 (n31 metrics.n_fdr_20, entry 198) | not asked |
| total_formulas (reference) | 103 ±20 | match 103.54 (n68 data.duration_s, entry 324) | not asked |

### palmer2017-metaspace-fdr | claude:claude-opus-5-5 | run 3

Status: answer. 563 s. 22 requests, 364 tool calls (4 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-082339-4fb9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261009-082339-4fb9/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/palmer2017-metaspace-fdr/run3/home/sessions/20261009-082339-4fb9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| formulas_in_all_three_sections (reference) | 51 ±8 | match 43 (n326 metrics.n_in_union, entry 1073) | match 50 via tolerance (n349, claim check 1251) |
| unique_formulas_three_sections (reference) | 66 exact | match 66 (n323 metrics.n_fdr_20, entry 1056) | not asked |
| total_formulas (reference) | 103 ±20 | match 100 (n10 metrics.n_found, entry 94) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-opus-5-5 | run 1

Status: answer. 62 s. 5 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 6 unsourced.
Session: 20261009-083303-b03a. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261009-083303-b03a/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schramm2012-imzml-pyimzml/run1/home/sessions/20261009-083303-b03a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 16) | pass 9 via tolerance (n5, claim check 59) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 16) | pass 100.0833 via tolerance (n2, claim check 59) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 16) | pass 799.9167 via tolerance (n2, claim check 59) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 27) | pass 243.54 via tolerance (n4, claim check 59) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 27) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 16) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 19) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-opus-5-5 | run 2

Status: answer. 74 s. 7 requests, 8 tool calls (0 failed), 1 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-083405-07c8. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261009-083405-07c8/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schramm2012-imzml-pyimzml/run2/home/sessions/20261009-083405-07c8/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 13) | pass 9 via tolerance (n5, claim check 65) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 13) | pass 100.0833 via tolerance (n2, claim check 65) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 13) | pass 799.9167 via tolerance (n2, claim check 65) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n3 metrics.tic_max, entry 23) | pass 243.54 via tolerance (n4, claim check 65) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n3 metrics.tic_mean, entry 23) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 13) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 16) | not asked |

### schramm2012-imzml-pyimzml | claude:claude-opus-5-5 | run 3

Status: answer. 84 s. 8 requests, 12 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-083519-160d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261009-083519-160d/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-opus-5-5/schramm2012-imzml-pyimzml/run3/home/sessions/20261009-083519-160d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| spectra_per_file | 9 exact | pass 9 (n1 metrics.n_pixels, entry 22) | pass 9 via tolerance (n6, claim check 82) |
| mz_min | 100.083336 ±0.0001 | pass 100.0833 (n1 metrics.mz_min, entry 22) | pass 100.0833 via tolerance (n2, claim check 82) |
| mz_max | 799.9167 ±0.0001 | pass 799.9167 (n1 metrics.mz_max, entry 22) | pass 799.9167 via tolerance (n2, claim check 82) |
| max_pixel_tic | 243.5395 ±0.001 | pass 243.5395 (n4 metrics.tic_max, entry 43) | pass 243.54 via tolerance (n5, claim check 82) |
| mean_tic | 161.1444 ±0.001 | pass 161.1444 (n4 metrics.tic_mean, entry 43) | not asked |
| continuous_ibd_bytes | 335976 exact | pass 335976 (n1 metrics.ibd_bytes, entry 22) | not asked |
| processed_ibd_bytes | 604744 exact | pass 604744 (n2 metrics.ibd_bytes, entry 25) | not asked |



Note (9 October): run 2 of palmer2017-metaspace-fdr stopped with "Cannot reach the Claude API". The JSON file holds the rerun from final-2026-10-09-rerun-claude_opus_p4-palmer-run2.json in its place, with the field rerunOf. The table above shows the first run.
