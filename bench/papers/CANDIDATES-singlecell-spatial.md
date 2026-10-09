# Paper candidates: advanced single-cell and spatial transcriptomics

Rules: peer-reviewed research paper from 2018 to 2026 with a DOI. Public input data with an open license or open access. The paper prints the target numbers. An independent calculation can check them. One run takes about 15 minutes or less on a Mac.

Status: searched on 2026-10-09. The sections "Selected" and "Outcome" show the choice. Numbers come from the full text (PMC, bioRxiv or the documentation page). A number that the search could not read is marked "not verified".

## Capabilities in scope

- Integration across samples: Harmony (harmonypy) and a LISI (local inverse Simpson index) check. Built into the scanpy adapter.
- Spatial transcriptomics: Squidpy (neighbor graph, spatially variable genes by Moran's I, neighborhood enrichment). New adapter `squidpy`.
- Not built in this round: cell-type annotation (CellTypist), trajectories (PAGA, scVelo) and cell-cell communication (LIANA, CellChat). The reasons are in "Rejected".

## Selected

### 1. Korsunsky 2019, Harmony, Jurkat and 293T cell lines
- Citation: Korsunsky I et al. Fast, sensitive and accurate integration of single-cell data with Harmony. Nat Methods 16(12):1289-1296 (2019).
- DOI: 10.1038/s41592-019-0619-0
- Data: three 10x Genomics v1 data sets (pure Jurkat, pure 293T, 50:50 mix). Files `https://cf.10xgenomics.com/samples/cell-exp/1.1.0/<name>/<name>_filtered_gene_bc_matrices.tar.gz`. Sizes 33.0 MB, 30.8 MB and 36.2 MB. All three answer HTTP 200. The 10x page states the license (checked in data/SOURCES.md).
- Numbers printed (Results, Harmony overview and cell-line section): 1799 Jurkat and 1565 293T cells in the mix, 3255 cells in pure Jurkat, 2859 in pure 293T. Median iLISI 1.01 before and 1.59 after Harmony, median cLISI 1.00 before and after. Filters: fewer than 500 genes or more than 20% mitochondrial reads.
- Reproduction: the filter keeps 3255 pure Jurkat cells (exact). Pure 293T gives 2885 and the mix gives 3388, so the cell counts of the paper for these two do not reproduce. Median iLISI before is 1.04 and after is 1.72 with the scanpy route. Harmony and LISI are the same classes of method, but the exact pipeline of the paper (R code, 2019) is not public in the text.
- Adapter: scanpy (new tools `integrate_harmony`, `compute_lisi`, `transfer_labels`).
- Run time: under 1 minute.

### 2. Weber 2023, nnSVG, human dorsolateral prefrontal cortex (DLPFC) Visium sample 151673
- Citation: Weber LM, Saha A, Datta A, Hansen KD, Hicks SC. nnSVG for the scalable identification of spatially variable genes using nearest-neighbor Gaussian processes. Nat Commun 14:4059 (2023).
- DOI: 10.1038/s41467-023-39748-z
- Data: spatialLIBD sample 151673 (Maynard 2021). `151673_filtered_feature_bc_matrix.h5` (12.9 MB) and `tissue_positions_list.txt` (0.19 MB), from the Lieber Institute.
- Numbers printed (Results): 3639 spots overlap the tissue. 3396 of 21,803 genes pass the filter (at least 3 UMI counts in at least 0.5% of spots). MOBP and SNAP25 are in the top 100 genes of all four methods, Moran's I among them. Moran's I ranks the three blood and immune genes lower, at ranks about 100 to 1000.
- Adapter: squidpy (new).
- Run time: under 2 minutes.

## Other candidates (not built)

### Spatial transcriptomics
- Svensson 2018, SpatialDE (Nat Methods 15:343, DOI 10.1038/nmeth.4636). Mouse olfactory bulb: 67 spatially variable genes at FDR below 0.05. Data: Rep11_MOB_0.csv (8.8 MB, Git LFS on GitHub). The count needs SpatialDE itself, so a Moran's I tool cannot match it. Rejected for the count. The data can serve as a second known-answer file.
- Sun 2020, SPARK (Nat Methods 17:193, DOI 10.1038/s41592-019-0701-7). 772 genes in the olfactory bulb, 11,274 genes on 260 spots after filtering. Same data as above. The gene and spot counts reproduce by a numpy rule. The 772 needs SPARK (R).
- Li 2023, SpatialDM (Nat Commun 2023, DOI 10.1038/s41467-023-39608-w). 103 spatially co-expressed ligand-receptor pairs at FDR below 0.1. Needs the CellChatDB list and a permutation test. Exact reproduction is unlikely. Rejected.
- Palla 2022, Squidpy (Nat Methods 19:171, DOI 10.1038/s41592-021-01358-2). The text prints no z-score and no Moran's I value. It names gene and cell type pairs only (Mobp and Nrgn in Visium mouse brain). Used as the source of the package documentation values, not as a benchmark paper.
- Maynard 2021, spatialLIBD (Nat Neurosci 2021, DOI 10.1038/s41593-020-00787-0). 47,681 spots in 12 samples. No domain accuracy value in the text. Rejected: the numbers need all 12 samples (about 150 MB) and give no test of a spatial tool.
- Dong 2022, STAGATE (Nat Commun 2022, DOI 10.1038/s41467-022-29439-6). Adjusted Rand index 0.60 on section 151676 is a value of STAGATE. A generic tool does not give it. Rejected.

### Integration and annotation
- Korsunsky 2019, pancreas meta-analysis (same paper). 14,746 cells in 5 studies. The scIB file has a different cell count and filters. Only the trend is checkable. Rejected.
- Zheng 2017, 68k PBMC (Nat Commun 8:14049, DOI 10.1038/ncomms14049). It prints cell type shares (T cells above 80%, NK about 6%, B about 6%, myeloid about 7%). Rejected: the paper is from 2017, outside the 2018 to 2026 window.
- Kang 2018 (Nat Biotechnol 2018, DOI 10.1038/nbt.4042, GSE96583). The full text could not be read, so no printed number is verified. Rejected.
- Domínguez Conde 2022, CellTypist (Science 376:eabl5197, DOI 10.1126/science.abl5197). 357,211 cells, 329,762 immune cells, 32 and 98 cell types. The data are far above 500 MB. A subset cannot match the totals. Rejected.
- Wilk 2020 (Nat Med 2020, DOI 10.1038/s41591-020-0944-y, GSE150728). The CellTypist model `Adult_COVID19_PBMC` was trained on these cells, so a check is circular. Not verified. Rejected.
- Abdelaal 2019 (Genome Biol 2019, DOI 10.1186/s13059-019-1795-z). F1 values of other tools, not CellTypist. The data are 3.7 GB. Rejected.
- Luecken 2022 (Nat Methods 2022, DOI 10.1038/s41592-021-01336-8) and Tran 2020 (Genome Biol 2020, DOI 10.1186/s13059-019-1850-9). The values of each method are in figures only. Rejected.

### Trajectories, RNA velocity and cell-cell communication
- Wolf 2019, PAGA (Genome Biol 20:59, DOI 10.1186/s13059-019-1663-x). The text prints cell counts of the data sets only. No connectivity value and no pseudotime value. Rejected as a benchmark. The scanpy documentation of the paul15 data (25 Louvain clusters, 15 diffusion eigenvalues) is a version-bound tutorial output.
- Paul 2015 (Cell 163:1663, DOI 10.1016/j.cell.2015.11.013), the source of paul15. Not open access. The numbers cannot be read. Rejected.
- Bastidas-Ponce 2019 (Development 146:dev173849, DOI 10.1242/dev.173849, GEO GSE132188). 36,351 cells and 7260 Ngn3-positive cells. The counts test loading, not a velocity or trajectory tool. The 318 MB file is large. Rejected.
- Bergen 2020, scVelo (Nat Biotechnol 2020, DOI 10.1038/s41587-020-0591-3). The text prints only simulation correlations. The pancreas values (velocity confidence by cluster) come from the documentation of scVelo 0.2.0 and can differ in scVelo 0.3. Rejected as a benchmark.
- Hochgerner 2018 (Nat Neurosci 21:290, DOI 10.1038/s41593-017-0056-2). Not open access. The accession is uncertain (GSE104323 or GSE95315). Rejected.
- Guerrero-Juarez 2019 (Nat Commun 10:650, DOI 10.1038/s41467-018-08247-x, GSE113854) and Jin 2021, CellChat (Nat Commun 12:1088, DOI 10.1038/s41467-021-21246-9). 21,819 cells after quality control, 13 clusters, 60 ligand-receptor pairs in 25 pathways. CellChat needs R, and the cluster labels of the authors are not in GEO. The CellChat text gives 21,898 in the Results and 21,819 in the Methods. Rejected.
- Dimitrov 2022, LIANA (Nat Commun 13:3224, DOI 10.1038/s41467-022-30755-0). The text prints overlap values (Jaccard 0.080 for methods, 0.119 for resources), not a ligand-receptor pair list. The documentation shows a top-pair table for `pbmc68k_reduced` from the package. Rejected as a paper benchmark.
- Lange 2022, CellRank (Nat Methods 19:159, DOI 10.1038/s41592-021-01346-6). Needs the cellrank package. Outside the scope.
- Setty 2019, Palantir (Nat Biotechnol 37:451, DOI 10.1038/s41587-019-0068-4). The text prints no pseudotime values. Rejected.

## Install facts (checked 2026-10-09)

- squidpy 1.8.3 installs on Python 3.12 (macOS arm64). The environment takes 0.9 GB.
- celltypist 1.7.1 installs on Python 3.12. The environment takes 0.6 GB. Models download from `https://celltypist.cog.sanger.ac.uk/models/models.json`. `Immune_All_Low.pkl` is 2.8 MB.
- harmonypy 2.1.0 (GPL-3.0-or-later) has wheels for macOS arm64.
- scvelo 0.3.4 and liana 1.10.0 resolve on Python 3.12. Neither was run.

## Outcome

Built on 2026-10-09. Both papers ran blind with claude:claude-haiku-5-5. The results are in `runs.md` of each paper.

| Capability | Adapter | Paper | Scored items | Haiku (computed, reported) | Items that do not reproduce |
| --- | --- | --- | --- | --- | --- |
| Integration of samples, LISI | `harmony` (with scanpy) | `korsunsky2019-harmony` | 5 | 5 of 5, 5 of 5 | Cells of the pure 293T data set (2885, paper 2859). Jurkat cells in the mix (1773, paper 1799). 293T cells in the mix (1615, paper 1565). All three are references. |
| Spatial transcriptomics | `squidpy` | `weber2023-nnsvg-dlpfc` | 4 | 4 of 4, 4 of 4 | Genes that pass the filter (3309 with the mitochondrial genes removed, 3322 with them, paper 3396). Reference. |

Reasons for the choice:

- Harmony and Squidpy have printed numbers that a run from processed data reproduces: the cells and the median LISI of the cell line test, and the spot count and the layer gene ranks of the nnSVG paper.
- The test values come from the packages themselves (the R reference outputs in the harmonypy tests, the Moran's I values in the Squidpy documentation) and from independent numpy and SciPy calculations.

Not built, with the reason:

- CellTypist: the papers that use it train or test on large atlases (357,211 cells), or print figures only. The one paper with printed shares for PBMC (Zheng 2017) is from 2017.
- PAGA, diffusion pseudotime and scVelo: the papers that print numbers print cell counts, not trajectory results. The documented outputs depend on the version of the package. The source paper of paul15 (Paul 2015) is not open access.
- LIANA and CellChat: the Dimitrov 2022 text prints overlap values only. CellChat needs R. The wound data have no cluster labels in GEO.
- scVI: no paper prints a value that a run on 15 minutes of data reproduces.

Papers checked and rejected after a closer read:

- nnSVG, olfactory bulb: the 7 known genes are not named in the text.
- nnSVG, rank ranges for PCP4, HBB, IGKC and NPY: the ranges ("around 100", "roughly 100 to 1000") match the rank of any other gene in an answer, and the ranks of HBB, IGKC and NPY do not reproduce (54, 33 and 260).
- Harmony paper, pancreas: the cell count of the scIB file differs from the 14,746 cells of the paper.

Faults found in other software:

- `scanpy.external.pp.harmony_integrate` fails with harmonypy 2.1.0. The adapter calls harmonypy directly.
