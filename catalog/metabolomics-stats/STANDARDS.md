# Metabolomics statistics standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- prepare_metabolite_table filters features, fills gaps, normalizes each sample and transforms the values. It writes the prepared table.
- fit_multivariate_model fits a PCA, PLS-DA or OPLS-DA model. It gives R2X, R2Y, Q2, the permutation p values and the VIP scores.
- test_features tests each feature between groups with an adjusted p value and gives the fold change.
- The input is a table with one row for each sample and one column for each feature. A table with features in rows needs a transpose first.
- Ask the scientist if software already normalized the values or took their logarithm. Do not normalize or transform twice.

## What to report

- The number of samples in each group and the number of features before and after the filter.
- The missing value rule, the imputation, the normalization, the transform and the scaling.
- For a model: the type, the predictive and orthogonal components, R2X, R2Y and Q2.
- For a model: the cross-validation segments, the permutation p values and the number of permutations.
- For a test: the test, the adjustment and the level.
- For a test: the significant features (up and down) and the top features with fold change and adjusted p value.
- The version of ropls.

## How to read the result

- R2Y says how well the model fits the samples. Q2 says how well it predicts samples that it did not use. Q2 close to R2Y is good. A large gap shows overfitting.
- A permutation p value tests if Q2 and R2Y beat shuffled labels. A small p value does not make the model useful. Read Q2.
- With more features than samples, a PLS model can separate random groups. Trust Q2 and the permutation test, not the score plot.
- VIP ranks features in the model. The mean of the squared VIP scores is 1. A VIP score is not a p value.
- OPLS splits the variation into a part that predicts the response and an orthogonal part. The orthogonal part helps the plot. It does not give a better prediction.
- A univariate test gives one p value for each feature. With many features, use the adjusted p value.
- Pareto scaling keeps part of the original size of the features. Standard scaling gives every feature the same weight, so noise features gain weight.
- PQN fits a dilution effect, such as urine concentration. Total area fails if a few large features change.
- A fold change needs the scale of the table. A log table gives the fold change as a difference.

## Do not claim

- Do not call a feature a biomarker from a VIP score or a score plot.
- Do not report R2Y alone as the quality of a model.
- Do not pick features from the full data and then report the accuracy on the same samples.
- Do not call features significant from raw p values of many tests.
- Do not drop an outlier sample because of the plot unless the scientist agrees. Report the model with and without it.
