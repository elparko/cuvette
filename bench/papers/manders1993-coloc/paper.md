# Manders 1993: overlap coefficients on designed image pairs

## Citation
Manders EMM, Verbeek FJ, Aten JA. Measurement of co-localization of objects in dual-colour confocal images. Journal of Microscopy 169(3):375-382, 1993. DOI: 10.1111/j.1365-2818.1993.tb03313.x.

## Data
- Fiji Coloc 2 test images mandersA.tiff to mandersD.tiff (300 by 300 pixels, 8 bit), commit 82af2de4 of github.com/fiji/Colocalisation_Analysis. GPL-3.
- They copy the designed object pairs of the paper: A is channel 1; B, C and D overlap A less and less.
- Data folder: /Volumes/T7/guided-analysis/data/manders1993-coloc. The Coloc 2 test classes with the expected values are in the reference folder.

## Numbers to reproduce
- Pearson r: A-B 0.72, A-C 0.44, A-D 0.16 (the paper's values, asserted in Coloc 2 with a tolerance of 0.01).
- Manders M1 and M2 above zero: A-B 0.75 and 0.75, A-C 0.5 and 0.5, A-D 0.25 and 0.25 (Coloc 2 assertions).
- NumPy on the same files: 0.7213, 0.4426, 0.1639 and the same M1 and M2 (check.py, check.out).

## Why this paper
No 2018 to 2026 paper with raw two-channel images and a printed coefficient for each image was found (CANDIDATES-wetlab-imaging.md). The 1993 paper defines M1 and M2 and prints Pearson values for designed pairs that Coloc 2 copies.

## Decisions owned by the scientist
- Threshold: none (all pixels above zero), as in the paper.
- Costes test: off.
- Region: the whole image.
