# Paper candidates: metabolomics statistics, epidemiology and trial endpoints

Rules: peer-reviewed paper or official report with a DOI. Public input data with an open license. Human data are public and de-identified. The source prints the target numbers. An independent check reproduces them. One run takes about 15 minutes or less on a Mac.

Status: searched on 2026-10-09. The section "Outcome" at the end lists what was built and what was rejected.

Scope decision: the three capabilities do not repeat biostats. Biostats has t-tests, ANOVA, logistic regression, chi-square, Fisher, McNemar, Cox and Kaplan-Meier. The new capabilities add what biostats lacks.

- Metabolomics statistics: normalization, scaling, PCA, PLS-DA and OPLS-DA with permutation tests and VIP scores, and univariate tests with FDR. Program: R package ropls.
- Epidemiology: rates with exact intervals, rate ratios, direct and indirect standardization, SMR, attributable risk and number needed to treat. Program: R package epitools with base R.
- Clinical trial endpoints: risk difference, relative risk, Mantel-Haenszel stratified estimates, non-inferiority tests, restricted mean survival time and hazard ratio. Program: R packages survRM2 and survival with base R.

## Shortlist

### M1. ropls, urine metabolome of 183 adults (sacurine)
- Citation: Thevenot EA, Roux A, Xu Y, Ezan E, Junot C. Analysis of the human adult urinary metabolome variations with age, body mass index, and gender by implementing a comprehensive workflow for univariate and OPLS statistical analyses. J Proteome Res 14:3322-3335 (2015). DOI: 10.1021/acs.jproteome.5b00354.
- Data: MetaboLights MTBLS404, 183 samples, 109 identified metabolites (also in the ropls package). Open data.
- Numbers printed: the ropls vignette prints R2X, R2Y, Q2, the permutation p values and the number of components of the PCA, the PLS-DA and the OPLS-DA of gender.
- Adapter: metabolomics-stats. Run time: under 1 minute.

### M2. Human cachexia urine, 77 samples, 63 NMR metabolites
- Citation: Eisner R et al. Learning to predict cancer outcome from urinary metabolites. Metabolomics 7:25-34 (2011). DOI: 10.1007/s11306-010-0232-9. Used in the MetaboAnalyst tutorials (Pang Z et al. Nucleic Acids Res 49:W388, 2021).
- Problem: the file is distributed by MetaboAnalyst. A license is not stated. The Statistical Analysis vignette is 700,000 characters long and prints the t-test and PLS-DA numbers late in the page.
- Status: used for a cross-check only if the license is clear.

### M3. MetaboLights studies of 2018 to 2026 with a paper that prints PLS-DA numbers
- A search of Europe PMC found many open papers with PLS-DA or OPLS-DA. None deposits a processed feature table with a stated license and prints R2Y, Q2 and the permutation p value for that table.
- Status: not built.

### E1. National Vital Statistics Reports, Deaths: Final Data for 2020
- Citation: Kochanek KD, Murphy SL, Xu JQ, Arias E. Deaths: Final data for 2020. National Vital Statistics Reports 72(10), 2023. DOI: 10.15620/cdc:131355. Public domain.
- Data: Table 5 prints the age-specific death rates of 11 age groups for 1999 to 2020 and the age-adjusted rate. Table 1 prints deaths and rates by sex.
- Numbers printed: age-adjusted death rate 835.4 in 2020 and 715.2 in 2019 (all causes), 168.2 for heart disease, 998.3 for males and 695.1 for females.
- Check: direct standardization of the printed age-specific rates with the year 2000 U.S. standard population gives 835.42, 715.24 and 168.19.
- Adapter: epi-rates. Run time: seconds.

### E2. epitools, example data of the package
- Citation: Aragon TJ. epitools: Epidemiology Tools. R package. Examples from Rothman KJ, Modern Epidemiology.
- Numbers printed: the package examples print standardized rates, rate ratios and exact intervals.
- Use: known-answer tests, not a benchmark paper.

### E3. Open-access cohort papers with standardized incidence ratios (observed and expected counts)
- Sources checked: BRCA1 and BRCA2 carriers and endometrial cancer, Eur J Cancer 2020 (CC BY), and germ cell tumours in Klinefelter syndrome, Andrology 2026 (CC BY).
- Problem: see "Rejected".

