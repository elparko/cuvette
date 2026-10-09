Report each enrichment result so that another lab can repeat it.

- Name the gene set collection, its version or download date, the species and the ID type.
- For over-representation, give the rule that made the gene list: the cutoffs and the direction.
- Also give the number of genes on the list, the background and its size.
- Give the gene set size limits and the correction (Benjamini-Hochberg).
- The background must be the measured genes. A background of all genes in the gene sets gives p values that are too small.
- For each pathway, give the overlap: the genes on the list in the set, out of the set size.
- Also give the p value and the adjusted p value for each pathway.
- For preranked GSEA, give the ranking metric and the number of ranked genes.
- Also give the number of permutations, the seed, the weight and the size limits.
- Give ES, NES, the nominal p, the FDR q and the leading edge size.
- A permutation p value is never 0. Report it as below 1 divided by the number of permutations.
- The GSEA convention calls an FDR q below 0.25 a candidate. It is not the same as a 5% error rate. Say which threshold you use.
- Enrichment does not show that a pathway is active or inhibited, or that it causes the effect. Do not claim this.
- Many gene sets overlap. Several top terms can come from the same genes. Say so when the leading edges overlap.
- IPA upstream-regulator and activation z-scores use a closed knowledge base. This adapter cannot give them.
