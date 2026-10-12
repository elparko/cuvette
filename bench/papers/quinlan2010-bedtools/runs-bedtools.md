# Runs with the bedtools adapter (bedtools 2.31.1, quinlan2010-bedtools)

Date: 2026-10-08. Model: ollama:qwen3:8b. Program: bedtools 2.31.1. Adapter 0.1.0.

Each overlap rule is a setup decision, and the harness applies the setup value to every call. One setup
cannot hold both a rule of "any overlap" (question 1) and a rule of "half of the exon" (question 2). I split
the Plain questions in two runs. The file paths are added, because prompt.md names no files. The files are the
full T7 files.

Command:

    GA_HOME=<temp dir> node bin/ga.js -p "<prompt>" --adapter catalog/bedtools --model ollama:qwen3:8b --setup setup.json --answers setup.json --output json

| Run | Questions | Setup | Session |
| --- | --- | --- | --- |
| 1 | 1 and 3 | hg18, fraction of A 0, fraction of B 0, strand any, merge distance 100 | 20261008-122038-54ba |
| 2 | 2 and 3 | same, with fraction of A 0.5 | 20261008-122543-64eb |

## Numbers against expected.yaml

| Item | Expected | Result in the run | Result |
| --- | --- | --- | --- |
| exons with an overlap | 126 | 126 (run 1) | pass |
| overlapping pairs | 129 | 129 (run 1) | pass |
| overlap bases, any overlap | 33713 | 33713 (run 1) | pass |
| pairs with fraction of exon >= 0.5 | 9 | 9, 1473 bases (run 2) | pass |
| AluY intervals after merge, distance 100 | 11270 | no number (both runs) | fail |

Verdict: fail. Four of five items pass. The merge question has no answer.

## What went wrong

- In both runs the model called intersect_intervals once and wrote the answer. It never called merge_intervals for
  question 3. The answer text does not mention question 3.
- The tool works. `catalog/bedtools` test toy_merge passes, and the merge of aluY.chr1.bed at distance 100 gives
  11270 on the command line.
- Run 1 answer: the review tool marked "chr1:101 [no source]-200 [no source]" in the answer text. The model
  wrote a coordinate example that no tool result gave. The numbers 129, 33713 and 126 are correct.

## Rerun after harness fixes (2026-10-08)

Model: `ollama:qwen3:8b`. Harness commit e44260a. Fresh `GA_HOME` for each run under `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/<run>/home`. Prompt, setup and answers files are in `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/`. Each run ended with exit code 0. No run crashed.

Scoring rules for the tables below:

- Pass: the correct number is in the final answer text.
- Tool only: the correct number is in a tool result in `log.jsonl`, but not in the final answer. This counts as fail in the strict count.
- The earlier column repeats the earlier result from this file.

Command: same as above. The prompts name the two files and ask question 3 (merge) in both runs. Two runs, as before, because one setup cannot hold both overlap rules. Run 1 (questions 1 and 3), session `20261008-132622-70d9`. Run 2 (questions 2 and 3), session `20261008-132653-28be`.

| Item | Expected | Earlier result | Rerun result | Pass |
| --- | --- | --- | --- | --- |
| exons with an overlap | 126 | 126 | 126 (run 1 answer) | pass |
| overlapping pairs | 129 | 129 | 129 in tool result id 8, not in the answer | tool only |
| overlap bases, any overlap | 33713 | 33713 | 33,713 (run 1 answer) | pass |
| pairs with fraction of exon >= 0.5 | 9 | 9 | 9 (run 2 answer) | pass |
| AluY intervals after merge, distance 100 | 11270 | no number | 11,270 in both answers (merge_intervals ids 13, 14 in both runs) | pass |

Result: 4 of 5 before, 4 of 5 strict after (5 of 5 with tool results).

Failure causes:

- Model left out a number that the tool returned. Question 1 asks for exons and bases. The answer has 126 and 33,713, not the 129 pairs (id 8 has it). The question does not ask for pairs.
- The merge question is now answered in both runs. The model called `merge_intervals` in both runs after it called `intersect_intervals`.
- Minor: the summary of `merge_intervals` reads "3258790 bases" while the metric is 3258788 (ids 14 and 15). Run 2 reports 3,258,788.
