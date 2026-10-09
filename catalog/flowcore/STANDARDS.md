# flowCore reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- compute_spillover makes the spillover matrix from single-stain controls and an unstained control.
- population_stats gives the percent positive and the median fluorescence intensity (MFI) of each sample.
- compare_groups compares the percent or the MFI between groups of samples.

## What to report

- The parent gate and its limits. Say how many events the parent gate holds.
- The cutoff of each marker and its scale (raw, asinh with the cofactor, or log10).
- The source of each cutoff: a control sample and a percentile, or a fixed value.
- The compensation: none, the file header, or a matrix file. Name the controls if you made the matrix.
- For each sample: the percent of the parent, the count, and the MFI of the positive events.
- For a comparison: the test, what one sample is, n of each group, the mean, the SD, the p value and the correction.
- The flowCore version.

## How to read the result

- A spillover coefficient is the share of the signal of one fluorochrome that appears in another channel. The diagonal is 1.
- A coefficient above 1 means that two controls have the same primary channel or that a control is not clean.
- Spillover from log-amplified channel numbers is wrong. Set the decades so that the tool converts them to linear values.
- A percent of the parent from fewer than 1000 events is not stable.
- MFI of all events mixes the positive and the negative population. Report the MFI of the positive events if you compare expression.

## Do not claim

- Do not compare percents from samples with different cutoffs.
- Do not give a p value from tubes of one donor as if each tube was a donor.
- Do not call a population absent because the percent is below the false positive rate of the control.
