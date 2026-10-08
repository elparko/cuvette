# Alexandrov 2019: METASPACE, a community knowledge base of spatial metabolomes

Citation: Alexandrov T, et al. METASPACE: a community-populated knowledge base of spatial metabolomes in health and disease. bioRxiv (2019), posted 3 February 2019.
DOI: 10.1101/539478
Text read: bioRxiv full text, first 100,000 characters (results and discussion). The methods and data availability sections were not seen in the text I fetched.
Engine paper: Palmer 2017 (see palmer2017-metaspace-fdr).

## Data
- Source: public METASPACE datasets from Michael et al. 2022, project "AP-MALDI-PPI Mouse Brain" (AP-MALDI with plasma post-ionization, mouse brain lipids, positive mode, qTOF, resolving power 60000 at m/z 700).
- Dataset ids: 2022-08-16_10h14m23s (MouseBrain_PlasmaPI_Pos20um, 20 um pixels) and 2022-08-16_12h31m33s (MouseBrain_PlasmaPI_Pos_TIMS, 30 um pixels).
- URL: https://metaspace2020.org/ (GraphQL API at https://metaspace2020.org/graphql). No account needed for public datasets.
- License: METASPACE public datasets are CC BY 4.0 by platform policy. I did not check each dataset's license field; the API did not return one.
- Files on disk: annotation tables at FDR 10% (CSV) and dataset configuration (JSON), 3 MB total. Fetched on 2026-10-07 with metaspace2020 2.0.9.
- These datasets are not in the 2019 paper. The paper had no dataset ids in the text I read. Paper numbers cannot be reproduced exactly.

## Tool
- METASPACE python client `metaspace2020` (SMInstance), or the GraphQL API over http.

## Method steps (paper, in order)
1. Submit imzML data. The engine annotates molecular formulas against public databases (HMDB, ChEBI, LIPID MAPS, SwissLipids; PAMDB and ECMDB in methods). (Results.)
2. Score with the Metabolite-Signal Match score and target-decoy FDR. Report at levels 5%, 10%, 20%, 50%. (Results.)
3. Extract ion images at 3 ppm for four principal peaks (stated in the paper). The datasets here use 6 ppm in the engine configuration.
4. Browse and search annotations at FDR 10%. (Results.)
5. Co-localization uses FDR up to 50%. Network edges use cosine similarity above 0.35. (Results.)

## Reported numbers
- More than 3000 datasets in the abstract; over 3200 public datasets in the results.
- Growth: 1000 datasets a year.
- Over 6 million metabolite images, over 140 contributors, over 70 laboratories (January 2019).
- 101 datasets from seven pharma companies.
- A 10 GB dataset annotates in under 10 minutes on the default cloud cluster.
- Glutathione at FDR 10%: 519 annotations from 18 laboratories. Creatinine: 26.
- Up to 103 annotations per dataset at FDR 10%, most in the low hundreds (my reading of an ambiguous sentence).
- Cohen's kappa for polarity, laboratory, organ: 0.95, 0.85, 0.77.
- These counts describe the January 2019 database. They do not match today's database.

## Numbers computed from the downloaded annotations (2026-10-07)
- Dataset 10h14m23s, HMDB v4, +H only: 14 annotations at FDR 5%, 263 at 10%, 819 at 20%, 2069 at 50%.
- Dataset 10h14m23s, LipidMaps 2017-12-12: 144 at 5%, 414 at 10%, 903 at 20%, 1934 at 50%.
- Dataset 12h31m33s, HMDB v4: 46 at 5%, 123 at 10%, 279 at 20%, 1134 at 50%.
- Dataset 12h31m33s, LipidMaps 2017-12-12: 84 at 5%, 191 at 10%, 444 at 20%, 1456 at 50%.
- Engine configuration for both: adducts +H, charge 1, n_peaks 4, ppm 6, decoy sample size 20.

## Decisions the scientist owns (paper choice)
- FDR level: 10% for browsing and counting.
- Database: HMDB, LIPID MAPS or SwissLipids. For lipids, LIPID MAPS or SwissLipids. The choice changes the count.
- Adducts: the datasets here use +H only.
- Mass tolerance: 3 ppm in the paper; 6 ppm in these datasets' configuration.
- Annotation level: molecular formula only (MSI Level 2), not structure.
- Replication unit: dataset (one tissue section).
