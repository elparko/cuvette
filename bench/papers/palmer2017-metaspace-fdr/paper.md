# Palmer 2017: FDR-controlled metabolite annotation for high-resolution imaging MS

Citation: Palmer A, Phapale P, Chernyavsky I, Lavigne R, Fay D, Tarasov A, Kovalev V, Fuchser J, Nikolenko S, Pineau C, Becker M, Alexandrov T. Nature Methods 14:57-60 (2017).
DOI: 10.1038/nmeth.4072
Text read: accepted manuscript at HAL (hal-01467553), including the supplementary notes.

## Data
- Source: MetaboLights MTBLS313 (mouse and rat brain MALDI-FTICR imzML) and MTBLS317 (simulated data).
- URL: https://www.ebi.ac.uk/metabolights/MTBLS313 and https://www.ebi.ac.uk/metabolights/MTBLS317
- License: EMBL-EBI Terms of Use (open access, set by the study files).
- Files on disk: MBa2s1.zip, MBa2s2.zip, MBa2s3.zip (about 35 MB each; each holds one imzML and one ibd file), sim001_twosquares.zip (124 MB), and the study tables (MAF files list the published annotations).
- Mouse animal a2, serial sections s1 to s3 (Bregma 1.42 mm) are the three sections used for the 51-of-73 overlap claim.
- Not downloaded: the rat files RB_a*_data.zip and uncentroided data (1.4 to 2.4 GB each).
- The mapping of MBa2s1 to animal a2 section s1 comes from the file names. The paper does not state the file names.

## Tool
- METASPACE annotation engine (today's version), through the web app or the python client `metaspace2020`.
- The paper used the engine pySM (the first version of the METASPACE engine). Today's engine uses different scoring and databases. Counts will not match exactly.

## Method steps (in order)
1. Tissue: adult wild-type mice. Five coronal sections per brain. Sections s1 to s3 are serial sections at Bregma 1.42 mm. (Main text, Methods.)
2. Matrix: alpha-cyano-4-hydroxycinnamic acid (HCCA), ImagePrep sprayer. (Supp. Note 1.)
3. Acquisition: 7T FTICR solariX XR (Bruker), positive mode, 50 um raster, 10 laser shots per pixel, resolving power 130000 at m/z 400, m/z range 100 to 1200. (Supp. Note 1.)
4. Calibration: animal a1 one-point lock mass at m/z 798.540963 (C42H82NO8P+K+). Animal a2 internal calibration with HCCA cluster m/z 379.092462, m/z 734.569432 and m/z 798.540963. (Supp. Note 1.)
5. Export: centroids to imzML from SCiLS Lab 2016a. (Supp. Note 1.)
6. Ion images: tolerance 2.5 ppm. Hot-spot removal: pixels above the 99th percentile set to the 99th percentile. Then a 3x3 median filter. (Supp. Note 1, signal processing.)
7. Annotation: metabolite database HMDB (version 2.5; 7708 carbon-containing entries in the supplement), adducts +H, +Na, +K, FDR 0.1, m/z tolerance 2.5 ppm. Score: Metabolite-Signal Match (MSM). (Main text, Results.)
8. FDR: target-decoy. Decoy ions use implausible adducts. The engine picks the smallest MSM cutoff that gives the chosen FDR. (Main text.)
9. Resolution test: m/z tolerance 1, 2.5, 5, 30, 100, 1000, 5000 ppm. The count of FDR-controlled annotations falls as tolerance grows. (Fig. 2i.)
10. Validation: 16 of 103 annotations checked by LC-MS/MS (MTBLS378, not downloaded). (Supp. Note 3.)

## Reported numbers
- FDR level 0.1, tolerance 2.5 ppm, adducts +H/+Na/+K (Fig. 2e-i).
- 103 annotations overall across the ten datasets (main text).
- 16 annotations validated by LC-MS/MS (main text).
- In animal a2, 51 of 73 sum formulas annotated in all three serial sections (Fig. 2e).
- Only two sum formulas annotated in animal a1 only (Fig. 2e).
- Exact-mass filtering gives lowest FDR 0.25 for 10 annotations. MSM gives FDR 0 for the same 10 (Fig. 2h).
- Mostly phospholipids: PC, PE, SM, PA (Supp. Note 1, Table S5).
- Simulated data (MTBLS317): 300 HMDB formulas plus 300 random formulas, R=140000 at m/z 400, 3500 +/- 127 peaks per pixel in a square, Gaussian sigma 0.015.

## Checks made on the downloaded tables
- MTBLS313 MAF has 236 rows. It has 103 unique sum formulas. This matches the 103 in the paper.
- In the MAF, 51 sum formulas appear in all three columns a2s1, a2s2, a2s3. This matches the 51 in the paper.
- The union of a2s1 to a2s3 is 66 sum formulas. The union of a2s1 to a2s5 is 76. Neither is 73. The "73" is not reproduced by the table.
- Adduct rows: +K 102, +Na 72, +H 62.
- MTBLS317 MAF has 300 rows.

## Decisions the scientist owns (paper choice)
- Database: HMDB.
- Adducts: +H, +Na, +K.
- FDR level: 0.1.
- m/z tolerance: 2.5 ppm.
- Replication unit: tissue section; animals a1 and a2 are the biological replicates; s1 to s3 are technical (serial) replicates.
- Hot-spot removal at the 99th percentile and 3x3 median filter before image scoring.
- Annotations are sum formulas, not structures.
