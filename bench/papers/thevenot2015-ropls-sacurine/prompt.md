# Prompts

## Plain
1. I have the urine metabolome of 183 adults. Do men and women differ?
2. Fit PCA, PLS-DA and OPLS-DA models and tell me how good they are.
3. Which metabolites differ between men and women?

## Guided
Do the urine metabolomes of men and women differ? The file sacurine.csv has 183 adults (one row each). The columns are sample, gender (M or F), age (years), bmi (kg/m2) and 109 metabolite columns measured by liquid chromatography with mass spectrometry. The values are already normalized to osmolality and log10 transformed. The table has no missing values. First fit a PCA of the metabolites and give the cumulative R2X and the number of components. Then fit a PLS-DA of gender and an OPLS-DA of gender with 1 predictive component, and give R2X, R2Y, Q2, RMSEE, the number of components and the permutation p values of each. Then train the OPLS-DA on the odd-numbered rows only and give R2Y, Q2, RMSEP and the number of correct calls in the test set. Then fit an OPLS regression of age with 1 predictive component and give R2Y, Q2 and RMSEE. Last, test every metabolite between men and women with the Welch test and the Benjamini-Hochberg adjustment, and give the number of significant metabolites (up and down).
