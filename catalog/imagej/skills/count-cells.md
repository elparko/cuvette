---
name: count-cells
description: Step-by-step workflow to count objects such as nuclei or cells in one image and measure their size.
---

# Count and measure objects in one image

Use these steps for one image. Ask the scientist for each decision that the setup lists.

1. Run open_image with the file path. Read the warnings.
   - No scale: ask for the pixel size. If the scientist gives it, run set_scale.
   - Saturated or JPEG: tell the scientist before you go on.
   - Uneven background: plan to run subtract_background.
2. Look at the preview PNG. Decide if the objects are bright on a dark background. If they are, use dark_background = true.
3. If the background is uneven, run subtract_background. Use a radius larger than the largest object. Use the next step with the new file.
4. If the image is noisy, run gaussian_blur with sigma 1 to 2.
5. Run threshold. The threshold method is the scientist's decision. Wait for the answer if it is open.
6. Look at the mask preview. If objects touch and merge, run watershed.
7. Run analyze_particles with the mask. The harness sets exclude_edges from the decision. For size measurements, objects on the edge must be excluded. If the decision keeps them, say so to the scientist.
8. Look at the outline PNG. Report merged objects, missed objects and noise.
9. Report count, mean area, median area and area fraction with the unit.

To compare settings, use threshold_and_count. It does steps 3 to 7 in one call.
