# Test data sources

| File | Source | License |
| --- | --- | --- |
| sacurine.csv | R package ropls 1.44.0, data `sacurine` (dataMatrix and sampleMetadata): urine of 183 human adults, 109 metabolites measured by liquid chromatography with mass spectrometry, normalized to osmolality and log10 transformed. Thevenot EA, Roux A, Xu Y, Ezan E, Junot C (2015). Journal of Proteome Research 14(8): 3322-3335, DOI 10.1021/acs.jproteome.5b00354. Public data of MetaboLights MTBLS404. The sample names are study codes (HU_nnn), with age, body mass index and gender only. Written by data/make_fixtures.R. | CeCILL, the license of the package. The MetaboLights study is public. Cite the paper. |
| sacurine_linear.csv | The same table as sacurine.csv with each value replaced by 10 to the power of the value (a back-transformation). Written by data/make_fixtures.R. | CeCILL, the license of the package |
| tiny_table.csv | Synthetic table of 6 samples and 5 features with one zero and one empty cell. Written by data/make_fixtures.R. | synthetic |
| tiny_three_groups.csv | Synthetic table of 6 samples, 4 features and 3 groups. Written by data/make_fixtures.R. | synthetic |
