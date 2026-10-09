# Paper candidates: microbiome tables and mass cytometry

Rules: peer-reviewed paper with a DOI. Open input data. The paper prints the target numbers. An independent calculation can check them. One run takes about 15 minutes or less on a Mac. The window is 2018 to 2026. A paper outside the window is marked.

Status: searched on 2026-10-09. The sections "Selected" and "Outcome" show the choice. Numbers come from the full text (PMC, Europe PMC) unless a line says "not verified".

## Capabilities in scope

- Microbiome tables (16S amplicon or shotgun profiles as a feature table): alpha diversity with optional rarefaction, beta diversity with PERMANOVA and a dispersion test, differential abundance with MaAsLin 2 or ALDEx2. New adapter `microbiome`. The tools replace the statistics steps of CLC Microbial Genomics and the web tools that wrap the same R packages.
- Mass cytometry and spectral flow cytometry from FCS files: arcsinh transform, FlowSOM clustering, population counts, differential abundance with diffcyt. New adapter `cytof`. The tools replace the clustering and the abundance tests of Cytobank and OMIQ.
- Not built: ANCOM-BC (the tool and its documented examples were not tested in this round), MetaPhlAn profile processing (the profile statistics run through the same MaAsLin 2 tool), CATALYST plots (the cytof adapter uses FlowSOM and diffcyt directly).

## Selected

### 1. Nowicka 2019 (version 3 of the 2017 paper), CyTOF workflow, Bodenmiller BCR-XL data
- Citation: Nowicka M, Krieg C, Crowell HL, Weber LM, Hartmann FJ, Guglietta S, Becher B, Levesque MP, Robinson MD. CyTOF workflow: differential discovery in high-throughput high-dimensional cytometry datasets. F1000Research 6:748 (2017), version 3 of 2019-05-24.
- DOI: 10.12688/f1000research.11622.3. CC BY 4.0. The first version is from 2017. Version 3 (2019) is inside the window and it is the version that the numbers come from.
- Data: Bodenmiller_BCR_XL_flowSet of the Bioconductor package HDCytoData (ExperimentHub EH2255, 24.8 MB, SHA-256 2a3048ce...a83b5). 16 FCS files, 8 donors, 172,791 cells. The data files have no license text, so the repository does not hold them. A fetch script downloads them and checks the sum.
- Numbers printed: the cells in each of the 16 samples (2838, 2739, 16675, ...), the percent of each of 8 cell types in each sample (for example 14.3 percent NK cells in the Reference sample of donor 1), the p values of the paired GLMM (4.5e-13 for NK cells, 2.2e-11, 3.5e-08, 7.1e-05), 6 cell types at FDR 0.05, and for the model without pairing 3 cell types and p 0.0135 for B-cells IgM+.
- Reproduction: all printed numbers reproduce. The event counts match the 16 printed counts. The shares match the printed table. A direct lme4 fit (binomial, random effects for sample and donor) gives p 4.474e-13, 2.202e-11, 3.451e-08 and 7.112e-05, with 6 and 3 significant cell types.
- Not reproduced: the manual merge of 20 FlowSOM metaclusters into 8 cell types is a figure. The benchmark scores the published labels (channel population_id of the data). The 84 and 44 differential state results need the state tests and are not in the adapter.
- Adapter: cytof (new). Run time: about 4 minutes for the whole session.

### 2. El Masri 2026, LIMIT cohort, meconium microbiota (MaAsLin 2)
- Citation: El Masri D et al. Early-life microbiota in the LIMIT cohort: unveiling meconium microbiota types beyond maternal lifestyle. Gut Microbes 18(1) (2026).
- DOI: 10.1080/19490976.2026.2712811. CC BY 4.0 (Crossref and Europe PMC, PMC13449723).
- Data: Zenodo 10.5281/zenodo.18376726, CC BY 4.0. `otutable.csv` (267 kB, 538 OTUs by 168 samples, SHA-256 d5ea8e30...fa8bb) and `metadata.csv` (21 kB, SHA-256 4f7e424c...ca80e).
- Numbers printed (Methods and Results): 168 meconium samples. MaAsLin 2 with gestational age, gestational weight gain (reference adequate), maternal age and pre-pregnancy BMI as fixed effects, total sum scaling, features in fewer than 5 percent of samples removed, default log transform. One significant association: OTU RS_GCF_002269255.1 (Klebsiella quasivariicola) and gestational age, q = 0.043. The OTU occurs in 7 of 132 participants (5.3 percent).
- Reproduction: the 142 vaginal births drop to 132 with complete data (exact). The OTU occurs in 7 of the 132 (exact). MaAsLin 2 1.x (R 4.6.1, linear model) tests 65 features and 325 associations and returns one result at q <= 0.05: the same OTU, coefficient -0.459, p 0.000131, q 0.04265. The paper q 0.043 matches after rounding.
- Adapter: microbiome (new tool `differential_abundance`). Run time: under 1 minute.

