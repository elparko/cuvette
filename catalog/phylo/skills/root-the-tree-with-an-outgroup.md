---
name: root-the-tree-with-an-outgroup
description: Steps to root a tree with an outgroup that the scientist names.
---

# Root the tree

1. Ask the scientist which sequence or sequences are the outgroup. Do not guess from the names.
2. Look in the FASTA file for the exact sequence names.
3. If the decision outgroup does not hold these names, call propose_change with the key outgroup and the names. Use commas between several names. Then run infer_tree.
4. Report the outgroup. If the outgroup is not a single group on the tree, IQ-TREE says so in the report. Tell the scientist.
5. If the scientist has no outgroup, the decision outgroup stays empty. Say that the tree is unrooted.
