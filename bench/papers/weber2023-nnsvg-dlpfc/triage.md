# Triage: weber2023-nnsvg-dlpfc

Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude:claude-haiku-5-5, run 1: `20261009-020313-e59c`
- claude:claude-haiku-5-5, run 2: `20261009-021809-9d1a`
- claude:claude-haiku-5-5, run 3: `20261009-023524-28df`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| haiku | mobp_rank, snap25_rank (run 1) | 50 +- 50 | reported 54 for both | c | A tolerance of 50 around 50 accepts any rank from 0 to 100. The scorer took 54, the rank of HBB, for MOBP and SNAP25. | The items were replaced by the count 2 and the ranks 4 and 19 of the independent check. Run 2 and run 3 pass. |
| haiku | hbb_rank, igkc_rank, npy_rank (run 1) | 550 +- 450 | all three matched 260 | c | The same fault: one number matches three genes. | The items were removed. The reason is in `paper.md` and `expected.yaml`. |
| spec | genes_pass_filter | 3396 | 3309 | c | The paper count does not reproduce. The paper does not say which spots or genes it dropped before the filter. | The item is a reference (no score). |

Commits in this branch for this paper: see `git log -- bench/papers/weber2023-nnsvg-dlpfc`.
