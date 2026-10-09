# Triage: thaqi2026-bovine-corpus-luteum

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind): `20261009-030114-c6fb`, computed 14/14, reported 13/13 (n_tested is not asked), 123 s, 10 tool calls (0 failed), 0 paths outside the allow list.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| earlier run | none (failed call) | | | b | `inspect_data` could not open `src/tools/inspect_data.py`. The blind sandbox allowed `src/adapters/` only. The model went on without it. | `src/bench/papers-blind.ts` allows that file. Run 1 has no failed call. |

Other findings:

- The six comparisons give the same counts in both runs of the benchmark: the pipeline is deterministic with the seed of the decision record.
- The model sent one `prepare_protein_table` call and six `test_differential_proteins` calls. It read the stage from the column names (`group_regex`), because the columns are in alphabetical order (IX comes after IV).
- The paper counts proteins that are "higher in the first group" and "higher in the second group". The tool gives `n_down` and `n_up` for group_a minus group_b. The model took the sign correctly in all six comparisons.
