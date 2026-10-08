# Triage: lazear2023-sage

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-145321-9283`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | target_psms_fdr5 | 242 | computed 260 (the target total), reported 260 | b, c, d | The setup fixes fdr_threshold at 0.01. The count at 5 percent exists only in a comparison run (compare_options). The scorer ignored comparison runs (c). The model asked for 0.05 in e19. The harness kept 0.01 (deviation e20) and the result e21 equals the 1 percent result. The model did not call compare_options. Its answer says that the 5 percent count was not provided and gives 260 elsewhere. count_at_fdr with threshold 0.05 on the logged results.tsv gives n_psm_pass 242. | 0f10521 (item flag from_comparison), e0a7289 (note says the result is for the recorded value) |

Other findings:

- The review (e32 to e35) flagged 0.05 and 5 as unsourced. Both come from "1 percent" and "5 percent" in the request. Fixed in aa463a6.

Commits in this branch for this paper: 0f10521, aa463a6, e0a7289
