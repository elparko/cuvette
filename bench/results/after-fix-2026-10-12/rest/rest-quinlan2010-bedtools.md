# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 12/12 | 9/9 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| quinlan2010-bedtools | 12/12 / 9/9 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 110 | 11 | 32 | 10760 | 101515 | 12 | 0 | 0 | 1 | 1 | 5 | 10 | 0 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| quinlan2010-bedtools | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-haiku-5-5 | 2 | on | 2 | 0 | 0 | 0 | 0 |
| quinlan2010-bedtools | claude:claude-haiku-5-5 | 3 | on | 2 | 0 | 0 | 0 | 0 |

## Details

### quinlan2010-bedtools | claude:claude-haiku-5-5 | run 1

Status: answer. 23 s. 2 requests, 3 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-042706-2020. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/quinlan2010-bedtools/claude_claude-haiku-5-5/quinlan2010-bedtools/run1/home/sessions/20261012-042706-2020/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/quinlan2010-bedtools/claude_claude-haiku-5-5/quinlan2010-bedtools/run1/home/sessions/20261012-042706-2020/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 12) | pass 126 via tolerance (n2, claim check 30) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 12) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 12) | pass 33713 via tolerance (n1, claim check 30) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 18) | pass 11270 via tolerance (n3, claim check 30) |

### quinlan2010-bedtools | claude:claude-haiku-5-5 | run 2

Status: answer. 35 s. 5 requests, 5 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-042730-e261. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/quinlan2010-bedtools/claude_claude-haiku-5-5/quinlan2010-bedtools/run2/home/sessions/20261012-042730-e261/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/quinlan2010-bedtools/claude_claude-haiku-5-5/quinlan2010-bedtools/run2/home/sessions/20261012-042730-e261/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_result, entry 15) | pass 126 via tolerance (n2, claim check 50) |
| overlapping_pairs | 129 exact | pass 129 (n2 metrics.n_result, entry 18) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n2 metrics.overlap_bases, entry 18) | pass 33713 via tolerance (n2, claim check 50) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 26) | pass 11270 via tolerance (n3, claim check 50) |

### quinlan2010-bedtools | claude:claude-haiku-5-5 | run 3

Status: answer. 52 s. 4 requests, 4 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-042805-8e03. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/quinlan2010-bedtools/claude_claude-haiku-5-5/quinlan2010-bedtools/run3/home/sessions/20261012-042805-8e03/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-b/bench-runs/quinlan2010-bedtools/claude_claude-haiku-5-5/quinlan2010-bedtools/run3/home/sessions/20261012-042805-8e03/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| exons_with_overlap | 126 exact | pass 126 (n1 metrics.n_a_with_overlap, entry 12) | pass 126 via tolerance (n2, claim check 45) |
| overlapping_pairs | 129 exact | pass 129 (n1 metrics.n_result, entry 12) | not asked |
| overlap_bases | 33713 exact | pass 33713 (n1 metrics.overlap_bases, entry 12) | pass 33713 via tolerance (n1, claim check 45) |
| merged_intervals | 11270 exact | pass 11270 (n3 metrics.n_merged, entry 18) | pass 11270 via tolerance (n3, claim check 45) |

