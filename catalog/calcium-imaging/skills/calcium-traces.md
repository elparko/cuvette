---
name: calcium-traces
description: How to go from fluorescence traces or a TIFF stack to dF/F, events, responsive cells and a group comparison.
---

1. Run inspect_recording on the traces file, the Suite2p folder or the stack. Write down the number of cells, the frame rate and the warnings.
2. If you have a TIFF stack with hand ROIs, run extract_traces. Give the ImageJ ROI file. Ask the scientist for the ring size of the neuropil.
3. If the stack needs motion correction and cell detection, ask the scientist to allow Suite2p. Run run_suite2p. If Suite2p is missing, stop and tell the scientist. Do not install it.
4. Ask the scientist for the baseline method, the window, the percentile and the neuropil coefficient. Run compute_dff. Look at the heatmap.
5. Ask for the event method, the threshold and the decay time constant. Run detect_events. Look at the raster.
6. For a stimulus, ask for the onset times, the two windows and the z criterion. Run find_responsive_cells.
7. Run correlate_cells if the scientist asks about shared activity.
8. Build a table with one row for each cell, a group column and an animal column. Run compare_groups. For a mixed model, hand the table to the lme4 adapter.

CaImAn is a heavier tool for cell detection and deconvolution. This adapter does not run it.
