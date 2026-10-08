# Wolf 2018: scanpy, PBMC 3k clustering tutorial

## Citation
- Wolf FA, Angerer P, Theis FJ. SCANPY: large-scale single-cell gene expression data analysis. Genome Biology 19:15 (2018).
- DOI: 10.1186/s13059-017-1382-0
- The steps and numbers below come from the scanpy tutorial "Preprocessing and clustering 3k PBMCs" (stable docs, read 2026-10-07). The tutorial reproduces the Seurat 3k PBMC guide. The paper's own Figure 1 and Figure 2 use the same data type.

## Data
- Source: 10x Genomics public dataset "3k PBMCs from a Healthy Donor", filtered gene-barcode matrices, hg19.
- URL: https://cf.10xgenomics.com/samples/cell/pbmc3k/pbmc3k_filtered_gene_bc_matrices.tar.gz (7.6 MB)
- License: not stated on the 10x dataset page (checked 2026-10-07). 10x publishes the file for open download and scanpy docs use it. Treat as open public data; confirm before redistribution.
- Local path: /Volumes/T7/guided-analysis/data/wolf2018-scanpy/filtered_gene_bc_matrices/hg19/ (matrix.mtx, genes.tsv, barcodes.tsv)
- Healthy donor, no patient identifiers.

## Tool
- scanpy (checked with 1.12.4), Python 3.13, leidenalg or igraph backend.

## Method steps, in order (tutorial parameters)
1. Read the 10x matrix with `sc.read_10x_mtx(..., var_names="gene_symbols")`. Result: 2700 cells x 32738 genes.
2. `sc.pp.filter_cells(min_genes=200)`. No cell is removed.
3. `sc.pp.filter_genes(min_cells=3)`. Result: 13714 genes.
4. Mark mitochondrial genes (symbol starts with `MT-`). Run `sc.pp.calculate_qc_metrics`.
5. Keep cells with `n_genes_by_counts` between 200 and 2500 and `pct_counts_mt` below 5. Result: 2638 cells.
6. `sc.pp.normalize_total(target_sum=1e4)`, then `sc.pp.log1p`.
7. `sc.pp.highly_variable_genes(min_mean=0.0125, max_mean=3, min_disp=0.5)`. The current tutorial also passes `n_top_genes=2000`, `flavor="seurat_v3"` on the raw counts layer. The older tutorial used the default flavor and gave 1838 genes (reproduced by the check run).
8. Regress out `total_counts` and `pct_counts_mt`. Scale with `max_value=10`.
9. PCA with `svd_solver="arpack"`.
10. `sc.pp.neighbors(n_neighbors=10, n_pcs=40)`.
11. `sc.tl.leiden(resolution=0.7, random_state=0, flavor="igraph", n_iterations=2, directed=False)`.
12. Find marker genes per cluster and label cell types (tutorial uses Wilcoxon rank-sum, `rank_genes_groups`).

## Numbers to reproduce
| Quantity | Value | Source |
|---|---|---|
| Cells and genes at load | 2700 x 32738 | tutorial, read step |
| Genes after min_cells=3 | 13714 | tutorial, basic filtering |
| Cells after QC filter | 2638 | tutorial, filtering by slicing |
| Highly variable genes (default flavor, min_mean/max_mean/min_disp as above) | 1838 | computed in check run |
| Leiden clusters at resolution 0.7 | 7 in check run (sizes 1174, 486, 438, 341, 150, 36, 13); tutorial shows its own cluster set | computed in check run |

Cluster number and sizes change with the scanpy version, the HVG flavor and the random seed.

## Decisions the scientist owns (paper choice)
- Minimum genes per cell: 200.
- Maximum genes per cell: 2500 (removes likely doublets).
- Mitochondrial fraction cut-off: 5 percent.
- Minimum cells per gene: 3.
- Normalization: library size to 10,000 counts, then log1p.
- Highly variable gene selection: min_mean 0.0125, max_mean 3, min_disp 0.5.
- Regress out total counts and mitochondrial fraction: yes.
- Number of PCs for the graph: 40. Neighbors: 10.
- Clustering resolution: 0.7.
