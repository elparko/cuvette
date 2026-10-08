# Runs: andrews-fastqc

Date: 2026-10-08. Model: ollama:qwen3:8b. Tool: FastQC 0.13.0 (Java from Homebrew).

The prompt is the three Plain questions in one message. The two file paths (the full T7 files,
`.txt` extension) are added, because prompt.md names no files.

Command (run 3, adapter 0.1.0):

    GA_HOME=<temp dir> node bin/ga.js -p "<prompt>" --adapter catalog/fastqc --model ollama:qwen3:8b --setup setup.json --answers setup.json --output json

setup.json: `{"encoding": "phred64", "action_on_fail": "decide_later"}`

| Run | Settings | Session |
| --- | --- | --- |
| 1 | encoding auto (FastQC defaults, as expected.yaml says) | 20261008-003127-112e |
| 2 | `--answers` only with phred64. The harness ignored it and used auto. | 20261008-003424-35f9 |
| 3 | `--setup` and `--answers` with phred64 | 20261008-003724-9835 |

## Final answer (run 3, short)

good_sequence_short.txt: 250,000 reads, length 40, 45 percent GC, all modules PASS.
bad_sequence.txt: 395,288 reads, length 40, 47 percent GC, 5 PASS, 4 WARN, 2 FAIL. The model would
not trust the bad file.

## Numbers against expected.yaml

| Item | Expected | Run 1 (auto) | Run 3 (phred64) |
| --- | --- | --- | --- |
| good file total sequences | 250000 | 250000 | 250000 |
| bad file total sequences | 395288 | 395288 | 395288 |
| sequence length | 40 | 40 | 40 |
| good file %GC | 45 | 45 | 45 |
| bad file %GC | 47 | 47 | 47 |
| bad file per base sequence quality | FAIL | PASS (fail) | FAIL |
| good file modules not PASS | 0 | 0 | 0 |
| bad file modules WARN | 4 | 4 | 4 |

Verdict: run 1 fails one item of eight. Run 3 passes eight of eight.

## What went wrong

- With the default encoding, FastQC 0.13.0 reads the bad file as Sanger (Phred+33) and prints
  "Using Phred32 encoding your lowest quality is 34 could this file be Phred64 encoded?". Per base
  sequence quality is then PASS. With `--phred64` the encoding is Illumina 1.5 and the module is FAIL,
  as expected.yaml says. The expected value needs the encoding decision, not the FastQC defaults.
  The adapter has this as the decision `encoding`.
- The model wrote some text that the data does not support: "adapter contamination" as a cause, "FastQC
  guessed the encoding as phred64" (the scientist set it), and "suitable for further analysis" for the
  good file. It did not name the FAIL modules in the answer. The tool result lists them in
  fail_modules.
- The model did not call read_modules. run_fastqc already gave the statuses.
- The adapter needed no change. The `--answers` file does not set setup decisions. Use `--setup`.
