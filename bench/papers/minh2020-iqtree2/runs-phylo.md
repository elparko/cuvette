# Runs with the phylo adapter (minh2020-iqtree2)

Date: 2026-10-08. Adapter: `catalog/phylo` version 0.1.0 (draft). Model: `ollama:qwen3:8b`. Programs: IQ-TREE 3.1.4 (`iqtree3`), MAFFT 7.526. macOS arm64.

Command (`<scratch>` is a scratch folder; the setup and answers files hold the same values):

    GA_HOME=<scratch>/runN/home node bin/ga.js -p "$(cat <scratch>/promptN.txt)" --adapter catalog/phylo --model ollama:qwen3:8b --setup setup.json --answers answers.json --allow all --output json

setup.json: `{"algorithm":"auto","trim":false,"model":"MFP","bootstrap_type":"ufboot","replicates":1000,"outgroup":""}`. The seed is fixed to 1 by the adapter.

| Run | Session | Prompt | Result |
| --- | --- | --- | --- |
| 1 | 20261008-120246-ff9d | The three Plain requests in one message, with the two file paths, and "write every number in the answer text". | fail |
| 2 | 20261008-121013-94dd | The guided question, the path of example.phy, and "call the tree tool". | fail |

## Run 1

The model made one tool call: align_sequences on unaligned.fasta. The answer has the alignment numbers only (6 sequences, 240 columns, 81 constant columns). It does not answer questions 1 and 2. The model stopped after one call with no model choice and no tree.

## Run 2

The model called align_sequences on example.phy, which is already aligned and is PHYLIP format. MAFFT failed. The harness stopped the repeated call. The answer says the alignment failed. No tree tool ran.

## Numbers against expected.yaml

| Item | Expected | Run 1 | Run 2 | Result |
| --- | --- | --- | --- | --- |
| best model by BIC | TIM2+F+I+G4 | not reported | not reported | fail |
| log-likelihood | -21152.54 (tolerance 1) | not reported | not reported | fail |
| sequences, sites | 17, 1998 | not reported | not reported | fail |
| constant sites | 686 | not reported | not reported | fail |
| MAFFT sequences | 6 | 6 | not run | pass in run 1 |
| MAFFT length | 240 (tolerance 20) | 240 | not run | pass in run 1 |

Verdict: fail. The main question (model and tree) got no answer in two runs.

## What went wrong

- The adapter tools give the expected numbers by hand and in the known-answer tests (`example_phy_models`, `example_phy_tree`).
- Run 2: the model chose the alignment tool for an aligned file. After the runs, the description of align_sequences and STANDARDS.md were changed to say that an aligned file goes straight to infer_tree. The change is not tested with the model, because the limit is two runs per paper.
- Run 1: the model answers one request of three and stops. The samtools runs show the same behavior of qwen3:8b.
- Each model turn took 1 to 5 minutes, because Ollama is shared with other agents.

## Rerun after harness fixes (2026-10-08)

Model: `ollama:qwen3:8b`. Harness commit 7fd2e86. Fresh `GA_HOME` for each run under `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/<run>/home`. Prompt, setup and answers files are in `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/`. Each run ended with exit code 0. No run crashed.

Scoring rules for the tables below:

- Pass: the correct number is in the final answer text.
- Tool only: the correct number is in a tool result in `log.jsonl`, but not in the final answer. This counts as fail in the strict count.
- The earlier column repeats the earlier result from this file.

Command: same as run 2 above, with `--setup` and `--answers` set to the same values. The prompt is the guided question, the path of example.phy and "Call the tree tool." The prompt files are in `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/minh2020-iqtree2/`. One run. Session `20261008-132503-4860`.

| Item | Expected | Earlier result | Rerun result | Pass |
| --- | --- | --- | --- | --- |
| best model by BIC | TIM2+F+I+G4 | not reported | not reported | fail |
| log-likelihood | -21152.54 (tolerance 1) | not reported | not reported | fail |
| sequences, sites | 17, 1998 | not reported | not reported | fail |
| constant sites | 686 | not reported | not reported | fail |
| MAFFT sequences, length | 6, 240 | pass in run 1 (Plain prompt) | not asked by the guided prompt | not scored |

Result: 0 of 4 before, 0 of 4 after.

Failure causes:

- Model called the wrong tool. It called `align_sequences` on example.phy, which is already aligned (log ids 7, 16, 23). It never called the model or tree tool, although the prompt said "Call the tree tool".
- The harness nudge at ids 13 and 22 said "fix the input and try again". The model sent the same call again. The harness stopped the third identical call at ids 25 and 26.
- The final answer (id 38) tells the user to fix MAFFT. It does not answer the question.
- Tool diagnostic gap: the error text ends after "mafft failed:" with no reason (ids 8 and 17). The model cannot see why the call failed.
