# Test data sources

| File | Source | License |
| --- | --- | --- |
| bsa3_ms2.mzML | MS2 spectra cut from the OpenMS example file BSA3.mzML (https://github.com/OpenMS/OpenMS/tree/develop/share/OpenMS/examples/BSA) | not confirmed (OpenMS software is BSD-3-Clause; the data license is not stated; bench/papers/lazear2023-sage/paper.md) |
| peptide_lcms.mzML | The OpenMS test input for FeatureFinderCentroided (test features_openms_reference in adapter.yaml) | not confirmed (OpenMS software is BSD-3-Clause; no license is stated for the test files) |
| sage_psms.idXML | A Sage search of the three OpenMS BSA example files against the standard proteins with reversed decoys, saved as idXML (test index_standards in adapter.yaml) | not confirmed (made from the OpenMS BSA example data; same as bsa3_ms2.mzML) |
| standards_td.fasta | standards.fasta of catalog/sage/data (made by bench/papers/lazear2023-sage/fetch.sh) plus one decoy sequence with the prefix DECOY_ for each protein. The decoys are not plain reversed sequences. The decoy method is not confirmed. | not confirmed (same as bsa3_ms2.mzML) |
| pi1.idXML | not confirmed. This repo has no record of the origin of the file. | not confirmed |
