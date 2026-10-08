# Paper benchmark 2026-10-08

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 4/5 | 4/4 | 1 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| love2014-deseq2-airway | 4/5 / 4/4 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 1 | 848 | 5 | 36980 | 2032 | 0 | 4 | 6 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 |

## Details

### love2014-deseq2-airway | ollama:qwen3:8b | run 1

Status: answer. 848 s. 5 requests, 4 tool calls (6 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-174945-c7c7. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/love2014-deseq2-airway/run1/home/sessions/20261008-174945-c7c7/log.jsonl

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n2 metrics.n_genes_tested, entry 45) | pass 16637 via tolerance (n2, claim check 58) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n2 metrics.n_significant, entry 45) | pass 4381 via tolerance (n2, claim check 58) |
| up_padj_01 | 2362 ±10 | pass 2362 (n2 metrics.n_up, entry 45) | pass 2362 via tolerance (n2, claim check 58) |
| down_padj_01 | 2019 ±3 | pass 2019 (n2 metrics.n_down, entry 45) | pass 2019 via tolerance (n2, claim check 58) |
| padj_005_workflow | 3602 ±10 | FAIL 3688.294 (n2 table.rows[9][1], entry 45) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n2 metrics.n_genes_tested, entry 45) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n2 metrics.n_significant, entry 45) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n3 table.rows[14][1], entry 51) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n2 metrics.n_up, entry 45) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n2 metrics.n_significant, entry 45) | not asked |

