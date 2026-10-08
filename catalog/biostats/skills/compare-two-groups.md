---
name: compare-two-groups
description: How to choose and report a two-group test, paired or unpaired, with the sleep data as the example.
---

# Compare two groups

The scientist chooses the test. Help the scientist to see the design.

1. Run inspect_table. Find the outcome column, the group column and the subject column.
2. Ask how the data were collected. If the same subject is in both groups, the design is paired. Ten patients that each took both drugs are ten pairs, not twenty subjects.
3. Run compare_two_groups. The harness asks for paired, the test family, the sidedness and alpha. Pass id_column in every call.
4. Read the summary. If it warns that the same IDs are in both groups and the test is unpaired, stop. Tell the scientist and ask again about paired.
5. For an unpaired t-test, the harness also asks about equal variances. Welch is the safer choice. Do not pick it for the scientist.
6. To check the result without a normal distribution, run the call again with test set to wilcoxon. Report both p-values and say that the rank test answers a different question about the center.
7. Report the direction (second group minus first group), the mean difference, the confidence interval, the p-value, the test name, the sidedness and alpha.

The sleep data (R dataset sleep) show why the pairing matters. The paired t-test gives p = 0.0028. The unpaired Welch test gives p = 0.079. The same numbers give two conclusions at alpha 0.05.
