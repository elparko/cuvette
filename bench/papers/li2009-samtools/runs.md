# Runs: li2009-samtools

Date: 2026-10-08. Model: ollama:qwen3:8b. Tool: samtools 1.24.

The prompt is the three Plain questions in one message. The two file paths are added, because
prompt.md names no files. The files are copies of the T7 data in `catalog/samtools/data/`.

Command (run 3, adapter 0.1.2):

    GA_HOME=<temp dir> node bin/ga.js -p "<prompt>" --adapter catalog/samtools --model ollama:qwen3:8b --answers answers.json --output json

answers.json: `{"reference": ".../ex1.fa", "min_mapq": 0, "exclude_flags": 0, "require_flags": 0}`

| Run | Adapter version | Session | Change before the run |
| --- | --- | --- | --- |
| 1 | 0.1.0 | 20261008-002535-e50c | none |
| 2 | 0.1.1 | 20261008-002652-60d0 | Tool descriptions of index_bam and count_reads name the next step |
| 3 | 0.1.2 | 20261008-002838-73f2 | STANDARDS.md says to call the tool before the answer |

## Final answer (all three runs, same content)

"The total number of reads is 3307, and 3271 of them are mapped. Out of these, 3144 reads are
properly paired. The BAM file is sorted and indexed ... To find how many reads fall on the
second reference sequence between positions 100 and 200, I will use the `count_reads` tool."

## Numbers against expected.yaml

| Item | Expected | Run 3 | Result |
| --- | --- | --- | --- |
| total reads | 3307 | 3307 | pass |
| mapped reads | 3271 | 3271 | pass |
| properly paired | 3144 | 3144 | pass |
| singletons | 127 | not reported (in the flagstat result, not in the answer) | not asked |
| reads on seq1 | 1482 | not run | not asked by the Plain prompts |
| reads on seq2 | 1789 | not run | not asked by the Plain prompts |
| MAPQ >= 30 | 3210 | not run | not asked by the Plain prompts |
| reads in seq2:100-200 | 79 | no number | fail |

Verdict: fail. The answer to question 3 is missing.

## What went wrong

- Tool calls in each run: convert_to_bam (with the reference), sort_bam, index_bam, flagstat. All four
  returned the right numbers. The model then wrote "I will use count_reads" and ended the turn with no
  tool call. This happened in all three runs.
- The adapter tools work. `catalog/samtools` test `pipeline_counts` gives 79 for seq2:100-200.
- Changes to the tool descriptions and to STANDARDS.md did not change the model behavior. This is a
  model or harness problem (a final text that promises a call and makes none). The harness does not
  retry this case.
- `--answers` answers only questions that the model asks. Setup decisions get their defaults unless
  `--setup <file>` is also given. The model passed the reference path from the prompt, so this did
  not change the result here.
