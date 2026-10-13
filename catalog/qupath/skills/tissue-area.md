---
name: tissue-area
description: Procedure to find the tissue on slides, skip empty glass, and report the tissue area in square millimeters.
---

# Tissue area on slides

1. For each slide, run open_image. Read calibrated.
2. If the slide has no pixel size, ask the scientist. Run set_pixel_size.
3. Run set_image_type. The harness sets the image type from the decision image_type. For H&E slides it is Brightfield (H&E).
4. Run detect_tissue. The harness sets the threshold from the decision tissue_threshold. The QuPath default of 127 can find no tissue on pale slides. Read n_annotations.
5. Call compare_options with the key tissue_threshold. Report tissue_area_mm2 for each value.
6. Look at tissue_fraction. Tell the scientist if the fraction is very small or near 1.
7. Report one row for each slide: slide, pixel size, threshold, tissue_area_mm2.

Use the same threshold on all slides that you compare.
The area depends on the pixel size. A wrong pixel size gives a wrong area.