### T1. SHOCK trial, early revascularization in cardiogenic shock
- Citation: Hochman JS et al. Early revascularization in acute myocardial infarction complicated by cardiogenic shock. N Engl J Med 341:625-634 (1999). DOI: 10.1056/NEJM199908263410901. Follow-up: Hochman JS et al. JAMA 295:2511-2515 (2006).
- Data: Zenodo 10.5281/zenodo.14046978, de-identified trial data of 302 patients, CC BY 4.0.
- Numbers printed: 30-day mortality 46.7% against 56.0%, a difference of -9.3 points (95% CI -20.5 to 1.9); 6-month mortality 50.3% against 63.1%; relative risk of 6-month death 0.80 (0.65 to 0.98); the age stratum under 75 years.
- Check: the data give 71 of 152 and 84 of 150 deaths at 30 days, which reproduces the first three numbers.
- Adapter: trial-endpoints (risk difference, relative risk, Mantel-Haenszel, hazard ratio, restricted mean survival time).

### T2. survRM2 sample data and the Mayo primary biliary cirrhosis trial
- Citation: Uno H et al. Moving beyond the hazard ratio in quantifying the between-group difference in survival analysis. J Clin Oncol 32:2380-2385 (2014). DOI: 10.1200/JCO.2014.55.2208. Tian L, Zhao L, Wei LJ. Biostatistics 15:222-233 (2014).
- Use: known-answer tests. The JCO paper uses data that are not public or that come from digitized curves.

## Rejected

| Source | Reason |
| --- | --- |
| BRCA1 and BRCA2 carriers and endometrial cancer, Eur J Cancer 2020 | Table 2 prints expected and observed counts. The exact Poisson interval of 14 observed and 6.27 expected is 1.22 to 3.75. The paper prints 0.84 to 4.78. The paper does not name its interval method. The data are available only on request. |
| Germ cell tumours in Klinefelter syndrome, Andrology 2026 | The text gives 2 observed cases and "about 0.4" expected. The expected count is not exact, and there is no data table. |
| MANTICO monoclonal antibody trial, eLife 2022 (Dryad 10.5061/dryad.tdz08kq2w) | Two events in 319 patients. The paper reports no risk difference and no non-inferiority test for the primary outcome. |
| Uno 2014 J Clin Oncol, three trials | The data of two trials are reconstructed from published curves. The data of the third trial belong to ECOG. No license. |
| PATENCY 3-year trial, BMJ 2025 (Dryad 10.5061/dryad.dz08kps7j); LAST ACT, Nat Med 2025; Italian dementia SMR data, Sci Data 2023 | The Dryad file download returns HTTP 401 or 403 without a token, and no Zenodo copy exists. A clean run cannot fetch the data. |
| Ivermectin with doxycycline for COVID-19, J Int Med Res 2021 (Zenodo 4718680) | Reproducible data. Not built: the trial adds no method that SHOCK does not cover, and the SPSS file needs a conversion step. |
| SINODAR-ONE trial data on Zenodo | The Zenodo record has no license. |
| epiR package | The package needs the R package sf, which needs the system library udunits. Installing it needs a change to the system Homebrew. epitools covers the needed functions. |

## Outcome

Built on 2026-10-09. Each benchmark paper passed all items in a blind run with claude:claude-haiku-5-5.

- metabolomics-stats (M1): the ropls vignette values reproduce with ropls 1.44.0. A NumPy script reproduces R2X, R2Y, VIP, the PCA variance and the univariate tests. Paper `thevenot2015-ropls-sacurine`, 21 items (21/21 computed and reported). Report: `bench/results/papers-2026-10-09-metabolomics-haiku.md`.
- epi-rates (E1): the printed age-adjusted rates reproduce by direct standardization. Paper `kochanek2023-deaths-final-data-2020`, 7 items (7/7). Report: `bench/results/papers-2026-10-09-epi-haiku.md`. E2 gives the known-answer tests.
- trial-endpoints (T1): the 30-day mortality, the 1-year survival and the hazard ratio of the SHOCK trial reproduce. Paper `hochman1999-shock-trial`, 17 scored items (see `bench/results/papers-2026-10-09-trials-haiku.md`). Not reproduced, and left out: 6-month mortality of the revascularization arm (paper 50.3%, data 49.3%), 6-year survival (paper 32.8% and 19.6%, data 32.4% and 19.4%) and the 1-year risk ratio. The Zenodo survival file lacks one medical-arm patient, so survival uses 301 patients. T2 gives the known-answer tests.
- M2 and M3 were not built.
