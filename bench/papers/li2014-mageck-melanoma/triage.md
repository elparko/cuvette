# Triage: li2014-mageck-melanoma

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 (blind, adapter 0.1.0): `20261009-024436-9501`, 169 s, 11 tool calls (1 failed), computed 8/8, reported 7/7. Report: `bench/results/papers-2026-10-09-epigenomics-crispr-genetics-haiku.md`.
- Leak check: 0 paths outside the allow list, 0 unsourced claims. The one "blocked" entry is the wait for the scientist's answers.
- An earlier run (adapter 0.1.0 before the fix of the list arguments) had 8 tool calls with 3 failed and a wrong reported value for the EGFR false discovery rate (0.25, the cutoff, instead of 0.027).

| Run | Item | Class | Cause | Fix |
| --- | --- | --- | --- | --- |
| earlier | treatment and control lists | a | The model sent the sample lists as JSON text (`["PLX14_R1", "PLX14_R2"]`). The tool split it at the comma and named the sample `["PLX14_R1"`. Two calls failed. | `as_list` in `scripts/lib.py` reads JSON text. The test `sample-lists-as-json-text` covers it. |
| earlier | egfr_fdr_neg_day7 (reported) | b | The claim check took 0.25 (the cutoff of the decision) as the answer. The text also gave 0.027. | none. The next run reported 0.025. |
| 1 | inspect_data failed | b | The sandbox of a worktree run blocks the Python helper (Operation not permitted). The model read the file with read_file. | none |
| 1 | rreb1_rank_neg_day14, egfr_rank_neg_day7, egfr_fdr_neg_day7 (computed) | b | The scorer takes the logged number nearest to the expected value. It matched rank 1 to `metrics.n_neg_fdr`, rank 6 to `metrics.CDH13_sgrnas` and the FDR to the RREB1 FDR (0.0248). The ranks and the FDR in the answer are right (RREB1 rank 1, EGFR rank 6, FDR 0.027). | Not fixed. An item cannot name the metric path that the scorer must read. |

Other findings:

- The false discovery rates of the paper do not reproduce (CDH13 0.028 against 0.017, PPT1 0.097 against 0.085, RREB1 0.025 against 0.05). The ranks do. The FDR of CDH13 is a reference item.
- Rejected on the same data: the rank statements of the paper for the leukemia screen (MAP4K3 rank 17, not 9; EPM2A rank 18, not 10) and the beta scores of the MAGeCK demo page (RNF11 0.129, not 3.6354). See `CANDIDATES-epigenomics-crispr-genetics.md`.
- The supplement has 118 gene symbols (melanoma sheet) that Excel changed to dates. The first run of the command line program on the raw export ranked the date entries first. The tools refuse such a table.
