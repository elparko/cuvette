---
name: plan-sample-size
description: Steps to compute the sample size of a planned study, and to check the sample size section of a published trial.
---

# Plan a sample size

1. Find the primary outcome and the planned test. A mean difference between two arms needs power_t_test. Two event rates need power_proportions. A table needs power_chisq. 3 or more groups need power_anova.
2. The harness asks for alpha, power, sidedness, the source of the effect size and the dropout.
3. Give the effect in its own units when you have them: mean_diff and sd, or p1 and p2. The tool computes the standardized effect.
4. Set solve_for to n. Report n per group, the total, and the n after dropout.
5. To check a published trial, give the values that its sample size section states and compare the n. If the n differs, try the other method for two proportions or the other sidedness, and say which one matches.
6. Offer the power curve and the power at a smaller or larger effect.
