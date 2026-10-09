# Plate-reader and bench assay candidates

Wet-lab flows with open plate data, checked for the paper benchmark on 2026-10-08 and 2026-10-09.
A candidate passes if the printed numbers reproduce from the shared raw data with an open-source program.
Labs do these flows by hand in GraphPad Prism, SoftMax Pro, Gen5, Bio-Rad CFX Maestro and QuantStudio.
Each adapter gives the equivalent steps in these programs in its manual route.

Checks used R 4.6.1 (drc 4.0.0, growthcurver 0.3.1, renz 0.2.1) and SciPy 1.16.2.
Dryad file downloads need a login token or pass a bot check. Records with a Zenodo copy use the Zenodo URL.

## Flows and software

| Flow | Programs that labs use | Open-source program | Citation that the authors ask for | License |
|---|---|---|---|---|
| ELISA standard curves (4PL, 5PL), back-calculation, LOD, LLOQ, ULOQ | SoftMax Pro, Gen5, Prism, MyAssays | R drc | Ritz C, Jensen SM, Gerhard D, Streibig JC (2019). Dose-Response Analysis Using R. Chapman and Hall/CRC. DOI 10.1201/b21966 (citation("drc") of drc 4.0.0). Most papers cite Ritz C, Baty F, Streibig JC, Gerhard D (2015). PLOS ONE 10(12): e0146021. DOI 10.1371/journal.pone.0146021 | GPL-2 |
| Dose-response: IC50 and EC50 with a confidence interval, Hill slope, model comparison | Prism | R drc | as above | GPL-2 |
| Enzyme kinetics: Km, Vmax, inhibition models | Prism | R drc (MM.2) and R nls (inhibition models); renz as a second check | drc as above; renz: Aledo JC (2023). renz: R-Enzymology. DOI 10.32614/CRAN.package.renz | GPL-2; GPL (>= 2) |
| Plate basics: blank correction, normalization to controls, Z' factor | SoftMax Pro, Gen5, Excel, Prism | arithmetic in R (tool normalize_plate of the drc adapter); Z' after Zhang JH, Chung TD, Oldenburg KR (1999). J Biomol Screen 4(2):67-73. DOI 10.1177/108705719900400206 | method citation | none |
| Growth curves: growth rate, lag time, carrying capacity | Gen5, Prism | R growthcurver, adapter `growthcurver`; lag time with growthrates | Sprouffske K (2020). growthcurver. DOI 10.32614/CRAN.package.growthcurver; Sprouffske K, Wagner A (2016). BMC Bioinformatics 17:172. DOI 10.1186/s12859-016-1016-7 | GPL (>= 2) |
| qPCR: ΔΔCt, efficiency-corrected Pfaffl ratio, reference gene stability | CFX Maestro, QuantStudio | R NormqPCR (Bioconductor) and base R, adapter `qpcr` | Perkins JR et al. (2012). BMC Genomics 13:296 (citation("NormqPCR")) | see the qpcr adapter |

The 5PL fit: Gottschalk PG, Dunn JR (2005). The five-parameter logistic: a characterization and comparison with the
four-parameter logistic. Anal Biochem 343:54-65. DOI 10.1016/j.ab.2005.04.035. SoftMax Pro and Gen5 write the 5PL as
D + (A - D) / (1 + (x/C)^B)^E. Prism writes it with the lower asymptote as Bottom. For a rising curve these are two
different equations, so the adapter offers both.

## Plan

1. One adapter, `drc`, for ELISA standard curves, dose-response, enzyme kinetics and plate normalization. drc does
   all four fits, so the adapter has one program citation, and a plate file feeds all tools in the same form (one row
   for each well). ELISA first.
2. A growth-curve adapter (`growthcurver`) and a qPCR adapter (`qpcr`), one package and one citation each.
3. Each tool: a plain summary, a manual route in R and in the programs above, plots as PNG and SVG, and the method
   choices as decisions of the scientist (the model, 4PL or 5PL, the weighting, the blank, the normalization, the
   excluded wells, the reference gene).

## ELISA

