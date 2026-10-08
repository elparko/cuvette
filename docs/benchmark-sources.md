# Sources of the expected values in the paper benchmark

This document tells where each expected value of the paper benchmark comes from.
It covers the 28 papers in `bench/papers/` and their 183 scored items.
The audit was done on 2026-10-08.

## Classes

Each item has a source class:

- **published**: a publication prints the value for the same quantity on the same data.
  Usually this is the paper of the case.
  For 11 items it is another publication on the same data, and the citation names it.
- **tutorial**: the official tutorial, vignette, user guide, example report, or test suite of the program prints the value.
- **computed**: no publication or tutorial prints the value.
  The benchmark authors computed it.

Each computed item also has an independence class:

- **independent**: a second computation uses a different program or a different code path from the adapter.
  Examples are R against Python, plain numpy against the adapter library, or a direct count of the raw file.
  The script and its output are in the paper folder as `check_<name>.py`, `.R` or `.sh` and `check_<name>.out`.
- **same path**: the only computation uses the program that the adapter runs.
  Such an item tests whether the agent drives the program correctly.
  It does not test whether the program gives the correct result.
- **unknown**: no record tells how the value was computed.

For published and tutorial items, the independence class is "not applicable".
Many of these items also have a check, and the table shows it.

The source class, the independence class and the check are in the `items` section of each `case.yaml`.
The exception is `love2014-deseq2-airway`, which has another owner.
Its classes are set in this document only.

## Totals

All 28 papers, 183 items:

| Class | Before the audit | After the audit |
| --- | ---: | ---: |
| Published | 15 | 26 |
| Official tutorial output | 39 | 43 |
| Computed, independent | 18 | 99 |
| Computed, same path | 108 | 15 |
| Computed, unknown | 3 | 0 |
| Total | 183 | 183 |

Notes on the "before" column:

- The "before" independence class comes from the records in each paper folder before the audit.
- Most of the 18 "independent" items before the audit had no saved script.
  A note in `runs-*.md` or `expected.yaml` described the second computation.
  Each of them now has a script and an output file.

By the kind of case, after the audit:

| Kind | Papers | Published | Tutorial | Computed, independent | Computed, same path |
| --- | ---: | ---: | ---: | ---: | ---: |
| Research paper | 8 | 15 | 0 | 17 | 7 |
| Tool tutorial or test suite | 20 | 11 | 43 | 82 | 8 |
| All | 28 | 26 | 43 | 99 | 15 |

## What the write-up can say

- 69 of 183 items (38%) are printed in a publication or in official program documentation.
- 99 items (54%) are computed by the benchmark authors and confirmed with a second program or code path.
- 15 items (8%) are computed with only the program that the adapter runs.
- In the 8 research papers, 15 of 39 items are printed in the paper.

"Cuvette reproduces published results" is true only for the 26 published items.
A correct sentence for all items is:
"Cuvette reproduces values that are published, printed in official documentation, or computed independently by the benchmark authors."

## The 15 same-path items

| Paper | Items | Reason |
| --- | --- | --- |
| alexandrov2019-metaspace | 5 annotation counts | METASPACE is a hosted service. A second query through the GraphQL API without the Python client gives the same counts, but the annotations come from the same engine. |
| delaney2004-esol | `zero_violations`, `logp_above_5` | The items are defined as RDKit Crippen counts. Open Babel gives different counts (see below). |
| lazear2023-sage | `psms_result_table`, `decoy_psms` | Only Sage makes this table. |
| rost2016-openms | `mass_traces` | The OpenMS command-line tool does not print this count. |
| love2014-deseq2-airway | 5 workflow counts | The workflow code runs R DESeq2 1.52.0, which the deseq2 adapter also runs. The same workflow code gives the printed workflow value (16637 genes) on the workflow's own version of the airway data. |

## Values that disagree

No expected value in `bench.yaml` was changed.

- **delaney2004-esol `zero_violations`** (expected 1018 ±5): Open Babel 3.1.0 gives 1000.
- **delaney2004-esol `logp_above_5`** (expected 97 ±5): Open Babel 3.1.0 gives 111.
  - Both programs use the Wildman-Crippen logP method, but their atom types are different.
  - For 299 of the 1128 molecules, the logP values differ by more than 0.1.
  - No evidence shows which program is correct, so the items stay RDKit counts with the class "same path".
- **rost2016-openms `features`** (expected 1887 ±100): the FeatureFinderMetabo algorithm finds 1887 features, and the TOPP tool finds the same 1887.
  - The featureXML file of the TOPP tool holds only 1783 features, because the tool drops 104 features with intensity 0.
  - A run that counts that file gets 1783, which is just outside the tolerance.
  - No source tells which count is the correct definition of a feature.

Values that agree, but with a known limit:

- **rossi1980-recidivism `ph_test_p_age`** (0.0007): the value is correct only for the lifelines test.
  - A hand calculation of the same test gives 0.00084.
  - R `cox.zph` from survival 3.x uses a different test. It gives 0.0145 with the km transform and 0.34 with the rank transform.
- **mahbod2024-nuinsseg `mean_dice_otsu`** (0.538 ±0.02): the value depends on the stain matrix.
  - The hematoxylin, eosin and DAB matrix of the adapter gives 0.538.
  - A matrix with only hematoxylin and eosin gives 0.565.
- **mahbod2024-nuinsseg `nuclei_label_masks`**: the released masks hold 35138 labels. Table 2 of the paper gives 30698. The cause is not known.
- **palmer2017-metaspace-fdr**: the paper gives 73 formulas as the base for its count of 51.
  - The MTBLS313 table gives 66 formulas for sections 1 to 3, and 76 for sections 1 to 5.
  - The number 73 is not reproduced.
- **bradley-photutils-100gaussians `sources_detected`** (82, exact): the adapter's smoothing kernel (13 by 13 pixels) gives 82.
  - The kernel of the segmentation guide (5 by 5 pixels) gives 83.
  - A tolerance of 1 would accept both kernels. The tolerance was not changed.
- **wolf2018-scanpy `leiden_clusters`** (7 ±1): leidenalg on an independently built neighbor graph gives 7 clusters for seven of the seeds 0 to 9, and 6 clusters for the other three.
  - All current and older tutorials print 8 at their own settings.
  - The tolerance accepts 6, 7 and 8.
- **rouault-gdal-autotest `band_std`**: the old note gave 22.986 as the sample standard deviation. The correct value is 22.957, which is inside the tolerance. The note is corrected.

## Scorer item flags

The computed score finds the logged number that is nearest to the expected value.
Without a `tool:` flag, it can match a number from an unrelated step.
The saved results of 2026-10-08 (Claude and qwen3) showed these wrong matches:

| Paper | Item | Wrong match | New flag |
| --- | --- | --- | --- |
| wolf2018-scanpy | `leiden_clusters` | run_pca, principal component 7 | `tool: cluster_leiden` |
| bemis2015-cardinal | `segments_s64` | process_peaks, the signal-to-noise setting 3 | `tool: segment_image` |
| bemis2015-cardinal | `segments_s32` | none yet. The flag keeps the match in the segmentation step. | `tool: segment_image` |
| delaney2004-esol | `two_or_more_violations` | compute_descriptors, the acceptor count of one molecule | `tool: rule_of_five` |
| delaney2004-esol | `zero_violations`, `logp_above_5` | none yet. The flag keeps the match in the rule-of-five step. | `tool: rule_of_five` |
| gowers2016-mdanalysis | `residues_chain_a`, `residues_chain_b` | inspect_trajectory, residues of the simulated protein | `tool: inspect_structure` |
| gramfort2013-mne-sample | `n100_latency_gfp` | load_raw, the high-pass setting 0.1 Hz | `tool: measure_peak` |
| gramfort2013-mne-sample | `strongest_grad_amplitude` | load_raw, the count of 204 gradiometers | `tool: measure_peak` |
| gramfort2013-mne-sample | 4 other peak items | none yet. The flag keeps the match in the peak step. | `tool: measure_peak` |
| bates2015-lme4-sleepstudy | `n_subjects` | inspect_data, rows for each day | `tool: fit_mixed_model` |
| palmer2017-metaspace-fdr | `formulas_in_all_three_sections` (reference) | compare_fdr_counts, off-sample count at FDR 20% | `tool: overlap_annotations` |

The effect of `bench rescore` on copies of the saved results:

- qwen3, gramfort2013-mne-sample: the computed score falls from 2 of 14 to 0 of 14.
  The qwen3 run did not measure a peak. Its two passes matched filter settings.
- qwen3, palmer2017-metaspace-fdr: the reference item changes from "matches" to "differs". Reference items are not scored.
- All other matches keep their pass or fail result. They now name the correct step.
  - In wolf2018-scanpy, both runs now match `n_clusters = 7` of the Leiden step.
  - In bemis2015-cardinal, all three runs now match `n_segments_s64 = 3`.

Limits that a `tool:` flag cannot fix:

- **bradley-photutils-100gaussians**, the three `net_flux_*` items: the tolerance is ±106.
  The median net flux of all apertures (925) falls inside it, and the Claude run matched that median for two items.
  The match is in the correct step but in the wrong number.
- **gowers2016-mdanalysis `residues_chain_b`**: chains A and B both have 214 residues.
  The score matches `residues_A`, the first equal value.
- **bemis2015-cardinal `segments_s32`**: the score matches `n_models = 6`, which comes before `n_segments_s32 = 6` in the same step.

## Not found

