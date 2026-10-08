# Rossi, Berk and Lenihan 1980: time to re-arrest after prison release

## Citation
- Rossi PH, Berk RA, Lenihan KJ. Money, Work, and Crime: Experimental Evidence. Academic Press (1980).
- Cox model on these data: Fox J, Weisberg S. Cox Proportional-Hazards Regression for Survival Data in R (appendix to An R Companion to Applied Regression); and the lifelines documentation, section "Survival regression".
- I did not read the 1980 book. The numbers below come from running lifelines 0.30.3 on this machine. The lifelines docs show the same coefficients rounded to two digits.

## Data
- 432 men released from Maryland state prisons. They were followed for 52 weeks.
- Columns: week (week of first arrest or end of follow-up), arrest (1 if arrested, 0 if censored), fin (1 if the man got financial aid), age (years at release), race (1 if Black), wexp (1 if full-time work before prison), mar (1 if married), paro (1 if released on parole), prio (number of prior convictions).
- 114 men were arrested. 318 were censored.
- Source: `lifelines.datasets.load_rossi`. Also in R as `carData::Rossi`. 8.7 KB.
- Local path: /Volumes/T7/guided-analysis/data/rossi1980-recidivism/rossi.csv

## Tool
- lifelines `CoxPHFitter` and `KaplanMeierFitter`; statsmodels `PHReg` for Breslow ties. Adapter `catalog/biostats`.

## Method steps
1. Kaplan-Meier curves by financial aid (fin), log-rank test.
2. Cox model with all seven covariates: fin, age, race, wexp, mar, paro, prio. Efron ties.
3. Check the proportional hazards assumption.

## Numbers to reproduce
| Quantity | Value |
|---|---|
| Subjects, events | 432, 114 |
| Log-rank chi-square (fin), p | 3.838, 0.0501 |
| Survival at week 26, week 52 (all men) | 0.875, 0.7361 |
| Cox coefficient fin (hazard ratio) | -0.3794 (0.684) |
| Cox coefficient age (hazard ratio) | -0.0574 (0.944) |
| Cox coefficient prio (hazard ratio) | 0.0915 (1.096) |
| Cox coefficient race, wexp, mar, paro | 0.3139, -0.1498, -0.4337, -0.0849 |
| p for fin, age, prio | 0.0474, 0.0090, 0.0014 |
| Concordance | 0.6403 |
| Proportional hazards test p, age | 0.0007 |
| Breslow ties, coefficient fin | -0.3790 |

## Decisions the scientist owns
- Covariates in the model.
- Ties method (Efron or Breslow).
- Alpha and the confidence level.
- Whether to stratify by a covariate that fails the proportional hazards test (age fails).
- Unit of replication: one row for each man.
