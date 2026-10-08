# Danecek 2021: Twelve years of SAMtools and BCFtools

## Citation
- Danecek P, Bonfield JK, Liddle J, et al. Twelve years of SAMtools and BCFtools. GigaScience 10(2):giab008 (2021). DOI: 10.1093/gigascience/giab008
- The paper describes the tools. It gives no numeric result for the data below. Every number in `expected.yaml` is computed with bcftools 1.24 on the command line. I did not read them in the paper.

## Data
- A 100 kb slice (chr20:1000000-1100000, GRCh38) of the 1000 Genomes high-coverage phased panel (3202 samples). The file keeps sites only (no genotypes). It has 2210 records.
- URL: https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/data_collections/1000G_2504_high_coverage/working/20220422_3202_phased_SNV_INDEL_SV/
- License: 1000 Genomes data are open, with no use limit. The slice has no patient identifiers.
- Size: 223 KB. A copy is in `catalog/bcftools/data/`.
- Local path: /Volumes/T7/guided-analysis/data/danecek2021-bcftools/g1k_chr20_1000000_1100000.vcf.gz
- Contig names are chr20 (with the prefix). The panel has no QUAL or INFO/DP fields. It has INFO/AF.
- Small hand-built toy files (11 records) with QUAL, DP and a multiallelic site are in `catalog/bcftools/data/toy.vcf`.

## Tool
- bcftools 1.24 (Homebrew), htslib 1.24.

## Method steps
1. Count by type: `bcftools stats g1k_chr20_1000000_1100000.vcf.gz`.
2. Count a region: `bcftools stats -r chr20:1000000-1050000 <file>`.
3. Filter: `bcftools view -i 'INFO/AF>=0.05' <file>`.

## Numbers to reproduce (computed, bcftools 1.24)
| Quantity | Value |
|---|---|
| Records | 2210 |
| SNPs | 1955 |
| Indels | 248 |
| Other (structural variants) | 7 |
| Multiallelic sites | 0 |
| Transitions / transversions | 1344 / 611 |
| Ts/Tv | 2.20 |
| Records in chr20:1000000-1050000 | 1137 |
| SNPs in chr20:1000000-1050000 | 1021 |
| Records with INFO/AF >= 0.05 | 328 |
| SNPs with INFO/AF >= 0.05 | 279 |

## Decisions the scientist owns
- The reference genome build (GRCh38 here).
- The quality and depth filters. This panel has no QUAL or DP. Frequency is the only filter that fits.
- Which regions to include.
- Whether to normalize and split multiallelic sites. This panel is already biallelic.
