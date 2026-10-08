# Bradley et al.: photutils, and the Astropy Collaboration papers (2013, 2018, 2022)

## Citation
- Bradley L, et al. photutils: Photometry tools. Zenodo (software). DOI: 10.5281/zenodo.596036
- Astropy Collaboration. Astropy: A community Python package for astronomy. A&A 558, A33 (2013). DOI: 10.1051/0004-6361/201322068
- Astropy Collaboration. The Astropy Project: Building an open-science project and status of the v2.0 core package. AJ 156, 123 (2018). DOI: 10.3847/1538-3881/aabc4f
- Astropy Collaboration. The Astropy Project: Sustaining and growing a community-oriented open-source project and the latest major release (v5.0) of the core package. ApJ 935, 167 (2022). DOI: 10.3847/1538-4357/ac7c74
- These papers describe the software. They print no image measurements. The known answers below come from the construction of the photutils example image, which is documented in the photutils docs (read 2026-10-08).

## Data
- Source: `photutils.datasets.make_100gaussians_image()`. Size 300 x 500 pixels. A constant background of 5, Gaussian noise with standard deviation 2 (random seed 0), and 100 injected 2D Gaussian sources. The injected positions, widths and fluxes are in `100gaussians_params.ecsv` inside photutils.
- Local copy in the repo: `catalog/astropy/data/gaussians_noisy.fits` (600 KB), a noise-free copy `gaussians_noiseless.fits`, and `truth_100gaussians.csv`. The FITS header adds BUNIT ct and a TAN WCS (1 arcsec pixels, reference pixel 250, 150 at RA 150, Dec 2). The pixel values are the photutils values.
- Fetch: bench/papers/bradley-photutils-100gaussians/fetch.sh regenerates the files into /Volumes/T7/guided-analysis/data/bradley-photutils-100gaussians/.
- Simulated data. No person, no identifiers. License of photutils: BSD 3-clause.

## Tool
- astropy 8.0.1 and photutils 3.0.0, Python 3.13, venv at ~/.guided-analysis/envs/astropy/.

## Method steps, in order
1. Read the image: `fits.getdata(path)`.
2. Background and noise: `sigma_clipped_stats(data, sigma=3, maxiters=10)` gives median 5.1524 and std 2.0937. The sources raise the median above the true 5.
3. With sources masked (first detection at 3 sigma, 5 pixels, grown by 11 pixels): median 5.029, std 1.988. Background2D with 50 pixel boxes gives 5.093 without a mask and 4.988 with one.
4. Detect: subtract the median, smooth with a Gaussian of FWHM 3 pixels, threshold 3 x std, at least 10 connected pixels. Result: 82 sources.
5. Aperture photometry at the injected positions of five isolated sources: radius 10 pixels, sky ring 15 to 20 pixels, clipped median.

## Numbers to reproduce
| Quantity | Value | Source |
|---|---|---|
| True background, true noise | 5 and 2 | construction of the image |
| Clipped median, std (global, no mask) | 5.152, 2.094 | computed, astropy direct call |
| Sources detected (3 sigma, 10 pixels, FWHM 3, global background) | 82 | computed twice: photutils, and scipy only |
| Injected sources | 100 | construction |
| Net flux, source at (48.70, 200.33) | 895.4 +/- 106 | injected flux, noise 2 x sqrt(314) = 35.4 |
| Net flux, source at (145.05, 168.52) | 734.1 +/- 106 | injected flux |
| Net flux, source at (355.56, 252.20) | 873.9 +/- 106 | injected flux |
| RA, Dec of pixel (249, 149) | 150.0, 2.0 deg | FITS WCS reference pixel |

## Traps
- The sigma-clipped median is above the true background because sources stay in the sample.
- 82 detections are not 100 sources. The 18 faint ones fall under the threshold.
- Pixel positions are 0-based in photutils. The FITS header is 1-based.
