# Paper benchmark 2026-10-08

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 6/6 | 6/6 | 1 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| bradley-photutils-100gaussians | 6/6 / 6/6 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 1 | 242 | 5 | 37548 | 702 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bradley-photutils-100gaussians | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### bradley-photutils-100gaussians | ollama:qwen3:8b | run 1

Status: answer. 242 s. 5 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-174242-c2fc. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/bradley-photutils-100gaussians/run1/home/sessions/20261008-174242-c2fc/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/bradley-photutils-100gaussians/run1/home/sessions/20261008-174242-c2fc/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| sky_level | 5.152 ±0.01 | pass 5.152442 (n9 metrics.background_median, entry 50) | pass 5.152 via tolerance (n9, claim check 119) |
| sky_noise | 2.094 ±0.01 | pass 2.094237 (n9 metrics.rms_median, entry 50) | pass 2.094 via tolerance (n9, claim check 119) |
| sources_detected | 82 exact | pass 82 (n18 metrics.n_sources, entry 91) | pass 82 via tolerance (n18, claim check 119) |
| net_flux_48_70_200_33 | 895.4 ±106 | pass 867.5532 (n19 table.rows[0][3], entry 110) | pass 925.24 via tolerance (n19, claim check 119) |
| net_flux_145_05_168_52 | 734.1 ±106 | pass 760.1982 (n19 table.rows[1][5], entry 110) | pass 760.2 via tolerance (n19, claim check 119) |
| net_flux_355_56_252_20 | 873.9 ±106 | pass 867.5532 (n19 table.rows[0][3], entry 110) | pass 925.24 via tolerance (n19, claim check 119) |

