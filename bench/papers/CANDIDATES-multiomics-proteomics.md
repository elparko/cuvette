# Paper candidates: multi-omics integration and proteomics statistics

Rules: peer-reviewed research paper from 2018 or later with a DOI. Public input data with an open license. The paper prints the target numbers. An independent check reproduces them. One run takes about 15 minutes or less on a Mac.

Search date: 2026-10-09. Status: built and checked. The section "Outcome" at the end records what was built and what was rejected.

Capabilities in scope:
- Differential protein abundance from a quantified table (R limma): normalization, missing values, moderated t test, volcano plot. Replaces Perseus statistics, Proteome Discoverer statistics and Spectronaut post-analysis.
- Multi-omics factor analysis (MOFA+, Python mofapy2): factors and variance explained for each view. Replaces the factor and PCA parts of SIMCA multi-block work.
- Supervised multi-block integration (R mixOmics): sPLS-DA and DIABLO. Replaces SIMCA PLS-DA and OPLS-DA.

## Proteomics statistics

### 1. Zhu 2020, DEqMS, label-free spike-in (dataset D2)
- Citation: Zhu Y, Orre LM, Tran YZ, et al. DEqMS: a method for accurate variance estimation in differential protein expression analysis. Mol Cell Proteomics 19(6):1047-1057 (2020).
- DOI: 10.1074/mcp.TIR119.001646. The article is CC BY 4.0.
- Data: PRIDE PXD000279, `proteomebenchmark.zip` (38 MB), file `proteinGroups.txt`. Six samples, E. coli spiked at 1:3 into a human background.
- Numbers printed: 6566 proteins, 1902 E. coli proteins, 5022 proteins with at least two values in each condition. limma with trend: 1230 true positives and 13 false positives at adjusted p below 0.01.
- Method: log2 of the LFQ intensity, `eBayes(trend = TRUE)`, Benjamini-Hochberg.
- Check: reproduces. See the outcome.

### 1b. Thaqi 2026, limma on bovine corpus luteum (found after the first list)
- Citation: Thaqi G, Chiang DM, Wudy SI, Ludwig C, Berisha B, Pfaffl MW. Bovine Corpus Luteum Proteomics during Different Reproductive and Physiological Stages. Sci Data 13:826 (2026). DOI 10.1038/s41597-026-07515-6. CC BY 4.0.
- Data: Zenodo 10.5281/zenodo.18680101 (CC BY 4.0, 13 MB zip with the raw proteinGroups.txt and the R code). PRIDE PXD069851.
- Numbers printed: 3783 proteins, and the counts of proteins that are higher in each stage for six comparisons (282 and 268, 240 and 240, 98 and 131, 74 and 109, 219 and 240, 138 and 125).
- Method: flag filter, more than one peptide, 70% valid values in one group, Perseus-style imputation (seed 1), quantile normalization, limma with robust eBayes, adjusted p below 0.05 and a twofold change.
- Check: reproduces exactly. See the outcome.

### 2. Zhu 2020, DEqMS, TMT miR-372 (dataset D4)
- Same paper. Data: PRIDE PXD004163, `Yan_miR_Protein_table.flatprottable.txt` (3.5 MB).
- Numbers printed: 8625 proteins without missing values. At 1% FDR the t test finds 1 protein, ROTS 21, limma 120 and DEqMS 201.
- Check: does not reproduce. See the outcome.

### 3. Bai 2023, LFQ-based protein differential expression, UPS spike-in
- Citation: Bai M, Deng J, Dai C, Pfeuffer J, Sachsenberg T, Perez-Riverol Y. LFQ-based peptide and protein intensity differential expression analysis. J Proteome Res 22(6):2114-2123 (2023). DOI 10.1021/acs.jproteome.2c00812.
- Data: the PXD000279 table of candidate 1 and two archives of 1.7 GB and 1.8 GB.
- Numbers printed: counts of true positives out of 48 UPS proteins for each tool (Eatomics, limma with vsn: 38).
- Risk: the column "total" is not defined. Each tool uses its own defaults. Not built.

