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

## Do not claim

- Do not report a concentration from a curve that the scientist did not approve.
- Do not remove a well as an outlier unless the scientist names it.
- Do not compare concentrations from plates with different curves without a plate control or a bridging sample.
