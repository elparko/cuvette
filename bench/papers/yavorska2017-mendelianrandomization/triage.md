# Triage: yavorska2017-mendelianrandomization

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 (blind, adapter 0.1.0): `20261009-024240-8c65`, 116 s, 8 tool calls (1 failed), computed 13/13, reported 13/13. Report: `bench/results/papers-2026-10-09-epigenomics-crispr-genetics-haiku.md`.
- Leak check: 0 paths outside the allow list, 0 unsourced claims. The one "blocked" entry is the wait for the scientist's answers, not a denied read.
- Two earlier runs of the same paper (adapter 0.1.0, before the item list changed) also passed all items.

| Run | Item | Class | Cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | inspect_data failed | b | The sandbox of a worktree run blocks the Python helper at `src/tools/inspect_data.py` (Operation not permitted). The model read the file with read_file and went on. | none. The fault is in the sandbox rule for a worktree path, not in the adapter. |
| earlier | f_statistic | c | The F statistic is 28.0 and the number of variants is 28. The scorer matched the F item to `metrics.n_variants`. | The item became a reference item and the standard error of the MR-Egger estimate took its place. |

Other findings:

- The model asked the four setup questions through the decision record and passed `alleles_harmonized` through the decision. The tools refused no call.
- The mode standard error (1.004 here, 1.005 in the vignette) comes from a bootstrap. It is not an item.
