# Triage: kasurinen2018-mmp14-gastric

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b run 1 (before 80ae314): `20261008-174234-21d7`, computed 19/25, reported 0/17 (20/25 before the tolerance change)
- qwen3:8b run 2 (after 80ae314): `20261008-181850-bf9d`, computed 6/25, reported 3/17 (7/25 and 4/17 before the tolerance change)

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | all reported items | see bench.yaml | no numbers | b, d | e31, e33, e39: the empty answer to cox_covariates replaced the agent's "mmp14_high" in the held call and in the ties comparison runs. Efron gave an empty model, Breslow raised IndexError. e65: run_script failed (no lifelines in the script environment). e69: the model then sent an empty final message. | 80ae314 (empty answer keeps the agent's argument; fit_cox rejects an empty covariate list) |
| 1 | hr_intestinal, ci_hi, p_intestinal, hr_diffuse_type, p_diffuse_type | 3.542 and others | not computed | d | The model tried the subgroups in run_script, not with fit_cox on the subgroup files. | none |
| 1 | hr_intestinal_ci_lo | 1.507 +-0.01 | 1.5010 (pass) | c | Chance match with the diffuse-type bound of the adjusted model. | tolerance 0.005 |
| 2 | hr_adjusted and the adjusted covariates | 1.5487 and others | not computed | d | e42: the adjusted model has age_ge67, stage2-4 and diffuse, without mmp14_high. | none |
| 2 | hr_unadjusted, ci, p_unadjusted | 1.918 and others | not computed | d | The model did not fit the unadjusted Cox model. | none |
| 2 | subgroup hazard ratios | 3.542, 1.5355 | not computed | d | e58, e64: Kaplan-Meier only on the subgroup files. The answer gives invented hazard ratios (2.33, 1.57 to 3.46) for both types. | none |
| 2 | hr_intestinal | 3.542 +-0.01 | 3.5479 (pass) | c | Chance match with a bound of the adjusted model. | tolerance 0.005 |
| 2 | p_unadjusted (reported) | 0.00167 +-0.0005 | 0.0014 (pass) | c | Chance match with the log-rank p in the answer. | tolerance 0.0002 (also logrank_p) |

Other findings:

- Run 2, e23 to e38: the model sent strata as a list ([]). The schema check refused it with "strata must be of type string" (comparison runs and held call). The model repeated the call with "" (e42). The error was clear. Model fault.
- Run 2: the empty-answer fix works. The comparison runs and the held call kept the agent's covariates.
