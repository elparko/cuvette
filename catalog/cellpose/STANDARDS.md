# Cellpose reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run inspect_image first. Read the warnings about JPEG files and saturated pixels.
- Use segment_cells for one image or a folder. Test the settings on one image before you run a folder.
- Every tool writes new files. It never changes an original image.

## Method

- Report the Cellpose version (4.2), the model name, the diameter, the flow threshold, the cell probability threshold and the smallest cell size.
- Say if the diameter is 0. Then the image is not resized.
- Look at the outline PNG. Say what you see: merged cells, split cells, missed cells, debris.
- The model and the thresholds can change the count. Report the range over the options that the scientist asked you to try.

## Units

- Report sizes in pixels unless the scientist gave the pixel size.
- Write the unit with each size. Area is in square units.

## Unit of replication

- Cells in one image are not independent samples. Do not compute a p-value from them.
- Count per image first. Compare images, or compare biological replicates.
- Report n for each group and the unit of that n.

## Scoring against hand-drawn masks

- Dice is a pixel overlap. State that it is not an object count.
- Report the F1 score at IoU 0.5 and the average F1 over IoU 0.5 to 0.95. Report the fraction of true cells that are missed at IoU 0.7.
- Report the truth count next to the found count. State which images were in the score.
- Cellpose models were trained on many public image sets. State that a public image set may not be a held-out test.
- A 16-bit mask holds one number for each cell. An 8-bit mask is split into connected cells.

## Report

- Give each number with the tool step that made it.
