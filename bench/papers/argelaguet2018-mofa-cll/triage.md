# Triage: argelaguet2018-mofa-cll

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind): `20261009-030515-548e`, computed 7/7, reported 7/7, 492 s, 26 tool calls (0 failed), 0 paths outside the allow list.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| earlier run | none (failed call) | | | a | `associate_factors` tested the column type `object` for a text covariate. With pandas 3 the column has the type str, so the tool skipped Gender and said that no covariate can be correlated. | The tool tests `is_numeric_dtype`. The error names the rule for text covariates. The test cll-factors covers covariates.csv. |
| earlier run | none (failed call) | | | b | `inspect_data` could not open `src/tools/inspect_data.py` (see thaqi2026-bovine-corpus-luteum). | Fixed in `src/bench/papers-blind.ts`. |

Other findings:

- The tolerances of the variance items (7, 3, 3 and 6 points) are wide. The computed score picks the logged number that is nearest to the expected value. In the first run it matched r2_drugs (41) to the mRNA value (38.1) and r2_mutations (24) to the methylation value (25.4). The wide tolerance is the difference between MOFA with 25 starts and MOFA+ with one start (case.yaml). The benchmark checks the order of magnitude of each view, the number of factors and the two factor identities exactly.
- One training takes 100 s. The run takes about 8 minutes with the follow-up tools.
