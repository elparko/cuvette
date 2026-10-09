# Kresken 2021: piperacillin/tazobactam and temocillin against cephalosporin-resistant Enterobacterales

## Citation
- Kresken M, Pfeifer Y, Werner G. Comparative in vitro activity of piperacillin-tazobactam and temocillin against third-generation cephalosporin-resistant, carbapenem-susceptible Escherichia coli and Klebsiella pneumoniae. GMS Infectious Diseases 9:Doc08 (2021). DOI: 10.3205/id000077. License CC BY 4.0.
- Data: Zenodo record 6575080, a mirror of Dryad 10.5061/dryad.931zcrjkc. CC0. The workbook has 109 isolates (73 E. coli, 36 K. pneumoniae) and 21 drug columns.

## Data
- Broth microdilution to ISO 20776-1. Isolates from the PEG surveillance of 2016 and 2017.
- The paper splits the isolates by cefotaxime MIC above 2 mg/L or ceftazidime MIC above 4 mg/L: 79 resistant, 30 susceptible.
- fetch.sh writes temocillin_mics.csv with the isolate, the species, the group and five drugs named with the drug name.

## Tool
- amr adapter: interpret_mic (guideline EUCAST 2021, susceptible_definition S and I) and mic_summary.
- Independent check: pandas and plain Python (`check.py`, output in `check.out`).

## Numbers to reproduce
- Percent susceptible, MIC50 and MIC90 of 8 groups (2 species, 2 cephalosporin groups) for 2 drugs. All 24 values reproduce exactly.

## Decisions the scientist owns
- The standard and the version (EUCAST 2021, version 11.0).
- What the percent susceptible counts (S and I together for temocillin).
- The grouping by cephalosporin resistance.
