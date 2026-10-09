# DiffBind reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- count_reads_in_peaks counts the reads of each sample in consensus peaks. It starts from BAM files and peak files.
- find_differential_peaks finds the peaks that differ between two conditions. It starts from a table of raw read counts.
- If you have only a table of read counts for the peaks, start with find_differential_peaks.
- The count table must hold raw read counts. Normalized scores, RPKM or control-subtracted values break the count model.

## What to report

- The experiment: the mark or factor, the cell lines or tissues, the number of samples in each group, and the peak caller.
- The consensus peaks: the number of sites, the rule for a shared site, and the width around the summit.
- The FRiP (fraction of reads in peaks) of each sample, and each sample that you removed with the reason.
- The method (DESeq2 or edgeR), the design with the blocking factors, the normalization, the filter and the false discovery rate cutoff.
- The number of peaks that gain and that lose signal, and the level that has more signal.
- For each named peak: the coordinates, the log2 fold change, and the false discovery rate.
- The versions of DiffBind, DESeq2 and edgeR.

## How to read the result

- A positive log2 fold change means more signal in the test level.
- The number of differential peaks depends on the design. A blocking factor such as the tissue or the cell line can change the number a lot. Report the design.
- The library size normalization keeps a global change of binding. The normalizations that use only the reads in peaks assume that most peaks do not change.
- A missing false discovery rate comes from the independent filter of DESeq2 or from a count of zero. It is not a peak that fails the test.
- Replicates from one cell line or one donor are not independent biological replicates. Name the unit of replication.
- A low FRiP, below 0.05, means a weak enrichment. The peaks of such a sample can be noise.
- A peak is not a gene. If you link peaks to genes, name the rule.

## Do not claim

- Do not say that a factor binds more at a site without the read counts and the design.
- Do not compare the number of peaks of two experiments that used different consensus sets or different filters.
- Do not remove a sample because it makes the result less clear. The scientist names the sample and the reason before the analysis.
