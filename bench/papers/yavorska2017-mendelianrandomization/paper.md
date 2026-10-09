# Yavorska 2017: MendelianRandomization, LDL cholesterol and coronary heart disease

## Citation
- Yavorska OO, Burgess S. MendelianRandomization: an R package for performing Mendelian randomization analyses using summarized data. International Journal of Epidemiology 46(6):1734-1739 (2017). DOI: 10.1093/ije/dyx034
- Package vignette (version 0.9.0, read 2026-10-09 at https://cran.r-project.org/web/packages/MendelianRandomization/vignettes/Vignette_MR.pdf). The numbers below come from the vignette, not from the paper text.
- Data source: Waterworth DM et al. Arterioscler Thromb Vasc Biol 30(11):2264-2276 (2010). DOI: 10.1161/atvbaha.109.201020

## Data
- R package MendelianRandomization 0.10.0, data sets ldlc, ldlcse, chdlodds, chdloddsse. GPL-2 or GPL-3. Published summary statistics of 28 variants. No data of persons.
- fetch.sh copies catalog/mendelianrandomization/data/ldl_chd.csv (made by make_fixtures.R) to the data folder and checks its SHA-256 sum.
- Local file: /Volumes/T7/guided-analysis/data/yavorska2017-mendelianrandomization/ldl_chd.csv

## Tool
- Original: R package MendelianRandomization, functions mr_input, mr_ivw, mr_egger, mr_median.
- Adapter route: mendelianrandomization adapter, tool estimate_causal_effect with methods ivw, egger and weighted_median.

## Sample design
28 variants, summary statistics from published meta-analyses of lipid levels and coronary heart disease. The variants are treated as independent. The effects are aligned to the same effect allele. The outcome effect is a log odds ratio.

## Method steps
1. Read the variant table. Confirm the alignment of the alleles (decision).
2. Inverse-variance weighted estimate, random-effects model for more than three variants. The weights are the first-order weights byse/bx.
3. Cochran's Q on 27 degrees of freedom, I-squared and the F statistic.
4. MR-Egger regression with the intercept.
5. Weighted median with a bootstrap standard error.

## Numbers to reproduce
| Quantity | Vignette 0.9.0 | check.py (no package) |
|---|---|---|
| Variants | 28 | 28 |
| Inverse-variance weighted estimate | 2.834 | 2.8342 |
| Standard error | 0.530 | 0.5298 |
| 95% interval | 1.796 to 3.873 | not computed |
| Cochran's Q (27 df) | 99.5304 | 99.5304 |
| I-squared | 72.9% | 72.9% |
| F statistic | 28.0 | 28.0 |
| MR-Egger estimate | 3.253 | 3.2529 |
| MR-Egger intercept | -0.011 | -0.0115 |
| p value of the intercept | 0.451 | not computed |
| Weighted median estimate | 2.683 | 2.6829 |

The mode estimate (2.946, standard error 1.005 in the vignette, 1.004 here) and the maximum likelihood estimate (3.225) are also in the vignette. They are not benchmark items.
