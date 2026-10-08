---
name: choose-qc-cutoffs
description: How to look at QC plots and ask the scientist for cell and gene cutoffs.
---

# Choose quality control cutoffs

The cutoffs belong to the scientist. Help the scientist to see the data.

1. Run calculate_qc on raw counts. Open qc_violin.png. Read the table: min, median, 95th percentile and max of genes per cell, counts per cell and percent mitochondrial counts.
2. Minimum genes per cell: look for the low tail. Cells in the tail are empty droplets or debris.
3. Maximum genes per cell: look for the high tail. Cells in the tail may be doublets.
4. Maximum percent mitochondrial counts: look for a group of cells with a high share. Dying cells have a high share. Some tissues, such as heart, have a high normal share.
5. Give the scientist the number of cells that each cutoff would remove. Use filter_cells on a copy of the handle to find it. The tool never changes the input handle.
6. Call filter_cells. The harness asks for the three cutoffs and records them. Do not change them to get a round cell count.
7. Mouse data use the prefix mt- in calculate_qc and filter_cells. Human data use MT-.
