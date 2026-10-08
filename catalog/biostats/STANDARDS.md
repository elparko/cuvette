# Biostatistics reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool reads one CSV file and names its columns.
- Call inspect_table first. Read the columns, the missing values and the number of distinct values.
- The scientist owns the test, the sidedness, alpha, the correction, the model formula, the covariates, the ties method and the unit of replication. Do not choose them. The harness asks for each value.
- Do not ask for decision values in your own words. Do not suggest a value in a question.

## Every test

- Report the test by name: paired or unpaired, t-test or rank test, Student or Welch.
- Report the sidedness, alpha, the number in each group, the estimate, the confidence interval and the p-value.
- State the direction of the difference. The tool gives the second group minus the first group.
- Report an effect size with the estimate. A p-value alone does not show the size of an effect.
- Say "significant" only with alpha beside it. Do not call p = 0.06 a trend.

## Pairing and replication

- Rows from the same subject are not independent. Count subjects as n.
- If the same subject is in both groups, use the paired test. An unpaired test on paired data can reverse the conclusion.
- If each subject has many rows, use fit_mixed_model with the subject as groups, or use one value for each subject. Do not use fit_ols with nonrobust errors on these rows.
- Say how many subjects and how many rows the data hold.

## Many tests

- Count all the tests that you ran for one question. Pairwise comparisons count as tests.
- Report the correction by name and the adjusted p-values. Do not call raw p-values significant.
- A one-sided test needs a reason that the scientist gave before the data were seen.

## Mixed models

- Report the formula, the random effects, REML or ML, the number of groups, the fixed effects with standard errors and the variance of each random effect.
- A random intercept alone does not model a slope that differs between subjects. Say which one the model has.

## Survival

- Report the number of subjects, the number of events, the covariates, the ties method and the concordance.
- Give hazard ratios with confidence intervals. A hazard ratio is not a risk ratio.
- Report the proportional hazards test. If a covariate fails it, say so. Do not present its hazard ratio as constant in time.
- Censored subjects are not events. Check that the event column is 1 for the event and 0 for censored.
- A Kaplan-Meier median that is not reached is not an error. Report it as not reached.
