# Triage: elmasri2026-limit-maaslin2

Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude:claude-haiku-5-5, run 1: `20261009-034501-3dac`
- claude:claude-haiku-5-5, run 2: `20261009-034911-c4a1`
- claude:claude-haiku-5-5, run 3 (final): `20261009-035258-57f6`

| Model | Item or call | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| haiku | permanova_gwg_f and permanova_gwg_r2 in run 2 | 0.678 and 0.0104 | 0.537 and 0.0103 | a | One decision (prevalence limit 0.05) was linked to both MaAsLin 2 and the distance. The tool dropped rare OTUs before the distance. | The new decision `beta_min_prevalence` (default 0) sets the limit for the distance. Run 3 passes. |
| haiku | samples_in_study in run 2 | 168 | 142 | d | The model reported the vaginal births as the samples in the study. The prompt gives 168. | None. Run 3 reports 168. |
| haiku | inspect_data | ok | "can't open file src/tools/inspect_data.py" | b | Blind mode hides the repository from child processes. The built-in tool could not start. | None. The model used inspect_feature_table. |
| haiku | beta_diversity with strata subject in run 3 | ok | "strata is not a column of the metadata: subject" | d | The sample table has no subject column. The error named the column. | None. The model repeated the call without strata. |
| haiku | final answer, the number 0.104875 | sourced | unsourced | d | A value that the model derived from logged results. | None. No scored item depends on it. |
| spec | otus_tested | not scored | 65 | c | The paper does not print the number of tested OTUs. | The item is a reference (no score). `check_limit_maaslin.py` gives 65. |
| spec | the four diversity items | not scored in the paper | scored | c | The paper prints no number for the Shannon test or for the PERMANOVA. | The values come from `check_limit_diversity.py` (numpy, SciPy). `case.yaml` marks them as computed. |

Commits in this branch for this paper: see `git log -- bench/papers/elmasri2026-limit-maaslin2`.
