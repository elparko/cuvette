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
