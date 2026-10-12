# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 18/18 | 9/9 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| lazear2023-sage | 18/18 / 9/9 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 331 | 37 | 92 | 41203 | 744126 | 41 | 0 | 0 | 3 | 3 | 8 | 14 | 5 | 1 | 3 | 3 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.04 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lazear2023-sage | claude:claude-haiku-5-5 | 1 | on | 9 | 0 | 0 | 0 | 0 |
| lazear2023-sage | claude:claude-haiku-5-5 | 2 | on | 7 | 0 | 0 | 0 | 0 |
| lazear2023-sage | claude:claude-haiku-5-5 | 3 | on | 8 | 0 | 0 | 1 | 0 |

## Details

### lazear2023-sage | claude:claude-haiku-5-5 | run 1

Status: answer. 105 s. 13 requests, 15 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-030843-9111. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lazear2023-sage/claude_claude-haiku-5-5/lazear2023-sage/run1/home/sessions/20261012-030843-9111/log.jsonl
Leak check: 9 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lazear2023-sage/claude_claude-haiku-5-5/lazear2023-sage/run1/home/sessions/20261012-030843-9111/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 22) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 22) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 30) | pass 207 via tolerance (n5, claim check 121) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 30) | pass 47 via tolerance (n5, claim check 121) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 30) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n4 metrics.n_psm_pass, entry 42) | pass 242 via tolerance (n4, claim check 121) |

### lazear2023-sage | claude:claude-haiku-5-5 | run 2

Status: answer. 111 s. 12 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-031028-cd09. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lazear2023-sage/claude_claude-haiku-5-5/lazear2023-sage/run2/home/sessions/20261012-031028-cd09/log.jsonl
Leak check: 7 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lazear2023-sage/claude_claude-haiku-5-5/lazear2023-sage/run2/home/sessions/20261012-031028-cd09/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 20) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 20) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 28) | pass 207 via tolerance (n8, claim check 115) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 28) | pass 47 via tolerance (n8, claim check 115) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 28) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n5 stdout, entry 51) | pass 242 via tolerance (n6, claim check 115) |

### lazear2023-sage | claude:claude-haiku-5-5 | run 3

Status: answer. 115 s. 12 requests, 13 tool calls (0 failed), 0 nudges, 1 plan reminders, 1 unsourced.
Session: 20261012-031219-e263. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lazear2023-sage/claude_claude-haiku-5-5/lazear2023-sage/run3/home/sessions/20261012-031219-e263/log.jsonl
Leak check: 8 paths read, 0 outside the allow list, 0 blocked, 1 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lazear2023-sage/claude_claude-haiku-5-5/lazear2023-sage/run3/home/sessions/20261012-031219-e263/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| psms_result_table | 303 exact | pass 303 (n1 metrics.n_psm, entry 23) | not asked |
| decoy_psms | 43 exact | pass 43 (n1 metrics.n_decoy_psm, entry 23) | not asked |
| target_psms_fdr1 | 207 exact | pass 207 (n2 metrics.n_psm_pass, entry 32) | pass 207 via tolerance (n5, claim check 117) |
| distinct_peptides | 47 exact | pass 47 (n2 metrics.n_peptides_pass, entry 32) | pass 47 via tolerance (n5, claim check 117) |
| decoy_psms_kept | 1 exact | pass 1 (n2 metrics.n_decoy_pass, entry 32) | not asked |
| target_psms_fdr5 | 242 exact | pass 242 (n4 metrics.n_psm_pass, entry 44) | pass 242 via tolerance (n4, claim check 117) |

