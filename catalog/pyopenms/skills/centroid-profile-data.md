---
name: centroid-profile-data
description: Turn profile spectra into centroided peaks before feature finding, and choose the signal-to-noise cutoff with the scientist. Use it when load_mzml reports profile spectra.
---

# Centroid profile data

1. Call `load_mzml`. If `spectrum_types` has only `centroid`, stop. Peak picking is not needed.
2. Ask the scientist for the peak picker S/N. The OpenMS default 0 turns the filter off.
3. Call `pick_peaks`. The harness shows the options 0, 1 and 3 side by side before it asks.
4. Read `n_points_before` and `n_peaks_after`. Check the table of the strongest peaks of the first spectrum against a peak that you know.
5. Use the centroided file in the next step. Say which file came from which step.
