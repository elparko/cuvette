# Wang 2023: small molecules for four cuproptosis hub genes in osteoarthritis

## Citation
- Wang Y, Zhang Y, Jiang M, Zhang J, Li J, Wang Y, Wang M. Bioinformatics Prediction and Experimental Validation Identify a Novel Cuproptosis-Related Gene Signature in Human Synovial Inflammation during Osteoarthritis Progression. Biomolecules 13(1):127 (2023). DOI: 10.3390/biom13010127. License CC BY 4.0.
- The full text came from Europe PMC (PMC9855951). Table 1 prints the numbers at full precision.
- Gene sets: DSigDB (Yoo M et al., Bioinformatics 31:3069-3071, 2015, DOI 10.1093/bioinformatics/btv313), served by Enrichr (Kuleshov MV et al., NAR 44:W90-W97, 2016, DOI 10.1093/nar/gkw377).

## Data
- The gene list is four symbols: DBT, DLST, FDX1, LIPT1. The abstract and the Results name all four. `fetch.sh` writes them to `hub_genes.csv`.
- The gene sets come from `https://maayanlab.cloud/Enrichr/geneSetLibrary?mode=text&libraryName=DSigDB`. 4026 gene sets, 19,512 distinct gene symbols.
- `fetch.sh` keeps the raw file and drops the lines with no name and no gene. `gseapy.get_library("DSigDB")` drops 20 of the 4026 lines, because their first gene field is empty. That changes the Benjamini-Hochberg denominator and every adjusted p value.
- `fetch.sh` checks the SHA-256 of the file. Enrichr can change a library without changing its name. A changed library makes the published p values wrong, so the check must stop the run.
- Local path: /Volumes/T7/guided-analysis/data/wang2023-cuproptosis-oa/

## Tool
- gseapy 1.3.1 `enrich`, through `catalog/enrichment` (`run_ora`).
- Independent check: `check_hypergeom.py` with `scipy.stats.hypergeom` and a Benjamini-Hochberg step-up written out by hand. Output in `check_hypergeom.out`.

## Method steps
1. Take the four hub genes as the list.
2. Use a background of 20,000 genes, the Enrichr web default.
3. Apply no gene set size limit.
4. Hypergeometric test for each gene set that shares a gene with the list (106 of 4026 do).
5. Benjamini-Hochberg over those 106 terms.

## Numbers to reproduce
| Term | Paper overlap | Paper p | Computed p | Paper adjusted p | Computed adjusted p |
|---|---|---|---|---|---|
| latamoxef HL60 DOWN | 3/1578 | 0.0018453476993 | 0.0018453839712 | 0.1118660761087 | 0.1118672402158 |
| ethotoin HL60 DOWN | 1/24 | 0.0047916600118 | 0.0047917256573 | the same | the same |
| betulinic acid PC3 DOWN | 1/30 | 0.0059868860535 | 0.0059869615252 | the same | the same |
| staurosporine MCF7 DOWN | 2/649 | 0.0060396749482 | 0.0060397542320 | the same | the same |
| cloperastine PC3 DOWN | 1/37 | 0.0073799565223 | 0.0073800423045 | the same | the same |

The odds ratio of the first term is 35.08761904761905 in the paper and in the check. Enrichr uses the uncorrected formula x(N - K - n + x) / ((K - x)(n - x)). gseapy adds a Haldane-Anscombe correction and gives 27.28, so the adapter reports both columns.

The printed and the computed p values agree to about 5 significant figures, not to the last digit. Enrichr has its own hypergeometric code. The item tolerances allow this difference.

## The trap
The background decides the p values. With the genes of the library as the background (19,512 genes), the gseapy default, the top term gives 0.00198 instead of the printed 0.00185. With the measured genes as the background the test is meaningless here, because the "measured" table is the gene list itself.

The gene set size limits are a second trap. The usual 15 to 500 would drop the second, third and fifth terms, which have 24, 30 and 37 genes, and the first term, which has 1578.

## What this paper does not test
The gene list is four genes from a machine learning step, not a differential expression table with a cutoff. The adapter's cutoff path (`padj_column`, `lfc_column`, `direction`) is not exercised. Preranked GSEA is not exercised either: no open paper found so far prints an enrichment score with a frozen ranked list.

## Decisions the scientist owns
- The gene set collection and its version or download date.
- The background. It changes the p values by a factor here, and by orders of magnitude for a long gene list.
- The gene set size limits.
- The multiple testing correction.
