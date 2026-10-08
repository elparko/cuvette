---
name: choose-the-input
description: How to choose the input type for DESeq2 - count matrix, transcript quantification with tximport, the counts and lengths of tximport, or a saved SummarizedExperiment.
---

# Choose the input

1. Run inspect_counts on the files. Read the detected input type and the reason.
2. Whole-number gene counts from featureCounts, HTSeq or summarizeOverlaps: use count matrix.
3. Salmon, kallisto or RSEM output: use transcript quantification. Give the folder with one
   quantification file for each sample and a transcript-to-gene table (tx2gene). RSEM
   genes.results files need no tx2gene table.
4. A tximport result saved as two tables (counts and average transcript lengths): use counts and
   lengths. Give the length table as lengths.
5. A saved tximeta or tximport object (.rds): use SummarizedExperiment rds. The sample table is
   in the object.
6. Counts with decimals are estimated counts. Do not round them into a count matrix. Ask the
   scientist for the quant files or the length table.
7. Tell the scientist which input type ran and if length offsets were used. The offsets change
   the number of significant genes.