| Status | Paper | Data | Software in the paper | Printed numbers | Result |
|---|---|---|---|---|---|
| Built: `yun2026-lasv-elisa` | Yun H et al. Development and qualification of an enzyme-linked immunosorbent assay to detect human serum immunoglobulin G reactive to multiple lineages of Lassa virus nucleoprotein. PLOS ONE 21(7): e0340568 (2026). DOI 10.1371/journal.pone.0340568 | S1 Data (Excel) of the article, CC BY 4.0. Nine runs with duplicate standards, blanks, controls and a dilution series, raw OD | BioTek Gen5 3.16, 4PL | Table 1: mean interpolated concentration, CV and recovery of ten dilutions and two controls; LLOQ 0.121 and ULOQ 7.744 IU/mL | All Table 1 concentrations and the range reproduce. SciPy gives each Gen5 concentration in the workbook to five digits (89 values). Dilution 8 recovery (92.0) and the LPC CV (20.09) do not reproduce. |
| Candidate | Girt et al. Nanobody sandwich ELISA for SARS-CoV-2 Spike 1. R Soc Open Sci (2021). DOI 10.1098/rsos.211016 | Dryad 10.5061/dryad.08kprr52t, CC0; Zenodo 5033328. Prism file with raw OD in triplicate | Prism 9 | Table 3: LOD = 3.3 x SD of the blank / slope of a linear fit | The RBD LOD reproduces (33 pg/mL). The Spike LOD does not (the blank SD is 0.0333, not 0.00552). The LOD is from a linear fit, not a 4PL, so it does not test the adapter. |
| Rejected | ELISA for antibodies to CN54gp140 and AIDSVAX BE. PLOS ONE (2022). DOI 10.1371/journal.pone.0275927 | S1 Data, CC BY | Gen5, Prism 9.3 | %CV of serum dilutions; LLOD 0.020 and 0.014 from a 4PL | The CVs are arithmetic. The LLOD does not reproduce (drc gives a lower asymptote of 0.047), and the paper does not give its unit. |
| Rejected | Endostatin ELISA validation in mice. PLOS ONE (2019). DOI 10.1371/journal.pone.0220935 | S1 and S2 Table, CC BY | Prism 4PL | LLOQ, LOD 0.336 nmol/L | The files hold back-calculated concentrations only, with no standard OD. |
| Rejected | Klegerman ME et al. PLOS ONE (2024). DOI 10.1371/journal.pone.0311777 | Dryad only, download blocked | log-linear | | No download without a Dryad token; not a 4PL. |
| Rejected | RSV ELISA (Dryad w6m905r40), Canine Bartonella ELISA (Dryad 9zw3r22t9), anti-Ebola glycoprotein ELISA (pone.0215457), colon collagen (Zenodo 14576125) | | | | Endpoint titers or concentrations only; no standard curve OD. |
| Rejected | Bead-array immunoassay, PLOS ONE (pone.0199278), CC0 | 32,560 wells of raw fluorescence | | variance components | The printed numbers are not standard-curve results. |

## Dose-response

| Status | Paper | Data | Software in the paper | Printed numbers | Result |
|---|---|---|---|---|---|
| Built: `desveaux2026-pcrv-ic50` | Desveaux JM et al. Neutralizing human monoclonal antibodies that target the PcrV component of the type III secretion system of Pseudomonas aeruginosa act through distinct mechanisms. eLife 14:RP105195 (2026). DOI 10.7554/eLife.105195 | eLife Figure 6 source data (xlsx), CC BY 4.0. Normalized response for each well, 3 experiments x 3 replicates | R drc, LL.3; comParm | IC50 of MEDI3902 117 ng/mL, 30-B8 21.3 ng/mL, P3D6 3.65 µg/mL (injection); P3D6 11.8 µg/mL (cytotoxicity); 30-B8 against variants V2 to V5: 12.8, 11.2, 13.0, 10.5 ng/mL | All reproduce with LL.3 (SciPy agrees). The 30-B8 cytotoxicity IC50 (45.2 ng/mL) reproduces only with LL.4 (45.18 ng/mL); reference item. |
| Candidate | Gremlin-1 as a target in MASH. eLife (2024). DOI 10.7554/eLife.95185 | eLife source data fig3 (xlsx), CC BY. Raw wells | R drc, LL.4 | Fig 3A IC50 2.7 to 3.1 nM; Fig 3B EC50 12.7 to 13.6 nM | 3B reproduces (13.1 and 13.4 nM). 3A gives 2.38 and 3.23 nM, outside the printed range. |
| Rejected | NBI-921352, a NaV1.6 inhibitor. eLife (2022). DOI 10.7554/eLife.72468 | source data with pooled means only | Prism 8, Hill slope 1 | Table 1 IC50 | The paper fits each biological replicate; the file has only the pooled means. Human values differ (0.042 against 0.051 µM). |
| Rejected | Cipargamin against Babesia. eLife (2025). DOI 10.7554/eLife.101128 | Dryad 10.5061/dryad.8kprr4z02, CC0, download blocked | Prism 9 | IC50 20.2 and 69.4 nM | No download without a Dryad token. |
| Rejected | Ganoderma MTT study. PLOS ONE (2025). DOI 10.1371/journal.pone.0327087 | mean and SD at 5 doses | not named | IC50 | Two fractions have identical rows but different printed IC50 values. |

