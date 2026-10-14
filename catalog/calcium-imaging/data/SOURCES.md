# Test data sources

| File | Source | License |
| --- | --- | --- |
| synthetic_transients.csv | Synthetic. Made by data/make_synthetic.py (fixed random seed). 2 cells, 10 Hz, 100 s, five exponential transients (relative height 0.5, time constant 1 s) at 10, 30, 50, 70 and 90 s, noise SD 1 on F = 100. | synthetic, CC0 |
| synthetic_neuropil_F.csv | Synthetic. Made by data/make_synthetic.py. One cell with resting F 120 and five transients. | synthetic, CC0 |
| synthetic_neuropil_Fneu.csv | Synthetic. Made by data/make_synthetic.py. A constant neuropil trace of 40 for the same cell. | synthetic, CC0 |
| synthetic_stimulus.csv | Synthetic. Made by data/make_synthetic.py. 6 cells, noise SD 0.02, cells 1 to 3 rise by 0.3 for 2 s after each of 5 onsets. | synthetic, CC0 |
| synthetic_correlation.csv | Synthetic. Made by data/make_synthetic.py. Three traces with B = 2 A + 5 and C = -A. | synthetic, CC0 |
| synthetic_groups.csv | Synthetic. Made by data/make_synthetic.py. 2 groups, 3 animals each, 10 cells each, animal means 1 to 6. | synthetic, CC0 |
| synthetic_groups3.csv | Synthetic. Written by hand for the Welch ANOVA test. 3 groups of 4, 5 and 3 animals, 2 cells each; each animal mean is a set value. | synthetic, CC0 |
| demo_rois.csv | Made for this adapter: 12 circles (radius 4 pixels) at the centers of cells that Suite2p 1.1.0 finds in the CaImAn demo movie. | synthetic, CC0 |
| cascade | Not in the repository. data/fetch.sh downloads the cell-attached ground truth recording of one Allen Institute neuron (file CAttached_Allen_tetO_101084_neuropil_subtracted_mini.mat, dataset DS12 of the Cascade ground truth database, Helmchen lab, github.com/HelmchenLabSoftware/Cascade, commit 69ecbf1b), checks its SHA-256 sum, and writes allen_101084_dff.csv and allen_101084_spikes.csv. Rupprecht et al. 2021, doi 10.1038/s41593-021-00895-5. | GPL-3.0 (the license of the Cascade repository). The repository does not redistribute the files. |
| demo/demoMovie.tif | Not in the repository. data/fetch.sh downloads the demo movie of CaImAn (github.com/flatironinstitute/CaImAn, example_movies/demoMovie.tif, 19 MB) and checks its SHA-256 sum. Giovannucci et al. 2019, doi 10.7554/eLife.38173. | GPL-2.0 (the license of the CaImAn repository). The repository does not redistribute the file. |
| demo/suite2p_ok | A marker file that data/fetch_suite2p.sh writes if a Suite2p environment exists. The script exits with code 7 (the test is skipped) if there is none. | none (empty file) |
| synthetic_groups3_flat.csv | Synthetic. Written by hand for the Welch ANOVA failure test. 3 groups of 4 animals, 1 cell each; group c has 4 values of 0. | synthetic, CC0 |
