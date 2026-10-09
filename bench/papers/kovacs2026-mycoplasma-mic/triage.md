# Triage: kovacs2026-mycoplasma-mic

Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind): `20261009-033411-7b04`, computed 14/14, reported 14/14 (the reference item is not in the counts), 129 s, 0 paths outside the allow list.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | enrofloxacin_mic50_printed (reference) | 10 | 5 | none | The paper prints "more than 10". The table gives 5. Expected. | none |
| 1 | none (failed call) | | | b | `inspect_data` cannot read `src/tools/inspect_data.py` in a worktree under `.claude/worktrees`. | none. The fault is in the harness sandbox for worktrees. |

Other findings:

- The model called `mic_summary` once and wrote the MIC50 and MIC90 of nine drugs. Two `run_script` calls checked the ranks.
- The reference item shows "match" because the logged value 10 (the MIC90 of doxycycline) is near the printed value. The report line for reference items is only a note.
