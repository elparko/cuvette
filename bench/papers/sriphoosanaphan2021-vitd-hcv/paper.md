# Sriphoosanaphan 2021: vitamin D and liver fibrosis markers after hepatitis C cure, a randomized trial

## Citation
- Sriphoosanaphan S, Thanapirom K, Kerr SJ, Suksawatamnuay S, Thaimai P, Sittisomwong S, Sonsiri K, Srisoonthorn N, Teeratorn N, Tanpowpong N, Chaopathomkul B, Treeprasertsuk S, Poovorawan Y, Komolmit P. Effect of vitamin D supplementation in patients with chronic hepatitis C after direct-acting antiviral treatment: a randomized, double-blind, placebo-controlled trial. PeerJ 9:e10709 (2021). DOI: 10.7717/peerj.10709. License CC BY 4.0.
- Data: Dryad DOI 10.5061/dryad.573n5tb4h, CC0. Copy on Zenodo, record 4404285.
- I read the full text (Europe PMC, PMC7879942). The numbers below come from Table 3 and the abstract.

## Data
- One Excel sheet, 75 patients, 24 columns: Case, Group (A or B), Sex (1 male, 2 female), Age (a range), BW, Height, BMI, FIB4, APRI, and VD, AST, ALT, TGF, TIMP, MMP, P3NP at baseline (suffix 0) and week 6 (suffix 6). Plt has a baseline value only.
- The readme does not say which group got vitamin D. Group A has 37 patients, 16 men, and mean 25(OH)D 17.2 at baseline and 41.8 at week 6. These match the vitamin D arm in Tables 2 and 3.
- The readme lists a column FIB5. The sheet calls it FIB4.
- fetch.sh writes vitd_hcv.csv. See case.yaml, section data, for the preprocessing.
- Local path: /Volumes/T7/guided-analysis/data/sriphoosanaphan2021-vitd-hcv/vitd_hcv.csv

## Tool
- SciPy `ttest_ind` with `equal_var=True`. Adapter `catalog/biostats`, tool `compare_two_groups`.
- Independent check: R 4.6.1 `t.test(var.equal = TRUE)` on changes computed from the raw columns (`check.R`, output in `check.out`).

## Method steps
1. For each marker, the change is the week-6 value minus the baseline value.
2. Student t-test of the change, vitamin D arm against placebo arm, two-sided, 95% confidence interval.

## Numbers to reproduce
| Marker | Paper: difference (95% CI), p | Computed |
|---|---|---|
| 25(OH)D | 23.1 (19.7 to 26.4), p < 0.001 | 23.086 (19.734 to 26.439) |
| AST | -0.7 (-4.2 to 2.8), p 0.69 | -0.702 (-4.201 to 2.797), p 0.690 |
| ALT | -3.0 (-7.5 to 15), p 0.20 | -2.968 (-7.508 to 1.571), p 0.197 |
| TGF-beta1 | -0.6 (-2.8 to 1.7), p 0.63 | -0.554 (-2.839 to 1.731), p 0.630 |
| TIMP-1 | -5.5 (-26.4 to 15.3), p 0.60 | -5.510 (-26.361 to 15.341), p 0.600 |
| MMP-9 | 122.9 (-69.0 to 314.8), p 0.21 | 122.92 (-68.96 to 314.81), p 0.206 |
| P3NP | -0.1 (-2.4 to 2.2), p 0.92 | -0.110 (-2.372 to 2.151), p 0.923 |

- The printed ALT upper bound (15) is a misprint. The computed value is 1.57.
- The Welch test gives the same values to the printed digits, except the 25(OH)D upper bound (26.52).
- A comparison of the week-6 values only gives 129.06 for MMP-9 (p 0.127). This is the trap item.

## Decisions the scientist owns
- The outcome: the change from baseline, not the week-6 value.
- Unpaired test between the arms.
- Equal variances (Student) or Welch.
- Alpha 0.05, two-sided.
- No correction for the four markers. The paper does not correct.
