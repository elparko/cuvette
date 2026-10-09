# Argelaguet 2018: MOFA on chronic lymphocytic leukemia

## Citation
- Argelaguet R, Velten B, Arnol D, Dietrich S, Zenz T, Marioni JC, Buettner F, Huber W, Stegle O. Multi-Omics Factor Analysis: a framework for unsupervised integration of multi-omics data sets. Molecular Systems Biology 14(6): e8124 (2018). DOI: 10.15252/msb.20178124. CC BY 4.0.
- Data: Bioconductor package MOFAdata (LGPL-3), from Dietrich et al. 2018 (DOI 10.1172/JCI93801). I read the full text on PubMed Central (PMC6010767).

## Data
- 200 patients and four views: drugs (310 features), methylation (4248), mRNA (5000) and mutations (69, with IGHV and trisomy12). The tables have features in rows and patients in columns, with missing values (8% in drugs, 2% in methylation, 32% in mRNA, 34% in mutations).
- The IGHV status and trisomy 12 are rows of the mutation view.

## Tool
- mofa adapter: run_mofa, associate_factors and top_features. The engine is mofapy2.
- Independent check: `catalog/mofa/checks/check_mofa.py` recomputes the variance explained of drugs and mRNA from the saved factors and weights, and the correlations with IGHV and trisomy 12 (`check_mofa.out`).

## Method steps
1. Train MOFA with up to 15 factors, a Bernoulli likelihood for the mutation view and gaussian likelihoods for the others.
2. Drop the factors that explain less than 2% of the variance in every view.
3. Sum the variance explained by all factors in each view.
4. Correlate the factors with the IGHV and trisomy 12 rows.

## Numbers to reproduce
| Quantity | Paper | Computed (MOFA+, seed 1) |
|---|---|---|
| Factors | 10 | 10 |
| Variance explained, drugs | 41% | 37.9% |
| Variance explained, mRNA | 38% | 38.1% |
| Variance explained, methylation | 24% | 25.4% |
| Variance explained, mutations | 24% | 28.4% |
| Factor for IGHV | Factor 1 | Factor 1 (r 0.860) |
| Factor for trisomy 12 | Factor 2 | Factor 2 (r 0.778) |

## Numbers that do not reproduce
- The variance explained does not match to the digit. The paper used the original MOFA with the best of 25 random starts. The benchmark uses MOFA+ with one start. Seed 2 gives 34.9, 38.2, 25.7 and 28.7. The tolerances (7, 3, 3 and 6 points) are these differences.
