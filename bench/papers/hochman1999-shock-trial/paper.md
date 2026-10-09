# Hochman 1999: SHOCK trial, early revascularization in cardiogenic shock

## Citation
- Hochman JS et al. Early revascularization in acute myocardial infarction complicated by cardiogenic shock. N Engl J Med 341(9):625-634 (1999). DOI: 10.1056/NEJM199908263410901
- Hochman JS et al. One-year survival following early revascularization for cardiogenic shock. JAMA 285(2):190-192 (2001). DOI: 10.1001/jama.285.2.190
- Hochman JS et al. Early revascularization and long-term survival in cardiogenic shock complicating acute myocardial infarction. JAMA 295(21):2511-2515 (2006). DOI: 10.1001/jama.295.21.2511
- The numbers come from the abstracts, read through Europe PMC on 2026-10-09. The full text of the 1999 paper is not open.

## Data
- Zenodo 10.5281/zenodo.14046978 (Iturrate E, 2024), files trial_deident.csv and survival_deident.csv. CC BY 4.0. De-identified data of the trial.
- fetch.sh downloads both files, checks their SHA-256 sums, joins them on the trial ID and writes shock_endpoints.csv (arm, died_30d, age_lt75, time_days, death) without the ID.
- Local file: /Volumes/T7/guided-analysis/data/hochman1999-shock-trial/shock_endpoints.csv

## Tool
- Original: SAS PROC FREQ, PROC LIFETEST and PROC PHREG, or R survival and survRM2.
- Adapter route: trial-endpoints adapter, tools compare_binary_endpoint (30-day death) and compare_survival_endpoint (hazard ratio, survival at 365 days, restricted mean survival time).

## Sample design
302 patients with cardiogenic shock after myocardial infarction, 152 randomized to early revascularization and 150 to initial medical stabilization, in 36 centers. The primary endpoint is death from any cause within 30 days. Follow-up of vital status lasted 1 to 11 years.

## Numbers to reproduce
| Quantity | Paper | check.py (no tool) |
|---|---|---|
| 30-day mortality, early revascularization | 46.7% | 46.71% |
| 30-day mortality, medical stabilization | 56.0% | 56.00% |
| Risk difference | -9.3 points | -9.29 points |
| 95% Wald interval | -20.5 to 1.9 | -20.51 to 1.94 |
| P value | 0.11 | 0.106 (chi-square without correction) |
| Hazard ratio, whole follow-up | 0.74 (0.57 to 0.97) | 0.744 (0.571 to 0.968) |
| Log-rank P | .03 | 0.0274 |
| 1-year survival | 46.7% and 33.6% | 46.71% and 33.56% |
| Difference in 1-year survival | 13.2 points (2.2 to 24.1) | 13.15 points (2.18 to 24.13) |

Values that do not reproduce are in expected.yaml and triage.md.
