# Cooley 2020: Z' factor of a split-luciferase assay on ten plates

## Citation
- Cooley R, Kara N, Hui NS, et al. Development of a cell-free split-luciferase biochemical assay as a tool for screening for inhibitors of challenging protein-protein interaction targets. Wellcome Open Research 5:20 (2020). DOI: 10.12688/wellcomeopenres.15675.1. License CC BY 4.0.
- Data: OSF registration MGKQV (DOI 10.17605/OSF.IO/MGKQV), CC BY 4.0.

## Data
- Ten PHERAstar exports (Figure 5F-G). Each has several reads (cycles) of a 384-well plate. The first read has four labelled rows: 20µL, DM 20µL, 10µL and DM 10µL, with five wells each and a sixth low well.
- In plate 1 the DM 20µL values are on the row below the label. Plate 7 also has a grid of averages. Plate 10 is an Excel file.
- "All plates analysis.csv" has the mean, SD and Z' of each plate and volume (reference folder).

## Tool
- drc adapter, `normalize_plate` with `plate_col: plate`, `high_control: pos_10ul`, `low_control: neg_10ul` (and the 20 µl labels).
- Independent check: pandas (`check.py`, `check.out`).

## Numbers to reproduce
- Z' of the ten plates at 10 µl: 0.54, 0.61, 0.73, 0.73, 0.66, 0.63, 0.77, 0.74, 0.62, 0.72. All reproduce.
- Z' at 20 µl: plates 2, 4, 6, 7, 8, 9 and 10 reproduce.

## Numbers that do not reproduce
- 20 µl, plates 3 and 5: printed Z' 0.65 and 0.83, computed 0.746 and 0.852. The printed means are not the means of the five wells.
- 20 µl, plate 1: printed mean 1327, computed 1337.4.
- Figures 5D and 5E use a manual outlier removal (126 to 104 wells). They are not in the benchmark.

## Decisions the scientist owns
- The control wells, no excluded wells, Z' from the mean and the SD.
