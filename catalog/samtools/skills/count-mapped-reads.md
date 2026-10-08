---
name: count-mapped-reads
description: Steps to get the total, mapped, properly paired and per-sequence read counts from a SAM or BAM file.
---

# Count reads in an alignment file

1. Look at the input file. A SAM file (.sam or .sam.gz) must become a BAM file first.
2. Run convert_to_bam. Give the reference FASTA file if the SAM file has no header. Ask the scientist for the file if it is open.
3. Run sort_bam with the bam path.
4. Run index_bam with the sorted bam path. Keep indexed_bam.
5. Run flagstat with indexed_bam. Report total, mapped, properly paired and singletons.
6. Run idxstats with indexed_bam. Report the mapped reads for each reference sequence.
7. Run count_reads for any other count. The scientist chooses the mapping quality cutoff and the flags.
8. Say that flagstat counts all reads, and say which filters each other count used.
