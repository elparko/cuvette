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
| Plate basics: blank correction, normalization to controls, Z' factor | SoftMax Pro, Gen5, Excel, Prism | arithmetic in R; Z' after Zhang JH, Chung TD, Oldenburg KR (1999). J Biomol Screen 4(2):67-73. DOI 10.1177/108705719900400206 | method citation | none |
| Growth curves: growth rate, lag time, carrying capacity | Gen5, Prism | R growthcurver (search running) | Sprouffske K (2020). growthcurver. DOI 10.32614/CRAN.package.growthcurver | GPL (>= 2) |
| qPCR: ΔΔCt, efficiency-corrected Pfaffl ratio, reference gene stability | CFX Maestro, QuantStudio | search running | search running | |

The 5PL fit: Gottschalk PG, Dunn JR (2005). The five-parameter logistic: a characterization and comparison with the
four-parameter logistic. Anal Biochem 343:54-65. DOI 10.1016/j.ab.2005.04.035. SoftMax Pro and Gen5 write the 5PL as
D + (A - D) / (1 + (x/C)^B)^E. Prism writes it with the lower asymptote as Bottom. For a rising curve these are two
different equations, so the adapter offers both.

## Plan

1. One adapter, `drc`, for ELISA standard curves, dose-response, enzyme kinetics and plate normalization. drc does
   all four fits, so the adapter has one program citation, and a plate file feeds all tools in the same form (one row
   for each well). ELISA first.
2. A growth-curve adapter and a qPCR adapter, if the search finds a well-cited package and a paper that reproduces.
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
| Next | Neutralizing antibodies against PcrV of Pseudomonas aeruginosa. eLife (2026). DOI 10.7554/eLife.105195 | eLife source data fig3, fig4 and fig6 (xlsx), CC BY 4.0. Raw signal for each well, 3 experiments x 3 replicates | R drc, LL.3; compParm for IC50 ratios | IC50 of MEDI3902 117 ng/mL, 30-B8 21.3 ng/mL, P3D6 3.65 µg/mL (injection assay); P3D6 11.8 µg/mL, 30-B8 45.2 ng/mL (cytotoxicity) | A first drc refit gives each printed IC50. The 30-B8 cytotoxicity value needs LL.4, although the paper names LL.3. |
| Candidate | Gremlin-1 as a target in MASH. eLife (2024). DOI 10.7554/eLife.95185 | eLife source data fig3 (xlsx), CC BY. Raw wells | R drc, LL.4 | Fig 3A IC50 2.7 to 3.1 nM; Fig 3B EC50 12.7 to 13.6 nM | 3B reproduces (13.1 and 13.4 nM). 3A gives 2.38 and 3.23 nM, outside the printed range. |
| Rejected | NBI-921352, a NaV1.6 inhibitor. eLife (2022). DOI 10.7554/eLife.72468 | source data with pooled means only | Prism 8, Hill slope 1 | Table 1 IC50 | The paper fits each biological replicate; the file has only the pooled means. Human values differ (0.042 against 0.051 µM). |
| Rejected | Cipargamin against Babesia. eLife (2025). DOI 10.7554/eLife.101128 | Dryad 10.5061/dryad.8kprr4z02, CC0, download blocked | Prism 9 | IC50 20.2 and 69.4 nM | No download without a Dryad token. |
| Rejected | Ganoderma MTT study. PLOS ONE (2025). DOI 10.1371/journal.pone.0327087 | mean and SD at 5 doses | not named | IC50 | Two fractions have identical rows but different printed IC50 values. |

## Known-answer test sources (adapter tests, not benchmark papers)

| Flow | Data | Trusted value | Independent check |
|---|---|---|---|
| ELISA 4PL | R datasets `DNase` run 1 (Davidian and Giltinan 1995) | R help ?DNase: nls with SSfpl, and anova() of the 3-parameter against the 4-parameter logistic | SciPy least squares (`catalog/drc/checks/check_elisa_dnase.py`) |
| ELISA nine runs | Lassa S1 Data (above) | Table 1 of the paper | SciPy, and the Gen5 values in the workbook |
| Dose-response | drc `ryegrass` | drc help ?ED and Ritz et al. 2015: ED50 3.06 (2.67 to 3.45) | SciPy (`catalog/drc/checks/check_dose_kinetics.py`) |
| Michaelis-Menten | R datasets `Puromycin` | Bates and Watts 1988 and R help ?Puromycin: Vmax 212.7, Km 0.06412 | SciPy, and renz ONPG example |
