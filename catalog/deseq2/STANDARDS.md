# DESeq2 reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run inspect_counts first. It shows the detected input type. Check that the sample names match.
- Run run_deseq with the design that the scientist chose. Do not choose the design alone.
- Use top_genes for a table of the best genes.

## Input

The scientist chooses the input type. The harness shows the type that it detects from the files.

| Input type | Files | DESeq2 call | Length offsets |
| --- | --- | --- | --- |
| count matrix | Whole-number gene counts: featureCounts, HTSeq, summarizeOverlaps, or any genes x samples table | DESeqDataSetFromMatrix | no |
| transcript quantification | Salmon quant.sf, kallisto abundance.h5 or abundance.tsv, RSEM .results, and a transcript-to-gene table | tximport, then DESeqDataSetFromTximport | yes |
| counts and lengths | The counts table and the length table of a tximport result | DESeqDataSetFromTximport | yes |
| SummarizedExperiment rds | A saved SummarizedExperiment or DESeqDataSet, such as tximeta output | DESeqDataSetFromTximport if it has a length assay, else DESeqDataSetFromMatrix | if a length assay is present |

- Salmon, kallisto and RSEM give estimated counts with decimals. Do not round them into a count
  matrix. Use tximport, so that DESeq2 gets the average transcript length of each gene in each
  sample. DESeq2 uses these lengths as offsets. They correct for a change in the isoform mix
  between samples.
- The length offsets change the result. On the airway data of the rnaseqGene workflow, the
  number of genes at padj < 0.1 changes by about 10% without them.
- If tximport ran with countsFromAbundance set to scaledTPM or lengthScaledTPM, the counts already
  carry the length correction. Then use the rounded counts as a count matrix, without lengths.
- tximport runs offline. tximeta downloads annotation. This adapter does not run tximeta, but it
  reads a saved tximeta object.
- Report the input type, the DESeq2 call, and if length offsets were used. The run_deseq result
  has them in input_type, constructor and length_offsets.

## What to report

- Report the design formula, the variable, the reference level and the test level.
- Report the filter (minimum count and minimum number of samples) and the number of genes that pass it.
- Report the cutoff for padj, the log2 fold change threshold, and the number of genes up and down.
- Say what the unit of replication is and how many replicates each group has.
- Name the DESeq2 version.
- Name the input type and say if transcript length offsets were used.

## How to read the result

- A positive log2 fold change means higher in the test level than in the reference level.
- Many genes with a small padj are normal for a paired design with strong effects. The fold change tells the size.
- A padj of NA means that the gene was removed by the independent filter or by the outlier check. It is not a result.
- A change of the design, the filter or the cutoff changes the gene count. Say which values you used.

## Do not claim

- Do not say that a gene causes an effect. The test shows a change in expression.
- Do not say that two libraries of one donor are two replicates.
- Do not call a gene strongly changed when the log2 fold change threshold is 0.
- Do not say that the numbers match a published workflow unless you compare them. Different gene
  annotations and input types give different counts. The airway experiment as read counts on
  Ensembl 75 genes (data(airway)) does not give the numbers of the workflow, which uses Salmon and
  tximeta (data(gse)).
- Do not round estimated counts into a count matrix.