- No publication or tutorial prints these values on the benchmark data:
  - the bcftools, samtools and bedtools counts on the test files;
  - the IQ-TREE log-likelihood on the tutorial alignment;
  - a Leiden count at resolution 0.7 with the seurat gene selection;
  - the Sage counts on the BSA data;
  - the OpenMS feature counts on PStd_050_1;
  - the pyimzML example file values;
  - the MNE event counts for each id and the N100 values;
  - the FlowKit counts without compensation;
  - the photutils source count at 3 sigma and the injected fluxes;
  - the BBBC005 sample ratio and error;
  - the NuInsSeg Otsu Dice score;
  - the ImageJ blobs particle counts;
  - the GDAL warp size and zone values;
  - the vegan Shannon index, PERMANOVA and dispersion test for Management on the dune data;
  - the t statistic, p-value and confidence interval for the Student sleep data. The R help page runs this test, but it does not print the output.
- These full texts were not available:
  - Michael et al. 2022 (Analytical Chemistry 94:17494), the paper of the METASPACE data sets. The full text needs a subscription.
  - Delaney 2004, for its R squared. The full text needs a subscription.
  - Allison's SAS book, for a log-rank value on the Rossi data.
- No version number is given on the photutils guide pages.

## Data problem found during the audit

These files are listed in `bench.yaml` but are not in the T7 data folder on 2026-10-08:

- the four CSV files of alexandrov2019-metaspace;
- the MTBLS313 metabolite table (MAF) of palmer2017-metaspace-fdr.

The audit checks used a copy of the MAF from the EBI FTP server.
Run the `fetch.sh` of each paper again before the next benchmark run.

## Items for each paper

Each table gives the item, the expected value with its tolerance, the source class, the independence class, and the citation.
"Not asked" means that the request does not ask for the value (`in_answer: false`).
"Trap" marks the result of a wrong method. "Reference" marks a value that is shown but not scored.

### Alexandrov 2019: alexandrov2019-metaspace

Kind: research paper. Program: METASPACE (metaspace2020 Python client), through the metaspace adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `d1_lipidmaps_fdr10` | 414 exact | computed | same path | Computed with METASPACE, queried with metaspace2020 2.0.9 on 2026-10-07. Not in the paper. The paper does not use this dataset. The count can change if METASPACE processes the dataset again. Check: check_counts.py queries the METASPACE GraphQL API without the metaspace2020 client and counts the annotations by FDR level itself. It gives 414 on 2026-10-08. The annotations and their FDR come from the same METASPACE engine, so this check confirms the count but not the annotation. |
| `d1_hmdb_fdr10` | 263 exact | computed | same path | Computed with METASPACE, queried with metaspace2020 2.0.9 on 2026-10-07. Not in the paper. HMDB is the comparison database, so the run must find this value in a comparison run. Check: check_counts.py gives 263 on 2026-10-08 through the GraphQL API. The annotations come from the same METASPACE engine. |
| `d2_lipidmaps_fdr10` | 191 exact | computed | same path | Computed with METASPACE, queried with metaspace2020 2.0.9 on 2026-10-07. Not in the paper. The paper does not use this dataset. Check: check_counts.py gives 191 on 2026-10-08 through the GraphQL API. The annotations come from the same METASPACE engine. |
| `d2_hmdb_fdr10` | 123 exact | computed | same path | Computed with METASPACE, queried with metaspace2020 2.0.9 on 2026-10-07. Not in the paper. HMDB is the comparison database, so the run must find this value in a comparison run. Check: check_counts.py gives 123 on 2026-10-08 through the GraphQL API. The annotations come from the same METASPACE engine. |
| `d1_lipidmaps_fdr5` (not asked) | 144 exact | computed | same path | Computed with METASPACE, queried with metaspace2020 2.0.9 on 2026-10-07. Not in the paper. It shows how the count falls at the stricter FDR level of 5%. Check: check_counts.py gives 144 on 2026-10-08 through the GraphQL API. The annotations come from the same METASPACE engine. |

### Andrews 2010: andrews-fastqc

Kind: tool tutorial or test suite. Program: FastQC (Java command line), through the fastqc adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `good_total_sequences` | 250000 exact | tutorial | not applicable | Example report for the good file, Basic Statistics table. It gives 250000 sequences. Check: A plain Python count of the FASTQ records in the benchmark copy of the file gives 250000. Script check_basic_stats.py, output check_basic_stats.out. |
| `bad_total_sequences` | 395288 exact | tutorial | not applicable | Example report for the bad file, Basic Statistics table. It gives 395288 sequences. Check: The plain Python count in check_basic_stats.py gives 395288. |
| `sequence_length` | 40 exact | tutorial | not applicable | Basic Statistics table of both example reports. Both give a length of 40. Check: The plain Python count in check_basic_stats.py finds only reads of 40 bases in both files. |
| `good_gc_percent` (not asked) | 45 ±1 | tutorial | not applicable | Example report for the good file, Basic Statistics table. It gives a GC content of 45%. Check: The plain Python count in check_basic_stats.py gives 45.81 percent GC. FastQC prints the whole number 45. |
| `bad_gc_percent` (not asked) | 47 ±1 | tutorial | not applicable | Example report for the bad file, Basic Statistics table. It gives a GC content of 47%. Check: The plain Python count in check_basic_stats.py gives 47.29 percent GC. |
| `good_modules_not_pass` (not asked) | 0 exact | tutorial | not applicable | Summary of the example report for the good file. All 11 modules give PASS. |
| `bad_modules_warning` (not asked) | 4 exact | tutorial | not applicable | Summary of the example report for the bad file. Four modules give WARNING: per base sequence content, per sequence GC content, sequence duplication levels and overrepresented sequences. Two modules give FAIL. |

### Bates 2015: bates2015-lme4-sleepstudy

Kind: research paper. Program: lme4 with lmerTest (R), through the lme4 adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `fixed_intercept` | 251.405 ±0.01 | published | not applicable | Section 5.2, fixed-effects table of summary(fm1). The intercept is 251.405 ms. |
| `fixed_days` | 10.467 ±0.01 | published | not applicable | Section 5.2, fixed-effects table of summary(fm1). The slope is 10.467 ms per day. |
| `reml_criterion` | 1743.6 ±0.1 | published | not applicable | Section 5.2, first lines of summary(fm1). The REML criterion at convergence is 1743.6. The current lme4 vignette rounds it to 1744. |
| `sd_subject_intercept` | 24.74 ±0.05 | published | not applicable | Section 5.2, random-effects table of summary(fm1), 24.740. Section 1.2 gives 24.74. |
| `sd_subject_days` | 5.92 ±0.05 | published | not applicable | Section 5.2, random-effects table of summary(fm1), 5.922. Section 1.2 gives 5.92. |
| `sd_residual` | 25.59 ±0.05 | published | not applicable | Section 5.2, random-effects table of summary(fm1), 25.592. |
| `random_correlation` (not asked) | 0.066 ±0.01 | published | not applicable | Section 2.2 gives the correlation of the random slope and intercept as 0.066. The table in Section 5.2 rounds it to 0.07. |
| `lrt_chi2_days` | 23.54 ±0.1 | computed | independent | Computed with lme4 2.0.6 and lmerTest 3.2.1 on R 4.6.1. Not in the paper. The anova example in Section 5.2 compares random-effect structures, not the fixed Days effect. Check: The benchmark authors fitted both models by maximum likelihood with nlme 3.1.169 (lme), a different program from lme4. The chi-square is 23.5366 (check_lrt_chi2_days.R). |
| `n_subjects` (not asked) | 18 exact | published | not applicable | Section 5.2, summary(fm1). It gives 180 observations in 18 groups of Subject. |

### Belenky 2003: belenky2003-sleepstudy

Kind: tool tutorial or test suite. Program: statsmodels mixedlm (Python), through the biostats adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `days_slope` | 10.467 ±0.01 | published | not applicable | Not in the 2003 paper. Bates et al. 2015 (J Stat Softw 67(1), doi 10.18637/jss.v067.i01), Section 5.2, fixed-effects table of summary(fm1), print 10.467 for the same model on the same 180 rows. Check: lme4 2.0.6 in R 4.6.1 gives 10.4673 (check_mixed_model.R). The adapter uses statsmodels mixedlm. |
| `intercept` (not asked) | 251.405 ±0.01 | published | not applicable | Not in the 2003 paper. Bates et al. 2015 (J Stat Softw 67(1)), Section 5.2, fixed-effects table of summary(fm1), print 251.405. Check: lme4 2.0.6 in R 4.6.1 gives 251.4051 (check_mixed_model.R). |
| `se_days_random_slope` | 1.546 ±0.01 | published | not applicable | Not in the 2003 paper. Bates et al. 2015 (J Stat Softw 67(1)), Section 5.2, fixed-effects table of summary(fm1), print a standard error of 1.546 for Days. Check: lme4 2.0.6 in R 4.6.1 gives 1.5458 (check_mixed_model.R). |
| `se_days_random_intercept_trap` (not asked, trap) | 0.804 ±0.01 | computed | independent | Computed with statsmodels 0.15.0 mixedlm, random intercept only. Not in the 2003 paper. This is the result of the wrong model, which leaves out the random slopes. Its standard error is too small. The run must not report it as the result. Check: lme4 2.0.6 in R 4.6.1, with a random intercept only, gives 0.8042 (check_mixed_model.R). |
| `se_days_ols_trap` (not asked, trap) | 1.238 ±0.01 | computed | independent | Computed with statsmodels 0.15.0 OLS. Not in the 2003 paper. This is the result of OLS, which treats the 180 rows as independent. The run must not report it as the result. Check: R 4.6.1 lm gives 1.2382 (check_mixed_model.R). |
| `intercept_variance` (not asked) | 612.1 ±0.5 | published | not applicable | Not in the 2003 paper. Bates et al. 2015 (J Stat Softw 67(1)), Section 5.2, random-effects table of summary(fm1), print 612.09. as.data.frame(VarCorr(fm1)) in the same section prints 612.089963. The expected value 612.10 is inside the tolerance of 0.5. Check: lme4 2.0.6 in R 4.6.1 gives 612.100 (check_mixed_model.R). |
| `slope_variance` (not asked) | 35.07 ±0.1 | published | not applicable | Not in the 2003 paper. Bates et al. 2015 (J Stat Softw 67(1)), Section 5.2, random-effects table of summary(fm1), print 35.07. Check: lme4 2.0.6 in R 4.6.1 gives 35.072 (check_mixed_model.R). |
| `residual_variance` (not asked) | 654.94 ±0.5 | published | not applicable | Not in the 2003 paper. Bates et al. 2015 (J Stat Softw 67(1)), Section 5.2, random-effects table of summary(fm1), print 654.94. Check: lme4 2.0.6 in R 4.6.1 gives 654.940 (check_mixed_model.R). |

