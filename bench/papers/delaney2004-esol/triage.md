# Triage: delaney2004-esol

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-144814-0e07`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | esol_r2 | 0.752 | computed 0.733 (a table cell of another tool), reported 0.989 | c, d | The model never called fit_solubility_model. It answered only the last question, the rule of five (answer e45, nudges e38, e42, e46, finding e60). The computed score passed by chance on a number of rule_of_five. | 75d0ec4 (the item reads only nodes of fit_solubility_model). Model fault for the missing step. |
| qwen3:8b | esol_rmse | 1.10 | computed 1 (by chance), reported 0.989 | c, d | Same cause. | 75d0ec4, 583677d |

Other findings:

- e8: the first load_molecules call failed with `id_column` "mol1". The model made up the value. The error text lists the real columns. The model fixed it in e12.

Commits in this branch for this paper: 583677d, 75d0ec4
