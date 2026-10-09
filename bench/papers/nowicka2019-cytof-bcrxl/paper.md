# Nowicka 2019: CyTOF workflow, differential abundance of blood cell types after BCR-XL stimulation

## Citation
- Nowicka M, Krieg C, Crowell HL, Weber LM, Hartmann FJ, Guglietta S, Becher B, Levesque MP, Robinson MD. CyTOF workflow: differential discovery in high-throughput high-dimensional cytometry datasets. F1000Research 6:748 (2017), version 3 of 2019-05-24.
- DOI: 10.12688/f1000research.11622.3. License CC BY 4.0.
- The first version appeared in 2017. The numbers below are from version 3 (2019), read on 2026-10-09 at https://pmc.ncbi.nlm.nih.gov/articles/PMC5473464/.
- The differential abundance methods are in Weber LM et al., Commun Biol 2:183 (2019), DOI 10.1038/s42003-019-0415-5.

## Data
- Bodenmiller BCR-XL mass cytometry data (Bodenmiller et al. 2012, Nat Biotechnol 30:858, DOI 10.1038/nbt.2317): 16 FCS files, 8 donors, each with a Reference and a BCR-XL file, 172,791 cells, 24 protein markers.
- Source: Bioconductor package HDCytoData, ExperimentHub record EH2255, `https://experimenthub.bioconductor.org/fetch/2255` (24.8 MB). SHA-256 2a3048ceba78e7bdee72932f54087519ffd626d0faa4fd512598c0eb105a83b5. `fetch.sh` writes the 16 FCS files and `sample_table.csv`.
- The files carry four label channels: group_id, patient_id, sample_id and population_id. The channel population_id holds the 8 cell types of the paper.
- License: HDCytoData is MIT. The data files have no license text of their own, so they are not in the repository.
- Local path: /Volumes/T7/guided-analysis/data/nowicka2019-cytof-bcrxl/

## Tool
- FlowSOM 2.20.0, diffcyt 1.32.1 and lme4 through the `cytof` adapter (R 4.6.1).
- Independent check: `check_bcrxl.py` counts the events and the cell type shares with flowio and numpy. `check_glmm.R` fits the binomial mixed models with lme4 directly.

## Method steps
1. Read the 16 FCS files. Transform the markers with arcsinh and cofactor 5.
2. Cluster the cells with FlowSOM (10 x 10 grid, 20 metaclusters, seed 1234).
3. Count the cells of each of the 8 cell types in each sample.
4. Test each cell type with a binomial GLMM of diffcyt, with a random effect for the sample and for the donor, then with the sample only.

## Numbers to reproduce
| Quantity | Paper | Computed |
|---|---|---|
| Cells in the file of donor 2 with BCR-XL | 16675 | 16675 |
| Cells in the file of donor 1 Reference | 2739 | 2739 |
| Total cells (sum of the 16 printed counts) | not printed | 172791 |
| Percent of NK cells, Reference file of donor 1 | 14.3 | 14.3 |
| Percent of CD4 T-cells, Reference file of donor 1 | 44.7 | 44.7 |
| p of the NK cells, paired GLMM | 4.5e-13 | 4.474e-13 |
| p of the B-cells IgM-, paired GLMM | 2.2e-11 | 2.202e-11 |
| p of the B-cells IgM+, paired GLMM | 3.5e-08 | 3.451e-08 |
| Adjusted p of the CD8 T-cells, paired GLMM | 0.0019 | 0.001914 |
| Cell types at FDR 0.05, paired GLMM | 6 | 6 |
| p of the B-cells IgM+, GLMM without the pairing | 0.0134820784 | 0.01348 |
| Cell types at FDR 0.05, GLMM without the pairing | 3 | 3 |

## Not reproduced
- The paper merges the 20 FlowSOM metaclusters into 8 cell types by hand. The merge table is a figure, so the benchmark uses the published cell types from the channel population_id. The counts of the 20 metaclusters are not printed, so they are not scored.
- The differential state results (84 and 44 significant cluster-marker pairs) need the signaling markers and the limma or GLMM state tests. The cytof adapter does not run them.
