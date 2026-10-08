# Delaney 2004: ESOL aqueous solubility, rule of five and descriptors with RDKit

## Citation
- Delaney JS. ESOL: estimating aqueous solubility directly from molecular structure. J Chem Inf Comput Sci 44(3):1000-1005 (2004). DOI: 10.1021/ci034243x. PMID 15154768.
- Rule of five: Lipinski CA et al. Adv Drug Deliv Rev 23:3-25 (1997). DOI: 10.1016/S0169-409X(96)00423-1 (cited for the cut-offs only; I did not read it here).
- Tool: Landrum G. RDKit: open-source cheminformatics. https://www.rdkit.org

## Data
- Delaney (ESOL) set as shipped by MoleculeNet/DeepChem: 1128 compounds with SMILES and measured log solubility (mol/L). The ESOL paper's own set is larger; this file is the public subset.
- URL: https://raw.githubusercontent.com/deepchem/deepchem/master/datasets/delaney-processed.csv (about 0.1 MB)
- License: the DeepChem repository is MIT licensed. The original data come from the ACS paper supporting information; the MoleculeNet release is widely used as open data. Status of the original supplement licence: not checked.
- Local path: /Volumes/T7/guided-analysis/data/delaney2004-esol/delaney-processed.csv
- Small molecules, no patient data.

## Tool
- RDKit 2026.03.6 (checked), pandas.

## Method steps
1. Parse each SMILES with `Chem.MolFromSmiles` (strip trailing spaces). All 1128 parse.
2. Compute molecular weight (`Descriptors.MolWt`), Crippen logP (`Crippen.MolLogP`), H-bond donors (`Lipinski.NumHDonors`), H-bond acceptors (`Lipinski.NumHAcceptors`), rotatable bonds (`Lipinski.NumRotatableBonds`), aromatic proportion (aromatic heavy atoms / heavy atoms).
3. Rule of five: violation if MW > 500, logP > 5, donors > 5, acceptors > 10.
4. ESOL equation: logS = 0.16 - 0.63 cLogP - 0.0062 MW + 0.066 RB - 0.74 AP. The equation is cited from the Walters blog post "Predicting aqueous solubility, it's harder than it looks" (practicalcheminformatics.blogspot.com, 2018-09), which states Delaney reported R2 0.74. I did not read the ACS full text.
5. Compare predicted and measured logS (R2 and RMSE).

## Numbers to reproduce (computed with RDKit 2026.03.6; the paper does not report these)
| Quantity | Value |
|---|---|
| Compounds | 1128 |
| Compounds with 0 rule-of-five violations | 1018 |
| With 1 or fewer violations | 1116 |
| With 2 or more violations | 12 |
| MW > 500 / logP > 5 / donors > 5 / acceptors > 10 | 9 / 97 / 10 / 8 |
| Mean MW | 203.9 |
| Measured logS mean / median / min / max | -3.05 / -2.86 / -11.6 / 1.58 |
| ESOL equation with RDKit Crippen logP: R2 vs measured | 0.752 |
| Same, RMSE (log units) | 1.10 |
| Predictions stored in the file: R2 / RMSE | 0.823 / 0.910 |
| Delaney reported R2 (secondary source) | 0.74 |
| Model built from | 2874 measured solubilities, nine descriptors (abstract, read via PubMed) |

## Decisions the scientist owns
- Descriptor definitions: RDKit Crippen logP differs from the Daylight cLogP in the paper.
- Acceptor and donor definitions (Lipinski module vs rdMolDescriptors). The counts above use the Lipinski module.
- Rule-of-five inequality (strict >, as in Lipinski) and how many violations are allowed (the usual rule allows one).
- Salts and multi-fragment molecules: kept as given.
