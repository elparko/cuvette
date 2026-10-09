# Triage: kresken2021-temocillin

Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind, before the fix): `20261009-032643-b18d`, computed 16/24, reported 17/24, 103 s, 14 tool calls (9 failed).
- claude-haiku-5-5 run 2 (blind, after the fix): `20261009-032859-0ef4`, computed 24/24, reported 24/24, 155 s, 0 paths outside the allow list.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | all percent items | 79.3 and others | 79, 109, 58 | b | The R package AMR was in a library folder (R-library-micro) that blind mode does not allow. Every AMR call failed with "there is no package called AMR". The model then used a Python fallback that has no breakpoints. | AMR is in the library folder /Volumes/T7/guided-analysis/tools/R-library, which blind mode allows. The install text of the adapter names this folder. |
| 1, 2 | none (failed call) | | | b | `inspect_data` cannot read `src/tools/inspect_data.py` in a worktree under `.claude/worktrees`. The model reads the file with `read_file` instead. | none. The fault is in the harness sandbox for worktrees. |

Other findings:

- The computed score takes the logged number nearest to the expected value. The items for MIC50 and MIC90 have small whole numbers (1, 2, 4, 8, 16) that many logged values match. The 8 percent items are the strict test: each needs the right standard (EUCAST 2021) and the right counting rule (S and I).
- With "S only" the percent susceptible of temocillin is 0 for every group. The decision `susceptible_definition` decides this result. The benchmark answers S and I, as the paper does.
