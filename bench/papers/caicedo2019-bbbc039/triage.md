# Triage: caicedo2019-bbbc039

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-143303-946c`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | missed_fraction_advanced | 0.155 | computed 0.184 (a table cell), reported 0.086 | c | The expected value is the miss rate of the CellProfiler advanced pipeline (expected.yaml: "paper Results, Fig S2"). The adapter runs Cellpose, which misses 0.086 at IoU 0.7 (tool result e28). The expected.yaml notes say that Cellpose has no published number here and that the tolerances are guesses. The item compares two methods. | 8daaa0e (item is a reference item) |
| qwen3:8b | missed_fraction_basic | 0.201 | computed 0.184, reported 0.086 | c | Same cause. The value is the CellProfiler basic pipeline. | 8daaa0e |

Other findings:

- e49: the referee did not run ("Cannot reach Ollama") exactly 5 min 01 s after the claim check e48 (19:41:36 to 19:46:38). This is the 300 s wait for response headers of Node fetch: complete() used stream false. Fixed in 4804f34.
- e58: the revised answer is a note about the review, not an answer. The review had flagged the Cellpose version `4.2` as unsourced (a). The version is in the session record. Fixed in 778cb5e, which counts program versions and tool arguments as inputs.

Commits in this branch for this paper: 4804f34, 8daaa0e, 778cb5e
