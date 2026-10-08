# Triage: ljosa2012-bbbc005

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-145606-da2e`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | mean_abs_error_sample | 3.11 | computed 1.35 (a setting), reported 0.94 | a, d | In e20 the model gave truth_regex `_C(\d+)_.TIF`. No file name matches it (they read `_C1_F1_s01_w1.TIF`). The result had true_count null and n_with_truth 0 (e68), with no message. The model then computed the error from the two totals with calculate (mae of one pair, e83) and wrote the ratio 0.94 as the error. The r2 calls (e89, e98) failed with "the result is not one finite number", and the model called the same input three times (notice e106). | 8093f5f (count_nuclei fails at once when truth_regex matches no file), 054e860 (r2 says why it failed) |
| qwen3:8b | true_total_sample | 5007 | computed 4706 (the detected total) | a, d | Same cause. The tool never gave the true total because the regex found no count. | 8093f5f |

Other findings:

- The item ratio_sample passed: the ratio of the totals is correct without per-image counts.

Commits in this branch for this paper: 054e860, 8093f5f
