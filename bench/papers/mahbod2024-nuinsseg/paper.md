# Mahbod 2024: NuInsSeg, nuclei instance segmentation in H&E images

## Citation
Mahbod A, Polak C, Feldmann K, et al. NuInsSeg: A fully annotated dataset for nuclei instance segmentation in H&E-stained histological images. Scientific Data 11:295, 2024. DOI: 10.1038/s41597-024-03117-2. Open access, CC BY 4.0.

## Data
- Zenodo record 10518968, file `NuInsSeg.zip` (1.63 GB, md5 08f9a33e23e983d82ee93aa58e69d095). DOI: 10.5281/zenodo.10518968.
- License: CC BY 4.0 (Zenodo metadata).
- Content: 665 H&E image patches, 512 x 512 pixels, RGB PNG, 31 human and mouse organs. Label masks are 16-bit TIFF, one integer per nucleus.
- Local path: /Volumes/T7/guided-analysis/data/mahbod2024-nuinsseg/x/<organ>/{tissue images, label masks, mask binary, vague areas}
- Kept on disk: the zip (1.63 GB) plus the four folders above (1.6 GB). The full extract is 14 GB; the other folders were deleted.

## Tool
scikit-image (Python). Cellpose, StarDist in QuPath, or CellProfiler can use the same data.
The paper made the masks with ImageJ 1.53 (freehand ROI tool) and trained U-Net models (TensorFlow 2.6.2, Keras 2.6.0).

## Method steps (paper sections "Sample acquisition", "Field of view and patch selection", "Technical Validation")
1. FFPE sections, 4 um, stained with H&E.
2. Scan: TissueFAXS, Zeiss Axio Imager Z1, Plan-Neofluar 40x/0.75 air objective, Baumer HXG40c color camera, 8-bit.
3. Field of view 2048 x 2048; a 512 x 512 patch is cropped from the center.
4. Nuclei outlined by hand in ImageJ; ambiguous regions marked as "vague areas".
5. Benchmark: five-fold cross-validation, 133 images per fold, scikit-learn split with a fixed random state (code on Kaggle and GitHub).
6. Metrics: Dice, aggregated Jaccard index (AJI), panoptic quality (PQ).
The pixel size in um is not stated in the text read. It must be asked or derived from the objective and camera.

## Numbers to reproduce
From the paper:
- Table 2: 665 images, 30,698 nuclei (human 472 images, 23,247 nuclei; mouse 193 images, 7,451 nuclei). Per organ, for example: human liver 40 images, 1,370 nuclei; human cerebrum 12 images, 146 nuclei; mouse spleen 7 images, 1,657 nuclei.
- Table 3, five-fold cross-validation, mean Dice / AJI / PQ in %: shallow U-Net 78.8/50.5/42.7; deep U-Net 79.7/49.4/40.4; attention U-Net 80.5/45.7/36.4; residual attention U-Net 81.4/46.2/36.9; two-stage U-Net 76.6/52.8/47.2; dual decoder U-Net 79.4/55.9/51.3.
Computed from the released files (this work):
- Image count per organ matches Table 2 in all 31 folders; 665 in total.
- Nuclei count from the label masks (unique non-zero labels): 35,138 in total. ImageJ ROI files: 33,098. Neither matches 30,698 in Table 2. Example: human liver 1,471 labels against 1,370 in the table; human brain 150 against 146; mouse spleen 2,029 against 1,657.
- Possible cause: the Zenodo release is newer than the paper table. Not confirmed.
- Folder names differ from Table 2 names: "human brain" is the cerebrum row, "human rectum" has no direct row (Table 2 has "Colon"), "human cardia" and "human pylorus" are the stomach rows. This mapping is an inference.
- scikit-image baseline (this work): hematoxylin channel from rgb2hed, global Otsu, remove objects under 30 pixels, no declumping. Mean pixel Dice over 665 images: 0.538. Object count 64,406 against 35,138 labels; R^2 of count per image 0.064. This is far below the U-Net values and shows that a plain threshold fails.

## Decisions owned by the scientist (paper choice)
- Stain channel for nuclei: hematoxylin (paper does not use color deconvolution; it trains on RGB).
- Segmentation method: deep learning (U-Net variants) in the paper.
- Vague areas: masked as ambiguous; the paper provides them but the text read does not say whether they were excluded from scoring.
- Object size range: none stated; tiny nuclei are included.
- Replication unit: image patch, grouped by organ; five folds of 133 images.
- Scale: 40x objective; um per pixel not stated in the text read.
- Truth: label masks (released) versus Table 2 counts (do not match; see above).
