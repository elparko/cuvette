# Sample size reporting standards

Follow these rules in each answer. They follow CONSORT 2010 item 7a and the SPIRIT 2013 item 14. The review checks look for the same errors.

## Tools

- The scientist owns alpha, power, sidedness, the source of the effect size, the method for two proportions and the dropout. Do not choose them. The harness asks for each value.
- Pick the tool from the planned primary analysis.
- Use power_t_test for a mean and power_proportions for a binary outcome.
- Use power_chisq for a table, power_correlation for a correlation, and power_anova for 3 or more groups.
- Set solve_for to the value that you want. Give all the other values.

## What to report

- The primary outcome and the planned test.
- The effect size in its own units: the difference of means and the SD, or the two proportions.
- The standardized effect: d, h, w, r or f.
- The source of the effect size: a pilot study, a published study, or the minimal clinically important difference.
- Alpha, sidedness and power.
- n per group and in total, rounded up, and the n after the dropout allowance.
- The method and the program: pwr version, and the method for two proportions.

## How to read the result

- A sample size is only as good as the effect size. A small change in the SD or in the difference changes n by the square.
- Cohen's small, medium and large values are not a source. Use them only when nothing else exists, and say so.
- Power computed from the effect that the study observed (post hoc power) gives no information beyond the p-value.
- A one-sided test needs a reason from before the study.
- G*Power, SPSS, Stata and pwr can give n that differ by 1 or 2 because of the method. Name the method.
