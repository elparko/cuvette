# Runs with the flowkit adapter (white2021-flowkit)

Date: 2026-10-08. Model: `ollama:qwen3:8b`. Adapter: flowkit 0.1.0 (draft). Program: FlowKit 1.3.2 on the 8 color sample `101_DEN084Y5_15_E01_008_clean.fcs` and the workspace `8_color_ICS.wsp`.

Method: prompt-only emulation. One request with the three plain questions of `prompt.md`. The request names the two files and no tool or setting. An answers file gives the decisions of `expected.yaml`.

Command (`<s>` is a scratch folder):

```
GA_HOME=<s>/home node bin/ga.js -p "$(cat <s>/prompt.txt)" --adapter catalog/flowkit --model ollama:qwen3:8b --answers <s>/answers.json --allow all --output json
```

answers.json: `gating_file` (the workspace), `compensation gating_file`, `free_compensation none`, `compensation_matrix ""`, `control_sample ""`, `transform logicle` with T 262144, W 0.5, M 4.5, A 0. A person must confirm these values.

Ollama was in use by other jobs during both runs. Each run was the only flowkit job.

## Result summary (run 2, final)

| Quantity | Expected | Run 2 | Pass |
| --- | --- | --- | --- |
| Events in the file | 290172 | 290,172 | yes |
| CD3+ events, FlowKit | 133670 | 133,670 | yes |
| CD3+ events, FlowJo | 133860 | 133,860 | yes |
| CD4+ events, FlowKit and FlowJo | 82484 and 82636 | 82,484 and 82,636 | yes |
| CD8+ events, FlowKit and FlowJo | 47165 and 47241 | 47,165 and 47,241 | yes |
| Difference to FlowJo | -0.14, -0.18, -0.16 percent | 190, 152, 76 events fewer (no percent) | yes |
| CD3+ events, compensation none | 135381 | not given | no |
| CD4+ events, compensation none | 85369 | +2885 events (85369) | yes |
| CD8+ events, compensation none | 47694 | +529 events (47694) | yes |
| CD8+ IFNg+ events, compensation none | 672 | 672, but the text calls it the FlowJo count | no |
| Gate that changes most without compensation | IFNg+ under CD8+ | IFNg+ under CD8+, 33,500 percent | yes |

Verdict: PARTIAL, fail on a strict reading. 9 of 11 items pass. The model gave the CD3+ count without compensation in no form. It also wrote that the largest FlowKit-to-FlowJo difference is IFNg+ (2 against 672 events). That claim is wrong. The values 2 and 672 are the counts with the workspace matrix and with none. The true largest FlowKit-to-FlowJo difference is 0.18 percent.

## Run 2 (final)

- Session: `20261008-131547-e623`. Adapter had the new tool `compare_compensation`.
- Tool order: inspect_fcs, list_gates, count_gates, compare_compensation (modes gating_file, fcs, none), count_gates again with compensation none.
- The harness replaced the last call's `none` with the setup value `gating_file` (deviation record, overwritten true). The result of that call did not change the answer. The numbers for the question about compensation came from compare_compensation.
- The review reported 14 problems. One is right: the text says "none" for the setting "Compensation for gating", and the record says gating_file. The other 13 repeat that the FlowJo counts and the differences have no source in the log. The numbers are in the `flowjo_count` column of the `count_gates` table, which the review reads as a summary only.
- The model did not report the CD107a+ counts, so the duplicate gate name was not tested.

## Run 1

- Session: `20261008-131009-060f`. Adapter had no `compare_compensation`.
- Counts of events, CD3+, CD4+ and CD8+ were right. The text gave only the largest FlowJo difference (690 events, Singlets).
- The model asked count_gates for compensation none. The harness replaced it with `gating_file` because the scientist had set that decision. The model then called the result "slightly different" and wrote that the matrix "had an impact". No no-compensation count was ever read. The question about compensation failed.
- The adapter fault: a decision that links to a tool argument also blocks a what-if. I added `compare_compensation` (no decision link) and a line in `STANDARDS.md`. The sensitivity table for `compensation` did not start by itself in either run.

