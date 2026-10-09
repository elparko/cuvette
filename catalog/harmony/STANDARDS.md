# Harmony integration standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the scanpy adapter for the steps before and after integration. Use this adapter for the merge, Harmony, LISI (local inverse Simpson index) and the labels.
- Pass the .h5ad checkpoint path from one adapter to the other. A handle works only inside one adapter.
- Do the steps in this order:
  1. merge_samples.
  2. Filter, normalize, find variable genes, scale and run_pca (scanpy).
  3. integrate_harmony and compute_lisi.
  4. build_neighbors with use_rep X_pca_harmony, then cluster.
- Do not call scanpy.external.pp.harmony_integrate in your own code. It fails with harmonypy 2.1.0. Use integrate_harmony.

## Design

- The scientist chooses the batch column. Do not choose it.
- Harmony removes differences between batches. Ask if the batches also differ by cell type or condition.
- If the batches are the conditions that the scientist compares, Harmony can remove the effect to find. Do not integrate over them.
- If a batch holds cell types that no other batch holds, check the cLISI of the cell types.
- Cells of one sample are not independent replicates. Integration does not change this. Count samples or donors as n for a comparison between conditions.

## Report

- Report the batch column, theta, the number of principal components and the random seed.
- Report the iLISI of the batch column before and after Harmony. Use the same number of components for both.
- Report the cLISI of a cell type column before and after. A cLISI above 1 after integration means that cell types mixed.
- State the maximum iLISI: it is the number of batches, and only if each batch holds the same cell types.
- Say that the corrected components change the neighbor graph and the clusters. They do not change the gene values.
- Do not state that the batch effect is "removed". State the LISI values.

## Limits

- Harmony needs at least 2 batches and at least 2 cells in each batch.
- A batch that holds a cell type that no other batch holds cannot mix for that cell type. Low iLISI for that cell type is correct.
