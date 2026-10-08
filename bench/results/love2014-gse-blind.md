# Paper benchmark 2026-10-08

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 5/5 | 4/4 | 1 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| love2014-deseq2-airway | 5/5 / 4/4 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 1 | 358 | 5 | 44535 | 2661 | 0 | 3 | 0 | 0 | 0 | 1 | 5 | 0 | 1 | 0 | 0 | 0 |

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| love2014-deseq2-airway | ollama:qwen3:8b | 1 | on | 4 | 0 | 0 | 0 | 0 |

## Details

### love2014-deseq2-airway | ollama:qwen3:8b | run 1

Status: answer. 358 s. 5 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-181512-817e. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/love2014-deseq2-airway/run1/home/sessions/20261008-181512-817e/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/love2014-deseq2-airway/run1/home/sessions/20261008-181512-817e/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| genes_after_filter | 16637 ±10 | pass 16637 (n7 metrics.n_genes_tested, entry 44) | pass 16637 via tolerance (n7, claim check 67) |
| padj_01_workflow | 4381 ±10 | pass 4381 (n7 metrics.n_significant, entry 44) | pass 4381 via tolerance (n7, claim check 67) |
| up_padj_01 | 2362 ±10 | pass 2362 (n7 metrics.n_up, entry 44) | pass 2362 via tolerance (n7, claim check 67) |
| down_padj_01 | 2019 ±3 | pass 2019 (n7 metrics.n_down, entry 44) | pass 2019 via tolerance (n7, claim check 67) |
| padj_005_workflow | 3602 ±10 | pass 3602 (n5 metrics.n_significant, entry 35) | not asked |
| csv_genes_after_filter (reference) | 16139 ±10 | differs 16637 (n7 metrics.n_genes_tested, entry 44) | not asked |
| csv_padj_01 (reference) | 4905 ±10 | differs 4381 (n7 metrics.n_significant, entry 44) | not asked |
| csv_up_padj_01 (reference) | 2607 ±10 | differs 2648.605 (n8 table.rows[14][1], entry 50) | not asked |
| csv_down_padj_01 (reference) | 2298 ±10 | differs 2362 (n7 metrics.n_up, entry 44) | not asked |
| csv_padj_005 (reference) | 4081 ±10 | differs 4381 (n7 metrics.n_significant, entry 44) | not asked |

