# Chure 2024: peak integration and a lactose calibration with hplc-py

## Citation
- Chure G, Cremer J. hplc-py: A Python Utility For Rapid Quantification of Complex Chemical Chromatograms. Journal of Open Source Software 9(94):6270 (2024). DOI: 10.21105/joss.06270. The paper is CC BY 4.0.
- Software and data: Zenodo DOI 10.5281/zenodo.10642439 (hplc-py 0.2.5), GPL-3.0.

## Data
- `sample.txt`, a Shimadzu LabSolutions export. The header block runs to line 83. The trace has 4801 points from 0 to 40 minutes, with the columns "R.Time (min)" and "Intensity".
- `lactose/lactose_mM_0.5.csv`, `_1`, `_3`, `_6`: the calibration standards. `lactose/lactose_mM_2.csv`: the unknown. Each has the columns time and signal.
- `fetch.sh` downloads the Zenodo archive, takes the five files and checks each SHA-256.
- Local path: /Volumes/T7/guided-analysis/data/chure2024-hplc-py/

## Tool
- hplc-py 0.2.10 through `catalog/chromatography` (`integrate_peaks`, `calibration_curve`, `quantify_areas`).
- Independent check of the calibration: R 4.6.1 `lm` (`catalog/chromatography/checks/calibration_r.R`).
- Independent check of the area convention: `catalog/chromatography/checks/area_units.py`, a trapezoid integral on a synthetic peak whose area the hplc-py test suite states.

## Method steps
1. Read `sample.txt` with the delimiter "," and 83 header lines skipped.
2. Crop to 10 to 20 minutes. Correct the baseline with SNIP and a peak width of 5. Fit the peaks with a prominence of 0.01.
3. Integrate the lactose peak of each standard with no baseline correction and no window.
4. Fit area against concentration with an intercept.
5. Divide the area of the unknown by the slope after the intercept.

## Numbers to reproduce
| Quantity | Paper (Figure 2D) | Computed |
|---|---|---|
| Peak 1 retention time | 10.90 | 10.90 |
| Peak 1 amplitude | 2.3e+4 | 23380.46 |
| Peak 1 scale | 0.16 | 0.1588 |
| Peak 1 skew | 0.70 | 0.6918 |
| Peak 1 area | 2.8e+6 | 2805655.43 |
| Peak 3 retention time | 14.45 | 14.45 |
| Peaks between 10 and 20 minutes | not printed | 6 |
| Calibration slope, intercept, R squared | not printed | 156586.74, 14624.94, 0.998868 |
| Unknown, nominal 2 mM | not printed | 1.8994 mM |

## Numbers that do not reproduce
Figure 2D row 2 prints a retention time of 15.19; the archived trace gives 15.53. Row 3 prints an amplitude of 3.7e+4 and a skew of -5.55; the trace gives 3.5e+4 and -3.0. The figure panel was probably made from another chromatogram. Only row 1 and the retention time of row 3 are items.

## The trap
Without the baseline correction the same window gives 7 peaks instead of 6, and the first peak moves to 10.28 minutes. The detector signal drifts, so the baseline is not optional here.

## Decisions the scientist owns
- The baseline correction and its peak width.
- The prominence that decides what counts as a peak.
- The time window.
- The calibration model: an intercept or a line through zero, and the weighting.
