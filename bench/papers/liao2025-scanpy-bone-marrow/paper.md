# Liao 2025: adipo-osteoprogenitors in mouse bone marrow, single-cell quality control

## Citation
- Liao X, Koehnken Sawall J, Seeley R, Song F, Ji X, Liu X, Song C, Long F. An adipo-osteoprogenitor population in the endosteal niche contributes to bone and fat formation in adult mouse bone marrow. PNAS 122(47):e2502436122 (2025). DOI: 10.1073/pnas.2502436122. Paper license CC BY-NC-ND 4.0.
- Data: GEO series GSE253262, samples GSM8017442 (pulse) and GSM8017443 (chase).

## Data
- Cell Ranger filtered feature-barcode matrices, one folder for each sample: barcodes.tsv.gz, features.tsv.gz, matrix.mtx.gz. About 188 MB in total.
- fetch.sh renames the GEO files (for example `GSM8017442_pulse_matrix.mtx.gz`) to the 10x names in the folders `pulse` and `chase`.
- Mouse cells. GEO data have no use restrictions from NCBI.

## Method (paper, Materials and Methods, "Single-Cell RNA-seq")
1. Adipoq-CreERT2;Ai9 male mice got tamoxifen by oral gavage for three days at 8 weeks of age. Bone marrow was harvested 24 hours (pulse) or 4 weeks (chase) after the last dose. Four mice for each sample.
2. Bright tdTomato-positive endosteal stromal cells were sorted (MoFlo Astrios) and profiled with 10x Single Cell 3' v3.1.
3. Cell Ranger made the filtered matrices. Seurat 4.1.1 did the quality control, normalization, variable genes, dimension reduction and clustering.
4. Quality control: "Cells with nFeature > 6,000 or <200 or >10% mitochondrial genes were excluded".

## Numbers to reproduce
| Quantity | Paper | check_qc.py (numpy, scipy) |
|---|---|---|
| Cells, pulse | 10,608 | 10608 |
| Cells, chase | 10,046 | 10046 |
| Cells after QC, pulse | 9,612 | 9612 |
| Cells after QC, chase | 8,887 | 8887 |

## Decisions the scientist owns
- Unit of replication: one pooled sample for each time point. Cell counts are descriptive.
- Minimum genes per cell: 200.
- Maximum genes per cell: more than 6000 removed.
- Maximum mitochondrial percent: 10. Mouse genes start with "mt-".
- Minimum cells per gene: not stated. The Seurat default is none.
