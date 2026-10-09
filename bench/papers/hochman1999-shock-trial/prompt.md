# Prompts

## Plain
1. I have the SHOCK trial data: early revascularization against medical stabilization in cardiogenic shock. Did early revascularization reduce deaths?
2. Give me the 30-day mortality in each arm, the risk difference with its interval, and the long-term hazard ratio.
3. Is the effect at 1 year different between the arms? Give the survival numbers.

## Guided
The SHOCK trial randomized 302 patients with cardiogenic shock after a heart attack to early revascularization or to initial medical stabilization. The file shock_endpoints.csv has one row for each patient: arm, died_30d, age_lt75, time_days and death. Early revascularization is the test arm, and all patients stay in the arm of randomization. Give the number of patients in each arm, the 30-day mortality in each arm, the risk difference with its 95% Wald interval and the chi-square p value. Give the hazard ratio with its interval and the log-rank p value for the whole follow-up. Compare the Kaplan-Meier survival at 1 year, and add the restricted mean survival time up to 1825 days.
