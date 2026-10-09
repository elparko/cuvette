---
name: binary-outcomes
description: How to test and model a binary outcome - chi-square, Fisher exact, McNemar and logistic regression, with odds ratios.
---

# Binary outcomes

1. Run inspect_table. Find the outcome column and its two values. Find the exposure and the covariates.
   Note the text columns. Note the numeric columns that hold codes for categories, such as a stage from 1 to 4.
2. Decide if the data have pairs. Two measurements on the same subject make a pair. Two tests on one sample make a pair. Matched subjects make a pair.
3. Unpaired, one exposure: run chi_square_test with row and column. Read the expected counts. If a cell has an expected count below 5, run fisher_exact and report it. For a 2x2 table, report the Yates correction choice.
4. Paired: run mcnemar_test with first and second. Report the discordant pairs, the p-value and the difference of the two proportions with its interval.
5. Covariates: run fit_logistic. The harness asks for the covariates, the event value and the reference levels. Pass categorical for numeric codes of categories.
6. Report each odds ratio with its Wald interval and p-value, and the reference level.
   Report n, the number of events and the likelihood-ratio test of the model. For a categorical covariate with more than 2 levels, report its likelihood-ratio test.
7. For a subgroup, pass subset, such as "sex == 'F'". Name the subgroup and its n.

An unadjusted odds ratio comes from fit_logistic with one covariate. An adjusted odds ratio comes from the model with all the covariates. Report which one each number is.
