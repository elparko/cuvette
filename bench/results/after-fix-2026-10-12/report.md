# Haiku run after the prompt fix (12 October 2026)

Commit 7b03121. Same 53 papers, 3 runs each, blind, as the run of 12 October after the effect-size rules.

The first four shards stopped when the T7 drive became full. The other 33 papers then ran on the internal disk, one paper at a time, from `shards/` and `rest/`.
Korsunsky 2019 run 3 did not fit on the disk (more than 15 GB). 158 of 159 runs ended with an answer.
Cost: about $3.20. Monthly spend after the run: about $180.

The table compares the same 158 runs (same paper, same run number) in the three sets.

| Set | Computed items | Reported items | Answers with a p value | Of those, with a 95% CI |
| --- | ---: | ---: | ---: | ---: |
| Before (9 October, commit 1d5f392) | 1405 of 1411 | 1128 of 1147 | 32 | 22 |
| After the effect-size rules (commit 25c8aa5) | 1398 of 1411 | 1116 of 1147 | 37 | 36 |
| After the prompt fix (commit 7b03121) | 1405 of 1411 | 1118 of 1147 | 37 | 36 |

Verdict: the computed score is the same as on 9 October. The reported score is 10 items lower. Two runs of the same code differ by about 10 items (see `../after-effect-2026-10-12/drop-analysis.md`), so this difference is in the run-to-run noise.
Nearly all answers with a p value now give a 95% confidence interval (36 of 37, before 22 of 32).