### Bemis 2015: bemis2015-cardinal

Kind: tool tutorial or test suite. Program: Cardinal (R, Bioconductor), through the cardinal adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `spectra` | 4959 exact | tutorial | not applicable | Vignette, data section. The text and the printed object give 4,959 spectra. Check: Checked on 2026-10-08 in the vignette "Segmentation of MS imaging experiments with Cardinal" (CardinalWorkflows 1.44.0, Bioconductor release, built with Cardinal 3.14.0), section 2. The printed object reads "MSImagingExperiment with 10200 features and 4959 spectra". |
| `mz_values` | 10200 exact | tutorial | not applicable | Vignette, data section. It gives 10,200 m/z values. The paper also gives 10,200 features for its five-section data. Check: Checked on 2026-10-08 in the same vignette, section 2. The text says "4,959 spectra with 10,200 m/z values". |
| `peaks` | 687 ±10 | tutorial | not applicable | Vignette, peak processing step, with Cardinal 3.14.0. It gives 687 peaks. The count depends on the random 10% sample and on the Cardinal version. Check: Checked on 2026-10-08 in the same vignette, section 2.1 (Pre-processing). The printed object has 687 features, and the text says "a centroided dataset with 687 peaks". The session information names Cardinal 3.14.0. |
| `segments_s32` | 6 ±1 | tutorial | not applicable | Vignette, table of the six fitted models. The model with s=32 has 6 segments. Check: Checked on 2026-10-08 in the same vignette, section 2.3. The printed table of the six models gives 6 clusters for r=2, k=8, s=32. |
| `segments_s64` | 3 ±1 | tutorial | not applicable | Vignette, table of the six fitted models. The model with s=64 has 3 segments and loses the heart. Check: Checked on 2026-10-08 in the same vignette, section 2.3. The printed table gives 3 clusters for r=2, k=8, s=64. |

### Bradley 2026: bradley-photutils-100gaussians

Kind: tool tutorial or test suite. Program: astropy and photutils (Python), through the astropy adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `sky_level` | 5.152 ±0.01 | tutorial | not applicable | Photutils background guide. sigma_clipped_stats with sigma=3 prints a median of 5.152. The true background is 5. Check: The benchmark authors repeated the 3-sigma clip in plain numpy (median and standard deviation, five iterations). It gives 5.1524. The guide prints 5.15244174. Script check_sky_sources_flux.py. |
| `sky_noise` | 2.094 ±0.01 | tutorial | not applicable | Photutils background guide. The same call prints a standard deviation of 2.094. The true noise is 2. Check: The same plain numpy clip gives 2.0942. The guide prints 2.09423739. Script check_sky_sources_flux.py. |
| `sources_detected` | 82 exact | computed | independent | Computed with photutils 3.0.0 with astropy 8.0.1, checked with a second method in SciPy only. Not in the guide. The segmentation guide uses a 1.5-sigma threshold and a 2D background, and it finds 86 sources. The benchmark uses 3 sigma and one global background. Check: The benchmark authors repeated the detection with scipy.ndimage only: Gaussian kernel of FWHM 3 over 13 by 13 pixels, threshold 3 times the clipped standard deviation, 8-connected labels of 10 pixels or more. It gives 82. With the 5 by 5 kernel of the segmentation guide the same method gives 83. Script check_sky_sources_flux.py. |
| `net_flux_48_70_200_33` | 895.4 ±106 | computed | independent | Computed with photutils 3.0.0, table of the injected sources of make_100gaussians_image. Not in the guide. The value is the injected flux of this source in the simulation table, not a measurement. The tolerance is three times the sky noise in the aperture. Check: The value is the injected flux in 100gaussians_params.ecsv, read as text. An aperture sum in plain numpy (radius 10, 10 by 10 subpixels, clipped-median sky in the 15 to 20 pixel annulus) gives 936.6, inside the tolerance. Script check_sky_sources_flux.py. |
| `net_flux_145_05_168_52` | 734.1 ±106 | computed | independent | Computed with photutils 3.0.0, table of the injected sources of make_100gaussians_image. Not in the guide. The value is the injected flux of this source in the simulation table, not a measurement. The tolerance is three times the sky noise in the aperture. Check: The value is the injected flux in 100gaussians_params.ecsv, read as text. The plain numpy aperture sum gives 760.2, inside the tolerance. Script check_sky_sources_flux.py. |
| `net_flux_355_56_252_20` | 873.9 ±106 | computed | independent | Computed with photutils 3.0.0, table of the injected sources of make_100gaussians_image. Not in the guide. The value is the injected flux of this source in the simulation table, not a measurement. The tolerance is three times the sky noise in the aperture. Check: The value is the injected flux in 100gaussians_params.ecsv, read as text. The plain numpy aperture sum gives 925.4, inside the tolerance. Script check_sky_sources_flux.py. |

### Caicedo 2019: caicedo2019-bbbc039

Kind: research paper. Program: Cellpose (Python), through the cellpose adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `true_nuclei_test` | 5720 exact | published | not applicable | Captions of Figures 3 and 4 and of Figure S2. The test set has 5,720 nuclei. The benchmark authors got the same count from the masks. Check: The benchmark authors counted the objects in the 50 test masks with skimage.measure.label, one pass for each mask color. It gives 5720, the same as the paper. The cellpose adapter uses scipy.ndimage for this count. Script check_true_nuclei_test.py. |
| `missed_fraction_advanced` (reference) | 0.155 ±0.05 | published | not applicable | Results, the section on the splitting of adjacent nuclei, and Figure S2. The advanced CellProfiler pipeline misses 15.5% of nuclei at an IoU of 0.7. Reference only, because the run uses Cellpose. Check: The benchmark authors read the value again in the bioRxiv full text (10.1101/335216), section 4.2: advanced CellProfiler 15.5% at a minimum IoU of 0.7. |
| `missed_fraction_basic` (reference) | 0.201 ±0.05 | published | not applicable | Results, the same section, and Figure S2. The basic CellProfiler pipeline misses 20.1% of nuclei at an IoU of 0.7. Reference only, because the run uses Cellpose. Check: The benchmark authors read the value again in the bioRxiv full text (10.1101/335216), section 4.2: basic CellProfiler 20.1% at a minimum IoU of 0.7. |

### Danecek 2021: danecek2021-bcftools

Kind: tool tutorial or test suite. Program: bcftools (command line), through the bcftools adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `snp_records` | 1955 exact | computed | independent | Computed with bcftools 1.24 (htslib 1.24), bcftools stats. Not in the paper. The paper has no results for this data. Check: A plain Python reader of the VCF text (gzip module, no bcftools or htslib) counts 1955 SNP records. Script check_counts.py, output check_counts.out. |
| `indel_records` | 248 exact | computed | independent | Computed with bcftools 1.24 (htslib 1.24), bcftools stats. Not in the paper. The paper has no results for this data. Check: The plain Python reader in check_counts.py counts 248 indel records. |
| `total_records` (not asked) | 2210 exact | computed | independent | Computed with bcftools 1.24 (htslib 1.24), bcftools stats. Not in the paper. The total of 2210 records includes 7 structural variants that are neither SNVs nor indels. Check: The plain Python reader in check_counts.py counts 2210 records, 7 of them symbolic structural variants. |
| `ts_tv_ratio` | 2.2 ±0.01 | computed | independent | Computed with bcftools 1.24 (htslib 1.24), bcftools stats. Not in the paper. The count is 1344 transitions and 611 transversions. Check: The plain Python reader in check_counts.py counts 1344 transitions and 611 transversions, a ratio of 2.1997. |
| `records_in_region` | 1137 exact | computed | independent | Computed with bcftools 1.24 (htslib 1.24), bcftools stats -r. Not in the paper. The region must use the contig name chr20. A region written as 20 gives no records. Check: The plain Python reader in check_counts.py counts 1137 records in chr20:1000000-1050000, both by start position and by overlap of the REF allele. |
| `records_af_5pct` | 328 exact | computed | independent | Computed with bcftools 1.24 (htslib 1.24), bcftools view -i. Not in the paper. The filter expression is INFO/AF at or above 0.05. Check: The plain Python reader in check_counts.py parses INFO/AF and counts 328 records at or above 0.05. |

### Delaney 2004: delaney2004-esol

