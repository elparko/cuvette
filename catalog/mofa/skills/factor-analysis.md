---
name: factor-analysis
description: Steps to train a MOFA model on several omics tables and to read the factors.
---

# Factor analysis with MOFA

1. Read the header of each table. Find the sample names, the layout and the feature type.
2. Check that the sample names match across the tables. Tell the scientist how many samples are in all tables.
3. Ask the scientist for the transform of each table. MOFA expects gaussian-like values. Counts need a log transform first.
4. Ask the scientist for the number of factors, the minimum variance of a factor, the scaling and the seed.
5. Run run_mofa. Read the variance explained of each factor in each view.
6. Run associate_factors with the covariates of the scientist. A covariate can be a row of one of the tables.
7. Run top_features for each factor that you want to interpret.
8. Run run_mofa again with a second seed. Say if the factors stay.
9. Report the settings, the variance explained, the covariates of each factor and the top features.
