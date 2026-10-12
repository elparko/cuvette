# Triage: rost2016-openms

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-153426-3d7c`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | spectra | 7173 | computed 7173 (pass), reported 1887 | b, d | The model wrote the 7173 spectra in a message between steps (e13). The final answer (e73) gives the features only. Numbers in earlier messages do not count. | 861a1de (rules say that the final answer holds every requested number) |

Other findings:

- e20 to e50 (a): find_features failed seven times with "unknown argument polarity", six of them in comparison runs. The error did not list the valid arguments. Fixed in d4b4cd8.

Commits in this branch for this paper: d4b4cd8, 861a1de
