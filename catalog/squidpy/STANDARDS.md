# Squidpy reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool does one Squidpy or scanpy step and returns a handle.
- Pass the handle of the last step to the next step. If you lose a handle, pass the .h5ad path of the checkpoint.
- Do the steps in this order:
  1. load_spatial.
  2. filter_genes_by_spots on raw counts.
  3. normalize_expression.
  4. build_spatial_graph.
  5. spatial_autocorr, nhood_enrichment or find_spatial_domains.

## Data and filters

- The scientist chooses the gene filter. Do not choose it. The harness asks for the minimum counts, the fraction of spots and the prefix of the genes to remove.
- Report the number of spots and genes before and after each filter.
- Say if you removed the mitochondrial genes. A rank of spatially variable genes changes if they stay.

## Spatial graph

- The scientist chooses the graph. Use grid with 6 neighbors for Visium, unless the scientist chooses another graph.
- Report coord_type, the number of neighbors or the radius, and the number of spots with fewer neighbors.
- A statistic of one graph does not hold for another graph. Say which graph you used.

## Spatially variable genes

- Moran's I is the correlation of a gene between neighboring spots. A value near 1 means that neighbors are alike. A value near 0 means no pattern.
- Report the I value with the rank of each gene that you name. Say how many genes you tested.
- The p values assume independent spots. Neighboring spots are not independent. Call the p values descriptive.
- Do not call a gene a marker of a domain from Moran's I. Use find_markers of the scanpy adapter for markers.

## Neighborhood enrichment

- A positive z score means that two groups lie next to each other more than by chance. A negative score means that they are apart.
- Report n_perms and the seed. Report the groups that you compared and the column that holds them.
- The z score depends on the number of cells in each group. A large group gives a large score. Do not compare scores of different data sets.

## Spatial domains

- The number of domains changes with the resolution and with the spatial weight. Report both with the seed.
- A domain is a cluster. Name a domain only with a known marker gene or with an annotation, and write "putative" otherwise.
- Use compare_to only with labels that the scientist trusts. A low adjusted Rand index does not show that the domains are wrong.

## Replication

- Spots of one section are not independent replicates. Do not compute a p value between conditions with spots as n.
- Count sections, donors or animals as n. Say how many sections the data hold.