### 4. PRONE 2025, normalization evaluation with limma
- Citation: Systematic evaluation of normalization approaches in tandem mass tag and label-free protein quantification data using PRONE. Brief Bioinform (2025), bbaf201. DOI 10.1093/bib/bbaf201.
- Data: Zenodo 10.5281/zenodo.12657423 (CC BY 4.0), 80 MB archive of six spike-in sets.
- Numbers printed: protein counts and spike-in rates of five data sets. The error rates are in figures only.
- Risk: few exact counts. Not built.

### 5. Bioconductor expression proteomics workflow 2023
- Citation: F1000Research 12:1402 (2023). DOI 10.12688/f1000research.139116.1.
- Data: PRIDE PXD041794 and Zenodo 10.5281/zenodo.7837375 (CC BY 4.0). The files hold peptide-spectrum matches (PSM), not a protein table.
- Numbers printed: 395 proteins down and 325 up (TMT, adjusted p 0.01).
- Risk: the tool must first build proteins from PSMs. Not built.

### 6. Kohler 2023, MSstats version 4.0
- Citation: J Proteome Res 22(5):1466-1482 (2023). DOI 10.1021/acs.jproteome.2c00834.
- Data: MassIVE.quant sets at feature level. The pages returned errors for scripts.
- Numbers printed: 929 proteins (MSstats) and 854 (MSqRob) in data set 4.
- Risk: feature-level input, and no direct file URL. Not built.

### 7. Others
- Sticker 2020 (msqrob2, DOI 10.1074/mcp.RA119.001624) and Wolski 2023 (prolfqua, DOI 10.1021/acs.jproteome.2c00441) print no counts. Not built.
- Frohlich 2022 (DOI 10.1038/s41467-022-30094-0): one 3.0 GB archive. Rejected for size.
- Valikangas 2018: uses ROTS, not limma. Rejected.

## Multi-omics integration

### 8. Argelaguet 2018, MOFA on chronic lymphocytic leukemia (CLL)
- Citation: Argelaguet R, et al. Multi-Omics Factor Analysis: a framework for unsupervised integration of multi-omics data sets. Mol Syst Biol 14:e8124 (2018). DOI 10.15252/msb.20178124. CC BY 4.0.
- Data: Bioconductor package MOFAdata (LGPL-3), files `CLL_data.RData` (9 MB) and `CLL_covariates.RData`. 200 patients, four views (drugs, methylation, mRNA, mutations).
- Numbers printed: 10 factors at a 2% minimum variance. The 10 factors explain 41% of the drug response variance, 38% of mRNA, 24% of methylation and 24% of mutations. Factor 1 aligns with IGHV status. Factor 2 aligns with trisomy 12.
- Settings: 25 random starts, 2% variance threshold.
- Check: reproduces in part. See the outcome.

### 9. Singh 2019, DIABLO
- Citation: Singh A, et al. DIABLO: an integrative approach for identifying key molecular drivers from multi-omics assays. Bioinformatics 35(17):3055-3062 (2019). DOI 10.1093/bioinformatics/bty1054.
- Data: `breast.TCGA` in the mixOmics package (GPL-2 or later).
- Numbers printed: balanced error rate 17.9% (training) and 22.9% (test) for a four-block panel.
- Risk: the package data has no methylation block, so the printed rates cannot reproduce. Rejected as a numeric target.

### 10. Argelaguet 2020, MOFA+
- DOI 10.1186/s13059-020-02015-1. Single-cell data sets of 1800 to 16000 cells (GEO). Too large for a run of 15 minutes. Rejected.

