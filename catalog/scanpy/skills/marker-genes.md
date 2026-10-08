---
name: marker-genes
description: How to find marker genes for each cluster, name the test, and label cell types with evidence.
---

# Marker genes and cell types

1. Ask the scientist for the marker test. The default of scanpy is the t-test. The tutorial uses wilcoxon.
2. Run find_markers with the clusters from cluster_leiden. Read the top genes of each cluster.
3. Run plot_genes with kind dotplot, and with kind umap for the genes that you want to check.
4. Compare the top genes with known markers. For blood cells (PBMC):
   - IL7R, CCR7: CD4 T cells
   - CD8A, CD8B: CD8 T cells
   - GNLY, NKG7: NK cells
   - MS4A1, CD79A: B cells
   - CD14, LYZ: CD14 monocytes
   - FCGR3A, MS4A7: FCGR3A monocytes
   - FCER1A, CST3: dendritic cells
   - PPBP: megakaryocytes
5. Name a cluster only with this evidence. Write "putative" if one or two genes support the name.
6. Report the test name, the top genes, the log fold change and the adjusted p-value for each cluster.
7. The p-values are descriptive. The clusters come from the same cells that the test ranks.
