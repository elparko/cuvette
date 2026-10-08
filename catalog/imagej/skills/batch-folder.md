---
name: batch-folder
description: How to run the same count on all images in a folder and check the result.
---

# Count all images in a folder

1. Run open_image on one image from the folder. Check the scale, the bit depth and the warnings.
2. Run threshold_and_count on that image with the settings that you plan to use. Look at the outline PNG.
3. Check the threshold method with the sensitivity table before you run the folder.
4. Run count_folder with the same settings. Use a pattern such as *.tif.
5. Read the per-image table. Look for images with a count far from the others. Open those with open_image.
6. Report n_images, the total count, the mean count for each image and the spread.
7. The record shows one step: "Repeat steps for images 1 to N". The scientist repeats the steps by hand for each image, or runs Process > Batch > Macro... with the macro text.
8. Group the per-image counts by condition before any statistics. See compare-conditions.
