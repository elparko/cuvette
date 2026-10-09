# Triage: kochanek2023-deaths-final-data-2020

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 (blind, adapter 0.1.0): `20261009-035954-67da`, 69 s, 7 tool calls (0 failed), computed 7/7, reported 7/7. Report: `bench/results/papers-2026-10-09-epi-haiku.md`.
- Leak check: 0 paths outside the allow list, 0 blocked, 1 unsourced claim.

| Run | Item | Class | Cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | standard_population | d | The model first asked for the standard `custom` with the file column std_pop_2000. The decision record fixed `us2000_11`, so the harness overwrote the argument (1 deviation, 1 overwritten). The values are the same, because the column holds the same weights. | none. The model then checked the weights of the column against the tool result. |
| 1 | unsourced number 1000000 | d | The answer gave the total of the standard weights. A script of the model printed the total (e47), but the claim check could not link it. | none. The number is in the log. |

Other findings:

- The model did not give the epitools version. The reporting rules ask for it.
- The referee warned that the headline states a rise with point estimates only. The tool gives no interval for a table of rates. The expected file says so.
