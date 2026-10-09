# Bench image assay reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Before the measurement

- Run inspect_image first. Read the warnings about JPEG files, saturated pixels and 8-bit copies for viewing.
- Look at the QC overlay of the first image before you run a folder. The overlay shows what the tool counted and what it left out.
- Every tool writes new files. It never changes an original image.

## Method

- Report each threshold as the method name or the number, and the channel that it reads.
- Report the size limits, the roundness limit, the rim margin and the split setting for colonies.
- Report the cell mode, the cargo threshold and the positivity rule for uptake. Say what "positive" means in words.
- Report the threshold method, the mask or region, the thresholds found and the Costes p value for colocalization.
- Report the program: scikit-image with SciPy, through the image-assays adapter.

## Colocalization

- Pearson r measures correlation. Manders tM1 and tM2 measure the fraction of signal above the other channel's threshold. Do not use one in place of the other.
- Manders values without a threshold include background. Say so if you report them.
- A Costes p value near 1 means the observed correlation is above the scrambled images. Report the number of randomizations.
- Saturated pixels lower the correlation. Report the saturated fraction if it is above zero.

## Counts and units

- Give sizes in pixels unless the scientist gave the pixel size.
- Report the number of images and the count in each image, not only the total.
- If hand counts exist, report the mean difference and the mean absolute difference between the tool and the hand counts.

## Unit of replication

- Cells in one field are not independent samples. Fields of one well are not independent either.
- Count per image, then average per well or culture, then compare biological replicates.
- Report n for each group and say what n counts.