Kind: research paper. Program: RDKit (Python), through the rdkit adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `molecules_parsed` (not asked) | 1128 exact | computed | independent | Computed with RDKit 2026.03.6. Not in the paper. The MoleculeNet file has 1128 rows. The set in the paper is larger. Check: Open Babel 3.1.0 (openbabel-wheel) parses all 1128 SMILES of the file (check_esol.py, check_esol.out). |
| `zero_violations` | 1018 ±5 | computed | same path | Computed with RDKit 2026.03.6. Not in the paper. The ESOL paper does not use the rule of five. Check: Open Babel 3.1.0 gives 1000, which is outside the tolerance of 5 (check_esol.py). Open Babel uses its own copy of the Wildman-Crippen logP, and it gives more molecules with logP above 5 (111 against 97). The check script also counts donors and acceptors with the Lipinski 1997 definitions (OH plus NH, N plus O), not with the RDKit Lipinski module. The value depends on the program, so it is not checked independently. |
| `two_or_more_violations` | 12 ±3 | computed | independent | Computed with RDKit 2026.03.6. Not in the paper. The ESOL paper does not use the rule of five. Check: Open Babel 3.1.0 with the Lipinski 1997 donor and acceptor definitions gives 13 (check_esol.py). |
| `logp_above_5` (not asked) | 97 ±5 | computed | same path | Computed with RDKit 2026.03.6, Crippen logP. Not in the paper. The count changes by a few molecules between RDKit versions. Check: Open Babel 3.1.0 gives 111, which is outside the tolerance of 5 (check_esol.py). Both programs use the Wildman-Crippen method, but their atom types differ. The logP of 299 of the 1128 molecules differs by more than 0.1 between the two programs. |
| `esol_r2` | 0.752 ±0.03 | computed | independent | Computed with RDKit 2026.03.6. Not in this form in the paper. The paper used Daylight clogP on its own data set. A secondary source gives R squared 0.74 for the paper. The benchmark authors did not confirm it in the paper text. Check: The published equation with Open Babel 3.1.0 descriptors gives a squared correlation of 0.7469 (check_esol.py). The predictions in the file column "ESOL predicted", which use Delaney's clogP, give 0.8231. That column is a different quantity. |
| `esol_rmse` | 1.1 ±0.1 | computed | independent | Computed with RDKit 2026.03.6. Not in the paper for this file. The value is the root mean square error in log units. Check: The published equation with Open Babel 3.1.0 descriptors gives an RMSE of 1.0898 log units (check_esol.py). |

### Gowers 2016: gowers2016-mdanalysis

Kind: tool tutorial or test suite. Program: MDAnalysis and Bio.PDB (Python), through the mdanalysis adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `atoms` | 3341 exact | tutorial | not applicable | The MDAnalysis quickstart prints a universe with 3341 atoms for these files. Check: A direct read of the !NATOM line of adk.psf gives 3341 (check_structure.py). |
| `frames` | 98 exact | tutorial | not applicable | The MDAnalysis quickstart prints a trajectory length of 98 frames. Check: The DCD reader of MDTraj 1.11.2 reads 98 frames (check_structure.py). |
| `backbone_rmsd_last_frame` | 6.8203 ±0.01 | tutorial | not applicable | MDAnalysis User Guide, example "Calculating the root mean square deviation of atomic structures" (examples/analysis/alignment_and_rms/rmsd), notebook last updated with MDAnalysis 2.4.0-dev0, guide version 2.9.0. It runs rms.RMSD(u, u, select='backbone', ref_frame=0) on the same PSF and DCD files. The printed table gives 6.820322 angstrom in the Backbone column for frame 97, the last frame. Check: MDTraj 1.11.2 reads the DCD. A numpy Kabsch fit of the 855 backbone atoms (N, CA, C, O) of the last frame on frame 0 gives 6.8203 angstrom (check_structure.py). |
| `rg_last_frame` | 19.592 ±0.02 | tutorial | not applicable | MDAnalysis User Guide, example "Writing your own trajectory analysis" (examples/analysis/custom_trajectory_analysis), notebook last updated with MDAnalysis 2.4.0-dev0, guide version 2.9.0. The table rog_base.df for select_atoms('protein') prints a radius of gyration of 19.591575 angstrom for frame 97, the last frame, and 16.669018 for frame 0. Check: MDTraj 1.11.2 reads the DCD. A numpy mass-weighted radius of gyration with the masses of adk.psf gives 19.5916 angstrom for the last frame and 16.669 for frame 0 (check_structure.py). |
| `residues_chain_a` | 214 exact | computed | independent | Computed with Bio.PDB (Biopython 1.88). Not in the paper. The benchmark authors counted the residues of chain A of PDB entry 4AKE. Check: A plain text read of 4AKE.pdb gives 214 residue numbers in the ATOM records of chain A. The SEQRES records also give 214 (check_structure.py). |
| `residues_chain_b` | 214 exact | computed | independent | Computed with Bio.PDB (Biopython 1.88). Not in the paper. The benchmark authors counted the residues of chain B of PDB entry 4AKE. Check: A plain text read of 4AKE.pdb gives 214 residue numbers in the ATOM records of chain B. The SEQRES records also give 214 (check_structure.py). |
| `ca_rmsd_open_closed` | 7.131 ±0.02 | computed | independent | Computed with Bio.PDB (Biopython 1.88), Superimposer. Not in the paper or the quickstart. The value is the RMSD after a fit of 4AKE chain A on 1AKE chain A. The MDAnalysis User Guide example "Aligning a structure to another" aligns open and closed AdK, but it uses other files (CRD and DCD2 against PSF and DCD) and prints 6.817 angstrom. Check: A plain text read of the CA atoms of both PDB files and a numpy Kabsch fit of the 214 matched pairs give 7.1307 angstrom (check_structure.py). |

### Gramfort 2013: gramfort2013-mne-sample

Kind: tool tutorial or test suite. Program: MNE-Python, through the mne adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `events_total` (not asked) | 319 exact | tutorial | not applicable | The overview tutorial prints 319 events found on the trigger channel STI 014. Check: A numpy scan of the STI 014 channel for rising steps to a non-zero value finds 319 events (check_events_epochs.py). MNE only reads the FIF file. |
| `events_id1` | 72 exact | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. The tutorial lists the six ids but not a count for each id. Check: A numpy scan of the STI 014 channel finds 72 events with id 1 (check_events_epochs.py). MNE only reads the FIF file. |
| `events_id2` | 73 exact | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. The tutorial lists the six ids but not a count for each id. Check: A numpy scan of the STI 014 channel finds 73 events with id 2 (check_events_epochs.py). |
| `events_id3` | 73 exact | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. The tutorial lists the six ids but not a count for each id. Check: A numpy scan of the STI 014 channel finds 73 events with id 3 (check_events_epochs.py). |
| `events_id4` | 70 exact | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. The tutorial lists the six ids but not a count for each id. Check: A numpy scan of the STI 014 channel finds 70 events with id 4 (check_events_epochs.py). |
| `events_id5` | 15 exact | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. The tutorial lists the six ids but not a count for each id. Check: A numpy scan of the STI 014 channel finds 15 events with id 5 (check_events_epochs.py). |
| `events_id32` | 16 exact | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. The tutorial lists the six ids but not a count for each id. Check: A numpy scan of the STI 014 channel finds 16 events with id 32 (check_events_epochs.py). |
| `epochs_dropped` (not asked) | 10 exact | tutorial | not applicable | The overview tutorial prints 10 bad epochs dropped. The tutorial removes two ICA components first. The benchmark run without ICA drops the same 10 epochs. Check: Numpy code cuts the epochs, removes the baseline, applies the four projectors of the file and the peak- to-peak limits. It drops 10 epochs (check_events_epochs.py). MNE only reads the FIF file. |
| `epochs_kept` | 309 exact | computed | independent | Computed with MNE-Python 1.13.2. The tutorial does not print this number. It is 319 events minus 10 dropped epochs. Check: The same numpy code keeps 309 epochs (check_events_epochs.py). |
| `auditory_left_kept` | 68 exact | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial. The tutorial prints only the pooled auditory counts after it equalizes the conditions. Check: The same numpy code keeps 68 auditory/left epochs (check_events_epochs.py). |
| `n100_latency_gfp` | 0.0932 ±0.007 | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. The value is the peak of the global field power of the good gradiometers. The tolerance is one sample (6.7 ms). Check: The numpy average of the 68 kept auditory/left epochs gives a peak of the gradiometer global field power at 0.0932 s (check_events_epochs.py). |
| `n100_amplitude_gfp` | 42.1 ±2 | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. Check: The same numpy average gives a gradiometer global field power peak of 42.11 fT/cm (check_events_epochs.py). |
| `strongest_grad_latency` | 0.0866 ±0.007 | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. If the bad channel MEG 2443 stays in, it becomes the strongest channel and the answer changes. Check: The same numpy average gives the largest absolute gradiometer value at 0.0866 s, on MEG 1332 (check_events_epochs.py). |
| `strongest_grad_amplitude` | 199 ±8 | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. The sign of one gradiometer depends on the sensor, so the score uses the absolute value. Check: The same numpy average gives 198.96 fT/cm on MEG 1332 (check_events_epochs.py). |
| `n100_latency_eeg` (not asked, optional) | 0.0999 ±0.007 | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial text. A joint plot of both auditory conditions in the tutorial marks 0.093 s, but it does not call that time the N100. Check: The same numpy average, with the average EEG reference projector, gives the most negative EEG value at 0.0999 s, on EEG 012 (check_events_epochs.py). |
| `n100_amplitude_eeg` (not asked, optional) | -6 ±0.4 | computed | independent | Computed with MNE-Python 1.13.2. Not in the tutorial or the paper. Check: The same numpy average gives -6.01 uV on EEG 012 (check_events_epochs.py). |

### Lazear 2023: lazear2023-sage

