# Triage: student1908-sleep

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-153945-3517`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | welch_p_trap | 0.07939 | computed 0.05 (an alpha) | c | A trap value: the unpaired p value appears only if the run uses the wrong test. The run used the paired test and avoided the trap. | 118ed59 (reference item). The coordinator replaces this with a trap flag. |

Commits in this branch for this paper: 118ed59