## Growth curves

| Status | Paper | Data | Software in the paper | Printed numbers | Result |
|---|---|---|---|---|---|
| Built: `nair2024-plasmid-growth` | Nair RR, Andersson DI, Warsi OM. Antibiotic resistance begets more resistance: chromosomal resistance mutations mitigate fitness costs conferred by multi-resistant clinical plasmids. Microbiology Spectrum 12(5): e0420623 (2024). DOI 10.1128/spectrum.04206-23 | figshare 10.6084/m9.figshare.25400194, CC BY 4.0. Bioscreen OD600 of each well every 4 min; Figure_1_2.xlsx with r and rel_r of each well | growthcurver 0.3.1 in R | Results: mean relative growth rate 0.936, 1.017, 1.033, 0.996; Figure 2 means and 95% intervals; source data r of each well | Sheet STR-R: all 70 published r within 1e-6 (growthcurver, bg_correct min) and 1.4e-6 (SciPy). rel_r = r / host well of the same plate column, within 1e-8. The printed averages do not reproduce, except NIT-R (source data 0.934, 1.017, 1.042, 1.009). |
| Rejected | Ecological ubiquity and phylogeny drive nestedness in phages-bacteria networks. PLOS Pathogens (2025). DOI 10.1371/journal.ppat.1013428 | Zenodo 10.5281/zenodo.17735985, CC BY 4.0 | growthcurver in R 4.4.0 | Growth inhibition from auc_e; no growth parameter in the text | k, r and t_gen of well A01 reproduce. The raw CSV stops at the Excel row limit (20 of 45 plates), and the article prints no growth number. |
| Rejected | CF airway media growth, F1000Research (2022). DOI 10.12688/f1000research.125074.2 | figshare, CC BY 4.0, CFU counts every 2 h | not named | approximate doubling times ("74 min") | Too few points and approximate printed values. |

## qPCR

| Status | Paper | Data | Software in the paper | Printed numbers | Result |
|---|---|---|---|---|---|
| Built: `hildyard2021-embryo-refgenes` | Hildyard JCW, Wells DJ, Piercy RJ. Identification of qPCR reference genes suitable for normalising gene expression in the developing mouse embryo. Wellcome Open Research 6: 197 (2021, v2). DOI 10.12688/wellcomeopenres.16972.2 | figshare 10.6084/m9.figshare.c.3136658 (raw Cq, analysis, efficiencies), CC BY 4.0 | geNorm and NormFinder Excel add-ins, Excel, Prism 8 | Tables 2, 5, 6 (rankings); text: 14 of 15 genes with M below 0.5; workbooks: geNorm M and V, NormFinder values, primer slopes | All items reproduce with NormqPCR to six digits (geNorm; NormFinder ungrouped and by tissue) and with lm (slopes). The ACTB slope (-3.2293) is a digit swap of -3.2993. NormFinder by age differs for 3 genes in the third decimal. |
| Test source | Ahmed M, Kim DR. pcr: an R package for quality assessment, analysis and testing of qPCR data. PeerJ 6: e4473 (2018). DOI 10.7717/peerj.4473 | pcr package data ct1, ct3 (GPL-3) | R pcr | Table 2: dCt 6.86, 4.37, ddCt -2.50, fold 5.6 (5.3 to 6.0) | Reproduces (5.637, 5.276 to 6.023). pcr was removed from CRAN on 2025-11-07, so the adapter uses NormqPCR and base R. |
| Rejected | Ruhluel D, O'Brien S, Fothergill JL. F1000Research (2022). DOI 10.12688/f1000research.125074.2 | figshare 10.6084/m9.figshare.20463159, CC BY 4.0 | CFX, 2^-ddCt | fold changes in figures only | No printed numbers. |
| Rejected | Fucus reference genes, PLOS ONE (2020). DOI 10.1371/journal.pone.0233249 | Dryad 10.5068/D11M3Q, CC0 | | | The Dryad download needs a token. |

## Enzyme kinetics

