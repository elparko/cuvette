# Trial endpoint reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- compare_binary_endpoint analyzes an event that happens or not. It gives the risk in each arm, the risk difference with its interval, the relative risk, the odds ratio and the number needed to treat.
- A stratum column adds the Mantel-Haenszel risk difference, relative risk and odds ratio. It adds the Cochran-Mantel-Haenszel test and the Breslow-Day test with the Tarone correction.
- compare_survival_endpoint analyzes the time to an event. It gives the Cox hazard ratio, the log-rank test, the proportional hazards test, the survival at one time and the restricted mean survival time.
- Both tools can test non-inferiority against a margin that the scientist fixes.
- Both tools analyze the rows that they receive. The scientist must filter the table to the analysis population before the first run.

## What to report

- The endpoint, the analysis population, the number of patients and the number of events in each arm.
- The name of the arm that is the numerator of each ratio and difference.
- The risk difference as points of percent with the interval, and the name of the interval method.
- The relative risk or the hazard ratio with its interval. Give the odds ratio only if the design asks for it.
- The test, its name and its p value. Give the p value as the tool prints it, not as "p < 0.05".
- For a stratified analysis: the stratification factor, the Mantel-Haenszel estimate and the homogeneity test.
- For restricted mean survival time: tau, the unit of time, the value in each arm, the difference and the ratio.
- For non-inferiority: the margin, its scale, the limit of the one-sided interval and the conclusion. State that the scientist fixed the margin before the data.
- The number of rows with a missing outcome and the rule that handled them.
- The version of the R package survRM2.

## How to read the result

- A risk difference below 0 means that the test arm has the lower risk. For an event that harms, this favors the test arm.
- A wide interval that includes 0 means that the data do not exclude a benefit or a harm. Do not say "no difference".
- Non-inferiority holds only if the interval limit lies inside the margin. A p value above 0.05 does not show it.
- The Wald interval is too narrow for small groups or for risks near 0 or 1. Newcombe and Miettinen-Nurminen keep their level better.
- The number needed to treat has no finite upper limit if the interval of the risk difference includes 0.
- One hazard ratio describes the whole follow-up only if the hazards are proportional. If the proportional hazards test is below 0.05, report the restricted mean survival time too.
- The restricted mean survival time is the mean event-free time up to tau. It needs no proportional hazards.
- Tau must be at or before the last time of the shorter arm, and the scientist must fix it before the data.
- The Cochran-Mantel-Haenszel test pools the strata under one common odds ratio. Check the homogeneity test before you give one pooled number.

## Do not claim

- Do not choose the margin, tau or the interval method after you see the result.
- Do not call a trial equivalent or non-inferior from a non-significant superiority test.
- Do not claim that a treatment works in a subgroup because the p value is below 0.05 in that subgroup. Ask for a test of interaction.
- Do not mix the intention to treat and the per protocol population in one comparison.
