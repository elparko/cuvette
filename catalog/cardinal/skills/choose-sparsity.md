---
name: choose-sparsity
description: How to choose the sparsity (s) of a spatial shrunken centroids model and what to report.
---

# Choose the sparsity

- The sparsity s shrinks the segment centers. A higher s keeps fewer ions and merges segments.
- Fit s = 2, 4, 8, 16, 32, 64 in one segment_image call.
- The package workflow for the pig section gives 8, 8, 8, 8, 6 and 3 segments for these values.
  It reports s = 32, because s = 64 loses the heart segment.
- A lower AIC or BIC helps, but it does not replace a look at the maps.
- Run plot_segments for the models near the change in the number of segments.
- Ask the scientist which s to report. Record the choice and the reason.
- Report the number of segments for every fitted s. Say that the number depends on s, k and r.
