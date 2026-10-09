# Yun 2026: an ELISA for IgG against Lassa virus nucleoprotein

## Citation
- Yun H, Sigei F, Appiah NYA, et al. Development and qualification of an enzyme-linked immunosorbent assay to detect human serum immunoglobulin G reactive to multiple lineages of Lassa virus nucleoprotein. PLOS ONE 21(7): e0340568 (2026). DOI: 10.1371/journal.pone.0340568. License CC BY 4.0.
- Data: S1 Data (Excel workbook, 16 sheets) of the article, CC BY 4.0.
- I read the full text (PLOS JATS XML). The numbers come from Table 1 and the section "Anti-LASV-NP IgG ELISA dynamic range and positive controls".

## Data
- Sheet "Table 1 dynamic range": nine runs. Each run has the standards STD1 to STD10 (9.292 to 0.018 IU/mL) in duplicate, four blank wells, HPC, LPC and NEG in triplicate, and the dilutions STD*-1 to STD*-10 of the reference serum pool in duplicate, with the Gen5 concentration of each dilution.
- Two LPC wells have a trailing asterisk: masked in Gen5 (run 7 replicate 2, run 9 replicate 1).
- Run 1 has one high blank well (0.146 against 0.014 to 0.023).
- fetch.sh writes `lasv_elisa_runs.csv` (477 wells) to the data folder and keeps the workbook in the reference folder.

## Tool
- drc adapter, `fit_standard_curve` with `plate_col: run`, `nominal_col: nominal`, `average_replicates: signal`, `blank: none`.
- Independent check: SciPy least squares (`check.py`, output in `check.out`). It also compares each run with the Gen5 concentrations: ratio 1.00000 for all 89 values.

## Method steps
1. For each run, a 4PL fit to the mean OD of each standard, with no blank subtraction.
2. For each run, the mean OD of each dilution and control back-calculated on the curve of the run.
3. Over the nine runs: mean OD and its CV, mean concentration and its CV, recovery = mean / nominal.
4. LLOQ and ULOQ: the lowest and highest nominal of the dilutions with recovery 75 to 125 percent and CV below 25 percent.

## Numbers to reproduce
| Quantity | Paper | Computed |
|---|---|---|
| Dilution 1: mean conc, CV, recovery | 7.587, 11.07, 98.0 | 7.5869, 11.070, 97.97 |
| Dilution 4 | 0.917, 10.93, 94.7 | 0.9171, 10.927, 94.74 |
| Dilution 7 | 0.120, 15.71, 99.6 | 0.1205, 15.714, 99.55 |
| Dilution 8 | 0.056, 15.55, 92.0 | 0.0558, 15.553, 92.99 |
| Dilution 9 | 0.027, 25.90, 88.7 | 0.0266, 25.895, 88.71 |
| Dilution 10 | 0.014, 42.05, 92.6 | 0.0139, 42.045, 92.56 |
| HPC | 1.993, 22.45, 107.3 | 1.9932, 22.447, 107.28 |
| LPC | 0.457, 20.09, 98.3 | 0.4569, 20.028, 98.25 |
| CV of the OD, dilutions 7 and 8 | 21.92, 26.62 | 21.919, 26.621 |
| LLOQ and ULOQ | 0.121 and 7.744 IU/mL | 0.121 and 7.744 |

## Numbers that do not reproduce
- Dilution 8 recovery: printed 92.0, computed 92.99 (nominal 0.060) or 92.22 (nominal 0.0605).
- LPC CV of the concentration: printed 20.09, computed 20.03. The mean OD and its CV match, so the difference is in the concentrations.
- The CV of dilution 10 (42.05) and dilution 9 (25.90) differ by 0.01 from the rounded computed values.

## Decisions the scientist owns
- 4PL, no weighting, no blank subtraction, a fit to the mean OD of the replicates (the Gen5 settings).
- The two masked LPC wells.
- The range rule: recovery 75 to 125 percent, CV below 25 percent.
