---
name: compare-two-files
description: Check if two imzML files hold the same spectra, such as a continuous and a processed version. Use it when the scientist asks if two files are the same data.
---

# Compare two imzML files

1. Call `read_file_info` on both files. Compare the pixel count, the grid, the m/z range and the polarity.
2. Call `compare_files` with both paths. Use `max_pixels` 0 to compare every pixel.
3. Read `identical`, `n_pixels_different`, `max_abs_mz_difference` and `max_abs_intensity_difference`.
4. If the files are identical, explain the size difference: a processed file stores one m/z array for each pixel. A continuous file stores one m/z array for all pixels.
5. If the files differ, give the number of pixels that differ and the largest difference. Do not guess the cause.