## Other candidates (checked, not built as a benchmark)

### Microbiome
- Rosen 2019, aerodigestive microbiome, PLOS ONE (DOI 10.1371/journal.pone.0216453, Zenodo 10.5281/zenodo.2678108, CC BY 4.0). Table 2 patient counts reproduce exactly (66, 22, 7, 45, 20, 6, 12, 37, 5; 25 aspirators and 23 non-aspirators). The text prints median Jensen-Shannon distances (0.90, 0.56, 0.56). A check in Python gives 0.915, 0.594 and 0.590. The Table 2 total in the paper is 222 and the rows and the metadata give 220. The distance is not a vegan distance, and the values differ by 0.02 to 0.04. Rejected: the printed distances do not reproduce.
- Mallick 2021, MaAsLin 2 paper (PLOS Comput Biol 17:e1009442, DOI 10.1371/journal.pcbi.1009442). The text prints 132 individuals, 1,785 stool samples and 222 species associations at FDR 0.25. The package example data hold 1,595 samples and 87 species. The same model with subject and site as random effects gives 241 associations at q <= 0.25. Rejected: the count does not reproduce with the public subset. The package data serve as a known-answer test (coefficients checked with statsmodels).
- IBS case-control study and nine public data sets, Microbiol Spectr 2023 (DOI 10.1128/spectrum.02125-22, Zenodo 10.5281/zenodo.7272051, CC BY 4.0). The data counts reproduce (945 samples, 2,142 species, 2,027 with reads, 43 samples in the own study). The Chao1 medians (96.6, 71.8, 69.7, 77.0) come from a phyloseq rarefaction with 100 repeats and do not reproduce (105.3, 84.4, 81.2, 92.9 in a Python re-implementation). The ALDEx2 count (32 less and 6 more abundant) gave 30 and 35 hits in a Python re-implementation. Not run with ALDEx2 itself. Rejected as a scored paper: the printed Chao1 and ALDEx2 counts do not reproduce.
- Ovariectomy in mice, J Endocr Soc 2021 (DOI 10.1210/jendso/bvaa173, Zenodo 10.5281/zenodo.4203456). 1,126 variants in 119 samples and the rarefaction depth 9638 reproduce exactly. The PERMANOVA p 0.036 is for unweighted UniFrac, which needs a tree. The adapter has no UniFrac. Rejected.
- QIIME 2 moving pictures tutorial. The table (770 features, 34 samples, 153,807 reads) is downloadable. The pseudo-F 9.4828 of the body-site test uses unweighted UniFrac. Rejected for the same reason.
- DADA2 MiSeq SOP. Only FASTQ files are available. The printed numbers (20 x 293 sequence table, 20 x 232 after chimera removal) need DADA2 and a run of several minutes on 37 MB of reads. Rejected: the task starts from processed tables.
- Lin and Peddada 2020, ANCOM-BC (Nat Commun 11:3514, DOI 10.1038/s41467-020-17041-7). The text prints no count of differentially abundant taxa. Rejected.
- Nearing 2022 (Nat Commun 13:342, DOI 10.1038/s41467-022-28034-z). Percentages over 38 data sets. A single data set cannot reproduce them. Rejected.

### Mass cytometry
- Weber 2019, diffcyt (Commun Biol 2:183, DOI 10.1038/s42003-019-0415-5). The text gives performance values over simulations. The real data section uses the same Bodenmiller data as selected paper 1. Used as the source of the method. Not scored on its own.
- Quintelier 2021, FlowSOM protocol (Nat Protoc 16:3775). The text was not readable. Not verified. Rejected.

## Outcome

- Built: `cytof` (paper 1) and `microbiome` (paper 2). `ga adapter check <name> --run-tests` passes with no error for both.
- Blind runs with claude:claude-haiku-5-5: Nowicka 2019 scores 10 of 10 computed and 10 of 10 reported. El Masri 2026 scores 9 of 9 computed and 9 of 9 reported, and the reference item (65 OTUs tested) matches. The run logs are in `bench/papers/*/runs.md`.
- El Masri 2026 prints numbers for MaAsLin 2 only. The diversity items (Shannon test, PERMANOVA) have independent values from `check_limit_diversity.py`, not printed values.
- ALDEx2 has no benchmark paper. Its known-answer test uses the `selex` data set of the package and a Python implementation as the independent check. The IBS paper that prints ALDEx2 counts was not run with ALDEx2 itself (see the list above).
- The rejected papers and the reason are in the lists above.
