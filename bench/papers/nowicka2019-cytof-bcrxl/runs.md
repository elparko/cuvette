# Runs: nowicka2019-cytof-bcrxl (CyTOF workflow, BCR-XL stimulation)

Date: 2026-10-09. Model: claude:claude-haiku-5-5 (blind mode on). Adapter: cytof 0.1.0 (draft). Programs: FlowSOM 2.20.0, diffcyt 1.32.1, lme4, R 4.6.1.

Command:

```
node bin/ga.js bench papers --papers nowicka2019-cytof-bcrxl --models claude:claude-haiku-5-5 --runs 1
```

The harness answered each decision from `bench.yaml`: ten lineage markers, cofactor 5, grid 10 x 10, 20 metaclusters, seed 1234, population column label, condition BCR-XL against Reference, pairing by patient_id, GLMM, adjusted p limit 0.05.

## Result summary

| Quantity | Paper | Run 2 (final) | Pass |
| --- | --- | --- | --- |
| Cells in the file of donor 2 with BCR-XL | 16675 | 16675 | yes |
| Cells in the file of donor 1 Reference | 2739 | 2739 | yes |
| Percent of NK cells, Reference file of donor 1 | 14.3 | 14.31 | yes |
| Percent of CD4 T-cells, Reference file of donor 1 | 44.7 | 44.72 | yes |
| p of the NK cells, paired GLMM | 4.5e-13 | 4.47e-13 | yes |
| p of the B-cells IgM-, paired GLMM | 2.2e-11 | 2.2e-11 | yes |
| Adjusted p of the CD8 T-cells, paired GLMM | 0.0019 | 0.0019 | yes |
| Cell types at FDR 0.05, paired GLMM | 6 | 6 | yes |
| Cell types at FDR 0.05, GLMM without the pairing | 3 | 3 | yes |
| p of the B-cells IgM+, GLMM without the pairing | 0.0135 | 0.01348 | yes |

Verdict: computed 10 of 10 scored items and reported 10 of 10 in the final run.

## Run 2 (final)

- Session: `20261009-033119-d666`. 245 s, 16 model requests, 19 tool calls, none failed. List-price cost $0.01.
- The pairing comparison (pair_by none) came from the sensitivity run of the harness.
- Leak check: 0 paths outside the allow list, 0 blocked reads, 0 unsourced claims.

## Run 1 (before the fix)

- Session: `20261009-032305-87f9`. 200 s, 23 tool calls, 16 failed. Computed 0 of 10, reported 5 of 10.
- Every R tool failed with "there is no package called flowCore". The packages were in a library folder that blind mode does not allow (`R-library-microcyto`). Fix: the packages are in `tools/R-library`, the folder that the blind allow list names. Run 2 has no failed call.
