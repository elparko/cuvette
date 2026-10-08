---
name: follow-in-fiji-or-napari
description: How to repeat a scikit-image step by hand in Fiji or napari, and how to compare the numbers.
---

# Repeat a step by hand

Each result shows the Python line. Run the line in a Python shell to get the same numbers.

## In Fiji

1. Open the image with File > Open...
2. Run Image > Adjust > Threshold... Choose the method. Click Auto. Close the window. Run Process > Binary > Convert to Mask.
3. Run Analyze > Analyze Particles... Set Size to the smallest object size. Tick Exclude on edges if the step did.
4. Compare the count. The Fiji method Default is close to isodata. The two can differ by one gray level.

## In napari

1. Open the image with File > Open File(s)...
2. Use the napari-assistant plugin: Tools > Segmentation / binarization, then Tools > Segmentation post-processing.
3. Compare the count with the agent.

A palette image such as a GIF has raw index values. The tool reads these values, as ImageJ does.
