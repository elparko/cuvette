---
name: measure-background
description: How to measure and report the sky background and noise of a FITS image, with the photutils 100-source image as the example.
---

# Background and noise

1. Run inspect_fits. Note the unit, the size and whether the file has a WCS.
2. Run clip_statistics for a first look. The harness asks for the clip level and for the source mask.
3. Run estimate_background. The harness asks for the method, the box size, the estimator and the mask.
4. Read background_median and rms_median in the result. Look at the plot. The background map must not follow the sources.
5. Report the method, clip level, box size, estimator, mask and the unit.

On the photutils 100-source image the true background is 5 and the true noise is 2. The clipped median is 5.15 with no mask and 5.03 with the sources masked. Background2D with 50 pixel boxes gives 5.09 without a mask and 4.99 with one. Sources raise the background level. The mask removes this bias.

Run the sensitivity table for box_size or mask_sources if the scientist asks how much the choice matters.
