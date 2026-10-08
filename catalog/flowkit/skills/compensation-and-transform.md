---
name: compensation-and-transform
description: How to show the effect of a compensation matrix and a transform, and how to count events in a hand drawn rectangle gate.
---

# Compensation, transform and a hand gate

The scientist owns the matrix, the transform and the limits.

1. Run inspect_fcs. Note the fluorescence channel names and whether the file has a spill matrix.
2. Run apply_compensation. Read the table. Report the number of negative values before and after, and the channel with the largest change.
3. Run transform_channels. Look at the histograms. Report the range after the transform. Values above 1 mean that T is below the data maximum.
4. The rectangle limits are in the units after compensation and transform. Ask the scientist for the limits after the scientist has seen the histograms.
5. Run count_rectangle. Report the channels, the limits, the compensation, the transform with T, W, M and A, the count and the percent of all events.
6. Run count_rectangle again with compensation none if the answer depends on the matrix. Report both counts.

Compensation is applied before the transform. A change of T, W, M or A moves the same events to other positions, so old limits no longer fit.
