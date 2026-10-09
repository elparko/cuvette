# Test data sources

| File | Source | License |
| --- | --- | --- |
| mini.csv | Written by hand for the tests: five rows, with one invalid SMILES and one salt. No script makes it. | synthetic, no third-party data |
| delaney-processed.csv | Not in the repository. data/fetch.sh downloads the ESOL data set (Delaney 2004) in the MoleculeNet release, https://raw.githubusercontent.com/deepchem/deepchem/108af2176a5f876c2df1df922baadb02d647c826/datasets/delaney-processed.csv, and checks its SHA-256 sum. | The DeepChem MIT license covers the DeepChem code. The values come from the ACS supporting information of Delaney (2004), which states no reuse license, so the repository does not redistribute the file. |
