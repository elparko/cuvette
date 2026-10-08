#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/danecek2021-bcftools"
mkdir -p "$D"
cd "$D"
U=https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/data_collections/1000G_2504_high_coverage/working/20220422_3202_phased_SNV_INDEL_SV/1kGP_high_coverage_Illumina.chr20.filtered.SNV_INDEL_SV_phased_panel.vcf.gz
bcftools view -r chr20:1000000-1100000 -G -Oz -o g1k_chr20_1000000_1100000.vcf.gz "$U"
bcftools index -t -f g1k_chr20_1000000_1100000.vcf.gz
