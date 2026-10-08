---
name: count-reads-in-region
description: Steps to count the reads in one region of a reference sequence, with a mapping quality cutoff when the scientist wants one.
---

# Count reads in a region

1. Make sure the BAM file is sorted and indexed. If it is not, run sort_bam, then index_bam.
2. Run count_reads with indexed_bam and region as sequence:start-end, such as seq2:100-200.
3. Leave min_mapq and the flags at the values that the scientist chose. Do not choose them.
4. Report the count, the region, the mapping quality cutoff and the flags.
5. To show how the cutoff changes the count, run the sensitivity check for min_mapq.
