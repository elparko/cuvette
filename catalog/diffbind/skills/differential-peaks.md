---
name: differential-peaks
description: Steps to find the ChIP-seq or ATAC-seq peaks that differ between two conditions.
---

# Differential peaks

1. Read the sample table. Find the columns for the sample name, the condition, the tissue or batch, and the library size.
2. Ask the scientist for the groups to compare, the baseline, and the blocking factors. Ask about the unit of replication.
3. If you have BAM files and peak files, run count_reads_in_peaks with the sample sheet. Read the FRiP of each sample. Tell the scientist about each value below 0.05.
4. Ask for the method and the normalization. Ask for the false discovery rate cutoff.
5. Run find_differential_peaks with the count table and the sample table. Use the files that count_reads_in_peaks wrote, or the tables of the scientist.
6. Read the number of tested peaks, the numbers that gain and lose signal, and each warning.
7. If the scientist wants a check of the choices, run the tool again with the other method or with another normalization. Compare the numbers.
8. Report the design, the normalization and the cutoff. Report the numbers that gain and lose signal, and the level that has more signal.
