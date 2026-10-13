---
name: pool-studies
description: Steps to pool studies in a meta-analysis - effect sizes, the model, heterogeneity, the forest plot and the funnel plot.
---

# Pool studies

1. Run inspect_studies. Find the study label column.
2. Find the data columns: the counts (events and non-events in each arm), the means and SDs, or the effect sizes.
3. If the file gives events and totals, the non-events column is the total minus the events. The tools need the non-events. Make the column with the tables adapter or ask the scientist.
4. The harness asks for the effect measure, the model and the tau2 estimator.
5. Run compute_effect_sizes. Check the effect of each study against the paper.
6. Run fit_meta_analysis. Report the pooled effect with its interval and p-value. For a ratio measure, report the ratio.
7. Report Q, I2, tau2 and the prediction interval. Show the forest plot.
8. Run funnel_and_egger. Report the Egger test with its model and the number of studies. With fewer than 10 studies, say that the test has low power.
9. Offer the sensitivity table for the model and the tau2 estimator.

For a hazard ratio from each study, use measure GEN with yi the log hazard ratio and sei its standard error. To get the standard error from a 95% interval, call calculate with (log(upper) - log(lower)) / 3.92. Do not compute it by hand.
