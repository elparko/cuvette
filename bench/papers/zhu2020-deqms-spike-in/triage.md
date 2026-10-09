# Triage: zhu2020-deqms-spike-in

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind): `20261009-030317-43a1`, computed 4/4, reported 4/4 (the two reference items are not in the counts), 118 s, 15 tool calls (0 failed), 0 paths outside the allow list.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tp_deqms (reference) | 1237 | 1235 | none | The tool runs limma, not DEqMS. The paper prints 1237 for DEqMS. Expected. | none |
| 1 | fp_deqms (reference) | 11 | 13 | none | As above. | none |
| earlier run | none (run stopped) | | | b | The catch-all answer "Use the values in the decision record." went to the numeric decisions that the answers file does not name (impute_shift, impute_width, impute_seed). The harness raised "must be a number" and kept the question open until the timeout. | `src/core/headless.ts` uses the recommendation of a decision with no options when the answers file has no entry for it. |
| earlier run | none (failed call) | | | b | `inspect_data` could not open `src/tools/inspect_data.py` (see thaqi2026-bovine-corpus-luteum). | Fixed in `src/bench/papers-blind.ts`. |

Other findings:

- The true positive item has a tolerance of 5. The paper prints 1230, the tool gives 1235 (check.out). The false positive count (13) and the protein counts (6566, 5022) match exactly.
- The model used the annotation pattern of `test_differential_proteins` for the E. coli count and reported both species counts from the summary.
