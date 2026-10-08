# Triage: bemis2015-cardinal

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-142527-65d4`
- claude: `20261008-145542-7afe`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | segments_s32 | 6 | computed 6 (pass), reported 4.71 | b | The final answer e77 says "Reported model: s = 32 (6 segments)". The claim check skipped every whole number of ten or less, so "6" was never a claim (claim check e69). The scorer then took the nearest other claim, 4.71, a standard deviation. | aa463a6 (a small whole number is a claim when a logged result holds it) |
| claude | segments_s64 | 3 | computed 3 (pass), reported 0.5 | b | The table row for s = 64 in the final answer holds the whole number 3. The claim check skipped it (claim check e168). Same cause. | aa463a6 |

Commits in this branch for this paper: aa463a6
