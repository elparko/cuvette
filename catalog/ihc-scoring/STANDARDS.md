# IHC scoring reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Before the score

- Run inspect_cell_table on a table. Read the compartments, the position columns and the groups.
- Look at the QC overlay of an image before you score a set of images. The overlay shows which nuclei the tool counted.
- This adapter scores cells that a detector found. For a whole slide image, use QuPath to find the cells and give its export to the scoring tools.

## Method

- Report the stain compartment, the three intensity thresholds, the stain vectors and the region that the tool scored.
- Say that the thresholds are in DAB optical density (no unit). A threshold from one stain, antibody or scanner does not carry to another.
- Report the number of cells behind each score. Flag a group with fewer cells than the minimum.
- For the H-score, write the formula. It is 1 x percent of 1+ cells, plus 2 x percent of 2+ cells, plus 3 x percent of 3+ cells.
- The range of the H-score is 0 to 300.
- For the Allred score, give the proportion score, the intensity score, the intensity rule and the total. A total of 3 or more counts as positive in the hormone receptor guideline.
- For Ki-67, say if the index is global or from a hot spot. Give the window size and the cells in the window for a hot spot.
- Report the program: scikit-image color deconvolution with pandas, through the ihc-scoring adapter.

## Agreement of two scorers

- A correlation does not show agreement. Two scorers can correlate and differ by a large bias.
- Give the weighted kappa and its weights.
- Give the intraclass correlation and its form.
- Give the mean difference and the limits of agreement.
- Say which scorer is the reference. Say if the cut points for the kappa came from the scientist.
- A kappa or an ICC from few cases has a wide interval. Report the interval and the number of cases.

## Unit of replication

- Cells in one slide are not independent samples.
- Score each slide or core. Compare slides, cores, patients or animals.
- Report n for each group and say what n counts.

## Limits

- A hot spot index is higher than a global index. Do not compare the two.
- A cell table from another detector gives other scores. Say which detector made the table.
- Scores from JPEG images are not reliable. JPEG compression changes the color values.
