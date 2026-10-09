# drc reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- fit_standard_curve fits the standards and back-calculates the samples on one plate, or on each plate of a plate column.
- compare_models compares curve models on the same points. Use it before you choose 4PL or 5PL only if the scientist asks for a comparison.
- The input is one row for each well. If the plate reader export is a grid of 8 rows and 12 columns, reshape it to one row for each well first.

## What to report for a standard curve

- The model (4PL, 5PL in the Prism form, or 5PL in the SoftMax Pro form), the weighting and the blank correction.
- The number of standard wells and levels, R-squared, and the curve parameters.
- The LOD with the rule (blank mean plus k standard deviations) and the number of blank wells.
- LLOQ and ULOQ with the rule (the accepted bias and CV of the back-calculated standards).
- For each sample: the concentration times the dilution factor, the unit, the number of replicate wells and the CV.
- Each excluded well and the reason.
- The drc version.

## How to read the result

- conc is the sample concentration (the concentration in the well times the dilution factor). conc_in_well is the concentration in the well.
- A sample below LLOQ or above ULOQ is outside the quantifiable range. Report it as "below LLOQ" or "above ULOQ", or as the limit with a sign, not as an exact number. Ask the scientist which form to use.
- A signal beyond an asymptote of the curve has no concentration. Retest such a sample at a different dilution.
- R-squared near 1 does not show that the low standards fit. Read the recovery of each standard.
- The 5PL forms of SoftMax Pro (and Gen5) and of Prism are different equations. Name the form.

## What to report for a dose-response curve

- The model (4PL, 3PL with the bottom at 0, or 4PL-normalized), the response (raw or normalized, and to which controls).
- For each group: the IC50 or EC50 with the unit and the confidence interval, the interval method, the Hill slope, the top and the bottom.
- Say if an IC50 is relative or absolute. A relative IC50 is the midpoint of the fitted curve.
- Say if an IC50 lies outside the tested doses. It is then an extrapolation.
- For a comparison of groups: the F test, its degrees of freedom and p.

## What to report for enzyme kinetics

- Vmax and Km with units and confidence intervals, from the nonlinear fit. Ki for an inhibition model.
- The model, and the AICc of the other inhibition models when the scientist asks which model fits.
- A Lineweaver-Burk plot is a view. Do not take Km or Vmax from a straight line through 1/v against 1/S.

## What to report for plate quality

- For each plate: the mean, SD and number of the high and the low control wells, and Z'.
- The Z' formula (mean and SD, or median and MAD) and each excluded well.
- Z' of 0.5 or more is the usual limit for an excellent screening assay (Zhang et al. 1999). Name the limit that the lab uses.

## Do not claim

- Do not report a concentration from a curve that the scientist did not approve.
- Do not remove a well as an outlier unless the scientist names it.
- Do not compare concentrations from plates with different curves without a plate control or a bridging sample.
- Do not call two IC50 values different without the F test or the confidence intervals.
