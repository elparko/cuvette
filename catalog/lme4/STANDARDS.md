# lme4 reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run inspect_data first. Find the grouping columns and the number of rows for each group.
- Run fit_mixed_model with the formula that the scientist chose. Do not choose the random effects alone.
- Use compare_models for a test of a fixed effect or of a random effect. Use plot_model to check the residuals.

## What to report

- Report the full formula, the data source and the number of observations.
- Report the number of groups for each random effect, such as the number of subjects.
- Report REML or ML. Report the method for the p values (Satterthwaite or Kenward-Roger).
- Report each fixed effect with its estimate, standard error, degrees of freedom and p value.
- Report the standard deviation of each random effect, the residual standard deviation and the correlations.
- Report the REML criterion for a REML fit, or the deviance for an ML fit.
- Report every warning and say if the fit is singular.
- Name the lme4 and lmerTest versions.

## How to read the result

- The unit of replication is the group (subject, animal, site). The number of rows is not the sample size for a between-subject effect.
- A singular fit means that a variance is near 0 or a correlation is near plus or minus 1. The random-effects structure is too complex for the data. Say so. Do not drop terms after you look at the fit unless the scientist agrees.
- A random-intercept model with the same fixed effects has the same estimates and smaller standard errors when the random slopes are real but left out. The p values are then too small.
- Compare fixed effects with ML fits. REML fits of models with different fixed effects are not comparable.
- A likelihood ratio test of a variance component is conservative, because the null value is on the boundary.
- The Satterthwaite and Kenward-Roger degrees of freedom are estimates. The p values are approximate.

## Do not claim

- Do not say that an effect is causal because the model has random effects.
- Do not count rows from the same subject as independent replicates.
- Do not report a p value from a fit with a convergence warning without naming the warning.
- Do not compare models with different data rows. The tool uses the same data for both models.
