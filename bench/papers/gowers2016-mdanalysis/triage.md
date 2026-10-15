# Triage: gowers2016-mdanalysis

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-145014-c335`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | atoms | 3341 | computed 3341 (pass), reported 214 | b, d | The model wrote each result in a message between steps (e13, e23, e37, all final:false). It ended with "Next, I will analyze the closed structure (1AKE.pdb) ..." in e52. The final answer holds only the 4AKE residues, so the score has no claim for the earlier values. The nudge did not fire because its pattern stopped at the dot in `1AKE.pdb` and did not know the verb "analyze". | 48aa000 (promise check). Model fault for the split answer. |
| qwen3:8b | frames | 98 | computed 98 (pass), reported 75 | b, d | Same cause. | 48aa000 |
| qwen3:8b | backbone_rmsd_last_frame | 6.8203 | computed 6.8203 (pass), reported 72 | b, d | Same cause. | 48aa000 |
| qwen3:8b | rg_last_frame | 19.592 | computed 19.592 (pass), reported 72 | b, d | Same cause. | 48aa000 |
| qwen3:8b | ca_rmsd_open_closed | 7.131 | computed 7 (no step ran), reported 72 | b, d | The step with 1AKE was never run. Same cause. | 48aa000 |

Commits in this branch for this paper: 48aa000
