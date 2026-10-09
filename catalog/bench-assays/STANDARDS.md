# bench-assays reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## What one row is

- Say what one row of the table is (a well, a lane, a count, a sample) and what n counts.
- n is the number of biological replicates. Lanes, wells and repeated counts of one sample are technical replicates.
- The tools do not test hypotheses. Use compare_two_groups or anova_oneway of the biostats adapter on the units table that ratio_normalize saves.

## Protein assay

- Name the assay, the curve model, the blank correction and the number of standard levels and wells.
- Report R squared and the recovery of each standard. R squared near 1 does not show that the low standards fit.
- Report each concentration after the dilution factor, with the unit, n of wells and the CV.
- A sample below the lowest or above the highest standard has no reliable value. Report it as "below range" or "above range". Dilute it and measure it again.
- Do not extrapolate a curve. A quadratic or 4PL curve can give a wrong value outside the standards.

## Blot and reporter ratios

- Name the target, the reference (loading control or Renilla) and the background step.
- Name the control group. Say if the control mean uses all blots or plates, or each blot or plate.
- Report the mean, SD and n of each group. Say that SD is the sample SD.
- A saturated band or well has no valid ratio. Image the blot again or measure the plate again.
- A loading control is valid only in its linear range. Say how the scientist checked it.

## Cell counts

- Say the dilution factor, the number of large squares and the chamber factor (10000 for a Neubauer large square).
- Say the number of cells that you counted. Fewer than 100 cells give a large sampling error.
- Report viability with the way that the scientist counted dead cells (trypan blue stain).
- A counter export can already include the dilution factor. Ask before you multiply.

## Nucleic acid QC

- Name the type (dsDNA, RNA, ssDNA), the factor, the path length and the baseline correction.
- The ratio ranges are rules of thumb: about 1.8 for DNA, about 2.0 for RNA, and 2.0 to 2.2 for A260/A230.
- A260/A280 does not detect protein well. Do not call a sample pure from the ratios.
- Ratios from an A260 below 0.1 (10 mm equivalent) are not reliable.

## Do not claim

- Do not give a concentration from a curve that the scientist did not approve.
- Do not remove a well, a lane or a count unless the scientist names it and gives the reason.
- Do not give a p-value from lanes or wells as n.
- Do not use a ratio of saturated signals.
