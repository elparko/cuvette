---
name: integrate-samples
description: Step-by-step workflow from several samples to a batch-corrected embedding with LISI values before and after.
---

# Integrate several samples

Ask the scientist for each decision that the setup lists. Do not choose a value.

1. Run merge_samples with the absolute path of each sample. Give sample_names if the folder names are equal. Read the cells of each sample.
2. Ask which column holds the batch. Ask if the batches also differ by cell type or condition. Stop and tell the scientist if the batches are the conditions that they compare.
3. Run the scanpy tools on the merged.h5ad path: calculate_qc, filter_cells, normalize_log, find_variable_genes, scale_data, run_pca. Use the cutoffs of the scientist.
4. Run compute_lisi on the batch column with use_rep X_pca. This is the value before.
5. Run integrate_harmony with the batch column. The harness asks for theta and the number of components.
6. Run compute_lisi on the batch column with use_rep X_pca_harmony and the same n_pcs. This is the value after.
7. If cell type labels exist, run compute_lisi on that column before and after. Use the argument by to see the batch LISI inside each cell type.
8. If pure samples define the cell types, run label_by_reference with those samples as reference groups.
9. Run plot_integration. Show the picture. Do not use the picture as a measure.
10. Run build_neighbors of the scanpy adapter with use_rep X_pca_harmony, then run_umap and cluster_leiden.
11. Report the LISI values before and after, theta, the components and the seed.

Each tool saves a .h5ad checkpoint. A later step can start from a checkpoint path.
