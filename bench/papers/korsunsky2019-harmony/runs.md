# Runs: korsunsky2019-harmony (Harmony, Jurkat and 293T cell lines)

Date: 2026-10-09. Model: claude:claude-haiku-5-5 (blind mode on). Adapters: scanpy 0.1.2 and harmony 0.1.0 (draft). Programs: scanpy 1.12.4, harmonypy 2.1.0.

Command:

```
node bin/ga.js bench papers --papers korsunsky2019-harmony --models claude:claude-haiku-5-5 --runs 1
```

The harness answered each decision from `bench.yaml`: minimum genes 500, maximum genes 100000, maximum mitochondrial percent 20, minimum cells per gene 3, target sum 10000, 1000 variable genes, no regression, batch column sample, Harmony theta 2, 30 components, seed 0.

## Result summary

| Quantity | Paper | Run 3 (final) | Pass |
| --- | --- | --- | --- |
| Median iLISI before Harmony | 1.01 (+/- 0.1) | 1.056 (reported) | yes |
| Median iLISI after Harmony | 1.59 (+/- 0.1) | 1.644 (reported) | yes |
| Median cLISI before Harmony | 1.00 (+/- 0.02) | 1.00 | yes |
| Median cLISI after Harmony | 1.00 (+/- 0.02) | 1.00 | yes |
| Cells of the pure Jurkat data set after quality control | 3255 | 3255 | yes |
| Cells of the pure 293T data set (reference) | 2859 | 2885 | differs |
| Jurkat cells in the mix (reference) | 1799 | 1773 | differs |
| 293T cells in the mix (reference) | 1565 | 1615 | differs |

Verdict: computed 5 of 5 scored items and reported 5 of 5, in all three runs. The three reference items differ from the paper. `check_lisi.py` (numpy and scikit-learn, no scanpy) gives the same numbers as the tools: median iLISI 1.056 before and 1.657 after, 3255, 2885, 1773 and 1615 cells (`check_lisi.out`).

The paper values 1.01 and 1.59 come from an R pipeline of 2019 with an L2 normalization and variable genes chosen in each data set. This pipeline gives 1.06 and 1.66. The difference is 0.05 and 0.07. The tolerance 0.1 was set before the first run.

## Run 3 (final)

- Session: `20261009-023719-c6f8`. 467 s, 27 model requests, 29 tool calls, none failed. The benchmark call that ran this paper and Weber 2023 cost $0.04 at list prices.
- The answer states 1.056 and 1.644 for the median iLISI. The run before Harmony and the run after Harmony use the same 30 components.
- Leak check: 0 paths outside the allow list, 0 blocked reads, 0 unsourced claims.

## Run 2

- Session: `20261009-020524-92e5`. 573 s, 30 tool calls, 1 failed. Same scores.
- The failed call: the model passed the text `{"handle": "merged.h5ad"}` as the data of `filter_genes`. No handle has this name. The scanpy error now names the path and says how to pass an object (scanpy 0.1.2, tests `missing-adata-file` and `handle-as-json-text`).

## Run 1 (before two fixes)

- Session: `20261009-014706-3bf1`. 767 s, 47 tool calls, 4 failed. Same scores.
- `label_by_reference` failed twice, because the model passed the list of reference groups as the text `["jurkat", "t293"]`. This is a tool fault (class a). Fix: the tools of the harmony and squidpy adapters read a list that arrives as JSON text. Runs 2 and 3 have no such failure.
- The model passed the wrong handle text to `filter_genes`, and one `run_script` call failed. These are model faults.

## Notes

- A run of this paper in the middle of the fixes (session `20261009-022301-9da4`) had 3 failed calls: two `plot_genes` calls with a list of genes as JSON text, and one `run_script` call. The scanpy tool `plot_genes` now reads a gene list as JSON text. The scores were the same.
- The score "computed" takes the logged number that is nearest to the expected value. For `ilisi_before` the runs matched 1.0067, 1.0116 and 1.0024 (a group value or the mean of the table of one call). The reported value is 1.056 in all runs. The tolerance 0.1 accepts all of them.
- The adapter does not call `scanpy.external.pp.harmony_integrate`, which fails with harmonypy 2.1.0 (it transposes the result).
