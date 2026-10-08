---
name: compare-conditions
description: How to compare two or more conditions, such as control and treated, with image counts or sizes.
---

# Compare conditions

Cells in one image are not independent. Use images or biological replicates as the unit.

1. Ask which images belong to each condition and which images come from the same animal or culture.
2. Use the same settings for all images. Use count_folder for a folder, or threshold_and_count for each file.
3. Make one table with one row for each image: condition, replicate, count, mean area, area fraction.
4. If the replicate is an animal or a culture, average the images of each replicate first. The average is one data point.
5. Report n for each group and the unit of n.
6. Pick the test with the scientist. Two groups with independent replicates: Welch t-test, or Mann-Whitney test for small or skewed data. Report the p-value, the effect size and the confidence interval.
7. Run the threshold check on one image from each condition. Say if the conclusion changes with the method.
8. Do not give a p-value computed from cells or particles. Show them only as a plot to explore.
