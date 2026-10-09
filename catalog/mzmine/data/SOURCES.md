# Test data sources

| File | Source | License |
| --- | --- | --- |
| PStd_050_1_rt600-660_mz100-200.mzML | Not in the repository. data/fetch.sh downloads 2012_02_03_PStd_050_1.mzML (221 MB) from the OpenMS tutorial data, https://abibuilder.cs.uni-tuebingen.de/archive/openms/Tutorials/Example_Data/Metabolomics/datasets/, checks its SHA-256 sum, and data/crop_pstd.py keeps retention time 600 to 660 s and m/z 100 to 200 (238 spectra, 63775 peaks). crop_pstd.py needs pyOpenMS; set PYOPENMS_PYTHON to a Python that has it. | The archive states no license, so the repository does not redistribute the file. |
| legacy_export_example.csv | Synthetic. Written by hand in the layout of the MZmine 2 Export CSV. | synthetic, no third-party data |
