# Jang 2016: serum AFP, PIVKA-II, osteopontin and Dickkopf-1 to tell HCC from cirrhosis

## Citation
- Jang ES, Jeong S-H, Kim J-W, Choi YS, Leissner P, Brechot C. Diagnostic performance of alpha-fetoprotein, protein induced by vitamin K absence, osteopontin, Dickkopf-1 and its combinations for hepatocellular carcinoma. PLOS ONE 11(3):e0151069 (2016). DOI: 10.1371/journal.pone.0151069. License CC BY 4.0.
- Data: Dryad, CC0. Copy on Zenodo, record 4952129.
- I read the full text on the PLOS site. The numbers below come from the abstract and the Results text.

## Data
- One Excel sheet, 401 patients, 57 columns: the group (HCC_studyGr, 1 HCC, 0 cirrhosis), sex, age, etiology, liver disease, Child-Turcotte-Pugh score and class, MELD, the four markers, and 0/1 copies of each marker at several cut-offs.
- No marker has a missing value. No marker value equals one of the published cut-offs.
- fetch.sh writes hcc_biomarkers.csv. Local path: /Volumes/T7/guided-analysis/data/jang2016-hcc-biomarkers/

## Tool
- pROC 1.19.1 `roc()`, `ci.auc()` (DeLong). Adapter `catalog/proc`, tools `roc_curve` and `accuracy_at_threshold`.
- Independent check: a NumPy implementation of the DeLong variance in Python (`check.py`, output in `check.out`).

## Numbers to reproduce
| Marker | Paper AUC (95% CI) | Computed | Paper Sn / Sp at cut-off | Computed |
|---|---|---|---|---|
| AFP | 0.786 (0.740-0.831) | 0.7856 (0.7404-0.8309) | 62% / 90.2% at 20 ng/mL | 0.6202 / 0.9016 |
| PIVKA-II | 0.729 (0.680-0.779) | 0.7294 (0.6799-0.7789) | 51.0% / 91.2% at 10 ng/mL | 0.5096 / 0.9119 |
| OPN | 0.660 (0.606-0.713) | 0.6596 (0.6061-0.7131) | 46.2% / 80.3% at 100 ng/mL | 0.4615 / 0.8031 |
| DKK-1 | 0.665 (0.612-0.718) | 0.6650 (0.6120-0.7180) | 50.0% / 80.8% at 500 pg/mL | 0.5000 / 0.8083 |

## Not items
- The subgroup AUCs (BCLC 0/A, HBV, AFP below 20 ng/mL) need subsets of rows. They are not in this case.
- The combinations (AFP or DKK-1, and others) use the 0/1 columns. They are not in this case.
- Trap: the AUC of the 0/1 column AFP_20_ng is 0.7609.
