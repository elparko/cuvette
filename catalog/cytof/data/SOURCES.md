# Test data sources

| File | Source | License |
| --- | --- | --- |
| synthetic | synthetic. Written by data/make_synthetic.py with a fixed random seed | synthetic, no restriction |
| bcrxl_metadata.csv | synthetic. Written by hand from the file names of the BCR-XL data | synthetic, no restriction |
| bcrxl | Bodenmiller BCR-XL mass cytometry data (Bodenmiller et al. 2012, Nature Biotechnology 30:858, DOI 10.1038/nbt.2317) as packaged by the Bioconductor package HDCytoData, record EH2255, https://experimenthub.bioconductor.org/fetch/2255. Not in the repository. data/fetch.sh downloads it, checks the SHA-256 sum and writes 16 FCS files | HDCytoData package: MIT. The data files carry no license text of their own, so the files are not committed. |
