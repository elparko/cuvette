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

On a simulated image with a known number of injected sources, the detected count is lower than the injected count. Faint sources with a peak of two to five times the noise do not reach the threshold. A higher threshold (5 sigma instead of 3) removes many more of them. Splitting touching sources adds a few.

The count is not a completeness. Do not report the detected fraction of injected sources without saying why the rest are missed.
