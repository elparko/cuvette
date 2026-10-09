---
name: evaluate-a-marker
description: Steps to evaluate a diagnostic marker - ROC curve, AUC, a threshold, sensitivity and specificity, and the comparison of two markers.
---

# Evaluate a marker

1. Run inspect_diagnostic_data. Find the outcome and its two values, and the marker columns.
2. The harness asks for the positive class (the value of the cases) and the direction (higher or lower values mean disease).
3. Run roc_curve. Report the AUC with its interval and the numbers of cases and controls. Show the plot.
4. If the scientist has a threshold from a guideline or another study, run accuracy_at_threshold with it. Else run best_threshold; the harness asks for the rule. Say that a threshold from the same data is optimistic.
5. Report sensitivity, specificity, PPV and NPV with exact intervals, the 2x2 counts and the prevalence.
6. For two markers in the same patients, run compare_aucs. Report both AUCs, the difference with its interval, Z and p.