## Notes

- Hand check (no model): count_gates on the same file with compensation gating_file, none and fcs gives CD3+ 133670, 135381, 133670. The spill matrix in the FCS file equals the matrix in the workspace for these gates.
- FlowKit differs from the FlowJo count in the workspace by up to 690 events (0.29 percent) at Singlets. The cause is not known. This is not an adapter fault.
- The Gating-ML 2.0 reference check (49 of 49 gates equal) is in the adapter tests, not in these runs.

## Rerun after harness fixes (2026-10-08)

Model: `ollama:qwen3:8b`. Harness commit 7fd2e86. Fresh `GA_HOME` for each run under `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/<run>/home`. Prompt, setup and answers files are in `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/`. Each run ended with exit code 0. No run crashed.

Scoring rules for the tables below:

- Pass: the correct number is in the final answer text.
- Tool only: the correct number is in a tool result in `log.jsonl`, but not in the final answer. This counts as fail in the strict count.
- The earlier column repeats the earlier result from this file.

Command: same as above. The prompt holds the three Plain questions and the two file paths. The answers file is the same as above, with the logicle values T 262144, W 0.5, M 4.5, A 0. One run. Session `20261008-133118-9d97`.

| Item | Expected | Earlier result (run 2) | Rerun result | Pass |
| --- | --- | --- | --- | --- |
| events in the file | 290172 | 290,172 | 290,172 | pass |
| CD3+ events, FlowKit | 133670 | 133,670 | 133,670 | pass |
| CD3+ events, FlowJo | 133860 | 133,860 | 133,860 | pass |
| CD4+ events, FlowKit and FlowJo | 82484 and 82636 | same | 82,484 and 82,636 | pass |
| CD8+ events, FlowKit and FlowJo | 47165 and 47241 | same | 47,165 and 47,241 | pass |
| difference to FlowJo | -0.14, -0.18, -0.16 percent | 190, 152, 76 events (no percent) | 190, 152, 76 events (no percent) | pass, same standard |
| CD3+ events, compensation none | 135381 | not given | in compare_compensation id 33 only | tool only |
| CD4+ events, compensation none | 85369 | 85369 | 85,369 | pass |
| CD8+ events, compensation none | 47694 | 47694 | 47,694 | pass |
| CD8+ IFNg+ events, compensation none | 672 | 672, called the FlowJo count | 2 to 672 events | pass |
| gate that changes most without compensation | IFNg+ under CD8+ | IFNg+ under CD8+ | IFNg+ under CD8+ (33,500 percent) | pass |

Result: 9 of 11 before, 10 of 11 strict after, 11 of 11 with tool results.

Failure causes:

- Model left out the CD3+ count without compensation. It is in id 33 (135381).
- The model did not call `calculate` (zero calls in the log). The answer has the differences 190, 152 and 76 and the percentages 29.42 and 16.44. The rule `unsourced_numbers` flagged them (id 58) and the answer shows "[no source]" next to them. The values are right: 133860-133670, 82636-82484, 47241-47165.
- Model asked twice for count_gates with compensation none (ids 43 and 50). The harness used the setup value gating_file (deviations, ids 44 and 51). Both calls were wasted. The tool result carries the note about `propose_change` and `compare_options`. The model used neither. It had the numbers from `compare_compensation` (id 32), so the answer is not affected.
- The review (10 problems, id 39) caused one revision. The revised answer (id 66) keeps the right counts and the "[no source]" marks.
- The model did not report the CD107a+ counts, so the duplicate gate name was not tested.

## Run 1

