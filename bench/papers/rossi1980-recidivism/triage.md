# Triage: rossi1980-recidivism

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-153141-5098`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | ph_test_p_age | 0.0007 +-0.0005 | computed 0.000714 (pass), reported 0.0474 | a | The fit_cox summary (e39) said "Proportional hazards test p below alpha for: age, wexp" and hid the p values. The model wrote the p value of fin (0.0474) in the answer (claim check e49). The p values were in the metrics only as the minimum. | 7ffa2fe (summary shows the test p values and the confidence intervals; metrics ph_p_<term>) |

Other findings:

- e27, e28: fit_cox failed with "missing required argument covariates". These are comparison runs that started before the covariates were set. The same cause as in oksanen-vegan-dune.
- e45: calculate with the names hr_fin and p_fin failed. The model used names of metrics as functions. The error text lists the functions. Model fault.

Commits in this branch for this paper: 7ffa2fe
