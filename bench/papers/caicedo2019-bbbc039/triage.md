# Triage: caicedo2019-bbbc039

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-143303-946c`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | missed_fraction_advanced | 0.155 | computed 0.184 (a table cell), reported 0.086 | c | The expected value is the miss rate of the CellProfiler advanced pipeline (expected.yaml: "paper Results, Fig S2"). The adapter runs Cellpose, which misses 0.086 at IoU 0.7 (tool result e28). The expected.yaml notes say that Cellpose has no published number here and that the tolerances are guesses. The item compares two methods. | 75d0ec4 (item is a reference item) |
| qwen3:8b | missed_fraction_basic | 0.201 | computed 0.184, reported 0.086 | c | Same cause. The value is the CellProfiler basic pipeline. | 75d0ec4 |

Other findings:

- e49: the referee did not run because Ollama was not reachable at that time. This is not a harness fault.
- e58: the revised answer is a note about the review, not an answer. The review had flagged the Cellpose version `4.2` as unsourced (a). The version is in the session record. Fixed in aa463a6, which counts program versions and tool arguments as inputs.

Commits in this branch for this paper: 75d0ec4, aa463a6
