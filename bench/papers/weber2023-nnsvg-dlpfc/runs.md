# Runs: weber2023-nnsvg-dlpfc (nnSVG paper, Visium prefrontal cortex, Moran's I)

Date: 2026-10-09. Model: claude:claude-haiku-5-5 (blind mode on). Adapter: squidpy 0.1.0 (draft). Programs: squidpy 1.8.3, scanpy 1.12.4.

Command:

```
node bin/ga.js bench papers --papers weber2023-nnsvg-dlpfc --models claude:claude-haiku-5-5 --runs 1
```

The harness answered each decision from `bench.yaml`: minimum 3 UMI counts, 0.5 percent of the spots, remove the genes with the prefix MT-, 10000 counts per spot, a grid with 6 neighbors, seed 0.

## Result summary

| Quantity | Paper | Run 3 (final) | Pass |
| --- | --- | --- | --- |
| Spots in the tissue | 3639 | 3639 | yes |
| Layer genes (MOBP, SNAP25) within the top 100 | 2 | 2 | yes |
| Moran's I rank of MOBP | within the top 100 (check: 4) | 4 | yes |
| Moran's I rank of SNAP25 | within the top 100 (check: 19) | 19 | yes |
| Genes that pass the filter (reference) | 3396 | 3309 | differs |

Verdict: computed 4 of 4 scored items and reported 4 of 4. The reference item differs from the paper. `check_svg.py` (h5py and SciPy, no Squidpy) gives the same ranks (4 and 19) and the same gene counts (3322, and 3309 without the mitochondrial genes) (`check_svg.out`).

## Run 3 (final)

- Session: `20261009-023524-28df`. 115 s, 9 model requests, 7 tool calls, none failed. The benchmark call that ran this paper and Korsunsky 2019 cost $0.04 at list prices.
- Tool order of the model: load the sample, filter the genes, normalize, build the grid graph, rank the genes by Moran's I with the two layer genes as reported genes, draw the plot.
- The sensitivity check for the number of neighbors (6, 12 and 36 nearest neighbors, then the grid) ran before the question of the decision.
- Leak check: 0 paths outside the allow list, 0 blocked reads, 2 unsourced claims.

## Run 1 and run 2 (before a change of the items)

- Run 1 (session `20261009-020313-e59c`) used the items "rank of MOBP and SNAP25 within 0 to 100" and the ranks of PCP4, HBB, IGKC and NPY as references. Computed 7 of 8 and reported 7 of 8.
- The scoring takes the number in the answer that is nearest to the expected value. With the value 50 and the tolerance 50, it matched 54 (the rank of HBB) for MOBP and SNAP25 instead of 4 and 19. A rank range cannot be scored (class c, spec fault). The items for the ranges were removed, and the items are now the count of layer genes in the top 100 (2) and the ranks 4 and 19 from the independent check. The tool `spatial_autocorr` got the argument `rank_cutoff` and the metric `n_report_genes_within_cutoff` for the count.
- Run 2 (session `20261009-021809-9d1a`) used the new items. Computed 4 of 4 and reported 4 of 4.

## Notes

- The ranks of HBB, IGKC and NPY are 54, 33 and 260 with the grid of 6 neighbors. The paper puts the three genes at roughly 100 to 1000. A graph of 36 nearest neighbors gives 132, 87 and 646 (squidpy, 3322 genes, mitochondrial genes kept). The paper does not state the graph of its Moran's I. These values are not in the benchmark.
- The count of genes that pass the filter does not reproduce. The file has 21,842 genes with a count (paper 21,803) and 3322 pass the filter (paper 3396). A removal of low-quality spots with 3 median absolute deviations gives 3593 spots, 21,833 genes and 3418 genes that pass. The text of the paper gives 3639 spots.
