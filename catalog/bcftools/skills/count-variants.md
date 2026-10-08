---
name: count-variants
description: Steps to count variants by type and get the Ts/Tv ratio of a VCF file, for the whole file or one region.
---

# Count variants in a VCF file

1. Ask the scientist for the VCF file and the reference genome build, if the request does not name them.
2. Run vcf_stats with the path. Add the region if the request names one.
3. Report the records, SNPs, indels, multiallelic sites, transitions, transversions and Ts/Tv ratio.
4. Say that the counts are records. Say how many sites are multiallelic.
5. Say that the counts use no filter. State the region, or write "whole file".
