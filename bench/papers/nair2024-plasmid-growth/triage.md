# Triage: nair2024-plasmid-growth

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind): `20261008-232644-b347`, computed 20/20, reported 17/17 (the reference item is not in the counts), 142 s, 11 tool calls (2 failed), 0 paths outside the allow list.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | mean_printed (reference) | 0.996 | 1.0092 | none | The printed STR-R average does not reproduce from the source data. Expected. | none |
| 1 | none (failed calls) | | | a | e74 to e89: the model sent group_cols as JSON text (`["plasmid"]`). The tool read it as one column name and failed twice. The error named the valid columns, and the model sent `plasmid` at e95. | as_list_arg reads JSON list text (adapter 0.1.1). The test strr-relative-growth sends group_cols as JSON text. |

Other findings:

- e23: the model left out bg_correct, t_trim and exclude. The harness filled them from the decision record, so the fit left out the 14 wells that the source data leave out.
- e103: the model used calculate for the mean of the 12 plasmid means, because group_cols was plasmid only and summary_by needs two group columns for its default. The value is correct.
