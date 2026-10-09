---
name: two-sample-mr
description: Steps to estimate a causal effect from variant summary statistics and to check the instruments.
---

# Mendelian randomization from summary statistics

1. Read the file. Find the columns for the variant, the exposure effect and its standard error, the outcome effect and its standard error.
2. Ask the scientist if the exposure and outcome effects use the same effect allele for every variant. Ask for the exposure, the outcome and the source of each table.
3. Ask if the variants are independent. If the variants have correlation, ask for the correlation matrix in the order of the table.
4. Run check_variants. Read the F statistic of each variant and the Q contributions. Tell the scientist about each weak instrument and each large contribution.
5. Ask for the methods and for the variants to exclude. Ask the scientist to decide before the scientist sees the estimates.
6. Run estimate_causal_effect with the chosen methods.
7. Read each estimate with its standard error and interval. Read Cochran Q, I-squared, the F statistic and the MR-Egger intercept.
8. If the methods disagree, or Q or the intercept is significant, say so. Do not pick the method that gives the result you expected.
9. State the scale of the estimate. For a binary outcome, give the odds ratio only after you take the exponential.
10. Report the number of variants, each excluded variant with its reason, each method, and each warning.
