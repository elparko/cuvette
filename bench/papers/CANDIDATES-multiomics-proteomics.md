# Paper candidates: multi-omics integration and proteomics statistics

Rules: peer-reviewed research paper from 2018 or later with a DOI. Public input data with an open license. The paper prints the target numbers. An independent check reproduces them. One run takes about 15 minutes or less on a Mac.

Search date: 2026-10-09. Status: the shortlist is below. The section "Outcome" at the end records what was built and what was rejected.

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
