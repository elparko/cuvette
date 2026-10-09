# Paper benchmark 2026-10-09

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 0/10 | 0/7 | 1 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| andreasson2019-endotoxin-health | 0/10 / 0/7 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 1 | 908 | 11 | 92204 | 1091 | 0 | 9 | 0 | 0 | 0 | 1 | 0 | 0 | 2 | 0 | 11 | 11 |

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| andreasson2019-endotoxin-health | ollama:qwen3:8b | 1 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### andreasson2019-endotoxin-health | ollama:qwen3:8b | run 1

Status: answer. 908 s. 11 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-193918-8cc9. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/andreasson2019-endotoxin-health/run1/home/sessions/20261008-193918-8cc9/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/andreasson2019-endotoxin-health/run1/home/sessions/20261008-193918-8cc9/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_ratings | 151 exact | FAIL - | not asked |
| n_subjects | 52 exact | FAIL - | not asked |
| intercept | 6.238 ±0.005 | FAIL - | FAIL 0.05 (n9, claim check 88) |
| coef_lps | 0.02 ±0.005 | FAIL - | FAIL 0.00005846 (n9, claim check 88) |
| coef_time2 | -0.619 ±0.005 | FAIL - | FAIL -0.8666 (n9, claim check 88) |
| coef_time3 | -0.218 ±0.005 | FAIL - | FAIL 0.00005846 (n9, claim check 88) |
| coef_lps_time2 | -1.786 ±0.005 | FAIL - | FAIL -0.8666 (n9, claim check 88) |
| coef_lps_time3 | -0.906 ±0.005 | FAIL - | FAIL -0.8666 (n9, claim check 88) |
| se_lps_time2 | 0.3157 ±0.001 | FAIL - | not asked |
| mannwhitney_p | 0.00416 ±0.0005 | FAIL 0.0000584569 (n3 metrics.p_value, entry 33) | FAIL 0.00005846 (n9, claim check 88) |

