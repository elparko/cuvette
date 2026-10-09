# Meta-analysis reporting standards

Follow these rules in each answer. They follow the PRISMA 2020 statement (items 13 and 20 to 21). The review checks look for the same errors.

## Tools

- Run inspect_studies first. Find the study label, the count or mean columns, and the zero cells.
- The scientist owns the effect measure, the model (fixed or random), the tau2 estimator and the test. Do not choose them. The harness asks for each value.
- Give each tool the same columns. The tools compute the effect sizes again from the file each time.

## What to report

- The number of studies (k) and the total number of participants if the file holds it.
- The effect measure, the model, the tau2 estimator for a random-effects model, and the test (z or Knapp-Hartung).
- The pooled effect with its confidence interval and p-value. For a ratio measure (RR, OR, PETO, ROM), give the ratio (effect), not the log value.
- Heterogeneity: Q with its df and p-value, I2, and tau2. For a random-effects model, give the prediction interval. It shows the range of the true effect in a new study.
- Say if escalc added 0.5 to studies with a zero cell, and which studies have no effect size.
- Name the metafor version.

## How to read the result

- I2 is the share of the variability that comes from heterogeneity, not from chance. It does not tell how large the variation of the true effects is. tau2 and the prediction interval do.
- A fixed-effect model with large heterogeneity gives an interval that is too narrow. Say so.
- DerSimonian-Laird can give a tau2 that is too small with few studies. REML and Paule-Mandel are alternatives. The sensitivity table shows the change.
- With fewer than 10 studies, the Egger test and the funnel plot cannot show that there is no small-study effect. Say that the test has low power.
- Asymmetry of the funnel plot has many causes: publication bias, true heterogeneity, chance, or a poor design of small studies.
- An odds ratio is not a risk ratio. Do not write "times the risk" for an odds ratio of a common outcome.
