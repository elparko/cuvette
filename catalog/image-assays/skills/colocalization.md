---
name: colocalization
description: How to measure and report colocalization of two fluorescence channels with Pearson, Manders and Costes.
---

1. Run inspect_image. Note the bit depth and the saturated fraction of each channel.
2. Ask for the region: the whole image, one cell, or a mask that leaves out background. A mask changes all values.
3. Run measure_colocalization with the Costes or Bisection threshold and the Costes test.
4. Read the scatter plot. A diagonal cloud means correlation. Two arms along the axes mean separate signals.
5. Report Pearson r, tM1 and tM2 with the thresholds, the Costes p value with the randomizations, and the region.
6. Do not report Manders values above zero as the result when there is background. Use the thresholded values.
7. One cell or one field is not a replicate. Measure several cells, average per culture, and compare cultures.

The Fiji route is Analyze > Colocalization > Coloc 2 with the same settings. The tool repeats the
Coloc 2 calculations.
