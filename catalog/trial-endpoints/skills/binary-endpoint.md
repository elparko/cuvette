---
name: binary-endpoint
description: Steps to analyze a yes-or-no trial endpoint with the risk difference, strata and a non-inferiority margin.
---

# Binary endpoint

1. Read the file. Find the arm column and the outcome column. Ask which value marks the event.
2. Ask the scientist for the endpoint, the analysis population and the stratification factor. Ask if the event harms or helps.
3. Count the rows with a missing outcome. Ask how to handle them.
4. Ask for the interval method of the risk difference and for the test. Ask for the significance level.
5. Run compare_binary_endpoint with the arm of interest as group_a. Check that n in each arm matches the trial report.
6. Read the risk difference with its interval, the relative risk and the test. Read the number needed to treat. If its interval is open, say so.
7. If the trial used strata, read the Mantel-Haenszel estimates. Read the homogeneity test. If it is below 0.05, say that the effect can differ between strata. The tool gives no result for each stratum. For one, make a file with the rows of that stratum (reshape_table of the tables adapter, with filter) and run the tool on it.
8. For a non-inferiority question, ask for the margin, its scale and the one-sided level. The scientist must fix them before the data.
9. Report the limit of the interval that the margin tests. Say if the data show non-inferiority.
10. Write the numbers, the method names and each warning in the answer.
