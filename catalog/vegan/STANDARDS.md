# vegan reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run inspect_community first. Check the site names, the range of values and the empty sites.
- Do not choose the distance, the transformation, the model terms, the number of permutations or the strata alone. Ask the scientist.
- After run_permanova, run test_dispersion for the same grouping variable and distance.

## What to report

- Report the distance, the transformation, the model terms and how the terms were tested (terms or margin).
- Report the number of permutations, the seed and the strata. Say that the smallest possible p is 1 divided by permutations plus 1.
- Report R2, F, the degrees of freedom and p for each term. R2 is the share of the total distance that the term explains.
- Report the unit of replication and the number of sites in each group.
- For NMDS, report the distance, the number of dimensions, the number of random starts and the stress.
- For diversity, name the index. For Shannon, name the logarithm base.
- Name the vegan version.

## How to read the result

- PERMANOVA reacts to a difference in centre and to a difference in spread. A significant PERMANOVA with a significant dispersion test does not show a difference in centre.
- NMDS stress below 0.1 is good, below 0.2 is usable, and above 0.2 is a poor picture. Do not read distances from a plot with stress above 0.2.
- NMDS axes have no meaning and no order. Their sign and rotation are arbitrary.
- The p value changes a little with the seed. R2 and F do not change.
- Rarefaction needs whole-number counts of individuals. Cover classes and percent cover are not counts.
- Shannon and Simpson of cover classes describe the cover scale of the survey. Say so.

## Do not claim

- Do not say that a treatment causes a community change. The test shows a difference between groups.
- Do not treat repeat visits or subsamples of one site as independent sites.
- Do not say that groups differ in centre when the dispersion test is significant.
- Do not pick the number of NMDS dimensions or the distance after you look at the result.
