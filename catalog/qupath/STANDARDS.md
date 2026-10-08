# QuPath reporting standards

Follow these rules in each answer. The review checks look for the same errors.

- Name the image type (H&E, H-DAB, fluorescence) and the stain vectors (default or estimated). A wrong type gives wrong stain values.
- Report the pixel size and say where it came from. If the file has none, ask the scientist. Do not report micrometers or square millimeters without it.
- Report the detection settings: detection image, requested pixel size, background radius, sigma, threshold, cell expansion, smallest and largest area.
- Report the region that you analyzed. Say if it was the whole image, the tissue annotation or a drawn region.
- For a positive fraction, report the score compartment, the cutoff, the number of cells and the number of positive cells.
- Show how the positive fraction moves when the cutoff moves. Give the fraction at two other cutoffs.
- Cells in one slide are not independent. Do not give a p-value or a confidence interval with cells as n. The unit is the slide, the patient or the animal.
- For an H-score, say that it is 1 x weak + 2 x moderate + 3 x strong, as percents of all cells. Give the three cutoffs.
- A cell count depends on the detection settings. Do not call it a true count. Say that it is the count at these settings.
- Cells can include debris, folds and cells on glass. Say if the region excluded them.
- Say that the numbers come from the tool steps, and give the step for each number.
