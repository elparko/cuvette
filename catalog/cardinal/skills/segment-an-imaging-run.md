---
name: segment-an-imaging-run
description: Steps to split a mass spectrometry imaging run into segments and list the ions of each segment.
---

# Segment an imaging run

1. Run load_image with the file path. Read the number of spectra, the number of m/z values and the m/z range.
2. Ask the scientist for normalization, signal-to-noise ratio and tolerance. Run process_peaks.
3. Read n_peaks. A low number can mean that the signal-to-noise ratio is too high.
4. Ask the scientist for r, k and the weights. Run segment_image with a list of s values, such as 2, 4, 8, 16, 32 and 64.
5. Read the table. Each row is one model. A higher s gives fewer segments.
6. Run plot_segments for two or three models. Show the maps to the scientist.
7. Ask the scientist which s to report. Do not choose it alone.
8. Run top_features for that model.
9. Report the settings, the number of segments for each s, and the top ions of each segment.
10. Name a segment only if the scientist gives an optical image, histology or a known marker ion.
