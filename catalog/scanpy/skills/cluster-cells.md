---
name: cluster-cells
description: Step-by-step workflow from a 10x folder or h5ad file to QC, clusters and a UMAP.
---

# Cluster the cells of one sample

Ask the scientist for each decision that the setup lists. Do not choose a cutoff.

1. Run load_data with the absolute path. Read the cell and gene counts. Check that x_is_counts is 1.
2. Run filter_genes first, on raw counts. The harness asks for min_cells_per_gene.
3. Run calculate_qc. Look at the violin plot and the quantile table. Show them to the scientist.
4. Run filter_cells with min_genes, max_genes and max_pct_mito. The harness asks the scientist for the values. Report the cells removed for each reason.
5. Run normalize_log with the target sum that the scientist chose.
6. Run find_variable_genes. Report the number of genes.
7. Run scale_data. Use the regress_out choice of the scientist.
8. Run run_pca. Look at the variance plot. The harness asks for the number of components when you run build_neighbors.
9. Run build_neighbors, then run_umap, then cluster_leiden. Use one random seed in all calls.
10. Report the number of clusters with the resolution, the seed, the neighbors and the components. Show the sensitivity table for the resolution.
11. Run find_markers. See the skill marker-genes.

Each tool saves a .h5ad checkpoint. A later step can start from a checkpoint path.
