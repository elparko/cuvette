# Triage: hildyard2021-embryo-refgenes

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind): `20261008-232410-da6e`, 170 s, 10 tool calls (0 failed), computed 18/19, reported 16/17. Leak check: 0 paths outside the allow list, 0 blocked, 2 unsourced claims.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | slope_actb_printed (reference) | -3.2293 | differs | none | The printed ACTB slope does not reproduce. The data give -3.2993, and the run reports -3.2993 (slope_actb_computed passes). A reference item is not in the pass counts. | none |

Other findings:

- The agent ran NormFinder with no groups (call e23, result e40), then grouped by tissue (call e47, result e48). The empty answer to stability_groups kept the group column of each call.
- The agent ran geNorm on the head samples with subset_col tissue and subset_value H (call e50, result e51). It also ran two run_script steps (e61, e83) to count genes and to check outliers; neither changed an item.
- All other items pass in the computed and the reported score.
