---
name: check-search-settings
description: Steps to check that search settings fit the data before a long Sage run. Use it when the scientist is unsure about tolerances or the instrument type.
---

# Check the search settings

1. Ask which instrument made the MS2 scans and whether the fragment scans are high or low resolution.
2. For high-resolution scans, suggest a fragment tolerance in ppm. For ion trap scans, suggest Da. The scientist decides.
3. Ask for the precursor mass accuracy of the instrument. Use it as the precursor tolerance.
4. Ask if the sample was reduced and alkylated. If yes, the fixed modification is C+57.0215.
5. Ask which enzyme cut the sample.
6. Run search_sage on one file. Read n_psm and n_decoy_psm.
7. If the decoy share is above 40% of the PSMs, tell the scientist that most matches look random. Check the tolerances and the database.
