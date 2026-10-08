---
name: compare-groups-of-sites
description: Steps to test if groups of sites differ in species composition with PERMANOVA, and to check the spread.
---

# Compare groups of sites

1. Run inspect_community with the site table. Read the columns and their levels.
2. Ask the scientist for the unit of replication. One row must be one independent site.
3. Ask the scientist for the distance and the transformation.
4. Ask the scientist for the model terms, the way to test them (terms or margin), and the strata.
5. Ask the scientist for the number of permutations. The seed comes from the decision record.
6. Run run_permanova. Read R2, F and p for each term.
7. Run test_dispersion for the same grouping variable, distance and transformation.
8. Run run_nmds with color_by set to the grouping variable. Give the plot and the stress.
9. Report the settings, the statistics and the dispersion result. Say if a dispersion difference limits the conclusion.
10. Offer to run the test again with another distance or more permutations. Show how R2 and p change.
