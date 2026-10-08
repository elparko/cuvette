# Li 2009: SAMtools, example alignment

## Citation
- Li H, Handsaker B, Wysoker A, et al. The Sequence Alignment/Map format and SAMtools. Bioinformatics 25(16):2078-2079 (2009). DOI: 10.1093/bioinformatics/btp352
- The paper is a two-page application note. It gives no numeric results for the example data. The numbers below are computed from the data with samtools 1.24 (through pysam 0.24.1). I did not read them in the paper.

## Data
- Files ex1.fa (reference, 2 sequences) and ex1.sam.gz (header-less SAM, paired 36 bp reads) from the samtools repository `examples/` folder.
- URL: https://github.com/samtools/samtools/tree/develop/examples
- License: samtools is MIT/Expat licensed; the example files ship in that repository. Synthetic/test data, no patient data.
- Size: about 118 KB.
- Local path: /Volumes/T7/guided-analysis/data/li2009-samtools/

## Tool
- samtools command line (not installed on this machine; the check run used pysam 0.24.1 with samtools 1.24).

## Method steps (samtools manual and the classic example workflow)
1. Index the reference: `samtools faidx ex1.fa`.
2. Convert SAM to BAM, with the reference supplied because the SAM has no header: `samtools view -bT ex1.fa -o ex1.bam ex1.sam.gz`.
3. Sort: `samtools sort -o ex1.sorted.bam ex1.bam`.
4. Index: `samtools index ex1.sorted.bam`.
5. Summary: `samtools flagstat ex1.sorted.bam` and `samtools idxstats ex1.sorted.bam`.
6. Region query: `samtools view -c ex1.sorted.bam seq2:100-200`.

## Numbers to reproduce (computed, samtools 1.24)
| Quantity | Value |
|---|---|
| Reference sequences | seq1 length 1575, seq2 length 1584 |
| Total reads | 3307 |
| Mapped reads | 3271 (98.91 percent) |
| Properly paired | 3144 (95.07 percent) |
| Singletons | 127 (3.84 percent) |
| Read 1 / read 2 | 1654 / 1653 |
| Mapped to seq1 / seq2 (idxstats) | 1482 / 1789 |
| Unmapped (idxstats) | seq1 19, seq2 17 (mate-placed unmapped reads) |
| Reads with MAPQ >= 30 | 3210 |
| Reverse-strand reads (flag 16) | 1641 |
| Reads in seq2:100-200 | 79 |

## Decisions the scientist owns
- Minimum mapping quality for counting reads (the example uses none in flagstat; the check run used 30).
- Whether to include unmapped reads or duplicate-flagged reads in counts. This file has no duplicates.
- Which region to query.
