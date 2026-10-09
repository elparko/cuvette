# Sample data: extra sleep with two drugs

`sleep.csv` has 20 rows: 10 patients, each measured with drug 1 and with drug 2. The value is
the extra hours of sleep compared with a night without the drug.

Columns:
- `patient`: 1 to 10. The same patient has a row for each drug.
- `drug`: 1 or 2.
- `extra_sleep_hours`: hours of sleep more than the control night. A negative value is less sleep.

Source:
- Cushny AR, Peebles AR. The action of optical isomers II: hyoscines. J Physiol 32:501-510 (1905).
- Student (Gosset WS). The probable error of a mean. Biometrika 6(1):1-25 (1908). Student used
  these values as his worked example of the paired t-test.

License: the values are published measurements from 1905 and 1908. They are in the public domain.
The same values are the `sleep` data set in R. The column names in this file are new.

The sample question: is drug 2 better than drug 1? A paired test gives a mean difference of 1.58
hours (95 percent confidence interval 0.70 to 2.46, p = 0.0028). An unpaired test gives p = 0.079.
