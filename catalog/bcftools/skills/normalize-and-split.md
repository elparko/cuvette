---
name: normalize-and-split
description: Steps to left-align indels and split multiallelic sites, and to report the effect on the counts.
---

# Normalize variants

1. Ask the scientist if the variants must be normalized. Ask for the reference FASTA file and its genome build.
2. Ask if multiallelic sites must be split. The choices are no, any, snps and indels.
3. Run normalize_variants with the path, the reference and the split setting.
4. Report n_before, n_after, n_split and n_realigned.
5. Say that the new file has one record for each alternate allele if the sites were split.
6. Run vcf_stats on the new file if the scientist needs counts by type.
