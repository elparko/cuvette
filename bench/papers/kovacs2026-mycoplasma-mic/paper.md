# Kovacs 2026: antibiotic susceptibility of Mycoplasma anserisalpingitidis

## Citation
- Kovács ÁB et al. Genome-wide association study of Mycoplasma anserisalpingitidis strains for antibiotic susceptibility. Scientific Reports (2026). DOI: 10.1038/s41598-026-39804-w. License CC BY 4.0.
- Data: Supplementary Table 1 of the paper (xlsx), CC BY 4.0. 110 strains, 9 drugs.

## Data
- Broth microdilution. Values can have a limit sign (<=0.25, >64).
- The species has no clinical breakpoints, so the paper gives the MIC50 and the MIC90 only.
- Some drugs use a dilution series that is not a power of two (doxycycline 0.039 to 10, tiamulin 0.078 to 2.5).
- fetch.sh writes mycoplasma_mics.csv.

## Tool
- amr adapter: mic_summary.
- Independent check: pandas and plain Python with both rank rules (`check.py`, output in `check.out`).

## Numbers to reproduce
- 13 MIC50 and MIC90 values that the paper prints. All reproduce.
- Enrofloxacin MIC50: the paper prints more than 10, the table gives 5. It does not reproduce.

## Decisions the scientist owns
- The rank rule for the MIC50 and the MIC90.
- That no breakpoint exists, so no S, I or R.
