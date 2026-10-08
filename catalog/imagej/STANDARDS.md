# ImageJ reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools first. Use run_command or run_macro only if no named tool fits.
- Each tool opens its input file and saves a new file. Pass the path of the file that the last step saved.
- Never change an original image. All tools save copies in the work folder.

## Calibration and units

- Report sizes in real units only if the image has a scale. Check calibrated in the open_image result.
- If the image has no scale, report sizes in pixels. Ask the scientist for the pixel size or a scale bar.
- Write the unit with each size. Area is in square units.

## Unit of replication

- Cells or particles in one image are not independent samples. Do not compute a p-value from them.
- Count per image first. Compare images, or compare biological replicates (animals, patients, cultures).
- Report n for each group, the unit of that n, the test, the p-value and an effect size with a confidence interval.

## Threshold

- Report the threshold method and the setting for dark background.
- Check the count with at least two other methods. Report the range if the count changes by more than 20 percent.
- Use the same method and settings for all images that you compare.
- Look at the outline PNG. Say what you see: merged objects, missed objects, noise counted as objects.

## Background and noise

- If open_image warns that the background differs, run subtract_background. Use a radius larger than the largest object.
- Use a blur only to reduce noise. Report the sigma.
- Report the smallest object size that you counted and why.

## Image quality

- Do not use a saturated image for intensity measurements. Tell the scientist if more than 1 percent of the pixels are at the maximum.
- Do not use JPEG files for quantification. Ask for the original TIFF or PNG file.
- Exclude objects that touch the edge for size measurements. Say that you did.

## Report

- Give the count, the mean and median area, and the area fraction for each image.
- Give each number with the tool step that made it.
- State which conclusions hold for all threshold methods that you tried, and which depend on one method.