### 11. Others
- JCI Insight 2025 (kidney disease, DOI 10.1172/jci.insight.186070): the proteomics data is on request only. Rejected.
- moiraine 2026 (DOI 10.1093/bioinformatics/btag070): a run takes 2.2 hours. Rejected.
- STAR Protocols 2026 (DOI 10.1016/j.xpro.2026.104534): complete settings, no printed results. Used for the setting names only.
- Rohart 2017 mixOmics (DOI 10.1371/journal.pcbi.1005752): before 2018. Not a benchmark paper. Used for the keepX and ncomp settings only.

### 12. Other limma papers that the second search found
- Melanoma-induced dendritic cell proteome, Mol Cell Proteomics 2025 (DOI 10.1016/j.mcpro.2025.101444): the MaxQuant archive is 498 MB, the imputation is random with no seed, and the valid value rule is not clear. Rejected.
- Barramundi diet, Proteomes 2026: limma p values with no multiple testing correction and a fold change of 1.3. Does not fit a stated FDR. Rejected.
- Iron and light in a cyanobacterium, Nat Commun 2026 (DOI 10.1038/s41467-026-71628-0): no named proteins with a fold change in the text, and no data accession found. Rejected.
- Bai 2023 and the PRONE paper: see candidates 3 and 4.

### 13. mixOmics
- The mixOmics case studies (breast.TCGA with DIABLO, SRBCT with sPLS-DA) print numbers, but they are package documentation, not papers. The Singh 2019 numbers use a methylation block that the package data does not have. The sputum proteomics paper (IJMS 2022, DOI 10.3390/ijms23158737) has its protein table behind a block of scripted downloads. The Metabolomics 2024 pioglitazone paper (DOI 10.1007/s11306-024-02201-3) has only raw files. No mixOmics paper with an open table and printed numbers was found, so no mixOmics adapter was built.

## Outcome

Built: `limma-proteomics` and `mofa`. Each passes `node bin/ga.js adapter check <name> --run-tests` with no error and no warning.

| Paper | Adapter | Result of the check | Benchmark run (claude-haiku-5-5, blind) |
| --- | --- | --- | --- |
| Thaqi 2026 | limma-proteomics | 3783 and all 12 counts reproduce exactly (`thaqi2026-bovine-corpus-luteum/check.out`) | see `bench/results/papers-2026-10-09-multiomics-haiku.md` |
| Zhu 2020, D2 | limma-proteomics | 6566, 5022 and 1902 reproduce. limma with trend gives 1235 true positives (paper 1230) and 13 false positives (paper 13) when only the proteins that are more abundant at the higher E. coli amount count (`zhu2020-deqms-spike-in/check.out`) | same file |
| Argelaguet 2018 | mofa | 10 factors, Factor 1 for IGHV and Factor 2 for trisomy 12 reproduce. The variance explained is 37.9, 38.1, 25.4 and 28.4 percent (paper 41, 38, 24, 24) | same file |

Rejected or not built, with the reason:

- Zhu 2020, D4 (TMT miR-372): the table has 8633 proteins without missing values (paper 8625), and limma gives 164 proteins (paper 120) and 97 with trend. The PRIDE file is probably a different version of the table. Rejected.
- Zhu 2020, DEqMS numbers (1237 true positives and 11 false positives): DEqMS 1.30 gives 1218 and 7 on the table. Kept as reference items only.
- Zhu 2020, limma without the direction filter: 2248 proteins, 1013 of them human. The paper does not state the direction filter. The prompt states it.
- Singh 2019 (DIABLO): the printed error rates (17.9 and 22.9 percent) are for a four-block panel with 9482 methylation features. The package data has three blocks. Rejected as a numeric target.
- Argelaguet 2020 (MOFA+): single-cell data of 1800 to 16000 cells, too large for a run of 15 minutes. Rejected.
- Bai 2023, PRONE 2025, Bioconductor workflow 2023, Kohler 2023 (MSstats): see the entries above. The printed numbers depend on tool defaults, on a peptide-level roll-up or on feature-level input. Not built.
- Kidney disease JCI Insight 2025 and moiraine 2026: see candidates 11. Rejected.
