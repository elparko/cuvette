---
name: neighborhood-enrichment
description: Step-by-step workflow to test which cell types or domains lie next to each other.
---

# Test which groups lie next to each other

Ask the scientist for each decision that the setup lists. Do not choose a value.

1. Run load_spatial. The cell table must have a column of cell types or domains. If it has none, run find_spatial_domains first.
2. Run build_spatial_graph. Use generic with a neighbor number for single cells. Use grid with 6 neighbors for Visium. The harness asks for both.
3. Run nhood_enrichment. The harness asks for the column and for n_perms.
4. Read the table and the heat map. Name the pairs with the highest and the lowest z scores.
5. Report the graph, the column, n_perms and the seed. A z score is not a p value between conditions.

Each tool saves a .h5ad checkpoint. A later step can start from a checkpoint path.
