# MendelianRandomization reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- estimate_causal_effect gives the causal estimate of each chosen method, Cochran Q, I-squared and the F statistic.
- check_variants gives the Wald ratio, the F statistic and the Q contribution of each variant. Run it before you drop a variant.
- The input is a table with one row for each variant. It has the effect and the standard error for the exposure and for the outcome.
- The package does not align alleles. Ask the scientist to confirm the alignment before the first run.

## What to report

- The exposure, the outcome, the number of variants and the source of the summary statistics.
- Each method that you ran, with the estimate, the standard error, the confidence interval and the p value.
- The scale of the estimate. For a binary outcome it is a log odds ratio for one unit of the exposure. Give the odds ratio only after you call calculate with exp of the estimate and of both limits.
- Cochran Q with its degrees of freedom and p value, and I-squared.
- The MR-Egger intercept with its p value.
- The F statistic. Name the weak instruments if there are any.
- Each excluded variant and the reason.
- The IVW model (fixed or random effects) and the version of the package.

## How to read the result

- The inverse-variance weighted estimate is valid if all variants are valid instruments. Cochran Q tests if the variant estimates agree.
- A significant MR-Egger intercept points to directional pleiotropy. Then the MR-Egger estimate is the better guide, and its interval is wide.
- The weighted median stays consistent if at most half of the weight comes from invalid variants. The mode method stays consistent if the largest group of variants with similar estimates is valid.
- If the methods agree in sign and size, the result is stronger. If they disagree, say so and report all of them.
- An F statistic below the scientist's limit marks a weak instrument. Weak instruments bias the estimate toward the observational association when the two samples overlap.
- The median and mode methods need uncorrelated variants. The inverse-variance, MR-Egger and maximum likelihood methods can use a correlation matrix.
- A p value of 0.000 in the printed output means a value below 0.0005. Give the number from the metrics.

## Do not claim

- Do not say that the result proves a cause. Name the three assumptions. The variant must affect the exposure. The variant and the outcome must have no common cause. The variant must affect the outcome only through the exposure.
- Do not drop a variant because it moves the estimate unless the scientist agrees. Report the estimate with and without it.
- Do not pool results from two ancestries or two exposure measures without the scientist's decision.
