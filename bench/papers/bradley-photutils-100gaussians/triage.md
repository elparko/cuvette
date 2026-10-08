# Triage: bradley-photutils-100gaussians

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-142851-6cff`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | net_flux_48_70_200_33 | 895.4 | computed 859.8 (by chance), reported 764.6 | d | In e96 the model passed `positions_csv` (the 82 detected sources) and not `x` and `y`. The result table has one row for each source. The model then wrote the flux of table rows 1, 2 and 5 (-342.1, -25.8, 764.6) as the flux at the three named positions (answer e138). The computed score passed because one of the 82 rows is near the expected value. | model fault. d242121 makes the tool description say that x and y name the positions. |
| qwen3:8b | net_flux_355_56_252_20 | 873.9 | computed 859.8 (by chance), reported 764.6 | d | Same cause. | d242121 |

Other findings:

- The answer e138 also says "Split Touching Sources (deblend): True". The record says false. The review did not flag it. This is a model slip.

Commits in this branch for this paper: d242121
