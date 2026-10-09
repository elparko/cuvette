---
name: metabolomics-workflow
description: Steps to prepare a metabolite feature table, fit PCA and PLS-DA or OPLS-DA models, and test each feature.
---

# Metabolomics workflow

1. Read the file header. Find the sample column, the group column and the feature columns. Find columns that are not features, such as age or batch.
2. Ask the scientist if the values are intensities or concentrations. Ask if software already normalized them or took their logarithm.
3. Ask the scientist for the missing value rule, the imputation, the normalization and the transform. Ask for samples to exclude.
4. Run prepare_metabolite_table. Read how many features stay and how many values the tool filled.
5. Run fit_multivariate_model with model pca. Look at the score plot for batch effects and outliers. Tell the scientist about them. Do not remove a sample without an answer.
6. Ask the scientist for the scaling, the model, the number of permutations and a test set. Run fit_multivariate_model for pls or opls.
7. Read Q2 and the permutation p values before R2Y. If Q2 is low or the permutation p value is large, say that the groups are not separable with this table.
8. Ask the scientist for the univariate test, the adjustment and the level. Run test_features with the prepared file.
9. Compare the VIP features with the significant features. Name features in both lists. Do not call a feature a biomarker.
10. Report the settings and the number of samples in each group. Report the model quality and the significant features.
