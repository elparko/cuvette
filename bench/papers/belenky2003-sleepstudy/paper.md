# Belenky et al. 2003: reaction time over days of sleep restriction

## Citation
- Belenky G, Wesensten NJ, Thorne DR, et al. Patterns of performance degradation and restoration during sleep restriction and subsequent recovery: a sleep dose-response study. J Sleep Res 12(1):1-12 (2003). DOI: 10.1046/j.1365-2869.2003.00337.x
- The data set `sleepstudy` in the R package lme4 holds the 18 subjects that were limited to 3 hours of sleep. It is the example of Bates et al., Fitting Linear Mixed-Effects Models Using lme4, J Stat Softw 67(1) (2015).
- I did not read the 2003 paper. The numbers below are from running statsmodels 0.15.0 and match the lme4 output printed in the lme4 documentation.

## Data
- 18 subjects, 10 days each, 180 rows. Columns: Reaction (mean reaction time in ms), Days (0 to 9 days of sleep restriction), Subject.
- Source: https://vincentarelbundock.github.io/Rdatasets/csv/lme4/sleepstudy.csv (3.3 KB)
- Local path: /Volumes/T7/guided-analysis/data/belenky2003-sleepstudy/sleepstudy.csv

## Tool
- statsmodels `mixedlm` (adapter `catalog/biostats`). R equivalent: `lme4::lmer`.

## Method steps
1. Fit Reaction ~ Days with a random intercept for each subject.
2. Fit Reaction ~ Days with a random intercept and a random slope for Days.
3. Compare with ordinary least squares, which treats 180 rows as independent.

## Numbers to reproduce
| Quantity | Random intercept | Random intercept and slope | OLS |
|---|---|---|---|
| Intercept (ms) | 251.405 | 251.405 | 251.405 |
| Days slope (ms per day) | 10.467 | 10.467 | 10.467 |
| SE of intercept | 9.747 | 6.825 | 6.610 |
| SE of Days | 0.804 | 1.546 | 1.238 |
| Subject variance | 1378.2 | 612.10 | |
| Slope variance | | 35.07 | |
| Residual variance | 960.5 | 654.94 | |

## Decisions the scientist owns
- Unit of replication: the subject (18), not the row (180).
- Random effects: intercept only, or intercept and slope.
- REML or ML.
- Alpha.
