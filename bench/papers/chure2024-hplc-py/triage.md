# Triage: chure2024-hplc-py

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

Runs with claude-haiku-5-5 on 2026-10-09.

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| haiku-5-5 (first run) | every item | the published values | "the program was not found" for every tool | b | The version command of a python adapter ran with the harness working folder on `sys.path`, which blind mode denies. | The version command now runs python in isolated mode (`-I`). |
| haiku-5-5 (second run) | peak1_skew | 0.70 | 0.6918 | c | The figure prints 0.70. The archived trace gives 0.6918, which rounds to 0.69. The figure panel and the archive differ, as rows 2 and 3 of the same figure show. | The tolerance is 0.01, one unit of the last printed digit. |
| haiku-5-5 (second run) | calibration_slope, calibration_intercept, calibration_r_squared, unknown_concentration | the values from the adapter route | the values from another integration route | c | The prompt said that the calibration traces need no baseline correction. The expected values come from the same settings as the first part: SNIP with a peak width of 5. | The prompt now says to use the same settings and the whole trace. |

The published items of the first peak (retention time, amplitude, scale, area) passed in the second run.
