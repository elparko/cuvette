# Aledo 2022: Michaelis-Menten fit of the ONPG data in renz

## Citation
- Aledo JC. renz: An R package for the analysis of enzyme kinetic data. BMC Bioinformatics 23:182 (2022). DOI: 10.1186/s12859-022-04729-4. License CC BY 4.0.
- Data: data set ONPG of the R package renz 0.2.1 (GPL >= 2). Replicate v6 is Table 2 of the paper.
- I read the full text (Europe PMC, PMC9112463).

## Data
- Ten ONPG concentrations (0.05 to 30 mM) and the initial rate. The package gives the rate in mM/min; Table 2 prints it in µM/min.

## Tool
- drc adapter, `fit_enzyme_kinetics` with `model: michaelis-menten` (drc MM.2).
- Independent checks: SciPy (`check.py`, `check.out`) and renz dir.MM (Km 2.479, Vmax 0.184).

## Numbers to reproduce
| Quantity | Paper | Computed |
|---|---|---|
| Km, nonlinear | 2.5 mM | 2.4793 mM |
| Vmax, nonlinear | 0.18 mM/min | 0.18407 mM/min |
| Km and Vmax, unweighted Lineweaver-Burk (trap) | 5.6 mM, 0.34 mM/min | 5.64, 0.344 |
| Km and Vmax, weighted double-reciprocal | 2.5 mM, 0.19 mM/min | 2.47, 0.186 (weights v^4) |

## Decisions the scientist owns
- The Michaelis-Menten model and a nonlinear fit, not a double-reciprocal line.
