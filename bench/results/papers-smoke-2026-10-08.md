# Paper benchmark 2026-10-08

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 6/7 | 4/4 | 1 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| student1908-sleep | 6/7 / 4/4 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 1 | 37 | 3 | 15042 | 229 | 0 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |

## Details

### student1908-sleep | ollama:qwen3:8b | run 1

Status: answer. 37 s. 3 requests, 2 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-135354-1ea5. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/student1908-sleep/run1/home/sessions/20261008-135354-1ea5/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| mean_difference | 1.58 ±0.005 | pass 1.58 (n2 metrics.mean_diff, entry 27) | pass 1.58 via tolerance (n2, claim check 32) |
| paired_t | abs 4.0621 ±0.001 | pass 4.062128 (n2 metrics.statistic, entry 27) | not asked |
| degrees_of_freedom | 9 exact | pass 9 (n2 metrics.df, entry 27) | not asked |
| paired_p | 0.002833 ±0.0001 | pass 0.00283289 (n2 metrics.p_value, entry 27) | pass 0.00283 via tolerance (n2, claim check 32) |
| ci_lower | 0.7 ±0.005 | pass 0.7001142 (n2 metrics.ci_lo, entry 27) | pass 0.7 via tolerance (n2, claim check 32) |
| ci_upper | 2.46 ±0.005 | pass 2.459886 (n2 metrics.ci_hi, entry 27) | pass 2.46 via tolerance (n2, claim check 32) |
| welch_p_trap | 0.07939 ±0.0005 | FAIL 0.05 (n2 data.data.alpha, entry 27) | not asked |

