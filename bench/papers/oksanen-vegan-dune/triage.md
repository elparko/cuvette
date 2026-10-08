# Triage: oksanen-vegan-dune

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-152500-4b52`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | (no failed item; 3 failed tool calls) | - | run_permanova failed in e33 to e35 with "argument is of length zero" | b | These are comparison runs that the harness started before the scientist set the formula. The formula had no value, so R got an empty argument. The main run (e44) passed. The comparison runs cost time and show an error that is not about the data. Not fixed: the harness should skip a comparison when a required argument has no value. | none |

Commits in this branch for this paper: none (model faults only).
