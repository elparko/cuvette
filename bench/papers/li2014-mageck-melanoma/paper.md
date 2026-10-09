# Li 2014: MAGeCK, vemurafenib screen in A375 melanoma cells

## Citation
- Li W, Xu H, Xiao T, Cong L, Love MI, Zhang F, Irizarry RA, Liu JS, Brown M, Liu XS. MAGeCK enables robust identification of essential genes from genome-scale CRISPR/Cas9 knockout screens. Genome Biology 15:554 (2014). DOI: 10.1186/s13059-014-0554-4
- Data of the screen: Shalem O et al. Genome-scale CRISPR-Cas9 knockout screening in human cells. Science 343:84-87 (2014). DOI: 10.1126/science.1247005
- The paper (PMC4290824) was read on 2026-10-09. The numbers below come from its results text.

## Data
- Additional file 4 of the paper (xlsx, 12 MB), sheet "melanoma dataset": 64,077 sgRNAs of 17,396 gene symbols. Columns: sgRNA, Gene, plasmid, D7_R1, D7_R2, D14_R1, D14_R2, PLX7_R1, PLX7_R2, PLX14_R1, PLX14_R2.
- fetch.sh downloads the file, checks its SHA-256 sum and writes the sheet as a tab-separated table. It restores 118 gene symbols that Excel changed to dates.
- Local file: /Volumes/T7/guided-analysis/data/li2014-mageck-melanoma/melanoma_counts.txt
- Cell line data. No data of persons.

## Tool
- Original: MAGeCK, command mageck test, version 0.5.9.5 (the paper used an older version).
- Adapter route: mageck adapter, tool test_screen.

## Sample design
A375 cells with the library, two replicates for each condition. DMSO at day 7 and day 14, vemurafenib (PLX) at day 7 and day 14. The comparison is vemurafenib against DMSO of the same day, with the replicates as one group each.

## Method steps
1. Median normalization of the read counts.
2. Remove the sgRNAs with zero counts in both groups.
3. Test each sgRNA with a negative binomial model, then rank the genes by robust rank aggregation of the sgRNA p values.
4. Read the rank and the false discovery rate of each gene in each direction.

## Numbers to reproduce
| Quantity | Paper | MAGeCK 0.5.9.5 (check.out) |
|---|---|---|
| CDH13, positive, day 14 | rank 9, FDR 0.017 | rank 9, FDR 0.028 |
| PPT1, positive, day 14 | rank 14, FDR 0.085 | rank 14, FDR 0.097 |
| NF1, NF2, MED12, CUL3, TADA1, TADA2B, day 14 | FDR below 0.031, largest rank 11 | largest rank 11 (TADA1), FDR 0.041 |
| RREB1, negative, day 14 | rank 1, FDR 0.05 | rank 1, FDR 0.025 |
| EGFR, negative, day 7 | rank 6, FDR 0.025 | rank 6, FDR 0.027 |
| NF1, NF2, MED12, CUL3, TADA1, TADA2B, day 7 | FDR below 0.030, largest rank 26 | largest rank 27 (NF1), FDR 0.026 |
| Genes ranked | 17,419 | 17,396 |

The ranks of the benchmark items reproduce. The false discovery rates do not, because MAGeCK changed the calculation after the paper. The day 7 positive ranks differ by one place, so they are not items.
