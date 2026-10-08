---
name: fit-a-mixed-model
description: Steps to fit and report a linear mixed model with random effects for subjects or sites.
---

# Fit a mixed model

1. Run inspect_data. Read the columns. Find the column that names the subject or the site. Read the number of rows for each value.
2. Ask the scientist for the unit of replication.
3. Ask the scientist for the formula. It has the response, the fixed effects and the random effects. Do not choose the random effects alone.
4. Ask the scientist for REML or ML, and for the method of the p values.
5. Run fit_mixed_model. Read the fixed effects, the random-effect standard deviations, the singular flag and the warnings.
6. Run plot_model with kind residuals. Run plot_model with kind fit_by_group when the model has a slope.
7. Run get_random_effects if the scientist asks which subjects differ.
8. Report the formula, the number of groups, the method, the estimates with standard errors and p values, the random-effect standard deviations, and every warning.
9. If the fit is singular, say that the random-effects structure is too complex. Ask the scientist before you change it.
