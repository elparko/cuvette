---
name: root-the-tree-with-an-outgroup
description: Steps to root a tree with an outgroup that the scientist names.
---

# Root the tree

1. Ask the scientist which sequence or sequences are the outgroup. Do not guess from the names.
2. Look in the FASTA file for the exact sequence names.
3. Run infer_tree with outgroup set to the name. Use commas between several names.
4. Report the outgroup. If the outgroup is not a single group on the tree, IQ-TREE says so in the report. Tell the scientist.
5. If the scientist has no outgroup, leave outgroup empty and say that the tree is unrooted.
