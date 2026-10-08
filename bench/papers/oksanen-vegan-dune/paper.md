# Oksanen et al.: vegan, the dune meadow data

## Citation
- Oksanen J, Simpson GL, Blanchet FG, Kindt R, Legendre P, Minchin PR, O'Hara RB, Solymos P, Stevens MHH, Szoecs E, Wagner H and others. vegan: Community Ecology Package. R package version 2.7-x. https://CRAN.R-project.org/package=vegan
- Data: Jongman RHG, ter Braak CJF, van Tongeren OFR. Data analysis in community and landscape ecology. Pudoc, Wageningen (1987). The `dune` and `dune.env` tables ship with vegan.
- Worked calls: vegan help pages of `adonis2` and `metaMDS`, and the vignettes `intro-vegan` and `diversity-vegan`. I did not re-read these pages in this session. The values below come from running vegan 2.7.6. The stress 0.1183 matches the value that I recall from the introduction vignette.

## Data
- `dune`: 20 sites by 30 plant species. Values are cover classes 0 to 9, not counts. Site totals are 15 to 48.
- `dune.env`: 20 sites. Columns A1 (thickness of the A1 soil horizon), Moisture (1 to 5), Management (BF, HF, NM, SF), Use (Hayfield, Haypastu, Pasture), Manure (0 to 4).
- Group sizes of Management: BF 3, HF 5, NM 6, SF 6.
- License: GPL-2 or later (package license). Field survey of a meadow, no personal data.
- fetch.sh writes `dune.csv` and `dune_env.csv` to /Volumes/T7/guided-analysis/data/oksanen-vegan-dune/. The adapter folder has copies in `catalog/vegan/data/`.

## Tool
- Original: R package vegan 2.7.6 on R 4.6.1.
- Adapter: `catalog/vegan`.

## Method steps
1. Shannon diversity of each site: `diversity(dune)`.
2. NMDS: `metaMDS(dune, distance = "bray", k = 2)`. The data range is below 50, so the automatic transformation of metaMDS does nothing.
3. PERMANOVA: `adonis2(dune ~ Management, data = dune.env, method = "bray", permutations = 999)` after `set.seed()`.
4. Dispersion: `permutest(betadisper(vegdist(dune), dune.env$Management))`.

## Numbers to reproduce
| Quantity | Value |
|---|---|
| Shannon index of site 1 (natural log) | 1.4405 |
| Richness of site 1 | 5 |
| Mean Shannon over 20 sites | 2.1634 |
| NMDS stress, Bray-Curtis, k = 2 | 0.1183 |
| PERMANOVA Management: R2, F, Df | 0.3416, 2.767, 3 and 16 |
| PERMANOVA p (999 permutations) | 0.002 to 0.004 depending on the seed |
| PERMANOVA p with permutations blocked by Use, seed 1 | 0.010 |
| PERMANOVA R2 with Jaccard on presence | 0.2896 |
| Dispersion test of Management: F | 1.951 |
| Dispersion test p | above 0.1 (0.15 to 0.18 depending on the seed) |

## Decisions the scientist owns
- Distance: Bray-Curtis (the help example).
- Transformation: none.
- Number of permutations: 999. Seed: any fixed value.
- Strata: none.
- Model terms: Management.
- Unit of replication: the 20 sites.
