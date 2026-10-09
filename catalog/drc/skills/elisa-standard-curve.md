---
name: elisa-standard-curve
description: Steps to fit an ELISA standard curve, back-calculate the samples and report the limits.
---

# ELISA standard curve

1. Read the plate file. Find the columns for the well, the well type and the standard concentration.
   Then find the columns for the signal, the sample name and the dilution factor.
2. If the export is a plate grid, reshape it to one row for each well. Keep the well names.
3. Ask the scientist for the curve model (4PL or 5PL, and which 5PL form), the weighting and the blank correction.
4. Ask the scientist which wells to exclude, and why. Do this before the fit.
5. Run fit_standard_curve. Read R-squared, the parameters, the recovery of each standard, LOD, LLOQ and ULOQ.
6. Look at the plot. Check that the samples lie on the curve and inside the range.
7. Read the samples table. For each sample, report conc (times the dilution factor), the CV and the flag.
8. For each flagged sample, tell the scientist the cause: below LLOQ, above ULOQ, beyond an asymptote, or a high CV.
9. If the scientist asks whether 5PL is better than 4PL, run compare_models with both models on the same standards.
10. Report the model, the weighting, the blank, the limits with their rules, the excluded wells and the drc version.
