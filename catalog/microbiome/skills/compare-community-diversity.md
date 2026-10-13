---
name: compare-community-diversity
description: Steps to compare the diversity within samples and the community structure between groups of a microbiome table.
---

# Compare community diversity

1. Run inspect_feature_table. Look at the reads of each sample and at the column of the groups.
2. Ask the scientist for the rarefaction depth. Show the reads of the smallest samples from inspect_feature_table, so that the scientist sees which samples drop out at a depth. Do not count them by hand.
3. Run alpha_diversity with the index and the group column that the scientist chose.
4. Ask for the normalization, the distance, the model terms and the number of permutations.
5. Run beta_diversity. Report R2, F, p and the dispersion test.
6. Say if the reads per sample differ between the groups.
7. Do not call a PERMANOVA difference a difference in centre when the dispersion test is significant.
