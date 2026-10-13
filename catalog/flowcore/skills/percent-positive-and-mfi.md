---
name: percent-positive-and-mfi
description: Steps to make a spillover matrix, count positive cells and compare groups of FCS samples.
---

# Percent positive and MFI

1. List the FCS files. Find the channels, the markers, and whether the values are linear or log-amplified.
2. If single-stain controls exist, run compute_spillover. Ask the scientist for the positive cutoff and the scatter gate.
3. Ask the scientist for the parent gate, the transform, and the cutoff of each marker. Name the control that sets each cutoff.
4. Run population_stats. If you made a matrix file, give it as comp_file. The decision compensation must be file for the tool to use it: if it is not, call propose_change with the key compensation.
5. Check the count of events in the parent gate. Look at the plot.
6. For groups, make a design file with the columns sample and group. Run compare_groups.
7. Report the settings, the cutoffs, the counts and the percents. Add the MFI of the positive events, n of each group and the p values.
