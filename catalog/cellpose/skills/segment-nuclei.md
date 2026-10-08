---
name: segment-nuclei
description: Step-by-step workflow to find nuclei or cells in one image or a folder with Cellpose, and to check the result.
---

# Segment cells with Cellpose

1. Run inspect_image on the folder to see the file patterns. Then run it on one image. Read the bit depth, the value range and the warnings.
2. Run segment_cells on that one image with the settings that the scientist chose. The first run loads the model and takes about 30 seconds.
3. Look at the outline PNG. Say what you see: merged cells, split cells, missed cells, debris.
4. Run the sensitivity check for the diameter. Say if the count changes.
5. Run segment_cells on the folder with the same settings. Give a pattern such as "*.tif". Add only_listed_in to use a list of images.
6. Read the per-image table. Look for images with a count far from the others.
7. Report the count, the mean area, the model, the diameter and the thresholds.
8. For an experiment, group the per-image counts by condition before any statistics.

The manual route is the Python line in each step. The Cellpose window repeats the settings: python -m cellpose.
