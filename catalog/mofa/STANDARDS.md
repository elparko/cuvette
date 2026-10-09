# MOFA standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- run_mofa trains one MOFA+ model on two or more views of the same samples. Each view is one table.
- associate_factors correlates the factors with sample covariates.
- top_features lists the features with the largest weights in one factor of one view.
- The tables must have matching sample names. A sample can miss in one view.

## What to report

- The views, the number of features in each view, the transform of each view, and the likelihood of each view.
- The number of samples, and the number of samples that are in all views.
- The number of factors at the start, the minimum variance for a factor, the scaling, and the seed.
- The variance explained by each kept factor in each view, and the total of each view.
- For each factor that you interpret: the covariate that it aligns with, the correlation and the adjusted p value, and the top features.
- The mofapy2 version.

## How to read the result

- A factor is a pattern that varies together in several features. It can be technical, such as a batch.
- A factor that explains variance in one view only is a source of variation of that view.
- A factor that explains variance in several views is a shared source of variation.
- The training starts from random values. Factors with small variance can change with the seed.
- The factor order is by the variance that they explain. The order can change with the seed.

## Do not claim

- Do not say that a factor causes a trait.
- Do not compare the variance explained of two views that have a different scaling. Say so if the number of features differs.
- Do not call a factor biological until you have checked the weights and the batch covariates.
