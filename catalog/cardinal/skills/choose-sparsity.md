---
name: choose-sparsity
description: How to choose the sparsity (s) of a spatial shrunken centroids model and what to report.
---

# Choose the sparsity

- The sparsity s shrinks the segment centers. A higher s keeps fewer ions and merges segments.
- Fit s = 2, 4, 8, 16, 32, 64 in one segment_image call.
- The number of segments usually stays the same for low s and falls at high s.
  Choose the highest s that keeps the tissue regions that you expect.
- A lower AIC or BIC helps, but it does not replace a look at the maps.
- Run plot_segments for the models near the change in the number of segments.
- Ask the scientist which s to report. Record the choice and the reason.
- Report the number of segments for every fitted s. Say that the number depends on s, k and r.
