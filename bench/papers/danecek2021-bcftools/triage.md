# Triage: danecek2021-bcftools

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-144721-eb8c`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | records_af_5pct | 328 | computed 312 (a Tv count), reported 248 | b, d | The model never called filter_variants. The review in e13 and e25 said that 1100000 and 0.05 match no logged result. Both are false alarms. 0.05 is "5 percent" in the request and 1100000 is in the region argument. The model removed the numbers and wrote "we need to run the filter_variants tool" in e27. The nudge did not fire because its pattern knew "I need to" and not "we need to". | aa463a6 (percent words, tool arguments), fd4fb93 (promise check) |

Commits in this branch for this paper: aa463a6, fd4fb93