Kind: tool tutorial or test suite. Program: Sage (command line), through the sage adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `psms_result_table` (not asked) | 303 exact | computed | same path | Computed with Sage 0.14.6 (release binary v0.14.7). Not in the paper. The paper has no result for this data. Check: Only Sage makes this table. A new Sage run from check_fdr_config.json gives 303 rows (check_fdr.py). No second search engine gives the same quantity, because each engine scores spectra in its own way. |
| `decoy_psms` (not asked) | 43 exact | computed | same path | Computed with Sage 0.14.6 (release binary v0.14.7). Not in the paper. The paper has no result for this data. Check: Only Sage makes this table. The new Sage run gives 43 decoy rows (check_fdr.py). |
| `target_psms_fdr1` | 207 exact | computed | independent | Computed with Sage 0.14.6 (release binary v0.14.7). Not in the paper. A Python recount of the q-values from the decoy labels gives the same number. Check: check_fdr.py sorts the Sage PSMs by score and computes q-values from the target and decoy labels in plain Python, with (decoys + 1) / targets. It does not read the Sage q-value columns. It gives 207. The PSM scores still come from Sage. Without the + 1 the count is 214. |
| `distinct_peptides` | 47 exact | computed | independent | Computed with Sage 0.14.6 (release binary v0.14.7). Not in the paper. The value counts distinct peptide sequences among the PSMs at 1 percent FDR. Check: check_fdr.py gives 47 distinct peptides among the 207 target PSMs, with the modifications as part of the sequence. Without the modifications the count is 45. The PSM scores come from Sage. |
| `decoy_psms_kept` (not asked) | 1 exact | computed | independent | Computed with Sage 0.14.6 (release binary v0.14.7). Not in the paper. One decoy PSM passes the 1 percent threshold. Check: check_fdr.py gives 1 decoy PSM at q 0.01 or less with its own q-values. The PSM scores come from Sage. |
| `target_psms_fdr5` | 242 exact | computed | independent | Computed with Sage 0.14.6 (release binary v0.14.7). Not in the paper. A Python recount of the q-values gives the same number. The run must get it from a comparison at 5 percent. Check: check_fdr.py gives 242 with its own q-values, with (decoys + 1) / targets. Without the + 1 the count is 243. The PSM scores come from Sage. |

### Li 2009: li2009-samtools

Kind: tool tutorial or test suite. Program: samtools (command line), through the samtools adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `total_reads` (not asked) | 3307 exact | computed | independent | Computed with samtools 1.24 through pysam 0.24.1, flagstat. Not in the paper or the README. The paper has no results for this data. Check: A plain Python reader of the SAM text (gzip module, no samtools, htslib or pysam) counts 3307 records. Script check_counts.py, output check_counts.out. |
| `mapped_reads` | 3271 exact | computed | independent | Computed with samtools 1.24 through pysam 0.24.1, flagstat. Not in the paper or the README. The value is 98.91 percent of all reads. Check: The plain Python reader in check_counts.py counts 3271 records without the unmapped flag (0x4). |
| `properly_paired` | 3144 exact | computed | independent | Computed with samtools 1.24 through pysam 0.24.1, flagstat. Not in the paper or the README. The value is 95.07 percent of all reads. Check: The plain Python reader in check_counts.py counts 3144 primary mapped reads with the proper pair flag (0x2). |
| `singletons` (not asked) | 127 exact | computed | independent | Computed with samtools 1.24 through pysam 0.24.1, flagstat. Not in the paper or the README. A singleton is a mapped read with an unmapped mate. Check: The plain Python reader in check_counts.py counts 127 primary paired reads that are mapped with an unmapped mate. |
| `reads_seq1` (not asked) | 1482 exact | computed | independent | Computed with samtools 1.24 through pysam 0.24.1, idxstats. Not in the paper or the README. The request does not ask for this count. Check: The plain Python reader in check_counts.py counts 1482 mapped reads on seq1. |
| `reads_seq2` (not asked) | 1789 exact | computed | independent | Computed with samtools 1.24 through pysam 0.24.1, idxstats. Not in the paper or the README. The request does not ask for this count. Check: The plain Python reader in check_counts.py counts 1789 mapped reads on seq2. |
| `mapq_ge_30` (not asked, optional) | 3210 exact | computed | independent | Computed with samtools 1.24 through pysam 0.24.1, view -c -q 30. Not in the paper or the README. The request does not ask for a mapping quality filter. Check: The plain Python reader in check_counts.py counts 3210 reads with a mapping quality of 30 or more. |
| `reads_seq2_100_200` | 79 exact | computed | independent | Computed with samtools 1.24 through pysam 0.24.1, view -c. Not in the paper or the README. The README views a different region, seq2 from 450 to 550, and prints no count. Check: The plain Python reader in check_counts.py gets the reference span of each read from its CIGAR string and counts 79 reads that overlap seq2:100-200. |

### Ljosa 2012: ljosa2012-bbbc005

Kind: research paper. Program: CellProfiler (headless), through the cellprofiler adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `ratio_sample` | 0.9379 ±0.02 | computed | independent | Computed with pandas, on the published CellProfiler counts in BBBC005_results_bray.csv. Not in the paper or on the BBBC005 page. The benchmark authors took the published counts for the same 100 images and divided the detected total by the true total. The published counts come from the w2 files. Check: The counts come from the results file that Bray et al. published (BBBC005 page, published results), not from the cellprofiler adapter. A Python standard library script repeats the division: 0.9379. Script check_sample_counts.py. |
| `mean_abs_error_sample` | 3.11 ±0.1 | computed | independent | Computed with pandas, on the published CellProfiler counts in BBBC005_results_bray.csv. Not in the paper or on the BBBC005 page. The benchmark authors computed the mean absolute error of the published counts for the same 100 images. Check: The counts come from the published results file of Bray et al., not from the adapter. A Python standard library script repeats the mean absolute error: 3.110. Script check_sample_counts.py. |
| `true_total_sample` (not asked) | 5007 exact | computed | independent | Computed with Python, from the C values in the file names. Not in the paper. The value is the sum of the true counts in the names of the 100 sampled files. Check: The truth is the C value in each simulated file name. A Python standard library script sums it over every sixth sorted w2 file: 5007. Script check_sample_counts.py. |

### Love 2014: love2014-deseq2-airway

Kind: tool tutorial or test suite. Program: DESeq2 (R), through the deseq2 adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `genes_after_filter` | 16139 ±100 | computed | same path | Computed with the rnaseqGene 1.36.0 workflow code, DESeq2 1.52.0 and R 4.6.1 (check_workflow.R). The benchmark authors ran the code of workflow section 4.1 on the benchmark CSV. The workflow text prints 16637, but that number is for another version of the airway data (58294 genes). The same code on that data gives 16637 exactly. Check: R DESeq2 1.52.0, the program that the deseq2 adapter runs. The workflow script differs from the adapter script. The same script gives the printed workflow value, 16637, on the workflow's version of the airway data. |
| `padj_01_workflow` | 4905 ±100 | computed | same path | Computed with the rnaseqGene 1.36.0 workflow code, DESeq2 1.52.0 and R 4.6.1 (check_workflow.R). The benchmark authors ran the code of workflow section 5 on the benchmark CSV. The workflow text prints 4381 for the other version of the airway data. Check: R DESeq2 1.52.0, the program that the deseq2 adapter runs, through the workflow script. |
| `up_padj_01` | 2607 ±60 | computed | same path | Computed with the rnaseqGene 1.36.0 workflow code, DESeq2 1.52.0 and R 4.6.1 (check_workflow.R). From summary(res) on the benchmark CSV. The workflow text prints 2362 for the other version of the airway data. Check: R DESeq2 1.52.0, the program that the deseq2 adapter runs, through the workflow script. |
| `down_padj_01` | 2298 ±60 | computed | same path | Computed with the rnaseqGene 1.36.0 workflow code, DESeq2 1.52.0 and R 4.6.1 (check_workflow.R). From summary(res) on the benchmark CSV. The workflow text prints 2019 for the other version of the airway data. Check: R DESeq2 1.52.0, the program that the deseq2 adapter runs, through the workflow script. |
| `padj_005_workflow` (not asked) | 4081 ±100 | computed | same path | Computed with the rnaseqGene 1.36.0 workflow code, DESeq2 1.52.0 and R 4.6.1 (check_workflow.R). From results(dds, alpha = 0.05) on the benchmark CSV. The workflow text prints 3602 for the other version of the airway data. Check: R DESeq2 1.52.0, the program that the deseq2 adapter runs, through the workflow script. |
| `padj_01_pydeseq2` (not asked, optional) | 4643 ±100 | computed | independent | Computed with pydeseq2 0.5.4. Not in the workflow. The benchmark authors ran pydeseq2 on the benchmark CSV. The deseq2 adapter runs R DESeq2 1.52.0, which gives 4905 genes on the same CSV. Check: pydeseq2 0.5.4, a Python program. The adapter runs R DESeq2. |
| `padj_005_pydeseq2` (not asked, optional) | 3872 ±100 | computed | independent | Computed with pydeseq2 0.5.4. Not in the workflow. The benchmark authors ran pydeseq2 on the benchmark CSV with alpha 0.05. R DESeq2 can give a different count on the same CSV. Check: pydeseq2 0.5.4, a Python program. The adapter runs R DESeq2. |

### Mahbod 2024: mahbod2024-nuinsseg

Kind: research paper. Program: scikit-image (Python), through the scikit-image adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `mean_dice_otsu` | 0.538 ±0.02 | computed | independent | Computed with scikit-image 0.26.0. Not in the paper. The paper reports Dice only for U-Net models (0.766 to 0.814 in Table 3). The benchmark authors scored a plain Otsu threshold on the hematoxylin channel over all 665 patches. Check: The benchmark authors repeated the baseline without scikit-image: own color deconvolution with the Ruifrok H-E-DAB vectors in numpy, own 256-bin Otsu, scipy.ndimage labels to drop groups under 30 pixels, Dice against the label masks. Mean over 665 patches: 0.5381. With an H and E only matrix (third vector from the cross product) the result is 0.565, so the value depends on the stain matrix. Script check_dice_and_labels.py. |
| `image_patches` (not asked) | 665 exact | published | not applicable | Methods, field of view and patch selection, and Table 2. The paper gives 665 patches. The released files match this count in every organ folder. Check: The check script finds 665 tissue images in the 31 organ folders. Script check_dice_and_labels.py. |
| `nuclei_label_masks` (not asked) | 35138 exact | computed | independent | Computed with Python count of unique non-zero labels in the released label masks. Not in the paper. Table 2 gives 30,698 nuclei, but the released masks hold 35,138 labels. The benchmark authors did not find the cause. Check: The benchmark authors read the label masks with tifffile and counted distinct non-zero values with numpy bincount. It gives 35138. The value is a direct count of the released files, so it does not depend on the adapter. Script check_dice_and_labels.py. |

