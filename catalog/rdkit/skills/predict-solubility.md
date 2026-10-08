---
name: predict-solubility
description: Procedure to predict log solubility from descriptors with the ESOL equation and report how well it fits.
---

# Solubility from structure

1. Run load_molecules with target_column set to the column of measured log solubility. Give id_column if the file has names.
2. Run compute_descriptors with the id from the molecules field.
3. Run fit_solubility_model with the id from the descriptors field. The equation, test fraction and seed are decisions of the scientist. Wait for the answers.
4. Report the equation or the coefficients, R squared with its definition, and the root mean square error in log units.
5. For a refit, report the score on the held-out molecules. Do not report only the training score.
6. Give the outliers from the outliers list. Name the molecule, the measured value and the predicted value.
7. Say that logP is the Crippen value and that the published coefficients come from a secondary source.
