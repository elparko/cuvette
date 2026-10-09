# Oreshkova 2024: queen mandibular pheromone, honey bee glands and lipid metabolism

## Citation
- Oreshkova A, Scofield S, Amdam GV. The effects of queen mandibular pheromone on nurse-aged honey bee (Apis mellifera) hypopharyngeal gland size and lipid metabolism. PLOS ONE 19(9):e0292500 (2024). DOI: 10.1371/journal.pone.0292500. License CC BY 4.0.
- Data: figshare 10.6084/m9.figshare.24164316 (abdominal metrics) and 10.6084/m9.figshare.24164265 (acini area), both CC BY 4.0.
- The authors' R script: figshare 10.6084/m9.figshare.24164343, CC BY 4.0.
- The numbers below come from Results sections 3.2, 3.3 and 3.4 of the full text.

## Data
- `qmp_pooled_data.csv`, 7.6 kB, 72 rows. One row for each pooled sample of two abdomens. Columns used: age (3 or 8), treatment (QMP + or QMP -), replicate (A, B or C), order (the four treatment groups A to D), fb_mg, fb_nadph, fas.
- `hpg_data.csv`, 2.2 kB, 72 rows. One row for each gland. Columns: Age, Treatment, Order, Gland, Number, Average, Replicate.
- Both files start with a byte order mark.
- The acini design is unbalanced: one cage gives 5 glands and another gives 7.
- Local path: /Volumes/T7/guided-analysis/data/oreshkova2024-qmp-honeybee/

## Tool
- statsmodels 0.15.0 `anova_lm` and SciPy `kruskal`, through `catalog/biostats` (`anova_factorial`, `kruskal_dunn`).
- Independent check: R 4.6.1 with `aov`, `car::Anova`, `kruskal.test` and `FSA::dunnTest` (`check_anova.R`, output in `check_anova.out`).

## Method steps
1. Three-way ANOVA of fb_mg by age, treatment and replicate, with every interaction, type I sums of squares.
2. The same model for the acini area (Average) by Age, Treatment and Replicate.
3. Kruskal-Wallis of fas by the four treatment groups (order), and by replicate.
4. Dunn comparisons with the Bonferroni correction.

## Numbers to reproduce
| Quantity | Paper | Computed |
|---|---|---|
| Abdominal protein, F age | 35.693 | 35.6928 |
| Abdominal protein, F treatment | 0.032, P 0.8596 | 0.0316, 0.8596 |
| Abdominal protein, F replicate | 36.000 | 35.9995 |
| Abdominal protein, F age x treatment | 1.057 | 1.0567 |
| Abdominal protein, F age x replicate | 2.809 | 2.8085 |
| Acini area, F age | 27.780 | 27.7799 |
| Acini area, F treatment | 29.156 | 29.1555 |
| Acini area, F replicate, P | 6.853, 0.00209 | 6.8530, 0.002087 |
| Acini area, F three-way, P | 4.457, 0.01568 | 4.4572, 0.015684 |
| Normalized FAS, Kruskal-Wallis over the 4 groups | 9.3498, df 3, P 0.02498 | the same |
| Normalized FAS, Kruskal-Wallis over the 3 replicates | 23.87, df 2 | 23.8701 |
| Dunn adjusted p, the one significant pair | 0.0397 | 0.03969 |

Every F statistic uses 1 or 2 and 60 degrees of freedom.

## The trap
The acini data are unbalanced. Type I sums of squares (R `aov`, the authors' choice) give F = 27.780 for age. Type III sums of squares, the default of SPSS, Prism and `car::Anova`, give 26.528. A run that keeps the SPSS default reaches the trap value.

## Numbers that do not reproduce
Section 3.2 prints "QMP treatment x replicate (F2,60 = 0.962, P = 0.29039)" for the abdominal fatty acid synthase activity. 0.9616 is the mean square of that term, not the F statistic. The F is 1.2624, and the printed p value matches 1.2624. This is a copy error in the paper, so the term is not a benchmark item.

Sections 3.1 and 3.5 (food consumption and the regressions of acini area on the abdominal measurements) are not in the benchmark. They need two more data files.

## Decisions the scientist owns
- The type of sums of squares. It changes the acini F values because the design is unbalanced.
- The replicate as a fixed factor in the model, not as a random effect.
- The rank test for the normalized activity, and the Bonferroni correction after it.
- Alpha 0.05.
