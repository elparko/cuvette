# El Masri 2026: LIMIT cohort, meconium microbiota, MaAsLin 2

## Citation
- El Masri D et al. Early-life microbiota in the LIMIT cohort: unveiling meconium microbiota types beyond maternal lifestyle. Gut Microbes 18(1) (2026).
- DOI: 10.1080/19490976.2026.2712811. CC BY 4.0. Full text read in Europe PMC (PMC13449723) on 2026-10-09.

## Data
- Zenodo 10.5281/zenodo.18376726, CC BY 4.0: `otutable.csv` (267 kB, 538 OTUs by 168 samples, then 7 taxonomy columns) and `metadata.csv` (21 kB, 168 rows). SHA-256 sums are in `fetch.sh`.
- The OTUs are genome taxonomy database species. The sequencing is 16S V1 to V8 with Oxford Nanopore long reads.
- Local path: /Volumes/T7/guided-analysis/data/elmasri2026-limit-maaslin2/. `fetch.sh` downloads and checks the files.
- The column gestational_age_weeks has typed entries such as "39 .5". The benchmark uses the whole-number column gestational_age.

## Tool
- MaAsLin2 1.26.0 (R 4.6.1) through the `microbiome` adapter, tool `differential_abundance`.
- Independent check: `check_limit_maaslin.py` (pandas, statsmodels OLS, Benjamini-Hochberg by hand) with the output `check_limit_maaslin.out`.

## Method steps (paper, Methods and Results)
1. Keep the babies born by vaginal delivery. Keep the samples with complete data for the model columns.
2. Remove OTUs found in fewer than 5 percent of the samples.
3. Normalize with total sum scaling. Apply the default log transform.
4. Fit a linear model for each OTU with gestational age, GWG (reference adequate), maternal age and pre-pregnancy BMI. Adjust the p values with Benjamini-Hochberg.

## Numbers to reproduce
| Quantity | Paper | Computed |
|---|---|---|
| Meconium samples | 168 | 168 |
| Participants in the model | 132 | 132 |
| OTUs tested | not printed | 65 (325 tests) |
| Significant associations at q below 0.05 | 1 | 1 |
| q of OTU RS_GCF_002269255.1 and gestational age | 0.043 | 0.042647 |
| Samples with this OTU | 7 | 7 |
| Coefficient (log base 2 per standard deviation) | not printed | -0.458835 |

## Not reproduced
- The PERMANOVA and alpha diversity statements are in Supplementary Tables that the text does not print. The paper reports only "no significant effect" of GWG, which the adapter reproduces (Kruskal-Wallis of Shannon p 0.51, PERMANOVA of Bray-Curtis p about 0.7).
- The clusters of the PAM analysis (R2 0.35, p 0.001) need the PAM step. The adapter has no tool for it.
