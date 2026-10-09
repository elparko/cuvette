# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 24/24 | 24/24 | 2 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| gouwens2019-allen-ephys | 14/14 / 14/14 |
| jahncke2025-dag1-mipsc | 10/10 / 10/10 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 2 | 523 | 21 | 56 | 40848 | 1000882 | 64 | 1 | 0 | 1 | 2 | 8 | 7 | 6 | 0 | 6 | 6 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.06 for 2 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gouwens2019-allen-ephys | claude:claude-haiku-5-5 | 1 | on | 6 | 0 | 0 | 0 | 0 |
| jahncke2025-dag1-mipsc | claude:claude-haiku-5-5 | 1 | on | 36 | 0 | 0 | 0 | 0 |

## Details

### gouwens2019-allen-ephys | claude:claude-haiku-5-5 | run 1

Status: answer. 250 s. 9 requests, 16 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261009-045801-e265. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gouwens2019-allen-ephys/run1/home/sessions/20261009-045801-e265/log.jsonl
Leak check: 6 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/gouwens2019-allen-ephys/run1/home/sessions/20261009-045801-e265/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| c1_rheobase | 230 exact | pass 230 (n6 metrics.rheobase_pa, entry 71) | pass 230 via tolerance (n14, claim check 144) |
| c1_fi_slope | 1.0717 ±0.005 | pass 1.071664 (n6 metrics.fi_slope_hz_per_pa, entry 71) | pass 1.072 via tolerance (n14, claim check 144) |
| c1_ri | 129.84 ±0.5 | pass 129.8438 (n11 metrics.input_resistance_mohm, entry 95) | pass 129.8 via tolerance (n11, claim check 144) |
| c1_tau | 8.26 ±0.3 | pass 8.223051 (n11 metrics.tau_ms, entry 95) | pass 8.223 via tolerance (n11, claim check 144) |
| c1_ratio | 1.1458 ±0.003 | pass 1.145815 (n6 metrics.upstroke_downstroke_ratio, entry 71) | pass 1.146 via tolerance (n5, claim check 144) |
| c2_rheobase | 70 exact | pass 70 (n6 table.rows[9][2], entry 71) | pass 70 via tolerance (n14, claim check 144) |
| c2_fi_slope | 0.1152 ±0.001 | pass 0.1151536 (n7 metrics.fi_slope_hz_per_pa, entry 75) | pass 0.115 via tolerance (n7, claim check 144) |
| c2_ri | 187.19 ±0.5 | pass 187.1876 (n12 metrics.input_resistance_mohm, entry 99) | pass 187.2 via tolerance (n12, claim check 144) |
| c2_tau | 32.56 ±0.6 | pass 32.25924 (n12 metrics.tau_ms, entry 99) | pass 32.26 via tolerance (n12, claim check 144) |
| c2_ratio | 3.8746 ±0.004 | pass 3.874569 (n7 metrics.upstroke_downstroke_ratio, entry 75) | pass 3.875 via tolerance (n7, claim check 144) |
| c3_rheobase | 90 exact | pass 90 (n6 table.rows[10][2], entry 71) | pass 90 via tolerance (n14, claim check 144) |
| c3_fi_slope | 0.2075 ±0.001 | pass 0.2075324 (n8 metrics.fi_slope_hz_per_pa, entry 79) | pass 0.208 via tolerance (n8, claim check 144) |
| c3_ri | 128.52 ±0.5 | pass 128.5156 (n13 metrics.input_resistance_mohm, entry 103) | pass 128.5 via tolerance (n13, claim check 144) |
| c3_ratio | 3.2259 ±0.004 | pass 3.225886 (n8 metrics.upstroke_downstroke_ratio, entry 79) | pass 3.226 via tolerance (n8, claim check 144) |
| c3_tau (reference) | 14.87 ±0.5 | match 15 (n12 table.rows[0][0], entry 99) | match 15 via tolerance (n14, claim check 144) |

### jahncke2025-dag1-mipsc | claude:claude-haiku-5-5 | run 1

Status: answer. 273 s. 12 requests, 48 tool calls (1 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261009-050212-27d1. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jahncke2025-dag1-mipsc/run1/home/sessions/20261009-050212-27d1/log.jsonl
Leak check: 36 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jahncke2025-dag1-mipsc/run1/home/sessions/20261009-050212-27d1/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_cells_ctrl | 16 exact | pass 16 (n12 table.rows[0][4], entry 117) | pass 16 via tolerance (n12, claim check 308) |
| n_cells_cko | 16 exact | pass 16 (n12 table.rows[0][4], entry 117) | pass 16 via tolerance (n12, claim check 308) |
| n_animals_per_group | 6 exact | pass 6 (n12 table.rows[0][6], entry 117) | pass 6 via tolerance (n12, claim check 308) |
| p_frequency | 0.018 ±0.015 | pass 0.01246003 (n12 metrics.min_p, entry 117) | pass 0.012 via tolerance (n12, claim check 308) |
| p_amplitude | 0.017 ±0.015 | pass 0.01246003 (n12 metrics.min_p, entry 117) | pass 0.012 via tolerance (n12, claim check 308) |
| p_rise (reference) | 0.38 ±0.2 | match 0.3971269 (n12 table.rows[3][14], entry 117) | not asked |
| p_decay (reference) | 0.36 ±0.25 | match 0.3971269 (n12 table.rows[3][14], entry 117) | not asked |
| decay_ctrl | 7.87 ±0.5 | pass 8.142494 (n12 table.rows[3][8], entry 117) | pass 8.14 via tolerance (n50, claim check 308) |
| freq_ctrl | 2.97 ±0.6 | pass 2.622807 (n12 table.rows[0][8], entry 117) | pass 2.62 via tolerance (n11, claim check 308) |
| freq_cko | 1.76 ±0.5 | pass 1.851845 (n12 table.rows[3][9], entry 117) | pass 1.64 via tolerance (n11, claim check 308) |
| amp_ctrl | 51.9 ±7 | pass 55.61393 (n12 table.rows[1][8], entry 117) | pass 55.6 via tolerance (n12, claim check 308) |
| amp_cko | 38.3 ±6 | pass 40.22686 (n12 table.rows[1][10], entry 117) | pass 37.8 via tolerance (n14, claim check 308) |
| p_amplitude_animal_unit (reference) | 0.067 ±0.03 | match 0.04764355 (n12 metrics.min_p_bh, entry 117) | not asked |

