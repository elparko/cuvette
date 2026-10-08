# Bates et al. 2015: lme4, the sleepstudy data

## Citation
- Bates D, Maechler M, Bolker B, Walker S. Fitting linear mixed-effects models using lme4. Journal of Statistical Software 67(1):1-48 (2015). DOI: 10.18637/jss.v067.i01
- Data: Belenky G and others. Patterns of performance degradation and restoration during sleep restriction and subsequent recovery: a sleep dose-response study. J Sleep Res 12:1-12 (2003).
- I did not re-read the paper in this session. The values below come from running lme4 2.0.6 with lmerTest 3.2.1. They agree with the values that the task brief and the lme4 vignette give (fixed effects 251.405 and 10.467, REML criterion 1743.6).

## Data
- `sleepstudy` in lme4: 180 observations, 18 subjects, 10 days each. Columns Reaction (mean reaction time in ms), Days (days of sleep deprivation, 0 to 9), Subject.
- Subjects slept 3 hours each night for the 10 days (days 0 and 1 are adaptation and training in the original study).
- License: GPL-2 or later (package license). The Subject column is a number, not a name.
- fetch.sh writes `sleepstudy.csv` to /Volumes/T7/guided-analysis/data/bates2015-lme4-sleepstudy/. The adapter folder has a copy in `catalog/lme4/data/`.

## Tool
- Original: R package lme4 (`lmer`) 2.0.6 and lmerTest 3.2.1 on R 4.6.1.
- Adapter: `catalog/lme4`.

## Method steps
1. `fm1 <- lmer(Reaction ~ Days + (Days | Subject), sleepstudy)`. REML is the default.
2. `fm2 <- lmer(Reaction ~ Days + (Days || Subject), sleepstudy)` for uncorrelated random effects.
3. `fm3 <- lmer(Reaction ~ Days + (1 | Subject), sleepstudy)` for a random intercept only.
4. A likelihood ratio test of Days with ML fits.

## Numbers to reproduce
| Quantity | Value |
|---|---|
| Fixed effect (Intercept), SE | 251.405, 6.825 |
| Fixed effect Days, SE | 10.467, 1.546 |
| REML criterion, (Days | Subject) | 1743.6 |
| SD of Subject intercept, SD of Subject Days, correlation | 24.74, 5.92, 0.07 |
| Residual SD | 25.59 |
| REML criterion, (Days || Subject) | 1743.7 |
| REML criterion, (1 | Subject) | 1786.5 |
| SE of Days with (1 | Subject) | 0.804 (too small, because the random slopes are left out) |
| ML log likelihood, (Days | Subject) | -875.97 |
| Likelihood ratio test of Days, ML: chi-square, df | 23.54, 1 |
| Conditional modes of subject 308: intercept, Days | 2.259, 9.199 |

## Decisions the scientist owns
- Formula and random-effects structure: `Reaction ~ Days + (Days | Subject)`.
- REML (TRUE) for the final estimates. ML for the likelihood ratio test.
- Method of the p values: Satterthwaite (lmerTest default).
- Unit of replication: the 18 subjects, not the 180 observations.
