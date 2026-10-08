# Caicedo 2019: Evaluation of deep learning strategies for nucleus segmentation in fluorescence images

## Citation
Caicedo JC, Roth J, Goodman A, et al. Evaluation of Deep Learning Strategies for Nucleus Segmentation in Fluorescence Images. Cytometry Part A 95(9):952-965, 2019.
DOI: 10.1002/cyto.a.23863 (open access, CC BY-NC).

## Data
- Image set BBBC039v1, Broad Bioimage Benchmark Collection. Page: https://bbbc.broadinstitute.org/BBBC039
- Files: images.zip (77.9 MB), masks.zip (2.8 MB), metadata.zip (18 KB). The metadata zip holds the split lists and the CellProfiler pipeline `segmentation_cp3.cppipe`.
- License: CC0 (stated on the BBBC039 page). The paper itself is CC BY-NC.
- Content: 200 fields of view, 520 x 696 pixels, 16-bit TIFF, Hoechst (DNA) channel, U2OS cells, one field per compound.
- Local path: /Volumes/T7/guided-analysis/data/caicedo2019-bbbc039/x/{images,masks,metadata}
- Total size: about 81 MB.

## Tool
CellProfiler 3.0 (pipeline file written for 3.x; the paper names "CellProfiler 3.0"). The pipeline loads in CellProfiler 4 with module upgrades. Mode: headless `cellprofiler -c -r -p pipeline -i input -o output`.
Other tools can use the same data: scikit-image, Cellpose, Fiji.

## Method steps (paper "Baseline Segmentations", and the cppipe file)
The paper describes two CellProfiler baselines: "basic" (only IdentifyPrimaryObjects) and "advanced" (adds illumination correction, median filter, opening). The paper does not say which one `segmentation_cp3.cppipe` is. The pipeline file has preprocessing, so it is probably the advanced one. This is not confirmed.
Parameters read from `segmentation_cp3.cppipe`:
1. Resize DNA by factor 0.5, nearest neighbor (module 5).
2. Opening, structuring element disk,45 (module 6).
3. Resize by factor 2.0, nearest neighbor (module 7).
4. ImageMath subtract the opened image from DNA, clip to 0..1 (module 8).
5. Closing, disk,9 (module 9).
6. EnhanceEdges, Sobel, all directions, automatic threshold, Gaussian sigma automatic (module 10).
7. ImageMath subtract edges from the background-subtracted image (module 11).
8. IdentifyPrimaryObjects (module 12):
   - typical diameter 20,80 pixels; do not discard objects outside the range; do not discard objects at the border
   - declump by Shape; dividing lines by Intensity
   - smoothing filter size 15; minimum distance between maxima 10
   - fill holes after thresholding and declumping
   - threshold: Global, Otsu, two classes, smoothing scale 1.0, correction factor 1.0, bounds 0.0 to 1.0
   - note: the file lists "Minimum cross entropy" for the first threshold line and "Otsu" for the last line. The setting that the module uses must be read in the CellProfiler GUI. Not resolved here.
9. ConvertObjectsToImage and SaveImages write the mask.
Evaluation (paper "Evaluation Metrics"): match predicted and true nuclei by intersection over union (IoU). A match needs IoU above a threshold. Score F1 per IoU threshold, then average over thresholds. The paper text gives "increasingly stringent thresholds". The exact threshold list (0.5 to 0.95) is not in the text that was read.
Splits: training 100 images, validation 50, test 50 (metadata/*.txt). The pipeline was tuned on training images and scored on validation and test.

## Numbers to reproduce
Reported in the paper (Results, "Deep Learning Improves Nucleus Segmentation Accuracy"; Fig. 2a, Fig. S1, Fig. S2):
- Average F1 over IoU thresholds: U-Net 0.898, DeepCell 0.858, Random Forest 0.840, CellProfiler advanced 0.811, CellProfiler basic 0.790.
- Missed-nucleus rate at IoU 0.7: U-Net 8.1%, DeepCell 14.0%, Random Forest 16.5%, CellProfiler advanced 15.5%, CellProfiler basic 20.1%.
- Test set has 5,720 nuclei (Fig. 3/4 captions).
- Abstract: 23,165 annotated nuclei.
Computed from the masks (this work, scikit-image `label` on mask channel 0, as in the BBBC039 decoding gist):
- Nuclei per split: training 11,999; validation 5,896; test 5,720. Sum 23,615.
- The sum 23,615 differs from the 23,165 in the abstract. The abstract probably has transposed digits. The test count 5,720 matches the paper.
- The BBBC039 page says "around 23,000".
- Mask decoding: channel 0 has values 0, 1, 2. Run `skimage.measure.label` on channel 0 (not on a binary mask).
CellProfiler outputs are not run here. The CellProfiler F1 values are targets, not verified.

## Decisions owned by the scientist (paper choice)
- Segmentation channel: Hoechst DNA channel, only channel in this set.
- Threshold method: global Otsu in the pipeline (see the note above).
- Object size range: 20 to 80 pixels diameter. Pixel size: 0.656 um per pixel at 20x (paper, DeepCell description). The paper states "diameter up to 40 um" for cells.
- Declumping: shape-based, smoothing 15, minimum distance 10.
- Background correction: opening disk 45 on a half-size image.
- Edge objects: kept (do not discard border objects).
- Replication unit: field of view (image), one per compound. Compound is the biological unit.
- Exclusions: tiny fragments and micronuclei are annotated as nuclei in the ground truth.
- Overlap threshold for a correct nucleus: IoU above 0.5 for matching, 0.7 for error counts.
- Which split to report: test (50 images), tune on training.
