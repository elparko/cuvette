# Makrai 2023: annotated bacterial colony photos

## Citation
Makrai L, Fodróczy B, Nagy SÁ, Czeiszing P, Csabai I, Szita G, Solymosi N. Annotated dataset for deep-learning-based bacterial colony detection. Scientific Data 10:497, 2023. DOI: 10.1038/s41597-023-02404-8. CC BY 4.0.

## Data
- figshare DOI 10.6084/m9.figshare.22022540.v3, CC BY 4.0.
- Six photos of species 14 (sp14_img01 to sp14_img06): three blood agar plates, each photographed on a black and on a white background. JPEG, about 2400 by 2400 pixels.
- Data folder: /Volumes/T7/guided-analysis/data/makrai2023-colonies/plates. The metadata sheet and the bounding box table are in the reference folder.

## Method in the paper
Microbiologists marked each colony with a bounding box. The metadata sheet gives the number of colonies of each photo. The paper uses no counting program.

## Numbers to reproduce
- Printed counts: 14, 14, 14, 14, 16, 16. Total 88 (check.py, check.out).

## Method in this benchmark
count_colonies on the folder: green channel, bright colonies, the dish found by a circle fit, a rim of 6 percent left out, a 50-pixel Gaussian background subtracted, the triangle threshold, colonies 20 to 250 pixels across, roundness 0.6 or more, touching colonies split.

The settings came from a pilot on six other photos of the same species (sp14_img07 to sp14_img12) before the test photos ran. The pilot gave 130 colonies against 139 printed. The first run on the test photos gave 15, 14, 12, 17, 16, 14 (88).

## Decisions owned by the scientist
- Channel, polarity, threshold method, size and roundness limits, rim margin, background radius, split of touching colonies.
- The tolerance of 9 colonies (about 10 percent) covers touching colonies, bubbles and glare.
