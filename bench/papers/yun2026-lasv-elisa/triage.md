# Triage: yun2026-lasv-elisa

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1: `20261008-230611-5916`, stopped by hand after the model gave up. No numbers.
- claude-haiku-5-5 run 2 (after the fixes below): `20261008-230845-6caa`, computed 30/30, reported 28/28, blind: 0 paths outside, 0 blocked, 0 unsourced.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | all | see bench.yaml | no numbers | a | e40, e41, e61, e69: every fit_standard_curve call failed with "exclude must be of type array". The decision exclude_wells is text, and the harness put the text into the list argument exclude. | `exclude` accepts a list or comma text (`type: [array, string]`). The R code reads both. |
| 1 | all | see bench.yaml | no numbers | c | e19 to e22, e92 to e95: the model asked the scientist a free question with its own options. The answers file had no `"*"` entry, so the harness answered with the model's own option (1/y^2 weighting, blank subtraction), and the decision answers then refused the changes. The model stopped. | `"*": "Use the values in the decision record."` in the answers. |
| 2 | recovery_d8_printed (reference) | 92.0 | computed 91.99 (match), reported 92.56 | c | The computed match is a chance match with a value of one run in samples.csv. The printed 92.0 does not reproduce (see paper.md). | none; reference item |
| 2 | lpc_cv_printed (reference) | 20.09 | 20.03 | none | The printed value does not reproduce. | none; reference item |

Other findings:

- Run 2: the model averaged the per-run results of samples.csv with run_script (e88, e90) and did not use the across-plates table of the tool. The numbers are the same.
- Run 1: the harness note "answered from the answers file" also shows when the answer is the model's own recommendation (src/core/headless.ts). Not changed here.
