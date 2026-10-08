---
name: cox-survival
description: How to run and report Kaplan-Meier curves, the log-rank test and a Cox model, with the Rossi data as the example.
---

# Survival analysis

1. Run inspect_table. Find the follow-up time, the event column and the covariates. The event column must be 1 for the event and 0 for censored.
2. Run kaplan_meier with group set to the exposure. Report the number of events, the median survival (or "not reached") and the log-rank p-value. Pass time_points for survival at set times.
3. Run fit_cox. The harness asks for the covariates and the ties method. The covariates come from the science, not from the p-values.
4. Report the hazard ratio with the confidence interval for each covariate. A hazard ratio below 1 means a lower rate of the event.
5. Read ph_violations in the result. A covariate on that list breaks the proportional hazards assumption. Say so in the report. The scientist can stratify by it with the strata argument.
6. The ties method (Efron or Breslow) can change the third digit of a coefficient. Report the method. Run the sensitivity table if the scientist asks how much it matters.

If the proportional hazards test fails for a covariate, the hazard ratio of that covariate is an average over time. Say so in the answer.
