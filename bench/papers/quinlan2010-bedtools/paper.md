# Quinlan and Hall 2010: BEDTools

## Citation
- Quinlan AR, Hall IM. BEDTools: a flexible suite of utilities for comparing genomic features. Bioinformatics 26(6):841-842 (2010). DOI: 10.1093/bioinformatics/btq033
- The paper is a two-page application note. It gives no numeric result for the data below. Every number in `expected.yaml` is computed with bedtools 2.31.1 on the command line and checked with awk. I did not read them in the paper.

## Data
- `refseq.chr1.exons.bed` (43424 RefSeq exons on chr1, hg18) and `aluY.chr1.bed` (11628 AluY repeats on chr1) from the bedtools2 repository `data/` folder. Both have a strand column.
- URL: https://github.com/arq5x/bedtools2/tree/master/data
- License: bedtools is GPL-2.0 licensed. The files ship in that repository. Public annotation data, no patient data.
- Size: 0.6 MB compressed.
- Local path: /Volumes/T7/guided-analysis/data/quinlan2010-bedtools/
- A 10 Mb slice of both files and a hand-built toy pair (5 and 6 intervals) are in `catalog/bedtools/data/`.

## Tool
- bedtools 2.31.1 (Homebrew).

## Method steps
1. Overlap pairs: `bedtools intersect -a refseq.chr1.exons.bed -b aluY.chr1.bed -wo`.
2. Exons with any overlap: add `-u`.
3. Fraction rule: add `-f 0.5`.
4. Strand rule: add `-s`.
5. Merge: `sort -k1,1 -k2,2n aluY.chr1.bed | bedtools merge -i - -d 100`.

## Numbers to reproduce (computed, bedtools 2.31.1)
| Quantity | Value |
|---|---|
| Exon and AluY pairs (any overlap) | 129 |
| Overlap bases of those pairs | 33713 |
| Exons with an overlap (-u) | 126 |
| Exons with no overlap (-v) | 43298 |
| Pairs with 50 percent of the exon covered (-f 0.5) | 9 |
| Overlap bases of those pairs | 1473 |
| Exons with an overlap on the same strand (-u -s) | 70 |
| AluY intervals after merge, distance 0 | 11513 |
| AluY intervals after merge, distance 100 | 11270 |

## Decisions the scientist owns
- The genome build (hg18 here). Both files must use the same build.
- The overlap rule: fraction of A, fraction of B, reciprocal or not.
- The strand rule.
- The merge distance.