### Minh 2020: minh2020-iqtree2

Kind: tool tutorial or test suite. Program: IQ-TREE 3.1.4 and MAFFT (command line), through the phylo adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `log_likelihood` | -21152.54 ±1 | computed | independent | Computed with IQ-TREE 3.1.4 (iqtree3), seed 1. Not in the paper or the tutorial. The tutorial names the model TIM2+I+G4 but prints no log-likelihood. The benchmark authors ran -m MFP -B 1000 and got -21152.5377. Check: Own Felsenstein pruning code in numpy and SciPy (no IQ-TREE) evaluates the IQ-TREE tree under TIM2+F+I+G4 with the rate, frequency, invariant and gamma values of the IQ-TREE report. It gives -21152.5378 on 1152 site patterns. This checks the likelihood calculation, not the tree search or the parameter fit. Script check_log_likelihood.py, output check_log_likelihood.out. |

### Oksanen 2026: oksanen-vegan-dune

Kind: tool tutorial or test suite. Program: vegan (R), through the vegan adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `shannon_site1` | 1.4405 ±0.001 | computed | independent | Computed with vegan 2.7.6. Not printed in the vignettes for the dune data. The benchmark authors ran diversity on the dune table. Check: The formula -sum(p ln p) in numpy on the cover values of site 1 gives 1.4405 (check_vegan.py). |
| `nmds_stress` | 0.1183 ±0.001 | tutorial | not applicable | Introduction vignette, section 1.2. The metaMDS output for the dune data shows a stress of 0.1183186. |
| `permanova_r2` | 0.3416 ±0.001 | computed | independent | Computed with vegan 2.7.6 adonis2. Not in the help page. The help example uses another model, Management with A1 and their interaction. Check: A numpy implementation of the PERMANOVA sums of squares of McArdle and Anderson (2001), on Bray-Curtis distances from SciPy, gives 0.3416 (check_vegan.py). |
| `permanova_f` | 2.767 ±0.01 | computed | independent | Computed with vegan 2.7.6 adonis2. Not in the help page. The help example uses another model. The F value does not depend on the seed. Check: The same numpy implementation gives a pseudo-F of 2.7672 (check_vegan.py). |
| `permanova_p` | 0.003 ±0.003 | computed | independent | Computed with vegan 2.7.6 adonis2, 999 permutations. Not in the help page. The p-value changes in the third decimal with the seed. Seeds 1 and 42 give 0.002 and 0.003. Check: The numpy implementation with 999 random permutations gives 0.002, 0.005, 0.002, 0.002 and 0.003 for five seeds. All are inside the tolerance (check_vegan.py). |
| `dispersion_f` (not asked) | 1.951 ±0.01 | computed | independent | Computed with vegan 2.7.6 betadisper and permutest. Not in the vignettes or help pages for the dune data. The test is not significant (p above 0.1). Check: A numpy implementation of the betadisper method (principal coordinates, spatial median for each group, correction for the 5 negative eigenvalues) followed by a one-way ANOVA gives 1.9506 (check_vegan.py). |

### Palmer 2017: palmer2017-metaspace-fdr

Kind: research paper. Program: METASPACE (metaspace2020 Python client), through the metaspace adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `formulas_in_all_three_sections` (reference) | 51 ±8 | published | not applicable | Figure 2e. In animal a2, 51 sum formulas appear in all three serial sections. The MTBLS313 annotation table also gives 51. The benchmark marks this as a reference value. Check: check_maf_counts.py reads the MTBLS313 v2 MAF table with the Python csv module. It gives 51 formulas with an entry in all three columns a2s1, a2s2 and a2s3. |
| `unique_formulas_three_sections` (not asked, reference) | 66 exact | computed | independent | Computed with Count of the MTBLS313 annotation table (MAF file) by the benchmark authors. Not in the paper. The paper gives 73 as the base for its 51, but the table gives 66 formulas for sections s1 to s3. The benchmark marks this as a reference value. Check: check_maf_counts.py counts the union of the formulas in columns a2s1 to a2s3 with the Python csv module. It gives 66. The METASPACE adapter does not read this table. The union for a2s1 to a2s5 is 76. No column set gives the 73 of the paper. |
| `total_formulas` (not asked, reference) | 103 ±20 | published | not applicable | Main text. The paper reports 103 annotations over all datasets. The MTBLS313 table has 103 unique sum formulas. The benchmark marks this as a reference value. Check: check_maf_counts.py gives 103 unique formulas in the 236 rows of the MAF table. |

### Quinlan 2010: quinlan2010-bedtools

Kind: tool tutorial or test suite. Program: bedtools (command line), through the bedtools adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `exons_with_overlap` | 126 exact | computed | independent | Computed with bedtools 2.31.1 intersect -u. Not in the paper. The paper gives no numbers for these files. Check: A plain Python interval sweep (no bedtools) counts 126 exons that overlap an AluY repeat by at least one base. Script check_counts.py, output check_counts.out. |
| `overlapping_pairs` (not asked) | 129 exact | computed | independent | Computed with bedtools 2.31.1 intersect -wo. Not in the paper. There are 129 pairs but 126 exons, because one exon can overlap more than one repeat. Check: The plain Python interval sweep in check_counts.py counts 129 exon and repeat pairs. |
| `overlap_bases` | 33713 exact | computed | independent | Computed with bedtools 2.31.1 intersect -wo, sum of the last column. Not in the paper. The benchmark authors checked the sum with awk. Check: The earlier awk check only summed the bedtools output. The plain Python interval sweep in check_counts.py computes each overlap length itself and gives 33713 bases. |
| `merged_intervals` | 11270 exact | computed | independent | Computed with bedtools 2.31.1 merge -d 100 on sorted input. Not in the paper. The 11628 AluY repeats become 11270 intervals. Check: The plain Python merge in check_counts.py joins sorted repeats with a gap of 100 bases or less and gives 11270 intervals. |

### Rossi 1980: rossi1980-recidivism

Kind: tool tutorial or test suite. Program: lifelines (Python), through the biostats adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `subjects` (not asked) | 432 exact | tutorial | not applicable | Survival regression section, the Cox model summary. The number of observations is 432. |
| `events` (not asked) | 114 exact | tutorial | not applicable | Survival regression section, the Cox model summary. The number of events is 114. |
| `coef_fin` (not asked) | -0.3794 ±0.0005 | published | not applicable | Fox J, Weisberg S. Cox Proportional-Hazards Regression for Survival Data in R, an appendix to An R Companion to Applied Regression, 3rd edition (Sage 2019), revision of 2023-01-31, Section 3.2, summary(mod.allison). It prints -0.3794 for finyes. The lifelines documentation gives a rounded value only (-0.38). Check: R survival 3.8.6 coxph with Efron ties gives -0.3794 (check_cox.R). |
| `coef_age` (not asked) | -0.0574 ±0.0005 | published | not applicable | Fox and Weisberg, Cox regression appendix (revision of 2023-01-31), Section 3.2, summary(mod.allison). It prints -0.0574 for age. Check: R survival 3.8.6 coxph gives -0.0574 (check_cox.R). |
| `coef_prio` (not asked) | 0.0915 ±0.0005 | published | not applicable | Fox and Weisberg, Cox regression appendix (revision of 2023-01-31), Section 3.2, summary(mod.allison). It prints 0.0915 for prio. Check: R survival 3.8.6 coxph gives 0.0915 (check_cox.R). |
| `hazard_ratio_fin` | 0.684 ±0.002 | published | not applicable | Fox and Weisberg, Cox regression appendix (revision of 2023-01-31), Section 3.2, summary(mod.allison). It prints exp(coef) 0.6843 for finyes, with a 95% interval of 0.470 to 0.996. Check: R survival 3.8.6 coxph gives 0.6843 (check_cox.R). |
| `p_fin` | 0.0474 ±0.001 | published | not applicable | Fox and Weisberg, Cox regression appendix (revision of 2023-01-31), Section 3.2, summary(mod.allison). It prints Pr(>\|z\|) 0.0474 for finyes. Check: R survival 3.8.6 coxph gives 0.0474 (check_cox.R). |
| `concordance` | 0.64 ±0.005 | tutorial | not applicable | Survival regression section, the Cox model summary. The concordance is 0.64. The benchmark run gives 0.6403. Check: R survival 3.8.6 coxph gives 0.6403 (check_cox.R). Fox and Weisberg (Section 3.2) also print 0.64. |
| `logrank_chi2_fin` (not asked) | 3.838 ±0.01 | computed | independent | Computed with lifelines 0.30.3 logrank_test. Not in the documentation. The benchmark authors compared the two aid groups with a log-rank test. Check: R survival 3.8.6 survdiff gives 3.8376 (check_cox.R). |
| `logrank_p_fin` (not asked) | 0.0501 ±0.001 | computed | independent | Computed with lifelines 0.30.3 logrank_test. Not in the documentation. The p-value is 0.0501, just above 0.05. Check: R survival 3.8.6 survdiff gives a chi-square of 3.8376 and p 0.0501 (check_cox.R). |
| `ph_test_p_age` | 0.0007 ±0.0005 | tutorial | not applicable | lifelines documentation, notebook Testing the proportional hazard assumptions (read on 2026-10-08). check_assumptions on this model prints a rank-transform test statistic of 11.45 for age and the advice text 'p-value is 0.0007'. The standalone proportional_hazard_test with time_transform='rank' prints 11.453 and a rounded p of 0.001. Check: A hand calculation in R of the Grambsch and Therneau (1994) approximation, from the scaled Schoenfeld residuals of survival 3.8.6, gives a chi-square of 11.157 and p 0.00084 (check_cox.R). The cox.zph test of survival 3.x is a different test. It gives p 0.0145 with the km transform and p 0.34 with the rank transform. |

