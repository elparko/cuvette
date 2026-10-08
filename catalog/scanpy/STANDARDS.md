# Scanpy reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool does one scanpy step and returns a handle.
- Pass the handle of the last step to the next step. If a handle is lost, pass the .h5ad path of the checkpoint.
- Each step saves a checkpoint .h5ad file. Name the file of the final step in the report.
- Do the steps in this order: load, filter genes, QC, filter cells (genes first, then cells), normalize, variable genes, scale, PCA, neighbors, UMAP, Leiden, markers.

## Quality control

- The scientist chooses the cutoffs. Do not choose them. Show the QC violin plot and the quantile table, then call filter_cells. The harness asks for each value.
- Do not ask for decision values in your own words. Do not suggest values in a question.
- Report min genes per cell, max genes per cell, max percent mitochondrial counts and min cells per gene.
- Report the number of cells and genes before and after each filter.
- The cutoffs depend on the tissue and the chemistry. Do not copy them from another data set without saying so.

## Clusters

- Report the Leiden resolution, the number of neighbors, the number of principal components and the random seed with every cluster count.
- The number of clusters changes with the resolution. Show the sensitivity table before you state a count.
- Before you name a cell type, read the skill marker-genes. It lists the canonical blood markers.
- Name a cluster by cell type only with marker genes as evidence. Write "putative" if the evidence is one or two genes.

## Marker genes

- Report the test (t-test, t-test_overestim_var, wilcoxon or logreg). The tool default is the t-test.
- Report log fold change with each p-value. Use adjusted p-values.
- Clusters come from the same cells that the test uses. Call these p-values descriptive. Do not call a marker "significant" as a test result.

## Replication

- Cells from one sample are not independent replicates. Do not compute a p-value between conditions with cells as n.
- For a comparison between conditions, sum or average the counts of each sample first. Count samples as n.
- Say how many samples and donors the data hold.

## Report

- Give each number with the tool step that made it.
- Say which results hold at every resolution that you tried, and which depend on one setting.
