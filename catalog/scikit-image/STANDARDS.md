# scikit-image reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run inspect_image first. Read the warnings about JPEG files and saturated pixels.
- Use count_objects for a count. Use threshold_image and label_objects only to look at a step.
- Every tool writes new files. It never changes an original image.

## Method

- Report the channel, the threshold method, the polarity (bright or dark), the smallest object size, and the border and watershed settings.
- Report the library version: scikit-image 0.26.
- The threshold method can change the count. Run the main methods and report the range.
- A size filter removes pixel groups that touch by their sides. Report the filter value.

## Units

- Report sizes in pixels unless the scientist gave the pixel size.
- Write the unit with each size. Area is in square units.

## Unit of replication

- Objects in one image are not independent samples. Do not compute a p-value from them.
- Count per image first. Compare images, or compare biological replicates.
- Report n for each group and the unit of that n.

## Scoring against hand-drawn masks

- Dice is a pixel overlap. State that it is not an object count.
- State which mask files you used as truth. State if vague or ambiguous areas were in the score.
- Report the truth object count next to the found object count.
- A 16-bit mask holds one number for each object. An 8-bit mask is split into connected objects.

## Report

- Give each number with the tool step that made it.
- Say which conclusions hold for all threshold methods that you tried, and which depend on one method.
