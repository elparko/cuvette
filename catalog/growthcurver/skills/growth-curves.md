---
name: growth-curves
description: Steps to fit growth curves on a plate and compare strains with a reference strain.
---

# Growth curves

1. Read the plate file. Find the time column, its unit and the well columns.
2. If the file has one row for each reading, give well_col and value_col.
3. Ask the scientist for the background correction, the blank wells, t_trim and the wells to exclude.
4. Run fit_growth_curves. Read r, the doubling time, k and the notes of each well.
5. Look at the plot. Check that each curve reaches a plateau and that the fit follows the readings.
6. Set lag to true only if the scientist asks for the lag time.
7. For a comparison, find or make a design file: the column well and one column for each factor.
8. Ask the scientist for the reference group and the rule: reference mean or same block.
9. Run compare_growth with the results_file of fit_growth_curves.
10. Report the settings, the n of each group, the mean, the 95% interval and the p value.
