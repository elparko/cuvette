---
name: choose-an-anova
description: How to pick between a factorial ANOVA, a repeated-measures ANOVA and a rank test, as in GraphPad Prism and SPSS.
---

Ask these questions in order.

1. How many factors does the question have? One factor goes to `anova_oneway`. Two or three factors go to `anova_factorial`.
2. Does each row come from a different subject? If the same subject gives more than one row, the rows are not independent.
   - A repeated condition in every subject goes to `anova_repeated`.
   - Many rows for each subject with other designs go to `fit_mixed_model`.
3. Do the residuals look normal, and do the groups have a similar spread? The Levene test p in the result is one clue.
   - If not, use `kruskal_dunn` for independent groups, or `friedman_test` for repeated conditions.
   - For two groups only, use `rank_test`.
4. For a factorial ANOVA, ask for the type of sums of squares. It matters only for an unbalanced design.
5. Ask which comparisons the scientist planned before the data. Run only those. Report the adjusted p values.

The matching menus in the programs that the scientist knows:

- Prism: Analyze > Grouped analyses > Two-way ANOVA. The design tab holds the repeated-measures choice. The Multiple Comparisons tab holds the post-hoc test.
- Prism, nonparametric: Analyze > Column analyses > One-way ANOVA, then "Non-parametric". Kruskal-Wallis with Dunn, or Friedman for repeated measures.
- SPSS: Analyze > General Linear Model > Univariate, or Repeated Measures.
- R: `aov`, `car::Anova`, `kruskal.test` with `FSA::dunnTest`, and `friedman.test`.

Report the F statistic with both degrees of freedom, the p value, the effect size and the number of subjects. For repeated measures, report the Mauchly test and say which correction you used.
