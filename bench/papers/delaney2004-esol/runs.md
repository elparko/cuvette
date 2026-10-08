# Runs: delaney2004-esol

Date: 2026-10-08. Model: ollama:qwen3:8b. Adapter: `catalog/rdkit`. RDKit 2026.03.6.

Prompt: the guided prompt from `prompt.md`. Two additions were needed: the rule of five question, and the file path and column names. The prompt has no data path.

Answers file (from `expected.yaml` decisions): salt_handling keep, invalid_smiles stop, logp_method crippen, hbd_hba_definition lipinski, rule_of_five_cutoffs lipinski_1997, allowed_violations 1, esol_equation published, test_fraction 0.2, split_seed 42.

Command (from a temp folder that holds the CSV and `answers.json`):

```
GA_HOME=<temp> node bin/ga.js -p "<prompt>" --adapter catalog/rdkit --model ollama:qwen3:8b --answers answers.json --output json
```

## Numbers against expected.yaml

| Quantity | Expected | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| Molecules parsed | 1128 | 1128 | 1128 | 1128 |
| Zero violations | 1018 +/- 5 | 1018 | 1018 | 1018 |
| Two or more violations | 12 +/- 3 | 12 | 12 | 12 |
| R squared (squared correlation) | 0.752 +/- 0.03 | 0.752 | 0.63 (not from a tool) | 0.869 (not from a tool) |
| RMSE, log units | 1.10 +/- 0.1 | 1.10 | 1.13 (not from a tool) | 1.121 (not from a tool) |
| Result | | PASS | FAIL | FAIL |

The tool reports two R squared values for the published equation. The squared correlation is 0.752, which matches `expected.yaml`. The coefficient of determination (1 minus residual over total sum of squares) is 0.7248. Both are in the tool result as `all_r_squared_correlation` and `all_r2`.

## Run 1 (adapter 0.1.0)

Session `20261008-002502-e637`. Tools called: load_molecules, compute_descriptors, rule_of_five, fit_solubility_model.

Final answer: 1128 molecules parsed, 0 invalid. Crippen logP, Lipinski donors and acceptors. 1018 with zero violations, 98 with one, 12 with two or more, 98.94 percent pass with one violation allowed. Published ESOL coefficients (0.16, -0.63, -0.0062, 0.066, -0.74). R squared (correlation) 0.752, RMSE 1.10 log units. Outliers: tetradecane, 1-octadecanol, hexadecane, uric acid, vamidothion.

What went wrong:
- The model put quotes around the column name. The call failed with a KeyError. The model retried and succeeded.
- The model gave allowed_violations 2. The harness replaced it with the decision value 1 (`effectiveArgs` in the log).
- The answer said the RDKit version was not stated. The tool result did not carry it.

Adapter fixes after run 1 (version 0.1.1): `_find` removes quotes around a column name. `load_molecules` and `compute_descriptors` return `rdkit_version`.

## Run 2 (adapter 0.1.1)

Session `20261008-002617-b927`. Tools called: load_molecules, compute_descriptors, rule_of_five. The model did not call fit_solubility_model.

The answer gave R squared 0.63 and RMSE 1.13. No tool made these numbers. The model also wrote 2.18 for the mean donors and acceptors. The harness finding `unsourced_numbers` marked the numbers. The model did not pass `id_column`, so molecule names were row numbers.

Adapter fix (version 0.1.2): the descriptions of compute_descriptors say that a solubility question needs a call to fit_solubility_model.

## Run 3 (adapter 0.1.2)

Session `20261008-002722-f564`. Tools called: load_molecules, compute_descriptors, rule_of_five. The model did not call fit_solubility_model.

The answer gave made-up coefficients (0.679, -0.068, -0.452, 0.334), R squared 0.869 and RMSE 1.121. It also said "the model was refit on the training data" although the equation was published. The harness finding `unsourced_numbers` marked 10 numbers. The text change did not stop the skip.

## Summary

Run 1 passes. Runs 2 and 3 fail. In both, the small model stopped after rule_of_five and wrote the model numbers from memory. The adapter tool is correct (the known-answer test `esol-full` passes). Max runs (3) reached. Result: the pipeline works, but qwen3:8b skips the last step in two of three runs. The harness catches the made-up numbers with the claim check, but the final answer still goes out with them.
