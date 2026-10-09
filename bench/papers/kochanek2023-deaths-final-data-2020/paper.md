# Kochanek 2023: Deaths, final data for 2020 (United States)

## Citation
- Kochanek KD, Murphy SL, Xu JQ, Arias E. Deaths: Final data for 2020. National Vital Statistics Reports 72(10). Hyattsville, MD: National Center for Health Statistics. 2023. DOI: 10.15620/cdc:131355
- Read on 2026-10-09 at https://www.cdc.gov/nchs/data/nvsr/nvsr72/nvsr72-10.pdf. Public domain.
- Standard population: Klein RJ, Schoenborn CA. Age adjustment using the 2000 projected U.S. population. Healthy People Statistical Notes 20 (2001).

## Data
- Tables 2 and 5 of the report print the death rate per 100,000 in 11 age groups (under 1, 1-4, 5-14, 15-24, 25-34, 35-44, 45-54, 55-64, 65-74, 75-84, 85 and over). Table 1 and Table 5 print the age-adjusted rate.
- catalog/epi-rates/data/make_fixtures.R writes nchs_2020_age_rates.csv with five groups (all causes 2020, all causes 2019, diseases of heart 2020, males 2020, females 2020) and the standard weights. fetch.sh copies the file to the data folder and checks its SHA-256 sum.
- Local file: /Volumes/T7/guided-analysis/data/kochanek2023-deaths-final-data-2020/nchs_2020_age_rates.csv

## Tool
- Original: direct age standardization as in the Technical Notes of the report. R package epitools, function ageadjust.direct.
- Adapter route: epi-rates adapter, tool standardize_rates with method direct and standard us2000_11.

## Sample design
All resident deaths of the United States registered in 2019 and 2020. The age-adjusted rate weights the 11 age-specific rates with the year 2000 standard population (total 1,000,000).

## Method steps
1. Read the age-specific rates of each group.
2. Multiply each rate by the standard weight of its age group and divide the sum by the total weight.
3. Divide the adjusted rate of 2020 by the adjusted rate of 2019. Divide the male rate by the female rate.

## Numbers to reproduce
| Quantity | Report | check.py (no package) |
|---|---|---|
| Age-adjusted rate, all causes, 2020 | 835.4 | 835.4200 |
| Age-adjusted rate, all causes, 2019 | 715.2 | 715.2437 |
| Age-adjusted rate, heart disease, 2020 | 168.2 | 168.1926 |
| Age-adjusted rate, males, 2020 | 998.3 | 998.3367 |
| Age-adjusted rate, females, 2020 | 695.1 | 695.0589 |
| Ratio 2020 to 2019 | 1.168 (835.4 / 715.2) | 1.16802 |
| Ratio male to female | 1.436 (998.3 / 695.1) | 1.43633 |

The report also prints the crude rates (1,027.0 in 2020 and 869.7 in 2019) and the numbers of deaths. The ratio of the crude rates (1.181) is not a benchmark item. It is the trap value of a comparison without age adjustment.
