# Triage: ross-innes2012-diffbind-tamoxifen

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 (blind, adapter 0.1.0): `20261009-024725-1c01`, 212 s, 22 tool calls (1 failed), computed 5/5, reported 5/5. Report: `bench/results/papers-2026-10-09-epigenomics-crispr-genetics-haiku.md`.
- Leak check: 0 paths outside the allow list, 0 unsourced claims. The one "blocked" entry is the wait for the scientist's answers.

| Run | Item | Class | Cause | Fix |
| --- | --- | --- | --- | --- |
| first | analysis 2 and 3 of the first spec | c | The first spec asked for three analyses with three designs. The harness fills `blocking_factors`, `condition_variable` and the levels from the decision record and overwrites the arguments of the model. The model got the number of analysis 1 three times, asked to change the record, and ran a comparison for the tissue design only. Analysis 3 could not run (MCF7 against T47D needs four decisions changed). | The spec now asks for one design (the tissue as blocking factor) and a comparison without it. The tissue contrast stays in the adapter test `tamoxifen-tissue-contrast`. |
| first | consensus width 401 | a | The width came from the summary text only. The claim check called it unsourced. | `count_reads_in_peaks` returns `metrics.peak_width`. |
| first | versions | a | The model could not report the versions of DESeq2 and edgeR. | `find_differential_peaks` returns `program_version`. |
| 1 | inspect_data failed | b | The sandbox of a worktree run blocks the Python helper (Operation not permitted). The model read the file with read_file. | none |

Other findings:

- The DiffBind route with the vignette sample sheet counts the 2845 sites in about 40 seconds.
- The model reported the numbers of the comparison run (design without the tissue) as such. The claim check noted it as a number from a comparison.
- Not reproduced: the edgeR numbers of the vignette (819 and 1518). The quasi-likelihood test gives 820 and 1517. They are not items.
