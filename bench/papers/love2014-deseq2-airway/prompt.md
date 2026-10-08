# Prompts

## Plain
1. I have RNA-seq data from airway muscle cells, with and without the steroid dexamethasone. I ran Salmon and tximeta and saved the object as an .rds file. Which genes change with the drug?
2. Find the genes that go up or down with treatment. How many are there?
3. Give me a table of the top 20 genes with fold change and significance.

## Guided
Does dexamethasone change gene expression in human airway smooth muscle cells, and in which genes? The samples come from four donors, each with a treated and an untreated culture. We quantified the reads with Salmon and summarized them to GENCODE genes with tximeta. The tximeta object is saved as airway_gse.rds. Please start from this object. I also exported it as two tables, gse_counts.csv (estimated counts) and gse_length.csv (average transcript lengths), with the sample table gse_coldata.csv.
