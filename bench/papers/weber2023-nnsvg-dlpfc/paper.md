# Weber 2023: nnSVG, spatially variable genes in the human prefrontal cortex

## Citation
- Weber LM, Saha A, Datta A, Hansen KD, Hicks SC. nnSVG for the scalable identification of spatially variable genes using nearest-neighbor Gaussian processes. Nature Communications 14:4059 (2023). Paper license CC BY 4.0.
- DOI: 10.1038/s41467-023-39748-z
- The numbers below come from the Results and Methods of the paper (PMC10333391, read 2026-10-09).

## Data
- Source: spatialLIBD human dorsolateral prefrontal cortex (DLPFC) Visium data, sample 151673 (Maynard et al. 2021, 10.1038/s41593-020-00787-0).
- Counts: `https://spatial-dlpfc.s3.us-east-2.amazonaws.com/h5/151673_filtered_feature_bc_matrix.h5` (12.9 MB). Spots: `tissue_positions_list.txt` of the HumanPilot repository of the Lieber Institute (0.19 MB).
- License: not stated for the data (checked 2026-10-09). The project page says the data are public. Confirm before redistribution.
- Local path: /Volumes/T7/guided-analysis/data/weber2023-nnsvg-dlpfc/151673/. `fetch.sh` makes it.

## Tool
- Squidpy 1.8.3 (Python 3.12) with scanpy 1.12.4, through the squidpy adapter.

## Method steps, in order
1. Read the matrix and the positions. Keep the spots with in_tissue 1. Result: 3639 spots.
2. Remove the genes that do not have at least 3 UMI counts in at least 0.5 percent of the spots, and the mitochondrial genes (paper, Methods).
3. Normalize each spot to 10,000 counts and apply log1p. (The paper uses the scran library size factors.)
4. Link the spots on the Visium grid with 6 neighbors.
5. Compute Moran's I of each gene and rank the genes by it.

## Numbers to reproduce
| Quantity | Paper | check_svg.py (h5py, SciPy) |
|---|---|---|
| Spots in the tissue | 3639 | 3639 |
| Genes with a count | 21,803 | 21,842 (does not reproduce) |
| Genes that pass the filter | 3396 | 3322, or 3309 without MT- genes (does not reproduce) |
| Moran's I rank of MOBP | within the top 100 | 4 |
| Moran's I rank of SNAP25 | within the top 100 | 19 |
| Moran's I rank of PCP4 | around 100 | 66 |
| Moran's I rank of HBB, IGKC, NPY | roughly 100 to 1000 | 54, 33, 260 (does not reproduce) |

The benchmark scores the spot count, the number of layer genes in the top 100 (2) and the ranks of MOBP and SNAP25 (computed by check_svg.py, because the paper gives no exact rank). The gene count of the paper is a reference. The ranks of PCP4, HBB, IGKC and NPY are not scored: a rank range ("around 100", "roughly 100 to 1000") matches the rank of any other gene in the answer, and the ranks of HBB, IGKC and NPY do not reproduce.

## Decisions the scientist owns (paper choice)
- Minimum UMI counts per gene in a spot: 3.
- Minimum fraction of spots: 0.5 percent.
- Genes to remove: mitochondrial (MT-).
- Spatial graph: Visium grid, 6 neighbors (the paper does not state the graph of its Moran's I).
