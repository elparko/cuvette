# Flow cytometry and microbiology susceptibility candidates

Papers from 2018 to 2026 with open data, checked on 2026-10-09 for the paper benchmark.
A candidate passes if the printed numbers reproduce from the shared raw data.
Checks used pandas, NumPy, SciPy, flowio and R 4.6.1 (flowCore 2.24.0, AMR 3.0.1).
Downloads are in `/Volumes/T7/guided-analysis/tools/flow-candidates/` and `/Volumes/T7/guided-analysis/tools/mic-candidates/`.

## Flows and software

| Flow | Programs that labs use | Open-source program | Citation that the authors ask for | License |
|---|---|---|---|---|
| MIC tables: S, I, R by EUCAST or CLSI breakpoints, MIC50, MIC90 | WHONET, instrument software (Vitek, Sensititre), Excel | R AMR, adapter `amr` | Berends MS, Luz CF, Friedrich AW, Sinha BNM, Albers CJ, Glasner C (2022). AMR: An R Package for Working with Antimicrobial Resistance Data. J Stat Softw 104(3):1-31. DOI 10.18637/jss.v104.i03 | GPL-2 or later |
| Spillover matrix from single-stain controls | FlowJo, FCS Express, BD FACSDiva | R flowCore data structures, adapter `flowcore` (median method of Roederer) | Hahne F et al. (2009). BMC Bioinformatics 10:106. DOI 10.1186/1471-2105-10-106; Ellis B et al. flowCore, DOI 10.18129/B9.bioc.flowCore | Artistic-2.0 |
| Percent positive and MFI of each sample, group tests | FlowJo, FCS Express, Prism | adapter `flowcore` (cutoffs from the scientist or a control, then R t.test and wilcox.test) | as above | Artistic-2.0 |

Time-kill curves and cell cycle fits were not built. No open data set that prints the fitted numbers was found.

## Microbiology: MIC tables

| Status | Paper | Data | Standard in the paper | Printed numbers | Result |
|---|---|---|---|---|---|
| Built: `kresken2021-temocillin` | Kresken M, Pfeifer Y, Werner G. Comparative in vitro activity of piperacillin-tazobactam and temocillin against third-generation cephalosporin-resistant, carbapenem-susceptible E. coli and K. pneumoniae. GMS Infect Dis 9:Doc08 (2021). DOI 10.3205/id000077 | Zenodo 6575080 (mirror of Dryad 10.5061/dryad.931zcrjkc), CC0. 109 isolates, 21 drugs | EUCAST v 11.0 (January 2021), broth microdilution | MIC50, MIC90 and percent susceptible of 8 groups (2 species, 2 cephalosporin groups) and 2 drugs: 24 values | All 24 reproduce exactly with AMR (EUCAST 2021, S and I counted as susceptible) and with plain Python. Temocillin needs "S and I" (EUCAST v 11 S at 0.001 or less, R above 16). |
| Built: `kovacs2026-mycoplasma-mic` | Kovács ÁB et al. Genome-wide association study of Mycoplasma anserisalpingitidis strains for antibiotic susceptibility. Sci Rep (2026). DOI 10.1038/s41598-026-39804-w | Supplementary Table 1, CC BY 4.0. 110 strains, 9 drugs | none (no clinical breakpoints) | MIC50 and MIC90 of 9 drugs | 13 values reproduce. The enrofloxacin MIC50 (printed more than 10) does not: the table gives 5. Values with limit signs and dilution series that are not powers of two. |
| Rejected | Salmonella in dairy cattle feces, UC Davis, 2002 to 2016. PLOS ONE (2018). DOI 10.1371/journal.pone.0199928 | Zenodo 4946838, CC0. 242 isolates | CLSI, "NARMS breakpoints" | Ceftriaxone R 97 of 242 (40.1%) and others | The text values reproduce with NARMS cutoffs in plain Python. AMR (CLSI 2018) has no ampicillin or azithromycin breakpoint for Salmonella enterica and gives ceftriaxone R at 64 or more, not 4 or more. The AMR table is not the NARMS table, so the benchmark cannot test the tool. Pansusceptible 49.2% (paper: about 46%) does not reproduce. |
| Rejected | Naicker SD et al. Fluconazole susceptibility of Cryptococcus gattii isolates from South Africa. PLoS Negl Trop Dis (2022). DOI 10.1371/journal.pntd.0010448 | figshare 20184796, CC BY 4.0. Counts of isolates at each MIC, not one row for each isolate | CLSI epidemiological cutoff values | MIC50, MIC90, geometric mean for 4 molecular types | All reproduce except the MIC90 of VGIV (printed 12). The paper averages the two middle ranks when 0.9 n is a whole number. The tool uses the lowest concentration at or above the percentile (8). The file is a count table. |
| Rejected | Legionella azithromycin, Portugal (Zenodo 10387040); Klebsiella blaKPC (Zenodo 17060580) | restricted access | | | No download. |
| Rejected | Candida bloodstream isolates, Malaysia (Zenodo 17946818); XF-73 against 2527 Staphylococcus isolates (figshare 24288799) | supplement is a PDF | | | No table of isolates. |
| Rejected | Neisseria gonorrhoeae, New Zealand. Microb Genom (2021) | CC BY-NC | | | License not on the list. |
| Rejected | Candida in a Mexican hospital (Zenodo 23075632) | CC BY, isolate-level fluconazole MICs with CLSI S, SDD, R | CLSI | | The paper is a revised manuscript, not yet peer reviewed. Check again after publication. This data set would test the SDD category. |

The Salmonella and Cryptococcus rejections show two things for users. The percentile rule of the tool is the common one (lowest concentration at or above the percentile). The breakpoint table is the one in AMR, so a program-specific table such as NARMS needs a manual route.

## Flow cytometry
