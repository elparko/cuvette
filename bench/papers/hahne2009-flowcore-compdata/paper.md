# Hahne 2009: the flowCore compensation data set (compdata)

## Citation
- Hahne F, LeMeur N, Brinkman RR, Ellis B, Haaland P, Sarkar D, Spidlen J, Strain E, Gentleman R. flowCore: a Bioconductor package for high throughput flow cytometry. BMC Bioinformatics 10:106 (2009). DOI: 10.1186/1471-2105-10-106.
- Data and reference: Bioconductor package flowCore 2.24.0, extdata/compdata (Artistic-2.0). Files 060909.001 to 060909.005 and the reference matrix compref.

## Data
- One unstained control (060909.001) and four single-stain controls: FL1-H (.002), FL2-H (.003), FL4-H (.004), FL3-H (.005). 7500 to 10000 events each.
- The values are log-amplified channel numbers (1024 channels, four decades).
- The paper describes the data structures. It prints no spillover numbers. The numbers come from the reference matrix of the flowCore tests, so this case is a test-suite case and not a paper case.

## Tool
- flowcore adapter: compute_spillover (positive_percentile 80, log_decades 4).
- Independent check: NumPy and flowio (`check_spillover.py`, output in `check_spillover.out`).

## Numbers to reproduce
- The 12 off-diagonal coefficients of compref. The tool reproduces 10 to 1e-6 and 2 to 0.0004.

## Decisions the scientist owns
- The positive cutoff of each control (a percentile of the unstained control).
- The conversion of the log scale to a linear scale.
