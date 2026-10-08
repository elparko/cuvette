---
name: model-repeated-measures
description: How to fit and report a mixed model when each subject has many rows, with the sleepstudy data as the example.
---

# Model repeated measures

Use this when each subject has more than one row, for example one reaction time for each day.

1. Run inspect_table. Find the subject column and the number of rows for each subject.
2. Ask the scientist for the unit of replication. The answer is the subject, not the row.
3. Run fit_mixed_model with groups set to the subject column. The harness asks for the formula, the random effects and REML or ML.
4. Read the variances. A large subject variance means that subjects differ in their baseline. A random slope variance means that subjects differ in their trend.
5. Run fit_mixed_model again with the other random effects choice. Report both. The fixed effect is the same. The standard error of the slope is not.
6. Report the formula, the random effects, REML or ML, the number of groups, the fixed effects with standard errors and the variance of each random effect.

Do not run fit_ols on these rows to get a p-value. OLS treats each row as an independent subject. Its standard error for a slope is then too small compared with a mixed model with a random slope.