- Session: `20261008-131009-060f`. Adapter had no `compare_compensation`.
- Counts of events, CD3+, CD4+ and CD8+ were right. The text gave only the largest FlowJo difference (690 events, Singlets).
- The model asked count_gates for compensation none. The harness replaced it with `gating_file` because the scientist had set that decision. The model then called the result "slightly different" and wrote that the matrix "had an impact". No no-compensation count was ever read. The question about compensation failed.
- The adapter fault: a decision that links to a tool argument also blocks a what-if. I added `compare_compensation` (no decision link) and a line in `STANDARDS.md`. The sensitivity table for `compensation` did not start by itself in either run.

## Notes

- Hand check (no model): count_gates on the same file with compensation gating_file, none and fcs gives CD3+ 133670, 135381, 133670. The spill matrix in the FCS file equals the matrix in the workspace for these gates.
- FlowKit differs from the FlowJo count in the workspace by up to 690 events (0.29 percent) at Singlets. The cause is not known. This is not an adapter fault.
- The Gating-ML 2.0 reference check (49 of 49 gates equal) is in the adapter tests, not in these runs.

## Rerun after harness fixes (2026-10-08)

Model: `ollama:qwen3:8b`. Harness commit 7fd2e86. Fresh `GA_HOME` for each run under `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/<run>/home`. Prompt, setup and answers files are in `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/`. Each run ended with exit code 0. No run crashed.

Scoring rules for the tables below:

- Pass: the correct number is in the final answer text.
- Tool only: the correct number is in a tool result in `log.jsonl`, but not in the final answer. This counts as fail in the strict count.
- The earlier column repeats the earlier result from this file.

Command: same as above. The prompt holds the three Plain questions and the two file paths. The answers file is the same as above, with the logicle values T 262144, W 0.5, M 4.5, A 0. One run. Session `20261008-133118-9d97`.

| Item | Expected | Earlier result (run 2) | Rerun result | Pass |
| --- | --- | --- | --- | --- |
| events in the file | 290172 | 290,172 | 290,172 | pass |
| CD3+ events, FlowKit | 133670 | 133,670 | 133,670 | pass |
| CD3+ events, FlowJo | 133860 | 133,860 | 133,860 | pass |
| CD4+ events, FlowKit and FlowJo | 82484 and 82636 | same | 82,484 and 82,636 | pass |
| CD8+ events, FlowKit and FlowJo | 47165 and 47241 | same | 47,165 and 47,241 | pass |
| difference to FlowJo | -0.14, -0.18, -0.16 percent | 190, 152, 76 events (no percent) | 190, 152, 76 events (no percent) | pass, same standard |
| CD3+ events, compensation none | 135381 | not given | in compare_compensation id 33 only | tool only |
| CD4+ events, compensation none | 85369 | 85369 | 85,369 | pass |
| CD8+ events, compensation none | 47694 | 47694 | 47,694 | pass |
| CD8+ IFNg+ events, compensation none | 672 | 672, called the FlowJo count | 2 to 672 events | pass |
| gate that changes most without compensation | IFNg+ under CD8+ | IFNg+ under CD8+ | IFNg+ under CD8+ (33,500 percent) | pass |

Result: 9 of 11 before, 10 of 11 strict after, 11 of 11 with tool results.

Failure causes:

- Model left out the CD3+ count without compensation. It is in id 33 (135381).
- The model did not call `calculate` (zero calls in the log). The answer has the differences 190, 152 and 76 and the percentages 29.42 and 16.44. The rule `unsourced_numbers` flagged them (id 58) and the answer shows "[no source]" next to them. The values are right: 133860-133670, 82636-82484, 47241-47165.
- Model asked twice for count_gates with compensation none (ids 43 and 50). The harness used the setup value gating_file (deviations, ids 44 and 51). Both calls were wasted. The tool result carries the note about `propose_change` and `compare_options`. The model used neither. It had the numbers from `compare_compensation` (id 32), so the answer is not affected.
- The first answer gave 29.42 and 16.44 percent of all events as "no compensation" shares. The review (10 problems) caused the revised answer. The numbers 133,670 and others stayed.
- The model did not report the CD107a+ counts, so the duplicate gate name was not tested.
