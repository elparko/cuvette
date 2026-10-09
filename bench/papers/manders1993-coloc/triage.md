# Triage: manders1993-coloc

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind): `20261009-000012-06e9`, adapter image-assays 0.1.0, 74 s, 9 tool calls (0 failed), computed 6/6, reported 5/5. Leak check: 0 paths outside the allow list, 0 blocked, 0 unsourced claims. Report: `bench/results/papers-2026-10-09-image-assays-haiku.md`.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | pearson_a_b | 0.72 (tolerance 0.01) | 0.7213 | none | Pass. | none |
| 1 | pearson_a_c | 0.44 | 0.4426 | none | Pass. | none |
| 1 | pearson_a_d | 0.16 | 0.1639 | none | Pass. | none |
| 1 | m1_a_b, m1_a_c, m2_a_d | 0.75, 0.5, 0.25 | 0.75, 0.5, 0.25 | none | Pass. | none |

Other findings:

- The scorer matched m2_a_d to metrics.manders_m1 of the A-D run (both are 0.25 for this symmetric pair). The M2 value of that run is also 0.25.
- The agent's calls asked for the Costes method with 10 randomizations; the decision record (threshold none, no test) replaced them, and the answer reports this. It also ran one Costes comparison on A-D and labeled it as a comparison.
- (d) The answer says that it saw no scientist answer. The answers file set the decisions before the first call, so no question card was shown. No fix.
