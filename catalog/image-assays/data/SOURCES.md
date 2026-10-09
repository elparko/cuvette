# Test data sources

| File | Source | License |
| --- | --- | --- |
| synthetic_plate.png | Synthetic. Made by data/make_synthetic.py (fixed random seed). The known answers come from the design: 12 colonies, 3 specks, 1 streak, 1 colony in the rim band. | synthetic, CC0 |
| synthetic_uptake.tif | Synthetic. Made by data/make_synthetic.py. 3 channels (nuclei, membrane, cargo), 9 whole cells with known cargo spots, 1 cell cut by the edge, 1 spot outside the cells. | synthetic, CC0 |
| synthetic_brightfield_red.tif | Synthetic. Made by data/make_synthetic.py. A brightfield channel with 8 textured cells and a red channel with 5 cargo objects, 4 of them inside 3 cells. | synthetic, CC0 |
| synthetic_clonogenic.csv | Synthetic. Made by data/make_synthetic.py. Colony counts and cells seeded for a control and two doses. | synthetic, CC0 |
| coloc2 | Not in the repository. data/fetch.sh downloads the test images of Fiji Coloc 2 (github.com/fiji/Colocalisation_Analysis, commit 82af2de4, src/test/resources: colocsample1b-green.tif, colocsample1b-red.tif, colocsample1b-mask.tif, mandersA.tiff to mandersD.tiff, mandersI.tiff) and checks the SHA-256 sum of each file. | GPL-3.0 (the license of the Coloc 2 repository). The repository does not redistribute the files. |
