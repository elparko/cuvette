---
name: detect-sources
description: How to find sources in a FITS image and report the count with its threshold, with the photutils 100-source image as the example.
---

# Source detection

1. Run estimate_background first. It writes a subtracted image with a noise map.
2. Run detect_sources with that file. The harness asks for the threshold, the minimum pixels, the smoothing width and the split option.
3. Look at the plot. The outlines must sit on visible sources.
4. Report the count with all settings, and the background method.
5. Run the sensitivity table for detect_nsigma if the scientist asks how the count changes.

On the photutils 100-source image, 100 sources are injected. At 3 sigma, 10 pixels and smoothing FWHM 3, the global background finds 82 sources. Background2D finds 83, and 85 if touching sources are split. The faint injected sources have a peak of 4 to 10 counts on a noise of 2. They do not reach the threshold. At 5 sigma the count falls to 50.

The count is not a completeness. Do not say that 82 of 100 sources are found without saying why 18 are missed.
