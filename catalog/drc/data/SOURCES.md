# Test data sources

| File | Source | License |
| --- | --- | --- |
| dnase_elisa.csv | R package datasets, data set `DNase` (ELISA of recombinant DNase in rat serum; Davidian M, Giltinan DM 1995, Nonlinear Models for Repeated Measurement Data). Run 1 is the standard curve. The run 2 wells are read as unknown samples with a dilution of 10. Written by data/make_fixtures.R. | GPL-2 or GPL-3, the license of R |
| ryegrass.csv | R package drc, data set `ryegrass` (root length of perennial ryegrass against ferulic acid; Inderjit et al. 2002). Written by data/make_fixtures.R. | GPL-2, the license of drc |
| puromycin.csv | R package datasets, data set `Puromycin` (enzyme velocity against substrate concentration; Treloar 1974, in Bates and Watts 1988). Written by data/make_fixtures.R. | GPL-2 or GPL-3, the license of R |
| lasv_elisa_runs.csv | Yun H et al. 2026, Development and qualification of an enzyme-linked immunosorbent assay to detect human serum immunoglobulin G reactive to multiple lineages of Lassa virus nucleoprotein, PLOS ONE 21(7): e0340568, DOI 10.1371/journal.pone.0340568. Supplement S1 Data, sheet "Table 1 dynamic range", converted to one row for each well by bench/papers/yun2026-lasv-elisa/fetch.sh. Only the optical densities and the nominal values; the Gen5 concentrations are left out. | CC BY 4.0, the license of the article and its supplement. Cite the paper. |
