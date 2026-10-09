---
name: survival-endpoint
description: Steps to compare a time-to-event trial endpoint with the hazard ratio, the survival at one time and the restricted mean survival time.
---

# Time-to-event endpoint

1. Read the file. Find the time, the event flag and the arm columns. Ask which value marks the event, and the unit of the time.
2. Ask the scientist for the endpoint, the analysis population and the stratification factor.
3. Ask for the time of the survival comparison and for tau of the restricted mean survival time. Tau must not pass the last time of the shorter arm.
4. Run compare_survival_endpoint with the arm of interest as group_a.
5. Read the hazard ratio with its interval and the log-rank test. Read the proportional hazards test.
6. If the proportional hazards test is below 0.05, do not report one hazard ratio alone. Add the restricted mean survival time.
7. Read the survival of each arm at the chosen time and the difference with its interval.
8. For a non-inferiority question, ask for the margin and its scale before you run the tool. The scale is the hazard ratio or the difference of restricted mean survival time.
9. Report the number of patients and events in each arm, each rule that dropped a row, and each warning.
