---
name: test-differential-abundance
description: Steps to find the features of a microbiome table that differ between groups or that change with a covariate.
---

# Test differential abundance

1. Run inspect_feature_table. Check the match of the sample names and the reads of each sample.
2. Ask the scientist for the model columns, the covariates, the reference level and the unit of replication.
3. Ask if one subject gives more than one sample. If yes, name the subject column as a random effect.
4. Ask for the prevalence limit, the normalization, the transform and the adjusted p limit. Choose them before the test.
5. Run differential_abundance with the method that the scientist chose.
6. Report the number of features tested and the number at the limit.
   Give the coefficient, p and q of each feature that you name.
7. Say in how many samples each named feature occurs.
8. Offer the second method as a check. Report both lists if the scientist agrees.
9. Do not change the filters or the transform after you see the result.
