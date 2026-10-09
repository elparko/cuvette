---
name: count-uptake
description: How to count all cells and the cells with cargo (phagocytosis, efferocytosis, bead or particle uptake), and compare with hand counts.
---

1. Run inspect_image on one image. Write down the channel numbers: nuclear stain, cell stain or brightfield, cargo.
2. Choose the cell mode with the scientist:
   - expand: a nuclear stain only. Cells are the nuclei grown by cell_expand pixels.
   - membrane: a nuclear stain and a membrane or cytoplasm stain.
   - texture: brightfield or phase without a nuclear stain. The tool reads the local texture of the cells.
   - labels: a label image from another program, such as the Cellpose segment_cells tool.
3. Run count_cell_uptake on one image. Open the QC overlay.
4. Check that each cell has one outline. Check that the tool leaves out cargo outside cells. Check that the positive cells look positive.
5. If cargo outside cells sits on top of cells (not engulfed), say so. A 2D image cannot tell bound cargo from engulfed cargo. Quenching or pH-sensitive dyes can.
6. Run the folder. If the scientist has hand counts, give a CSV file with columns image, total, positive as hand_counts. Report the mean difference and the mean absolute difference for all cells and for positive cells.
7. Report the fraction of positive cells for each image, then for each well or culture. Compare biological replicates, not cells.

Efferocytosis example, brightfield plus a red apoptotic-cell channel:

- cell_mode texture, cell_channel the brightfield channel;
- cargo_channel the red channel;
- positivity_rule area, with the smallest red area that the scientist calls one engulfed cell.