| Status | Paper | Data | Software in the paper | Printed numbers | Result |
|---|---|---|---|---|---|
| Built: `aledo2022-renz-onpg` | Aledo JC. renz: An R package for the analysis of enzyme kinetic data. BMC Bioinformatics 23:182 (2022). DOI 10.1186/s12859-022-04729-4 | Table 2 of the paper (CC BY 4.0) = data set ONPG, replicate v6, of renz 0.2.1 (GPL >= 2) | renz | Km 2.5 mM and Vmax 0.18 mM/min (nonlinear); Km 5.6 mM and Vmax 0.34 mM/min from a Lineweaver-Burk line (biased) | The nonlinear values reproduce (2.4793, 0.18407; renz dir.MM and SciPy agree). The Lineweaver-Burk values are trap items. |
| Rejected for now | The measurement of true initial rates is not always absolutely necessary. Sci Rep (2023). DOI 10.1038/s41598-023-41805-y | Zenodo 10.5281/zenodo.10059024, CC BY 4.0, 136 MB of time courses | | Km 49 and 29 µM, V 37 and 33 µM/min | Values from the summary table agree within the printed SE, not exactly. The tool fits initial rates, not progress curves. |
| Rejected | POP metal switches. Nat Commun (2022). DOI 10.1038/s41467-022-29239-y | source data, raw A410 traces | | Km 219 and 335 µM | Fits of the figure data give 293 to 309 and 404 µM. The figure data do not trace to Table 1. |

## Plate assay quality (Z')

| Status | Paper | Data | Software in the paper | Printed numbers | Result |
|---|---|---|---|---|---|
| Built: `cooley2020-splitluc-zprime` | Cooley R et al. Development of a cell-free split-luciferase biochemical assay as a tool for screening for inhibitors of challenging protein-protein interaction targets. Wellcome Open Research 5:20 (2020). DOI 10.12688/wellcomeopenres.15675.1 | OSF 10.17605/OSF.IO/MGKQV, CC BY 4.0. PHERAstar exports of ten 384-well plates | Excel | Z' of ten plates at 10 µl and at 20 µl (Figure 5F-G and the summary table) | All ten 10 µl values and seven of ten 20 µl values reproduce. Plates 3 and 5 at 20 µl do not: the printed means are not the means of the wells. Figures 5D and 5E use a manual outlier removal and are not items. |
| Rejected | WRN helicase screen, PLOS ONE (2019); nsp13 helicase screen, Biochem J (2021) | supplements | | Z' | Compound or hit lists only, no plate wells. |
| Not tried | Buß and Jager, PLOS ONE (2016), Zenodo 10.5281/zenodo.21536, CC0 | | | Z factor, SSMD | Before 2018. |

## Known-answer test sources (adapter tests, not benchmark papers)

| Flow | Data | Trusted value | Independent check |
|---|---|---|---|
| ELISA 4PL | R datasets `DNase` run 1 (Davidian and Giltinan 1995) | R help ?DNase: nls with SSfpl, and anova() of the 3-parameter against the 4-parameter logistic | SciPy least squares (`catalog/drc/checks/check_elisa_dnase.py`) |
| ELISA nine runs | Lassa S1 Data (above) | Table 1 of the paper | SciPy, and the Gen5 values in the workbook |
| Dose-response | drc `ryegrass` | drc help ?ED and Ritz et al. 2015: ED50 3.06 (2.67 to 3.45) | SciPy (`catalog/drc/checks/check_dose_kinetics.py`) |
| Dose-response, shared IC50 | drc `S.alba` | none printed; drc anova() of a curveid fit stops early (F 20.355) | SciPy: F 19.617 |
| Michaelis-Menten | R datasets `Puromycin` | Bates and Watts 1988 and R help ?Puromycin: Vmax 212.7, Km 0.06412 | SciPy, and renz ONPG example |
| Inhibition models | synthetic (fixed seed) | none | SciPy |
| Z' | Cooley 2020 plates (above) | the summary table of the authors | pandas |

## Blind runs with claude:claude-haiku-5-5 (2026-10-09)

| Paper | Result | File |
|---|---|---|
| desveaux2026-pcrv-ic50 | 10 of 10 computed, 9 of 9 reported. | bench/results/papers-2026-10-09-drc-dose-response-haiku.md |
| aledo2022-renz-onpg | 2 of 2 | bench/results/papers-2026-10-09-drc-dose-kinetics-zprime-haiku.md |
| cooley2020-splitluc-zprime | 19 of 19 | bench/results/papers-2026-10-09-drc-dose-kinetics-zprime-haiku.md |

The first run of desveaux2026-pcrv-ic50 in the kinetics file timed out after 1800 s.
The tool fit_dose_response waited for the decision response_level, which the answer file of the paper did not set.
The answer file now sets it, and the second run passes.
