# Alignment and tree reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool runs one MAFFT or IQ-TREE command.
- Pass the path that the last step gave. Use alignment from align_sequences or trim_alignment.
- A file that is already aligned (for example PHYLIP) needs no alignment step. Give it to infer_tree or select_model.
- If a question needs a tool call, make the call before you write the answer. Do not write "I will use" and stop.
- The scientist chooses the alignment method, the trimming, the substitution model, the bootstrap type, the number of replicates and the outgroup. Ask. Do not choose.
- The harness fixes the random seed. Report it.

## Alignment

- Report the method, the number of sequences, the alignment length and the gap fraction.
- Say if the alignment was trimmed. Give the gap fraction and the number of columns removed.
- Check sequences_intact. If it is 0, stop and tell the scientist.

## Tree

- Report the program version, the substitution model and how it was chosen (ModelFinder with BIC, or fixed by the scientist).
- Report the log-likelihood, the seed, the bootstrap type and the number of replicates.
- Ultrafast bootstrap values are not standard bootstrap values. Read 95 or more as well supported for the ultrafast bootstrap. Read 70 or more as supported for the standard bootstrap.
- Say which sequence was the outgroup. If none, say that the tree is unrooted.
- Log-likelihoods of trees from different alignments or different models are not comparable without a model test.

## Do not claim

- Do not say a branch is well supported when the run had no bootstrap.
- Do not call a tree the true tree. It is the maximum-likelihood tree under the chosen model.
- Do not read branch order in an unrooted tree as time order.
