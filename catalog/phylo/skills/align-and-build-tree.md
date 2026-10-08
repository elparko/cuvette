---
name: align-and-build-tree
description: Steps to go from unaligned sequences to a maximum-likelihood tree with support values.
---

# Align and build a tree

1. Ask the scientist for the alignment method, if the scientist wants to trim, the model, the bootstrap type and the number of replicates.
2. Run align_sequences with the FASTA file and the chosen algorithm.
3. Check n_sequences and sequences_intact in the result. If sequences_intact is 0, stop.
4. If the scientist chose to trim, run trim_alignment with the chosen gap fraction. Use the new alignment path.
5. Run infer_tree with the alignment path. Leave the model, the bootstrap and the outgroup at the values that the scientist chose.
6. If the scientist named an outgroup, check that its name is in the FASTA file.
7. Report the alignment summary, the model, the log-likelihood, the seed and the bootstrap type.
8. Tell the scientist where the tree file is. The support values are on the branches of that tree.
