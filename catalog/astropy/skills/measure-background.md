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

On a simulated image with a known background, the clipped median without a mask is above the true value. With the sources masked it is closer to the true value. Background2D shows the same pattern. Sources raise the background level. The mask removes most of this bias.

Run the sensitivity table for box_size or mask_sources if the scientist asks how much the choice matters.
