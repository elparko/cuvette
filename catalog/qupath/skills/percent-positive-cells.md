---
name: percent-positive-cells
description: Procedure to find the percent of positive cells for a brown stain such as Ki-67 in one slide, and to show how it depends on the cutoff.
---

# Percent of positive cells in one slide

Ask the scientist for each decision that the setup lists. Do the steps in this order.

1. Run open_image with the file path. Read the width, the height, calibrated and the pixel size.
2. If calibrated is 0, ask for the pixel size. Run set_pixel_size with the answer. Use the state file that it saves.
3. Ask for the image type. A brown stain with blue nuclei is Brightfield (H-DAB). Run set_image_type.
4. Pick the region. A whole slide is large. Ask the scientist for a region (x,y,width,height in pixels), or run detect_tissue first.
5. Run detect_positive_cells on the state file. The score compartment, the cutoff and the cell settings are decisions.
6. Read n_cells, n_positive and positive_percent. Say how many cells you counted.
7. Call compare_options with the key positive_threshold. Report the percent for each value.
8. Run export_measurements if the scientist wants a table.
9. Run get_workflow_script and give the script to the scientist. The scientist can repeat the steps in QuPath.

Report the percent with the cell count, the cutoff, the score compartment and the region.
Do not give a p-value with cells as n.
