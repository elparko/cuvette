# Triage: andrews-fastqc

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-140830-3c93`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | (no failed item; 4 failed tool calls) | - | read_modules failed in e20, e25, e47, e52 | a, b | The model called read_modules with `.../data.txt`. The file is named `fastqc_data.txt`. The result of run_fastqc (e8) lists more than forty picture files before the text field that holds `data_file`. For a small model the harness cut the result at 6000 characters, so the model never saw `data_file`. The error text of awk did not name the right file. | 0a988cc (text before the file list, file list capped), 275f70c (read_modules names the missing file) |

Other findings:

- The final answer (e67) states that the module statuses could not be read. The score items all pass because the run_fastqc summary holds the counts.

Commits in this branch for this paper: 0a988cc, 275f70c
