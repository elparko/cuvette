# Haiku run after the prompt fix (12 October 2026)

Commit 7b03121. Same 53 papers and options as the run of 12 October after the effect-size rules.
Four shards. Budget guard $181.20. Cost: about $1.20.

The run stopped early. The T7 drive became full (ENOSPC) after about 18 runs in each shard.
65 runs on 23 papers ended with an answer. The table compares only these 65 runs (same paper, same run number) in the three sets.

| Set | Computed items | Reported items |
| --- | ---: | ---: |
| Before (9 October, commit 1d5f392) | 543 of 548 | 455 of 465 |
| After the effect-size rules (commit 25c8aa5) | 540 of 548 | 452 of 465 |
| After the prompt fix (commit 7b03121) | 544 of 548 | 460 of 465 |

Verdict: on these 65 runs, the score after the prompt fix is equal to or higher than the score of 9 October.
The other 30 papers did not run. Free space on T7 is necessary for a full run.
