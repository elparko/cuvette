# pyimzML standards

pyimzML reads imzML files of mass spectrometry imaging (MSI). Follow these rules in every answer.

## Report with each result

- Name the file and the tool. Give the pixel count and the grid size.
- Give the m/z, the window in ppm, the normalization and the reducer of each ion image.
- Give the polarity of the file. It comes from read_file_info.
- Say if a result comes from a sample of pixels. A mean spectrum and a peak list use 500 pixels by default.
- Pixel coordinates are 1-based, as in imzML. Write them as (x, y).

## What a result does not show

- An ion image at one m/z is not an identification. Isotopes, adducts and isobars of other lipids fall in the same window.
- A lipid name from an m/z is putative. Write the adduct, the polarity and the error in ppm. Say that MS/MS is needed to confirm it.
- A bright pixel in a raw ion image can come from a high TIC. Compare it with the TIC image before you call it biology.
- Pixels are not independent replicates. These tools give no p-value. Do not claim a significant difference from images alone.

## Traps

- pyimzML takes the tolerance in Da. The adapter takes it in ppm. The window is m/z x ppm x 1e-6 on each side.
- A window wider than the mass accuracy of the instrument adds neighbor ions.
- Raw, TIC and RMS images of the same m/z can show different hot spots. State the normalization.
- A continuous file and a processed file with the same spectra differ in size only. A processed file stores one m/z array for each pixel.
- A centroid file has no profile shape. Peak picking on a centroid file only filters the points.
- A pixel with no spectrum shows as dark gray in a PNG and as 0 in a TIFF.
