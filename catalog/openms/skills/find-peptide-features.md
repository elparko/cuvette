---
name: find-peptide-features
description: Steps to find peptide features in a centroided LC-MS file with FeatureFinderCentroided and report the settings. Use it when the scientist asks for features in a bottom-up proteomics file.
---

# Find peptide features

1. Run file_info on the mzML file. Read n_ms1_spectra and the retention time range.
2. Ask the scientist for the m/z tolerance, the charge range and the fewest scans in a mass trace.
3. Run find_peptide_features. The input must be centroided.
4. Read n_features. Run file_info on the featureXML file for the charge distribution.
5. Report the count with every setting.
6. Say that a feature is not an identification.
