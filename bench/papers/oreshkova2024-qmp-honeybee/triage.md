# Triage: oreshkova2024-qmp-honeybee

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

Runs with claude-haiku-5-5 on 2026-10-09.

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| haiku-5-5 (first run) | every item of the acini ANOVA | the published F values | the type II values, from the model's own script | b | Every tool of the biostats adapter failed with "the program was not found". The version command of a python adapter ran with the harness working folder on `sys.path`, and blind mode denies that folder, so the import raised PermissionError. | The version command now runs python in isolated mode (`-I`). |
| haiku-5-5 (first run) | fas_kruskal_df | 3 | 2.8133 from another number in the log | c | The value 3 is too common to match on its own. | The second run matched it in the result of the right tool. The item keeps its value. |
| haiku-5-5 (second run) | acini_p_replicate, reported | 0.00209 | the answer rounds it to 0.002 | d | The answer gives two significant figures for a p value that the paper prints to five. | None. The computed value passed. |

After the fix the paper scores 19 of 19 computed and 15 of 16 reported.
