# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 21/21 | 9/9 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| li2009-samtools | 21/21 / 9/9 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 153 | 22 | 60 | 13099 | 251790 | 20 | 0 | 0 | 1 | 1 | 9 | 7 | 0 | 0 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.02 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| li2009-samtools | claude:claude-haiku-5-5 | 1 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-haiku-5-5 | 2 | on | 5 | 0 | 0 | 0 | 0 |
| li2009-samtools | claude:claude-haiku-5-5 | 3 | on | 5 | 0 | 0 | 0 | 0 |

## Details

### li2009-samtools | claude:claude-haiku-5-5 | run 1

Status: answer. 45 s. 7 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-033022-c2ea. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/li2009-samtools/claude_claude-haiku-5-5/li2009-samtools/run1/home/sessions/20261012-033022-c2ea/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/li2009-samtools/claude_claude-haiku-5-5/li2009-samtools/run1/home/sessions/20261012-033022-c2ea/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 12) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 33) | pass 3271 via tolerance (n5, claim check 81) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 33) | pass 3144 via tolerance (n4, claim check 81) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 33) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 41) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 41) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 69) | pass 79 via tolerance (n10, claim check 81) |

### li2009-samtools | claude:claude-haiku-5-5 | run 2

Status: answer. 65 s. 9 requests, 8 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-033107-28ba. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/li2009-samtools/claude_claude-haiku-5-5/li2009-samtools/run2/home/sessions/20261012-033107-28ba/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/li2009-samtools/claude_claude-haiku-5-5/li2009-samtools/run2/home/sessions/20261012-033107-28ba/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 16) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 38) | pass 3271 via tolerance (n5, claim check 98) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 38) | pass 3144 via tolerance (n4, claim check 98) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 38) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 41) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 41) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 69) | pass 79 via tolerance (n10, claim check 98) |

### li2009-samtools | claude:claude-haiku-5-5 | run 3

Status: answer. 43 s. 6 requests, 6 tool calls (0 failed), 0 nudges, 0 plan reminders, 0 unsourced.
Session: 20261012-033212-be35. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/li2009-samtools/claude_claude-haiku-5-5/li2009-samtools/run3/home/sessions/20261012-033212-be35/log.jsonl
Leak check: 5 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/li2009-samtools/claude_claude-haiku-5-5/li2009-samtools/run3/home/sessions/20261012-033212-be35/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| total_reads | 3307 exact | pass 3307 (n1 metrics.n_reads, entry 12) | not asked |
| mapped_reads | 3271 exact | pass 3271 (n4 metrics.mapped, entry 33) | pass 3271 via tolerance (n5, claim check 78) |
| properly_paired | 3144 exact | pass 3144 (n4 metrics.properly_paired, entry 33) | pass 3144 via tolerance (n4, claim check 78) |
| singletons | 127 exact | pass 127 (n4 metrics.singletons, entry 33) | not asked |
| reads_seq1 | 1482 exact | pass 1482 (n5 metrics.mapped_seq1, entry 36) | not asked |
| reads_seq2 | 1789 exact | pass 1789 (n5 metrics.mapped_seq2, entry 36) | not asked |
| reads_seq2_100_200 | 79 exact | pass 79 (n10 metrics.count, entry 64) | pass 79 via tolerance (n10, claim check 78) |

