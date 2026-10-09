# Nair 2024: growth cost of clinical plasmids in resistant E. coli

## Citation
- Nair RR, Andersson DI, Warsi OM. Antibiotic resistance begets more resistance: chromosomal resistance mutations mitigate fitness costs conferred by multi-resistant clinical plasmids. Microbiology Spectrum 12(5): e0420623 (2024). DOI: 10.1128/spectrum.04206-23. License CC BY 4.0.
- Data: figshare DOI 10.6084/m9.figshare.25400194, CC BY 4.0. Bioscreen_data.xlsx (raw OD600), Figure_1_2.xlsx (r and rel_r of each well), ReadME.pdf.
- I read the full text (Europe PMC XML, PMC11064507). The supplement (Tables S1 to S3) is behind a bot check on the ASM and PMC sites.

## Data
- Bioscreen_data.xlsx has three sheets. The benchmark uses STR-R: host DA49828 (streptomycin resistant, rpsL K42N) and 12 plasmids, 84 wells, OD600 every 4 minutes for 36 hours, already zero-referenced.
- Each block is a plate column: the plasmid-free host at the top and plasmid-carrying wells below it.
- Figure_1_2.xlsx has 70 rows for STR-R. It leaves out block 2 (W10 to W18) and block 12 (W80 to W84). These wells grew normally; the paper gives no reason.
- fetch.sh writes strr_od.csv and strr_design.csv to the data folder and keeps Figure_1_2.xlsx in the reference folder.

## Tool
- growthcurver adapter: fit_growth_curves (bg_correct min) and compare_growth (reference Host, same block).
- Independent check: SciPy logistic fit and SciPy statistics on the published rel_r (`check.py`, output in `check.out`).

## Method steps
1. growthcurver logistic fit of each well after the subtraction of the well minimum. Growth rate r.
2. rel_r = r of the well divided by r of the host well of the same block.
3. For each plasmid: mean rel_r, 95% t interval, two-sided one-sample t test against 1.
4. The mean of the 12 plasmid means.

## Numbers to reproduce
| Quantity | Source data or paper | Computed |
|---|---|---|
| r of each of the 70 wells | Figure_1_2.xlsx (W01 0.371065, W24 0.479446) | growthcurver within 1e-6; SciPy within 1.4e-6 |
| rel_r of each well | Figure_1_2.xlsx | within 1e-8 |
| Mean rel_r P5, P11, P14 | Figure 2D (plot) | 1.0725, 0.9466, 1.0821 |
| 95% interval P11 | Figure 2D (plot) | 0.742 to 1.151 |
| Plasmids with a mean below 1 and p below 0.05 | none (Results) | none; the lowest p is 0.243 (P5) |
| Mean of the plasmid means | 0.996 (Results) | 1.0092 |

## Numbers that do not reproduce
- The Results print average relative growth rates of 0.936 (susceptible), 1.017 (NIT-R), 1.033 (CIP-R) and 0.996 (STR-R). The source data give 0.934, 1.017, 1.042 and 1.009 (means of all plasmid wells). Only NIT-R matches.
- Other sheets: in Sen_NIT-R, 213 of 217 published r values match growthcurver within 1e-6; in CIP-R, 72 of 81. The rows that differ have no unique well in the raw data. These sheets are not in the benchmark.

## Decisions the scientist owns
- The background correction (min), all readings (t_trim 0), the excluded wells.
- The reference (the plasmid-free host) and the rule (the host well of the same block).
