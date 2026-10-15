# Runs with the Sage adapter (lazear2023-sage)

Date: 2026-10-08. Model: ollama:qwen3:8b. Program: Sage 0.14.6 (release v0.14.7). Adapter 0.1.1.
Data: BSA1, BSA2, BSA3 and standards.fasta in /Volumes/T7/guided-analysis/data/lazear2023-sage/ (read only).

Command (setup.json in this folder answers all setup questions):

    GA_HOME=<temp dir> node bin/ga.js -p "<prompt>" --adapter catalog/sage --model ollama:qwen3:8b --setup setup.json --answers setup.json --output json

The prompt is Plain question 1, 2 and 3 in one message (run 1) and the Guided question (run 2). The file paths are added, because prompt.md names no file.

| Run | Prompt | Session | Result |
| --- | --- | --- | --- |
| 1 | Plain 1 to 3 | 20261008-125939-d3d3 | pass: all three numbers right |
| 2 | Guided | 20261008-130637-384e | partial: 1% right, 5% not computed |

## Numbers against expected.yaml

| Item | Expected | Run 1 | Run 2 | Result |
| --- | --- | --- | --- | --- |
| PSMs in the table | 303 | 303 (tool) | 303 (answer) | pass |
| decoy PSMs | 43 | 43 (tool) | 43 (answer) | pass |
| target PSMs at 1% | 207 | 207 (answer) | 207 (answer) | pass |
| distinct peptides at 1% | 47 | 47 (answer) | 47 (answer) | pass |
| decoys among kept | 1 | 1 (answer) | 1 (answer) | pass |
| target PSMs at 5% | 242 | not asked | no number | fail |

Verdict: pass for the Plain questions. Fail for the 5% part of the Guided question.

## What happened

- Run 1: the model called `search_sage` once and `count_at_fdr` once. It left out the arguments that the setup sets, and the harness filled them. The first draft ended with text that promised more work. The harness nudged the model twice. The final answer has the three numbers and all settings. `recount_agrees` was 1 (the Python recount of the q-values equals Sage).
- Run 2: the model called `count_at_fdr` a second time with threshold 0.05. The harness replaced 0.05 with the setup value 0.01 (deviation record: setup 0.01, requested 0.05, used 0.01, overwritten true). The tool result then showed 207 again. The model wrote "5 [no source]" and said that no 5% data exist. The referee flagged this.
- The model asked for no peptide list. The answer names only the top peptide (YLYEIAR). The question "which peptides" needs the table; the adapter has no tool that lists peptides.

## Harness fault to review

- A setup value overwrites a value that the model requests for a `when_needed` decision. A scientist who sets 0.01 at setup cannot then ask the agent for 0.05. The sensitivity table (options 0.01, 0.05, 0.1) does not help the answer, because the answer must come from a tool result with the requested value. This is the same fault as in `runs-bcftools.md`.

## Other checks (not model runs)

- The adapter test `standards_psm_1pct` uses the 283 spectra that matched with min_len 7 (the small copies in `catalog/sage/data/`): 283 PSMs, 203 at 1%, 43 peptides. The full files with the same settings and length up to 30 give 302 PSMs and 206. With Sage default lengths (5 to 50) they give 303 and 207, the values in expected.yaml.
- Early settings that fail: with no limit on fragment charge, the highest-scoring hits were 40-residue peptides at charge 5 and no PSM reached 1% FDR. With max_fragment_charge 1 the standards appear.
- The single-spectrum file of the Sage repository gives the peptide LQSRPAAPPAPGPGQLTLR as top hit (test `sage_repo_single_spectrum`).
- A search of the whole database (9439 proteins, with the background organism) gives 731 PSMs with 318 decoys and no hit at 1%. The standards database is the right one for a standard mix; a larger database needs more spectra.
- OpenMS SageAdapter on the same files gives 18 PSMs at 1%, because it scores by hyperscore without Sage rescoring and FalseDiscoveryRate does not use the +1 correction. See `runs-openms.md` in rost2016-openms.

## Rerun after harness fixes (2026-10-08)

Model: `ollama:qwen3:8b`. Harness commit e44260a. Fresh `GA_HOME` for each run under `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/<run>/home`. Prompt, setup and answers files are in `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/`. Each run ended with exit code 0. No run crashed.

Scoring rules for the tables below:

- Pass: the correct number is in the final answer text.
- Tool only: the correct number is in a tool result in `log.jsonl`, but not in the final answer. This counts as fail in the strict count.
- The earlier column repeats the earlier result from this file.

Command: same as above, with the Guided prompt and the paths of BSA1, BSA2, BSA3 and standards.fasta. The setup file is `setup.json` of this folder. One run. Session `20261008-133633-3d1a`.

| Item | Expected | Earlier result (run 2) | Rerun result | Pass |
| --- | --- | --- | --- | --- |
| PSMs in the table | 303 | 303 (answer) | 303 in the first draft (id 24), not in the final answer | tool only |
| decoy PSMs | 43 | 43 (answer) | 43 in the first draft, not in the final answer | tool only |
| target PSMs at 1% | 207 | 207 | 207 (answer) | pass |
| distinct peptides at 1% | 47 | 47 | 47 (answer) | pass |
| decoys among kept | 1 | 1 | 1 in id 14 only | tool only |
| target PSMs at 5% | 242 | no number | 207, stated as the 5% count | fail |

Result: 5 of 6 before, 2 of 6 strict after, 5 of 6 with tool results.

Failure causes:

- Model misreported the 5% count. It called `count_at_fdr` with threshold 0.05 (id 19). The harness used the setup value 0.01 (deviation, id 20). The tool result shows fdr_threshold=0.01 and carries the note "To change it, call propose_change. To check other values without a change, call compare_options." The model used neither tool. It wrote that 207 PSMs pass at 5% and "the FDR threshold was already met" (ids 24 and 39).
- Harness fault: one review round. The first draft had 303 and 43 (id 24). The review flagged the 5 as unsourced and the revision (id 39) dropped the PSM totals. The final answer still has the wrong 5% claim, flagged by the referee (ids 33, 34, 38).
- No peptide list. The model asked for none and the adapter has no tool for it. The final answer says the number of peptides "is not clear from the data", while it gives 47.
- The model did not use `propose_change` or `compare_options` (zero calls).
