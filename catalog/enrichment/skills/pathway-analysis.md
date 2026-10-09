---
name: pathway-analysis
description: How to do the pathway step after differential expression, in place of Ingenuity Pathway Analysis.
---

1. Ask for the full results table of the differential expression, with all measured genes. A table of only the significant genes cannot give a background or a ranking.
2. Run `inspect_gene_table` with the GMT file. Check the ID type and the share of IDs that are in the gene sets. If few match, the ID type or the species differs. Convert the IDs before you go on.
3. Ask the scientist which test answers the question:
   - Over-representation (`run_ora`): "Which pathways are over-represented among my significant genes?" It needs a cutoff and a background.
   - Preranked GSEA (`run_gsea_prerank`): "Which pathways move together at the top or bottom of the ranking?" It uses all genes and no cutoff.
4. For `run_ora`, the scientist chooses the background. Run the sensitivity check of the background if the scientist is not sure.
5. For `run_gsea_prerank`, the scientist chooses the ranking metric. The DESeq2 `stat` column or the limma `t` column is a usual choice.
6. Report the numbers listed in the standards. Name the pathways as tests of gene sets, not as proof of pathway activity.

In IPA, the nearest step is Core Analysis > Canonical Pathways. IPA uses its own pathway database, so the pathway names and the counts differ.
