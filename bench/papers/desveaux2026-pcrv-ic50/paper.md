# Desveaux 2026: IC50 of anti-PcrV antibodies

## Citation
- Desveaux JM, Faudry E, Contreras-Martel C, et al. Neutralizing human monoclonal antibodies that target the PcrV component of the type III secretion system of Pseudomonas aeruginosa act through distinct mechanisms. eLife (2026). DOI: 10.7554/eLife.105195. License CC BY 4.0.
- Data: Figure 6 source data 1 (Excel), CC BY 4.0.
- I read the full text (eLife API JSON). The numbers come from the Results, Figure 4 and Figure 6 supplement 1.

## Data
- Sheets Medi3902, 30-B8 and P3D6: a cytotoxicity block and an injection block, each with experiment, antibody, concentration (µg/mL), raw signal, the means of the no-IgG and the non-infected controls, and the normalized value.
- Sheet Fig_supp: the injection assay of 30-B8 against the PcrV variants V1 to V5.
- The P3D6 injection block has one more column in the data rows than in the header. fetch.sh reads the cells by type.

## Tool
- drc adapter, `fit_dose_response` with `model: 3PL` and `group_col: antibody` (or `variant`).
- Independent check: SciPy least squares (`check.py`, output in `check.out`).

## Numbers to reproduce
| Quantity | Paper | Computed (LL.3) |
|---|---|---|
| MEDI3902, injection | 117 ng/mL | 117.25 ng/mL |
| 30-B8, injection | 21.3 ng/mL | 21.307 ng/mL |
| P3D6, injection | 3.65 µg/mL | 3.6534 µg/mL |
| P3D6, cytotoxicity | 11.8 µg/mL | 11.792 µg/mL |
| 30-B8 against V2, V3, V4, V5 | 12.8, 11.2, 13.0, 10.5 ng/mL | 12.782, 11.202, 13.050, 10.452 ng/mL |

## Numbers that do not reproduce
- 30-B8, cytotoxicity: printed 45.2 ng/mL. LL.3 gives 6.70 µg/mL. LL.4 gives 45.18 ng/mL, so the paper probably used a four-parameter model for this curve.

## Decisions the scientist owns
- The three-parameter model (lower limit 0) and the use of the normalized response.
- The no-antibody wells at dose 0 in the fit.
