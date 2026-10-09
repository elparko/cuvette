# Test data sources

| File | Source | License |
| --- | --- | --- |
| pix_h_score_table.csv | Ram S, Vizcarra P, Whalen P, et al. (2021). Pixelwise H-score. PLOS ONE 16(9): e0245638, S1 Table (doi 10.1371/journal.pone.0245638.s002). data/make_pix_table.py joins the three sheets (5T4, P-cadherin, PD-L1) into one table: 75 cases with the pathologist percents at 0, 1+, 2+ and 3+, the pathologist H-score and the QuPath, HALO and other digital scores. | CC BY 4.0 |
| shrout_fleiss_1979.csv | Shrout PE, Fleiss JL (1979). Intraclass correlations: uses in assessing rater reliability. Psychological Bulletin 86(2): 420-428, Table 2 (6 targets, 4 judges). The 24 ratings are printed in the paper. | Data of a published table, cited |
| synthetic_ihc.png | Synthetic. Made by data/make_synthetic.py. 12 nuclei on a white background with designed stain densities (hematoxylin 0.6, DAB 0.05, 0.30, 0.50, 0.80), drawn with the Ruifrok and Johnston vectors. | synthetic, CC0 |
| synthetic_cells.csv | Synthetic. Made by data/make_synthetic.py. 260 cells of two slides with QuPath style columns, a designed Ki-67 hot spot and designed intensity classes. | synthetic, CC0 |
| skimage_immunohistochemistry.png | The sample image immunohistochemistry of scikit-image 0.26.0 (skimage.data.immunohistochemistry): colon glands with FHL2 protein stained with DAB and hematoxylin, acquired at the Center for Microscopy And Molecular Imaging. Saved as PNG. | No known copyright restrictions (scikit-image data documentation); scikit-image is BSD-3-Clause |
