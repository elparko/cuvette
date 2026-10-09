# Paper candidates: cloning, chromatography and bench statistics

Checked on 2026-10-09, for the `cloning`, `chromatography` and `biostats` adapters.

Rules: a peer-reviewed paper with a DOI, open data with an open license, and printed numbers that an
independent route reproduces. One run must take minutes on a Mac.

## Built

| Folder | Paper | Data | Result |
|---|---|---|---|
| `klindworth2013-16s-primers` | Klindworth A et al. Evaluation of general 16S rRNA gene PCR primers. Nucleic Acids Research 41(1):e1 (2013). DOI 10.1093/nar/gks808 | GenBank J01695.2 | The in-silico PCR puts the forward primer at E. coli position 341, as the primer name says. The printed 464 bp is the difference of the two primer positions. The tool counts 465 bases from the first to the last base. |
| `chure2024-hplc-py` | Chure G, Cremer J. hplc-py. Journal of Open Source Software 9(94):6270 (2024). DOI 10.21105/joss.06270 | Zenodo 10642439, GPL-3.0 | Row 1 of Figure 2D reproduces: retention time 10.90, amplitude 2.3e4, area 2.8e6. The skew rounds to 0.69 against a printed 0.70. Rows 2 and 3 do not reproduce; the panel seems to come from another trace. |
| `oreshkova2024-qmp-honeybee` | Oreshkova A, Scofield S, Amdam GV. PLOS ONE 19(9):e0292500 (2024). DOI 10.1371/journal.pone.0292500 | figshare, CC BY 4.0 | 20 of the 21 printed F statistics and both chi-squared values reproduce exactly. |

## Rejected

| Paper | Reason |
|---|---|
| Haas CP et al. ACS Central Science 9(2):307-317 (2023). Diode-array UV data, MIT license | The main text prints no peak area and no retention time. The numbers are in the supplementary sections. |
| Koeppl L-H et al. Communications Biology 7:380 (2024). UV traces on DaRUS, CC BY 4.0 | Table 1 prints conversion classes only. The retention times are in a supplementary table. |
| Arnoldini et al., Cell, chromatography of metabolites | A refractive index detector, and no printed numbers. |
| chromatographR (R package) | No peer-reviewed paper. |
| New England Biolabs catalog, lambda HindIII fragment sizes | Not peer-reviewed. The sizes are a known-answer test of the adapter instead. Six of the eight catalog sizes come out of NC_001416.1. The 6557 and 125 pair appears as one 6682 bp fragment, because the deposited sequence has AAGCTC where the reagent lambda has AAGCTT. |
| Eleršič K et al. PLOS ONE 19(3):e0299379 (2024). Ketamine, Kruskal-Wallis and Dunn | Three of four chi-squared values and all four Dunn Z values reproduce. Two tests report degrees of freedom that the raw file cannot give, because the authors regrouped the treatment column in a way the Methods do not state. |
| Krause and Poth, PLOS ONE 20(5):e0322482 (2025). Repeated-measures ANOVA with Greenhouse-Geisser | The p values appear only as "p < .05". The preprocessing bins the trials by response time, so the result depends on the authors' own scripts. The OSF materials state no license. |

## Notes

- Dryad file downloads need an API token. Records from before about 2022 have a copy on Zenodo.
- A figshare download URL of the form `https://ndownloader.figshare.com/files/<id>` needs no token.
- A paper that prints a statistic to three decimals needs the same route, not only the same data.
- The type of sums of squares, the baseline correction and the background of a hypergeometric test each change the number.