### Röst 2016: rost2016-openms

Kind: tool tutorial or test suite. Program: pyOpenMS (Python interface to OpenMS), through the pyopenms adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `spectra` | 7173 exact | computed | independent | Computed with pyOpenMS 3.6.0. Not in the paper or the supplement. The benchmark authors counted the spectra in the file. Check: check_spectra.py counts the spectrum elements with the Python XML parser, without OpenMS. It gives 7173, and the count attribute of the spectrum list is also 7173. |
| `ms1_spectra` (not asked) | 7173 exact | computed | independent | Computed with pyOpenMS 3.6.0. Not in the paper or the supplement. All spectra in the file are level 1 mass spectra (MS1). Check: check_spectra.py reads the ms level term (MS:1000511) of each spectrum with the Python XML parser. All 7173 spectra have level 1. |
| `mass_traces` (not asked) | 1880 ±100 | computed | same path | Computed with pyOpenMS 3.6.0. Not in the paper or the supplement. The supplement gives no counts. The value uses the tutorial settings and OpenMS defaults for all other parameters. Check: No independent count was found. The TOPP tool FeatureFinderMetabo does not print the number of mass traces. A second run of the pyOpenMS classes gives 1880 (check_features_zero_intensity.py), but this is the same code as the adapter. |
| `elution_peaks` (not asked) | 2255 ±120 | computed | independent | Computed with pyOpenMS 3.6.0. Not in the paper or the supplement. Other OpenMS versions can give a slightly different count. Check: The TOPP command line tool FeatureFinderMetabo of OpenMS 3.5.0 (conda build), the tool that the paper workflow uses, reports 2255 input traces with the supplement settings (check_features.sh). The algorithm is the same OpenMS C++ code. Only the build and the tool code differ from the adapter. |
| `features` | 1887 ±100 | computed | independent | Computed with pyOpenMS 3.6.0. Not in the paper or the supplement. The paper used OpenMS 2.0 in KNIME, so the tolerance allows for version differences. Check: The TOPP tool FeatureFinderMetabo of OpenMS 3.5.0 reports 1887 features from the algorithm (check_features.sh). It writes only 1783 features to its featureXML file, because it drops the 104 features with intensity 0 (check_features_zero_intensity.py). The adapter counts all 1887. A run that counts the TOPP output file gets 1783, which is 104 below the expected value and just outside the tolerance of 100. |

### Rouault 2026: rouault-gdal-autotest

Kind: tool tutorial or test suite. Program: GDAL (command-line programs), through the gdal adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `width` | 20 exact | tutorial | not applicable | GDAL test suite, test_gdalinfo.py, test_gdalinfo_stac_json. The test checks a raster shape of 20 by 20 pixels. Check: tifffile reads a 20 by 20 pixel array without GDAL. Script check_raster_warp_zones.py. |
| `height` | 20 exact | tutorial | not applicable | GDAL test suite, test_gdalinfo.py, test_gdalinfo_stac_json. The test checks a raster shape of 20 by 20 pixels. Check: tifffile reads a 20 by 20 pixel array without GDAL. Script check_raster_warp_zones.py. |
| `epsg` | 26711 exact | tutorial | not applicable | GDAL test suite, test_gdalinfo.py, test_gdalinfo_stac_json. The test checks the code EPSG:26711 (North American Datum 1927, Universal Transverse Mercator zone 11 north). Check: The GeoTIFF key ProjectedCSTypeGeoKey, read with tifffile, is 26711. Script check_raster_warp_zones.py. |
| `pixel_size_m` | 60 exact | tutorial | not applicable | GDAL test suite, test_gdalinfo.py, test_gdalinfo_stac_json. The geotransform in the test has a pixel size of 60 m. Check: The GeoTIFF tag ModelPixelScale, read with tifffile, is 60 by 60 m. Script check_raster_warp_zones.py. |
| `band_min` | 74 exact | tutorial | not applicable | GDAL test suite, test_gdalinfo.py, test_gdalinfo_stac_json. The test checks a minimum of 74. Check: numpy on the pixels read with tifffile gives 74. Script check_raster_warp_zones.py. |
| `band_max` | 255 exact | tutorial | not applicable | GDAL test suite, test_gdalinfo.py, test_gdalinfo_stac_json. The test checks a maximum of 255. Check: numpy on the pixels read with tifffile gives 255. Script check_raster_warp_zones.py. |
| `band_mean` | 126.765 ±0.01 | tutorial | not applicable | GDAL test suite, test_gdalinfo.py, test_gdalinfo_stac_json. The test checks a mean of 126.765. Check: numpy on the pixels read with tifffile gives 126.7650. Script check_raster_warp_zones.py. |
| `band_std` | 22.93 ±0.05 | tutorial | not applicable | GDAL test suite, test_gdalinfo.py, test_gdalinfo_stac_json. The test checks 22.928, the population standard deviation. The sample standard deviation is 22.957, which is also inside the tolerance. Check: numpy on the pixels read with tifffile gives 22.9285 (population) and 22.9572 (sample, n - 1). Script check_raster_warp_zones.py. |
| `warp_width` | 22 exact | computed | independent | Computed with GDAL 3.13.3 gdalwarp, checked with pyproj. Not in the test suite. The benchmark authors ran the warp with nearest neighbour and the default pixel size. Check: The benchmark authors repeated the GDALSuggestedWarpOutput size rule without GDAL: pyproj transforms 21 points on each edge, the pixel size keeps the length of the diagonal, and the size is the extent over the pixel size, rounded. It gives 22. Script check_raster_warp_zones.py. |
| `warp_height` | 18 exact | computed | independent | Computed with GDAL 3.13.3 gdalwarp, checked with pyproj. Not in the test suite. The benchmark authors ran the warp with nearest neighbour and the default pixel size. Check: The same pyproj calculation gives 18. Script check_raster_warp_zones.py. |
| `zone_a_pixels` | 100 exact | computed | independent | Computed with numpy and shapely. Not in a source. Zone A is a square that the benchmark authors drew on the pixel grid. Check: numpy tests each pixel center against the square, with no rasterio or rasterstats. It gives 100. Script check_raster_warp_zones.py. |
| `zone_a_mean` | 129.5 ±0.01 | computed | independent | Computed with numpy and shapely. Not in a source. Zone A is a square that the benchmark authors drew on the pixel grid. Check: The same numpy pixel center test gives a mean of 129.500. Script check_raster_warp_zones.py. |
| `zone_b_pixels_centers` | 42 exact | computed | independent | Computed with numpy and shapely. Not in a source. Zone B is offset by 40 m from the grid. With all touched pixels the count is 56, not 42. Check: The same numpy pixel center test gives 42. Script check_raster_warp_zones.py. |
| `zone_b_mean_centers` | 135 ±0.01 | computed | independent | Computed with numpy and shapely. Not in a source. With all touched pixels the mean is 134.857, not 135.0. Check: The same numpy pixel center test gives a mean of 135.000. Script check_raster_warp_zones.py. |

### Schindelin 2012: schindelin2012-fiji-blobs

Kind: tool tutorial or test suite. Program: scikit-image (Python), through the scikit-image adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `particles_edges_included` | 64 exact | computed | independent | Computed with ImageJ 1.53 (Default threshold, Analyze Particles). Not in the paper. No official ImageJ or Fiji tutorial that prints this count was found. The benchmark authors ran ImageJ, which gave 64. Check: ImageJ 1.53 is a different program from the scikit-image adapter. A second check with PIL and scipy.ndimage only (range 126 to 255 that ImageJ picked, 8-connected labels) also gives 64. Script check_particles.py. |
| `particles_edges_excluded` (not asked, optional) | 46 exact | computed | independent | Computed with ImageJ 1.53 (Default threshold, Analyze Particles with edge exclusion). Not in the paper. No official tutorial that prints this count was found. The benchmark authors ran ImageJ, which gave 46. Check: ImageJ 1.53 is a different program from the scikit-image adapter. The same scipy.ndimage check, with labels that touch the image border removed, gives 46. Script check_particles.py. |

### Schramm 2012: schramm2012-imzml-pyimzml

Kind: tool tutorial or test suite. Program: pyimzML (Python), through the pyimzml adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `spectra_per_file` | 9 exact | tutorial | not applicable | pyimzML test suite, tests/test_basic.py. The test checks 9 coordinates in each file. Check: A standard library XML parse counts 9 spectrum elements in each imzML file (check_spectra.py). |
| `mz_min` | 100.083336 ±0.0001 | computed | independent | Computed with pyimzML 1.5.5. The test suite checks only that all m/z values are between 100 and 800. The exact lowest value is computed. Check: check_spectra.py reads the imzML with the Python XML parser and the ibd file with numpy, without pyimzML. It gives 100.083336 in both files. |
| `mz_max` | 799.9167 ±0.0001 | computed | independent | Computed with pyimzML 1.5.5. The test suite checks only that all m/z values are between 100 and 800. The exact highest value is computed. Check: check_spectra.py reads the imzML with the Python XML parser and the ibd file with numpy, without pyimzML. It gives 799.916687 in both files. |
| `max_pixel_tic` | 243.5395 ±0.001 | computed | independent | Computed with pyimzML 1.5.5 and numpy. Not in a source. The total ion current (TIC) of a pixel is the sum of its intensities. Check: check_spectra.py sums the intensity arrays that it reads from the ibd file with numpy. It gives 243.5395 at pixel (3, 3). The imzML file itself stores a TIC for each spectrum (MS:1000285), and its largest value is also 243.5395. |
| `mean_tic` (not asked) | 161.1444 ±0.001 | computed | independent | Computed with pyimzML 1.5.5 and numpy. Not in a source. The value is the mean total ion current (TIC) of the nine pixels, with float32 sums. Check: check_spectra.py gives 161.1444 with float32 sums and with float64 sums. The mean of the nine TIC values stored in the imzML file is the same. |
| `continuous_ibd_bytes` (not asked) | 335976 exact | computed | independent | Computed with file size of the downloaded file. Not in a source. The file holds one shared m/z array and nine intensity arrays. Check: check_spectra.py reads 335976 bytes from the file system. The imzML layout gives the same number: a 16-byte UUID, one m/z array and nine intensity arrays of 8399 float32 values. |
| `processed_ibd_bytes` (not asked) | 604744 exact | computed | independent | Computed with file size of the downloaded file. Not in a source. The file holds one m/z array and one intensity array for each spectrum. Check: check_spectra.py reads 604744 bytes from the file system. The imzML layout gives the same number: a 16-byte UUID and nine pairs of m/z and intensity arrays of 8399 float32 values. |

