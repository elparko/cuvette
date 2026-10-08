# Triage: alexandrov2019-metaspace

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-135629-7f08`
- claude: `20261008-144624-4edd`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | d1_hmdb_fdr10 | 263 | computed 191, reported 191 | b, c, d | The HMDB count exists only in a comparison run (e33, e116), and the scorer ignored comparison runs (c). The model asked for HMDB in e57, e83 and e90. The harness kept LipidMaps (deviation e58, e84, e91) and the model wrote the LipidMaps counts as HMDB counts in e179 to e201 (d). compare_options in e115 repeated only the last step, which was the other dataset, and the result did not say so (b). The model called it five times (notice e175). | 75d0ec4 (item flag from_comparison), 65006eb (result names the repeated step), e0a7289 (note says the result is for the recorded value) |
| qwen3:8b | d2_hmdb_fdr10 | 123 | computed 144, reported 144 | b, c, d | Same cause. The final answer e201 gives the LipidMaps counts for HMDB. The comparison run in e116 held the right value, 123. | 75d0ec4, 65006eb, e0a7289 |
| claude | d1_hmdb_fdr10 | 263 | computed 191, reported 263 (pass) | c | The value 263 is in a comparison run (e74, node n11). The setup fixes the database, so only a comparison run can hold it. The scorer ignored comparison runs. | 75d0ec4 |
| claude | d2_hmdb_fdr10 | 123 | computed 127.4, reported 123 (pass) | c | Same cause. The value 123 is in the comparison run of e58. | 75d0ec4 |

Other findings:

- Claude, review findings e153 to e155 (b): number_from_comparison and decision_misreported were errors, but the answer said "In comparison runs with HMDB v4". The claim check also flagged an unsourced 10, from the id fragment `10h14m23s`. Fixed in b5d18d2 and aa463a6.
- After the fixes, a new scoring of both finished runs from the saved logs gives no failed item for this paper in the computed score. The reported score of qwen3:8b stays at 2 failed items (model fault).

Commits in this branch for this paper: 65006eb, 75d0ec4, aa463a6, b5d18d2, e0a7289
