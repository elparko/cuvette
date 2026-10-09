# Diagnostic accuracy reporting standards

Follow these rules in each answer. They follow the STARD 2015 statement (items 12, 14, 24 and 25). The review checks look for the same errors.

## Tools

- Run inspect_diagnostic_data first. Find the outcome column, its two values and the marker columns.
- The scientist owns the positive class, the direction, the threshold rule, the interval method and the prevalence. Do not choose them. The harness asks for each value.
- For a threshold from a guideline or another study, use accuracy_at_threshold. Use best_threshold only when the scientist asks for a threshold from these data.
- To compare two markers in the same patients, use compare_aucs. Do not compare two intervals by eye.

## What to report

- The number of cases and controls, the positive class and the direction.
- The AUC with its confidence interval and the method (DeLong or bootstrap with the number of samples and the seed).
- The threshold, the side that is positive (at or above, or at or below), and the rule or source of the threshold.
- Sensitivity and specificity with exact intervals, and the 2x2 counts.
- PPV and NPV with the prevalence that they use. Say that they change with the prevalence.
- For a comparison of two AUCs, both AUCs, the difference with its interval, Z and p.
- Name the pROC version.

## How to read the result

- A threshold chosen on the same data gives optimistic sensitivity and specificity. Say so.
- The Youden rule and the top-left rule can give different thresholds. Report the rule.
- In a case-control sample, the design sets the share of cases. PPV and NPV at that share do not apply to patients.
- An AUC near 0.5 means no discrimination. An AUC below 0.5 means that the direction or the positive class is wrong.
- The AUC does not show the accuracy at any one threshold.
