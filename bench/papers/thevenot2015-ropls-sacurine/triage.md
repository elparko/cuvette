# Triage: thevenot2015-ropls-sacurine

Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude:claude-haiku-5-5 (blind, adapter 0.1.0, final run): `20261009-041011-a533`, 198 s, 12 tool calls (0 failed), computed 21/21, reported 21/21. Report: `bench/results/papers-2026-10-09-metabolomics-haiku.md`.
- Leak check: 0 paths outside the allow list, 0 blocked reads, 0 literature claims.
- First run of the paper (before the fix in the table below): `20261009-040442-3196`, 236 s, 19 tool calls (1 failed), computed 21/21, reported 21/21.

| Run | Item | Class | Cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | prepare_metabolite_table failed | a | The tool refused every table with a negative value. The published table holds log10 values, which are negative. The model tried the preparation step with all options set to none. | The tool now refuses negative values only if normalization or a transform is on. Two known-answer tests pin both cases. |
| 1 | referee finding on n_predictive | c | The decision record fixed n_predictive to auto. The model asked for 1 predictive component in the OPLS calls, and the harness kept auto. OPLS with one response uses 1 component in both cases, so the values did not change. | none. The finding has severity info. |
| 2 | 5 unsourced numbers | b | The numbers 18, 16 and 14 are counts of extreme values from the data check of the harness (`inspect_data` note). The model repeated them as examples. They are not results of the analysis. | none. |

Other findings:

- The model asked the setup questions through the decision record, asked for the scaling when it ran the first model, and passed `holdout: odd` by itself for the test-set run.
- The permutation p value of 0.05 is the smallest value that 20 permutations can give. The prompt does not ask for more permutations.
