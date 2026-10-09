---
name: spatially-variable-genes
description: Step-by-step workflow from a Visium sample to a ranked list of spatially variable genes with Moran's I.
---

# Rank spatially variable genes

Ask the scientist for each decision that the setup lists. Do not choose a value.

1. Run load_spatial with the absolute path of the Space Ranger outs folder or the .h5 file. Give positions if the tool asks for it. Read the number of spots. Check that x_is_counts is 1.
2. Run filter_genes_by_spots. The harness asks for the minimum counts, the fraction of spots and the prefix of the genes to remove. Report the genes before and after.
3. Run normalize_expression with the target sum of the scientist.
4. Run build_spatial_graph. Use coord_type grid and 6 neighbors for Visium. The harness asks for both.
5. Run spatial_autocorr. Give report_genes for each gene that the scientist names. Read the I value and the rank of each.
6. Run plot_spatial for the top genes and for the named genes. Show the picture.
7. Report the graph, the gene filter, the number of genes tested and the I values. Call the p values descriptive.

Each tool saves a .h5ad checkpoint. A later step can start from a checkpoint path.
