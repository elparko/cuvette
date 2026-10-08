# Bemis 2015: Cardinal, an R package for statistical analysis of MS imaging experiments

Citation: Bemis KD, Harry A, Eberlin LS, Ferreira C, van de Ven SM, Mallick P, Stolowitz M, Vitek O. Bioinformatics 31(14):2418-2420 (2015).
DOI: 10.1093/bioinformatics/btv146 (PMC4495298). Read in full via PMC.

## Data
- Source: Bioconductor package CardinalWorkflows 1.44.0, dataset `pig206` (DESI-MSI of a whole pig fetus cross-section; Aston Labs: Eberlin, Ferreira, Cooks).
- Also in the package: `cardinal` (DESI of an oil painting) and `rcc` (human renal cell carcinoma, de-identified; not used here).
- URL: https://bioconductor.org/packages/CardinalWorkflows/ (file CardinalWorkflows_1.44.0.tar.gz, 56 MB; data in data/pig206.rda).
- License: Artistic-2.0.
- Data differ from the paper: the paper's pig fetus set has five adjacent sections (28,016 pixels). `pig206` is one section (4,959 spectra per the package vignette).
- R is not installed here. The agent needs R with Bioconductor, or must read the .rda file another way.

## Tool
- Cardinal (R, Bioconductor). The paper used Cardinal 1.x. Current release is 3.14.0 (Bioconductor 3.23). The API changed in version 3 (`peakProcess`, `spatialShrunkenCentroids` with `weights=`).

## Method steps (paper, in order)
1. Pre-processing: normalization (example: total ion current), baseline correction (example: median interpolation), peak detection (example: LIMPIC), peak alignment (example: mean spectrum). The paper gives no parameter values. (Main text.)
2. Reduce 10,200 features to 298 peaks. Dataset size falls from 2.2 GB to 63.7 MB. (Main text.)
3. Exploration: PCA, first 20 components. 86.9 s on raw data, 4.3 s on peaks. (Main text.)
4. Segmentation: spatial shrunken centroids with spatially aware distance. 241 s to 827 s on picked peaks. Result: 11 segments. (Fig. 1, main text.)
5. Peak selection per segment against the mean spectrum: liver segment 92 peaks enriched and 153 absent; heart segment 23 enriched and none absent. (Main text.)
6. Hardware: MacBook Pro, 2.6 GHz Intel Core i7, 16 GB.
7. Classification (PLS-DA, OPLS-DA, spatial shrunken centroids) is described. The paper reports no classification accuracy.

## Parameters from the package workflow (vignette MSI-segmentation, Cardinal 3.x; not the paper)
- Mean spectrum with `summarizeFeatures`; TIC with `summarizePixels`.
- `normalize(method="tic")`, then `peakProcess(SNR=3, sampleSize=0.1, tolerance=0.5, units="mz")`. Result: 687 peaks.
- `PCA(ncomp=3)`, `NMF(ncomp=3, niter=30)`.
- `set.seed(1)`; `spatialShrunkenCentroids(weights="adaptive", r=2, k=8, s=2^(1:6))`. Six models. Higher `s` gives fewer segments.
- The vignette picks the model with s=32 (6 segments) because s=64 (3 segments) loses the heart. It reads liver, heart and brain as segments 4, 5, 6.
- `topFeatures()` ranks peaks by t-statistic per segment. Hand-picked peaks: m/z 187.36 heart, 840.43 brain, 537.08 liver.
- Dataset facts from the vignette: 4,959 spectra and 10,200 m/z values.

## Reported numbers to reproduce
- Paper (five-section data, not reproducible on pig206): 28,016 pixels, 10,200 features, 298 peaks, 11 segments, liver 92 enriched and 153 absent, heart 23 enriched and 0 absent.
- Vignette (pig206): 4,959 spectra, 10,200 m/z, 687 peaks, six models for s=2,4,8,16,32,64, chosen model has 6 segments.

## Decisions the scientist owns (choice)
- Normalization: TIC (vignette); the paper names TIC as an example.
- Peak picking: SNR 3, 10% of spectra as reference, merge tolerance 0.5 m/z (vignette).
- Segmentation weights: adaptive; radius r=2; maximum segments k=8 (vignette).
- Sparsity s: highest value that keeps a meaningful organ (heart); s=32 (vignette).
- Region labels (liver, heart, brain) come from the optical image, not from the algorithm.
- Replication unit: not applicable. One section, so segments are descriptive, not tested.
