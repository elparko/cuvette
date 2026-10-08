# DESeq2 reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run inspect_counts first. Check that the sample names match.
- Run run_deseq with the design that the scientist chose. Do not choose the design alone.
- Use top_genes for a table of the best genes.

## What to report

- Report the design formula, the variable, the reference level and the test level.
- Report the filter (minimum count and minimum number of samples) and the number of genes that pass it.
- Report the cutoff for padj, the log2 fold change threshold, and the number of genes up and down.
- Say what the unit of replication is and how many replicates each group has.
- Name the DESeq2 version.

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
  annotations give different counts.
