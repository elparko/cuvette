# Triage: schramm2012-imzml-pyimzml

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-153834-9cfb`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | spectra_per_file | 9 | computed pass, reported 243.54 | b, d | The model wrote the file facts in a message between steps (e22, final:false). The final answer (e31) holds the TIC maximum 243.54 and the sentence "we will use the compare_files function". The nudge for an announced step did not see "we will use". The score took 243.54 as the nearest claim. | 861a1de, 48aa000 (the check finds "we will use") |
| qwen3:8b | mz_min | 100.083336 | computed pass, reported 243.54 | b, d | The model wrote the file facts in a message between steps (e22, final:false). The final answer (e31) holds the TIC maximum 243.54 and the sentence "we will use the compare_files function". The nudge for an announced step did not see "we will use". The score took 243.54 as the nearest claim. | 861a1de, 48aa000 (the check finds "we will use") |
| qwen3:8b | mz_max | 799.9167 | computed pass, reported 243.54 | b, d | The model wrote the file facts in a message between steps (e22, final:false). The final answer (e31) holds the TIC maximum 243.54 and the sentence "we will use the compare_files function". The nudge for an announced step did not see "we will use". The score took 243.54 as the nearest claim. | 861a1de, 48aa000 (the check finds "we will use") |

Commits in this branch for this paper: 861a1de, 48aa000
