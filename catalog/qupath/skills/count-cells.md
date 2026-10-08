---
name: count-cells
description: Procedure to count cells in one image or in a region, and to report the cell density.
---

# Count cells

1. Run open_image. Read the size and the pixel size.
2. If the pixel size is missing, ask the scientist. Run set_pixel_size.
3. Run set_image_type. H&E and H-DAB use the hematoxylin channel to find nuclei.
4. Choose the region with the scientist. Use detect_tissue to skip empty glass, or give a region.
5. Run detect_cells. The detection settings and the threshold are decisions.
6. Read n_cells, mean_cell_area_um2 and cells_per_mm2.
7. Run detect_cells again with two other values of threshold. Report the range of n_cells.
8. To show how the cells are spread, run create_tiles on the tissue annotation. Then run export_measurements for Annotations or Detections.
9. Say that the count is the count at these settings.

The count depends on the threshold, sigma and the nucleus size limits. Do not call it a true count.
