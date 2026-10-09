# Test data sources

| File | Source | License |
| --- | --- | --- |
| g1k_chr20_1000000_1100000.vcf.gz | The region chr20:1000000-1100000 (GRCh38, sites only) of the 1000 Genomes high-coverage phased panel (https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/data_collections/1000G_2504_high_coverage/working/20220422_3202_phased_SNV_INDEL_SV/), made by bench/papers/danecek2021-bcftools/fetch.sh | open, no use limit (1000 Genomes; bench/papers/danecek2021-bcftools/paper.md) |
| g1k_chr20_1000000_1100000.vcf.gz.tbi | The tabix index of the VCF file, made with bcftools index -t by bench/papers/danecek2021-bcftools/fetch.sh | open, no use limit (1000 Genomes; bench/papers/danecek2021-bcftools/paper.md) |
| toy.vcf | synthetic, made by hand for this adapter (bench/papers/danecek2021-bcftools/paper.md) | synthetic, no third-party data |
| toy.fa | synthetic, made by hand for this adapter | synthetic, no third-party data |
| toy.fa.fai | The index of toy.fa, made with samtools faidx toy.fa | synthetic, no third-party data |
