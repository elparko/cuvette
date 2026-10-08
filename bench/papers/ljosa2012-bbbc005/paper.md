# Ljosa 2012: Broad Bioimage Benchmark Collection, image set BBBC005 (synthetic cells with known counts)

## Citation
- Ljosa V, Sokolnicki KL, Carpenter AE. Annotated high-throughput microscopy image sets for validation. Nature Methods 9:637, 2012. DOI: 10.1038/nmeth.2083 (recommended citation on the BBBC005 page).
- Results file: Bray MA, Fraser AN, Hasaka TP, Carpenter AE. Workflow and metrics for image quality control in large-scale high-content screens. J Biomol Screen 17(2):266-274, 2012. DOI: 10.1177/1087057111420292 (the BBBC005 page lists it as "J Biomol Screen 2011").

## Data
- Page: https://bbbc.broadinstitute.org/BBBC005
- License: CC0 1.0 (stated on the page).
- Content: 19,200 synthetic fluorescence images, 696 x 520 pixels, 8-bit TIF. Made with SIMCEP.
- File name: `SIMCEPImages_<well>_C<cells>_F<blur>_s<sample>_w<stain>.TIF`. The BBBC page says `w1` is the cell body stain and `w2` is the nuclei stain. The images show the opposite (see Decisions). `C` is the true cell count (1 to 100, 24 distinct values). `F` is focus blur (F1 is in focus, up to F48).
- Ground truth: 1,200 binary masks for F1 images only (600 for w1, 600 for w2), `synthetic_2_ground_truth/`.
- Published results: `BBBC005_results_bray.csv`, 9,600 rows (CellProfiler nucleus counts for the nuclei images), column `Image_Count_DetectedNuclei` against `Image_Metadata_ActualCellCount` and `Image_Metadata_BlurFilterSize`.
- Local download: ground truth zip (12 MB), full images zip (1.88 GB, kept), results CSV (2.4 MB), and extracted subsets of the 600 in-focus w2 images (`sub/`) and the 600 in-focus w1 images (`sub_w1/`). Total about 2.6 GB on disk.
- Local path: /Volumes/T7/guided-analysis/data/ljosa2012-bbbc005/

## Tool
CellProfiler 4 headless (IdentifyPrimaryObjects on the w1 images, see Decisions). The original counts in the CSV used CellProfiler (workflow of Bray 2012). The exact CellProfiler version and pipeline for the CSV were not found in the files read.
scikit-image or Fiji can also run on these images.

## Method steps
The BBBC page does not give a pipeline. The task is the standard one: count nuclei per image and compare with the true count in the file name.
1. Read the nuclei images (`w1` files, see Decisions).
2. Segment nuclei (threshold and declump).
3. Count objects per image.
4. Compare to `C` in the file name, per blur level.
No parameter values come from a paper for this task. Parameters in the CSV pipeline were not read.

## Numbers to reproduce
Computed from `BBBC005_results_bray.csv` (this work, pandas):
- 9,600 images, 400 per true count, 24 true counts from 1 to 100, 16 blur sizes.
- Sum of true counts 484,800; sum of detected 341,697 (detected / true = 0.705).
- Squared correlation (R^2) of detected against true count: 0.834 over all images.
- Blur size 1 (in focus), 600 images: R^2 0.936, mean absolute error 3.36 nuclei, detected / true 0.934.
- Blur size 32, 600 images: R^2 0.970, mean absolute error 11.07, detected / true 0.781.
- Blur size 48, 600 images: R^2 0.886, mean absolute error 18.48, detected / true 0.634.
Computed from the ground truth masks:
- Binary masks merge touching cells. Labeling the 100-image subset (every sixth w2 mask) gave 1,366 components against 5,007 true cells (exact match in 8% of images). Use the file name count as the truth, not the mask.
Check with scikit-image (this work): Otsu threshold plus connected-component labeling on 100 in-focus w2 images gave 1,293 objects against 5,007 true cells. Clumps merge. Declumping is needed.
These numbers come from the data files, not from the text of Ljosa 2012 or Bray 2012. No number from the text of either paper was read.

## Decisions owned by the scientist
- Stain channel for counting: w1. The w1 files show separate round nuclei (about 31 pixels across). The w2 files show large cell bodies that touch and overlap (about 67 pixels across), although the BBBC page calls w2 the nuclei stain. On the 100-image sample (every sixth file, F1) with CellProfiler 4.2.8, diameter 15 to 60, Otsu, declump by shape: w1 gives 4,984 objects for 5,007 true cells (ratio 0.995, mean absolute error 0.33). w2 gives 3,481 objects (ratio 0.695, error 15.3). With dividing lines by intensity and border objects kept, w1 gives ratio 0.940 and error 3.01, close to the published 0.934 and 3.36. A person must confirm the channel.
- Threshold method: not given. Otsu merges clumps at high counts.
- Declumping method and object size range: not given in the sources read.
- Blur range to include: all F1 to F48, or only in-focus F1. Counts drop as blur rises.
- Replication unit: image (sample s1 to s25 within a well).
- Truth source: count in file name (C), not the binary mask.
- Exclusions: none stated.
- Scale: not stated (synthetic images).
