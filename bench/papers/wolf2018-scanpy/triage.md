# Triage: wolf2018-scanpy

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-154305-7e99`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | leiden_clusters | 7 +-1 | computed 7 (pass), reported 5.68 | b | The answer says "partitioned into **7 clusters**". The claim check skipped the whole number 7, so the scorer took 5.68 (a percent). | 778cb5e (a small whole number is a claim when a logged result holds it). A new scoring of the saved log passes the item. |

Commits in this branch for this paper: 778cb5e
