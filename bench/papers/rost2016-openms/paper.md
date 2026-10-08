# Rost 2016: OpenMS, an open-source platform for mass spectrometry data analysis

Citation: Rost HL, Sachsenberg T, Aiche S, Bielow C, Weisser H, et al. Nature Methods 13(9):741-748 (2016).
DOI: 10.1038/nmeth.3959
Text read: accepted manuscript and supplementary PDF (MDC Berlin repository). The main text is a software overview and has no results table. The parameters below come from the supplementary tutorial, section 5 "Metabolomics".

## Data
- Source: OpenMS tutorial Example_Data, folder Metabolomics (University of Tuebingen archive).
- URL: https://abibuilder.cs.uni-tuebingen.de/archive/openms/Tutorials/Example_Data/Metabolomics/
- License: not stated on the archive. OpenMS software is BSD 3-clause. Treat the data as tutorial data of the OpenMS project and check before redistributing.
- Files: six mzML files, 1.3 GB in total (about 200 to 236 MB each), plus HMDB mapping tables (17 MB).
- Design (supplement): two spike-in levels, 0.5 mg/l (files PStd_050_1..3) and 10.0 mg/l (files PStd_10_1..3), in male blood background, triplicates, seven isotopically labelled compounds.
- Not downloaded: Metabolite_ID_SpectraDB_positive.mzML (158 MB) and MetaboliteSpectralDB.mzML (113 MB).

## Tool
- OpenMS TOPP tools (command line): FeatureFinderMetabo, MapAlignerPoseClustering, FeatureLinkerUnlabeledQT, TextExporter, FileConverter, AccurateMassSearch.
- pyOpenMS offers the same functions in python. The paper used OpenMS 2.0 in KNIME. Checks here used pyOpenMS 3.6.0.

## Method steps (supplement section 5, in order)
1. Load all six mzML files. Process each file in a loop.
2. FeatureFinderMetabo per file with: common chrom_fwhm = 8.0; mtd trace_termination_criterion = sample_rate; mtd min_trace_length = 3.0; mtd max_trace_length = 600.0; epd width_filtering = off.
3. MapAlignerPoseClustering (output featureXML): max_num_peaks_considered = -1; superimposer mz_pair_max_distance = 0.005; superimposer num_used_points = 10000; pairfinder distance_RT max_difference = 20.0; pairfinder distance_MZ max_difference = 20.0, unit ppm.
4. FeatureLinkerUnlabeledQT: distance_RT max_difference = 40.0; distance_MZ max_difference = 20.0, unit ppm.
5. TextExporter writes one table of features across samples.
6. FileConverter to featureXML, then AccurateMassSearch with PositiveAdducts.tsv, NegativeAdducts.tsv, HMDBMappingFile.tsv, HMDB2StructMapping.tsv. Output: mzTab. The supplement lists no other parameters, so defaults apply.
7. Downstream (section 5.5): compare the two spike-in levels to find the differential compounds. The supplement gives a prepared R workflow; the statistical test and cutoffs are not stated in the part I read.

## Reported numbers
- The supplement gives no feature counts and no list of the seven spike-in compounds.
- The supplement says the goal is to detect and quantify seven differential spike-in compounds.
- Main text: OpenMS provides 185 tools (abstract).

## Numbers computed from the data
- File 2012_02_03_PStd_050_1.mzML: 7173 spectra, all MS level 1, centroided, first spectrum 383 peaks, RT 1.917 s to 1800.085 s.
- pyOpenMS 3.6.0 with the step 2 parameters and all other values at default: 1880 mass traces, 2255 elution peaks, 1887 features.
- These counts are for one file. Different OpenMS versions give different counts.

## Decisions the scientist owns (paper choice)
- Feature detection settings: chrom_fwhm 8 s, trace length 3 to 600 s, width filtering off.
- Alignment and linking tolerances: 20 ppm in m/z; 20 s (alignment) and 40 s (linking) in retention time.
- Database for identification: HMDB, with positive and negative adduct lists.
- Replication unit: file (injection); three technical replicates per level.
- Comparison: 0.5 versus 10.0 mg/l spike-in. The statistical test is not stated in the part I read.
