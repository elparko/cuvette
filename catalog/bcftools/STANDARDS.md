# bcftools reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool runs one bcftools command.
- Pass the path that the last step gave. Use vcf from filter_variants or normalize_variants.
- Answer each question in the request. If a question needs a tool call, make the call before you write the answer. Do not write "I will use" and stop.
- For a question about one part of the genome, call vcf_stats or filter_variants with the region.
- Ask the scientist for the reference genome build, the quality and depth cutoffs, and the regions. Do not choose them.

## Counts

- Say which tool made each number.
- State the QUAL cutoff, the depth cutoff, the variant type and the FILTER setting of each count. Write "none" if there are none.
- Say if a count is records or alleles. A multiallelic record is one record and more than one variant.
- Name the reference genome build. Say that it is not known if the file does not say.
- Give the SNP count with each Ts/Tv ratio. A ratio from fewer than 1000 SNPs has a large random error.
- A file with no samples (sites only) has no genotype counts. Do not report genotype numbers for it.

## Normalization

- Normalization needs the reference FASTA file of the same build as the VCF file.
- Splitting multiallelic sites raises the number of records. Report the count before and after.

## Do not claim

- Do not say that a Ts/Tv ratio proves the calls are correct. A ratio near 2 for whole-genome human SNPs is typical. It does not prove each call.
- Do not compare counts from two filter settings as if they used the same sites.
- Do not call a variant real or false from QUAL or depth alone.
