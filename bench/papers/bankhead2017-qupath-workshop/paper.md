# Bankhead 2017: QuPath, with open workshop images

## Citation
Bankhead P, Loughrey MB, Fernandez JA, et al. QuPath: Open source software for digital pathology image analysis. Scientific Reports 7:16878, 2017. DOI: 10.1038/s41598-017-17204-5.
This is the tool paper. Its own image data are patient tissue microarray and slide sets that are not openly downloadable. They are not used here.

## Data
- Zenodo record 6390370, "Whole-Slide Image Analysis and Quantitative Pathology with QuPath" (workshop images). DOI: 10.5281/zenodo.6390370. Published 2022-03-28.
- License: CC BY 4.0 (Zenodo metadata).
- Files used (md5 in fetch.sh): `prostate_1.ome.tif`, `prostate_2.ome.tif`, `prostate_3.ome.tif` (H&E, 10000 x 10000 pixels, RGB, 18 to 22 MB each) and `ki678_lymphoma.ndpi` (Ki-67 immunohistochemistry, 221 MB).
- Not downloaded: `ki67_lung.ndpi` (467 MB) and `polyp_fluo.tif` (281 MB). They are on the same record.
- Total size: about 280 MB.
- Local path: /Volumes/T7/guided-analysis/data/bankhead2017-qupath-workshop/
- The record gives no patient information in its description. The origin of the tissue is not stated on the record. Check the ethics note before any public use.

## Tool
QuPath (desktop, Groovy script, kind macro). The version is not fixed by the record. The paper used QuPath 0.1.x. Use a current release and write the version in the run log. QuPath is not installed on this machine, so no QuPath run was done.

## Method steps from the paper (Bankhead 2017, Results and Methods text read via Europe PMC)
Parameter values were not extracted from the paper text. Only these facts were read:
1. Tissue is found by thresholding a downsampled, smoothed image, then cleaning with morphological operations.
2. Stains are separated by color deconvolution. Cells are found as peaks in the hematoxylin channel (or a sum of channels).
3. A random-trees classifier separates tumor epithelium from other detections.
4. Positive cells use one intensity threshold on the maximum DAB optical density in the full cell area.
5. H-score = 3 x % strong + 2 x % moderate + 1 x % weak nuclei (p53 example in the paper).
Numeric thresholds, cell size limits and sigma values from the paper were not read.
For the workshop images the QuPath documentation gives the matching steps: Cell detection and Cell classification tutorials. The parameter values there were not read either.

## Numbers to reproduce
No number from the paper can be reproduced with these images.
Computed from the files (tifffile, this work):
- prostate_1/2/3.ome.tif: 10000 x 10000 pixels, RGB, 8-bit, one level. No physical pixel size is in the OME header (no PhysicalSizeX found). The scale must come from the scientist.
- ki678_lymphoma.ndpi: level 0 is 28800 pixels wide and 34816 high, RGB, 5 pages. TIFF XResolution 22042 pixels per centimeter. This gives 0.4537 um per pixel (10000 / 22042).
Cell counts, positive percentages and H-scores for these images were not computed. No reference value exists.

## Decisions owned by the scientist
- Stain vectors (default H&E or DAB, or estimated from the slide).
- Region to analyze (whole tissue, a drawn tumor region).
- Detection channel and threshold; cell size range; cell expansion.
- Positivity rule (single threshold on nucleus or cell DAB; one level or three levels).
- Scale in um per pixel (not in the prostate files; 0.4537 for the lymphoma slide).
- Replication unit (slide, region, or patient; here one slide each).
