# Triage: gouwens2019-allen-ephys

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 (blind, adapter 0.1.0): `20261009-045801-e265`, 250 s, computed 14/14 (14 scored items and 1 reference item), reported 14/14. Report: `bench/results/papers-2026-10-09-ephys-haiku.md`.
- Leak check: 0 paths outside the allow list, 0 blocked reads, 0 unsourced claims.
- The run asked 5 setup questions. The decision record answered all of them. The harness replaced the requested spike threshold method with the decision record value in 2 calls (e74, e78).

| Run | Item | Class | Cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | c3_tau (reference item) | b | The reference item expects 14.87 ms. The model gave 15.79 ms. The item shows a pass. The computed match is the number 15 in a table (n12 table.rows[0][0], the sweep count). The reported match is "15 sweeps" in the answer. The item is a reference item, so it is not in the totals. | none. The match does not change a total. The model value differs by 0.92 ms because one of the three tau fits failed and the mean uses two fits. |
| 1 | c1_ratio | d | The first answer used the ratio from a comparison run (junction potential 10 mV). The claim check showed an error (e135). The model ran the setting of 0 mV again and the values did not change. | none. The final answer states the ratio of the chosen setting. |
| 1 | c1_ratio | d | The cell 1 ratio is 1.146. Cells 2 and 3 give 3.9 and 3.2. The model said that the first spike at rheobase is small and asked the scientist to check the plot. | none. The value matches the benchmark value. |

Other findings:

- The model did not run the threshold sensitivity check. It said so in the "Uncertain" list.
- The downstroke values in the answer are derived (upstroke divided by the ratio). The referee finding (e139) asked for a label. The final answer does not label them.
- The model gave no tau fit window. It wrote that the window is the tool default. The referee finding (e140) asked for the value.
- The stored computed value of the 10 mIPSC items in the same result file was wrong. This paper is not affected. See the triage of jahncke2025-dag1-mipsc.