### Student 1908: student1908-sleep

Kind: research paper. Program: SciPy (Python), through the biostats adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `mean_difference` | 1.58 ±0.005 | published | not applicable | Illustration I, the table of the ten patients. The mean of the differences is +1.58 hours. Check: R 4.6.1 gives 1.5800 (check_ttest.R). |
| `paired_t` (not asked) | 4.0621 ±0.001 | computed | independent | Computed with SciPy 1.x ttest_rel. Not in this form in the paper. Student gives the mean as 1.35 times the standard deviation, with n as the divisor. The modern t statistic uses n - 1. Check: R 4.6.1 t.test with paired = TRUE gives 4.0621. The formula mean / (sd / sqrt(n)), computed by hand, gives the same value (check_ttest.R). |
| `degrees_of_freedom` (not asked) | 9 exact | computed | independent | Computed with SciPy 1.x ttest_rel. Not in the paper. Student indexes his table by the number of experiments (10). Check: R 4.6.1 t.test with paired = TRUE gives 9 (check_ttest.R). |
| `paired_p` | 0.002833 ±0.0001 | computed | independent | Computed with SciPy 1.x ttest_rel. Not in the paper. Student gives a probability of 0.9985 (odds of about 666 to 1) that drug 2 is better, from his own table. Check: R 4.6.1 t.test with paired = TRUE gives 0.002833. The t distribution, computed by hand, gives the same value (check_ttest.R). |
| `ci_lower` | 0.7 ±0.005 | computed | independent | Computed with SciPy 1.x. Not in the paper. Student does not give a confidence interval. Check: R 4.6.1 t.test with paired = TRUE gives 0.7001 (check_ttest.R). |
| `ci_upper` | 2.46 ±0.005 | computed | independent | Computed with SciPy 1.x. Not in the paper. Student does not give a confidence interval. Check: R 4.6.1 t.test with paired = TRUE gives 2.4599 (check_ttest.R). |
| `welch_p_trap` (not asked, trap) | 0.07939 ±0.0005 | computed | independent | Computed with SciPy 1.x ttest_ind with equal_var=False. Not in the paper. This is the result of the wrong test: an unpaired test on paired data. The run must not report it as the result. Check: R 4.6.1 t.test with var.equal = FALSE gives 0.07939, with t 1.8608 and 17.776 degrees of freedom (check_ttest.R). |

### White 2021: white2021-flowkit

Kind: tool tutorial or test suite. Program: FlowKit (Python), through the flowkit adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `events_in_file` | 290172 exact | tutorial | not applicable | FlowKit tutorial notebook, part 1 (Sample class). It prints this sample with 290172 events. The workspace stores the same count. Check: fcsparser 0.2.8 reads 290172 events from the FCS file. The SampleNode count in the workspace XML is also 290172 (check_gates.py). |
| `cd3_flowkit` | 133670 exact | tutorial | not applicable | FlowKit tutorial notebook, part 3, gating results report. It gates this file with a Gating-ML copy of the same gates. The workspace test in the FlowKit test suite checks the same count. Check: Own numpy code (fcsparser 0.2.8 to read the FCS file, inverse of the workspace spillover matrix, own logicle transform after Moore and Parks 2012, matplotlib point-in-polygon) applies the workspace gates and gives 133670 (check_gates.py). FlowKit Tutorial Part 6 (Workspace class, FlowKit 1.3.0) also prints 133670 for this sample. |
| `cd3_flowjo` | 133860 exact | computed | independent | Computed with FlowKit 1.3.2, read from the workspace file. Not in the paper or a tutorial. FlowJo stored this count in the workspace file. Check: A direct read of the Population count attribute in the workspace XML with ElementTree gives 133860 (check_gates.py). FlowJo 10.6.2 computed this count, not FlowKit. |
| `cd4_flowkit` | 82484 exact | tutorial | not applicable | FlowKit tutorial notebook, part 3, gating results report, gate CD4-pos. Check: The same numpy gating gives 82484 (check_gates.py). FlowKit Tutorial Part 6 (Workspace class, FlowKit 1.3.0) also prints 82484 for this sample. |
| `cd4_flowjo` | 82636 exact | computed | independent | Computed with FlowKit 1.3.2, read from the workspace file. Not in the paper or a tutorial. FlowJo stored this count in the workspace file. Check: A direct read of the workspace XML with ElementTree gives 82636 (check_gates.py). |
| `cd8_flowkit` | 47165 exact | tutorial | not applicable | FlowKit tutorial notebook, part 3, gating results report, gate CD8-pos. Check: The same numpy gating gives 47165 (check_gates.py). |
| `cd8_flowjo` | 47241 exact | computed | independent | Computed with FlowKit 1.3.2, read from the workspace file. Not in the paper or a tutorial. FlowJo stored this count in the workspace file. Check: A direct read of the workspace XML with ElementTree gives 47241 (check_gates.py). |
| `largest_difference_percent` (not asked) | -0.184 ±0.02 | computed | independent | Computed with FlowKit 1.3.2. Not in a source. The differences for CD3+, CD4+ and CD8+ are -0.142, -0.184 and -0.161 percent of the FlowJo count. Check: The numpy gate counts and the XML counts give -0.142, -0.184 and -0.161 percent for CD3+, CD4+ and CD8+ (check_gates.py). |
| `cd3_no_compensation` | 135381 exact | computed | independent | Computed with FlowKit 1.3.2. Not in a source. The benchmark authors ran the workspace gates with compensation set to none. Check: The same numpy gating without the spillover matrix gives 135381 (check_gates.py). |
| `cd4_no_compensation` | 85369 exact | computed | independent | Computed with FlowKit 1.3.2. Not in a source. The benchmark authors ran the workspace gates with compensation set to none. Check: The same numpy gating without the spillover matrix gives 85369 (check_gates.py). |
| `cd8_no_compensation` | 47694 exact | computed | independent | Computed with FlowKit 1.3.2. Not in a source. The benchmark authors ran the workspace gates with compensation set to none. Check: The same numpy gating without the spillover matrix gives 47694 (check_gates.py). |
| `cd8_ifng_no_compensation` (not asked) | 672 exact | computed | independent | Computed with FlowKit 1.3.2. Not in a source. Without compensation, the interferon gamma (IFNg) gate under CD8+ grows from 2 to 672 events. This is the largest relative change. Check: The same numpy gating without the spillover matrix gives 672 for IFNg+ under CD8+, and 2 with the matrix (check_gates.py). |

### Wolf 2018: wolf2018-scanpy

Kind: tool tutorial or test suite. Program: scanpy (Python), through the scanpy adapter.

| Item | Value | Source | Independence | Citation and check |
| --- | --- | --- | --- | --- |
| `cells_at_load` (not asked) | 2700 exact | tutorial | not applicable | Tutorial, read step. The printed data object has 2700 cells. |
| `genes_at_load` (not asked) | 32738 exact | tutorial | not applicable | Tutorial, read step. The printed data object has 32738 genes. |
| `genes_after_min_cells` (not asked) | 13714 exact | tutorial | not applicable | Tutorial, basic filtering step. The log says that the filter removes 19024 genes, which leaves 13714. |
| `cells_after_qc` | 2638 exact | tutorial | not applicable | Tutorial, filter step after the quality metrics. The printed data object has 2638 cells. Check: The plain numpy filters in check_hvg_leiden.py (no scanpy) keep 2638 cells. |
| `highly_variable_genes` (not asked) | 1838 ±20 | tutorial | not applicable | Legacy tutorial "Preprocessing and clustering 3k PBMCs (legacy workflow)", scanpy 1.10.x documentation (https://scanpy.readthedocs.io/en/1.10.x/tutorials/basics/clustering-2017.html). It calls highly_variable_genes with min_mean 0.0125, max_mean 3 and min_disp 0.5 and the default seurat flavor. The printed object after the gene selection is 2638 x 1838. The scanpy-tutorials pbmc3k notebook for scanpy 1.4.5 prints the same shape. The current tutorial uses the seurat_v3 method and prints no count. Check: Own numpy code of the seurat dispersion method (20 mean bins, normalized log dispersion) without scanpy gives 1838 genes. Script check_hvg_leiden.py, output check_hvg_leiden.out. |
| `leiden_clusters` | 7 ±1 | computed | independent | Computed with scanpy 1.12.4. No tutorial prints a count for these settings. The current tutorial (resolution 0.7, seurat_v3 genes) reports 8 clusters. The legacy tutorials (default genes, resolution 0.9 or 1.0) also report 8. The benchmark run gives 7. The tolerance of 1 accepts 6 to 8. Check: check_hvg_leiden.py redoes the pipeline without scanpy: numpy regression and scaling, a SciPy SVD for the principal components, scikit-learn exact neighbors, own code for the UMAP neighbor weights, and leidenalg instead of the igraph Leiden code that scanpy uses. At resolution 0.7 it gives 7 clusters with seed 0, and 7 clusters with 7 of 10 seeds (6 with the other 3). Output check_hvg_leiden.out. |
