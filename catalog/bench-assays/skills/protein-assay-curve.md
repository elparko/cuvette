---
name: protein-assay-curve
description: Steps to fit a BCA, Bradford or Lowry standard curve, back-calculate samples and prepare an equal protein load.
---

# Protein assay standard curve

A protein assay measures the color that protein makes with a reagent. The color is proportional to the protein, over a limited range.
The standards (often bovine serum albumin) give the curve. The curve gives the protein in each sample.

1. Read the file. Find the columns for the sample name, the well type (standard, blank, sample), the standard concentration and the absorbance.
2. If the export is a plate grid, reshape it to one row for each well with the tables adapter.
3. Ask the scientist for the blank correction, the curve model and the unit of the standards.
4. Ask the scientist for the dilution factor of each sample and for the wells to exclude, with the reason. Do this before the fit.
5. Run protein_assay. Read R squared, the recovery of each standard and the flags.
6. Look at the plot. Check that the samples lie inside the shaded range of the standards.
7. For each flagged sample, tell the scientist the cause. Offer to dilute the sample and measure it again.
8. For an equal load, ask for the target micrograms and the final volume. Run protein_assay again with load_ug and final_volume_ul.
9. Report the assay, the model, the blank and the exclusions. Report each concentration after the dilution factor, with the CV and n of wells.

## Common mistakes

- A standard above the linear range of BCA. The BCA color is not linear over the full kit range. If the top standards bend, use a quadratic model or drop the top standards. Do not force a line through them.
- The wrong model. A Bradford curve bends. A straight line then gives wrong values at both ends.
- A sample outside the standards. A value from outside the range is an extrapolation. Dilute the sample and measure it again.
- A forgotten dilution factor. The tool gives conc_in_well and conc. Report conc.
- A blank that is not the buffer of the samples. The blank must have the same buffer as the samples and the standards.
- A line through zero that does not fit. A blank-subtracted line through zero is correct only if the intercept is close to zero. Look at the low standards.
- A detergent or reducing agent that the kit does not tolerate. The kit manual lists them. BCA does not tolerate reducing agents in high amounts. Bradford does not tolerate high detergent.
- A standard protein that differs from the sample protein. Albumin and the sample protein can give different color. The result is a value relative to the standard.

## Stop and ask

- The tool gives R squared below 0.99 for a linear model. Ask if the scientist wants another model or wants to remove a standard.
- A recovery of a standard differs by more than 20 percent from the nominal value.
- The tool flags more than half of the samples.
- The blank wells have an absorbance above the lowest standard.
- The quadratic curve turns inside the standard range. The tool warns. Do not report values from it.
