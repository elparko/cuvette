# Paper benchmark 2026-10-09

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 4/4 | 3/3 | 1 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| astapova2021-deseq2-kgn | 4/4 / 3/3 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 1 | 283 | 4 | 32873 | 1283 | 0 | 3 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 |

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| astapova2021-deseq2-kgn | ollama:qwen3:8b | 1 | on | 3 | 0 | 0 | 0 | 0 |

## Details

### astapova2021-deseq2-kgn | ollama:qwen3:8b | run 1

Status: answer. 283 s. 4 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261008-193409-d2f6. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/astapova2021-deseq2-kgn/run1/home/sessions/20261008-193409-d2f6/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/ollama_qwen3_8b/astapova2021-deseq2-kgn/run1/home/sessions/20261008-193409-d2f6/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| significant_padj_005 | 173 ±2 | pass 173 (n7 metrics.n_significant, entry 44) | pass 173 via tolerance (n7, claim check 59) |
| up_padj_005 | 125 ±2 | pass 125 (n7 metrics.n_up, entry 44) | pass 125 via tolerance (n7, claim check 59) |
| down_padj_005 | 48 ±2 | pass 48 (n7 metrics.n_down, entry 44) | pass 48 via tolerance (n7, claim check 59) |
| genes_in_table | 59087 exact | pass 59087 (n1 metrics.n_genes, entry 8) | not asked |

