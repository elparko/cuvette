# Student 1908: paired t-test on the Cushny and Peebles sleep data

## Citation
- Student (Gosset WS). The probable error of a mean. Biometrika 6(1):1-25 (1908). DOI: 10.2307/2331554
- Original data: Cushny AR, Peebles AR. The action of optical isomers II: hyoscines. J Physiol 32:501-510 (1905). Student used these data as his worked example.
- I could not read the 1908 paper text. The values below are computed from the data. Student's own tail probability is not recorded here.

## Data
- Extra hours of sleep for 10 patients under two drugs (R dataset `sleep`: extra, group 1 or 2, ID 1 to 10).
- URL: https://vincentarelbundock.github.io/Rdatasets/csv/datasets/sleep.csv (238 bytes)
- License: the 1905 and 1908 data are historic published measurements (public domain in effect). The Rdatasets mirror is GPL-3 for the collection. Ten summary values, no identifiers.
- Local path: /Volumes/T7/guided-analysis/data/student1908-sleep/sleep.csv

## Tool
- PSPP (kind: files or screen; Analyze > Compare Means > Paired-Samples T Test), or scipy 1.x `ttest_rel`, or R `t.test(paired=TRUE)`. The check run used scipy.

## Method steps
1. Load the CSV. Columns: rownames, extra, group, ID.
2. Pair the two groups by ID (the same patient in both groups).
3. Paired t-test on extra(group 2) minus extra(group 1), two-sided, 95 percent confidence interval.

## Numbers to reproduce (computed with scipy)
| Quantity | Value |
|---|---|
| Mean extra sleep, group 1 / group 2 | 0.75 / 2.33 hours |
| SD, group 1 / group 2 | 1.789 / 2.002 |
| Mean paired difference (group 2 - group 1) | 1.58 hours |
| SD of differences | 1.230 |
| Paired t, df | 4.0621, 9 |
| Paired two-sided p | 0.002833 |
| 95 percent CI of mean difference | 0.700 to 2.460 |
| Welch (unpaired) t, df, p | 1.8608, 17.78, 0.07939 |
| Pooled-variance (unpaired) t, df, p | 1.8608, 18, 0.07919 |
| Wilcoxon signed-rank p | 0.003906 |

The paired and unpaired analyses give different conclusions at alpha 0.05.

## Decisions the scientist owns
- Paired vs unpaired test: the design pairs patients by ID, so use the paired test.
- Two-sided test.
- Alpha 0.05 and 95 percent CI.
- Parametric vs rank test.
