# Test data sources

| File | Source | License |
| --- | --- | --- |
| visium_hne_100hvg.h5ad | The first 100 highly variable genes of the Squidpy data set "Brain Coronal HnE Adata" (visium_hne.h5ad, 2688 spots, https://doi.org/10.6084/m9.figshare.13604186.v1), made by data/make_test_data.py. The data are a 10x Genomics Visium sample of the mouse brain (Palla et al. 2022, doi 10.1038/s41592-021-01358-2). | CC BY 4.0, stated on the figshare record (checked with the figshare API on 2026-10-09). Credit: Palla et al. and 10x Genomics. Changes: 100 genes, the cell table reduced to the cluster column. |
| imc_cells.h5ad | The Squidpy data set "Imaging Mass Cytometry Breast Cancer" (imc.h5ad, 4668 cells, 34 proteins, https://doi.org/10.6084/m9.figshare.13604192.v1). The data are from Jackson et al. 2020 (Nature, doi 10.1038/s41586-019-1876-x). | CC BY 4.0, stated on the figshare record (checked with the figshare API on 2026-10-09). Credit: Palla et al. and Jackson et al. Changes: the file is unchanged except that data/make_test_data.py removed the uns entries. |
| visium_tiny.h5 | 300 spots and 400 genes of random Poisson counts in the 10x .h5 layout. Made by data/make_test_data.py with seed 0. | synthetic |
| visium_tiny_positions.txt | A positions file in the Space Ranger layout for the 300 spots. Made by data/make_test_data.py with seed 0. 5 spots are marked as outside the tissue. | synthetic |
