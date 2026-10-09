# Sriphoosanaphan 2021: the sample size calculation of a vitamin D trial in chronic hepatitis C

## Citation
- Sriphoosanaphan S, Thanapirom K, Kerr SJ, et al. Effect of vitamin D supplementation in patients with chronic hepatitis C after direct-acting antiviral treatment: a randomized, double-blind, placebo-controlled trial. PeerJ 9:e10709 (2021). DOI: 10.7717/peerj.10709. License CC BY 4.0.
- I read the Sample size calculation section of the full text on PMC (PMC7879942).

## Inputs that the paper states
- Primary outcome for the calculation: the change in TGF-beta1 from baseline to week 6.
- Mean difference in the change between the arms: 81 (pg/mL in the text; the tables use ng/mL). Pooled SD: 110.
- Power 80%, two-sided significance level 5%.

## Tool
- pwr 1.3.0 `pwr.t.test(d = 81/110, power = 0.8)`. Adapter `catalog/pwr`, tool `power_t_test`.
- Independent check: Python statsmodels `TTestIndPower` (`check.py`, output in `check.out`).

## Numbers to reproduce
| Value | Paper | Computed |
|---|---|---|
| Patients per arm | 30 | 29.94, rounded up to 30 |
| Patients in total | 60 (30 per group) | 60 |

## Not reproduced or not items
- The paper inflates the sample size to 37 per arm for dropout and does not state the rate. 37 matches about 19%.
- Trap: a one-sided test gives 23.51 per arm.
