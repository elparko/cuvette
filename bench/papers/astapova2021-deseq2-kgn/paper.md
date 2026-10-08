# Astapova 2021: DHT and gene expression in KGN granulosa cells

## Citation
- Astapova O, Seger C, Hammes SR. Ligand Binding Prolongs Androgen Receptor Protein Half-Life by Reducing its Degradation. Journal of the Endocrine Society 5(5):bvab035 (2021). DOI: 10.1210/jendso/bvab035. Paper license CC BY-NC-ND 4.0.
- Data: GEO series GSE158218.

## Data
- `GSE158218_experiment1_deSeq2_counts.txt.gz` (666 kB) from the GEO series supplement. Gene-level featureCounts counts (subread 1.6.4, GRCh38 with GENCODE 31), 59087 genes by 10 samples, integers.
- fetch.sh converts the tab file to `kgn_counts.csv` and writes `kgn_samples.csv` from the GEO sample titles.
- Samples: DHT10_23, DHT10_28, DHT11_1, DHT11_5, DHT12_4 (GSM4795440 to GSM4795444) and VEH10_23 to VEH12_4 (GSM4795450 to GSM4795454). The suffix is the date of the experiment.
- KGN is a human granulosa-like tumor cell line. No patient data.
- GEO data have no use restrictions from NCBI.

## Method (paper, Materials and Methods, "RNA Sequencing")
1. KGN cells at about 50% confluency, serum-starved for 24 hours, then 25 nM DHT or ethanol for 12 hours. Five independent experiments.
2. TruSeq stranded mRNA libraries, single-end reads, FastP 0.20.0, STAR 2.7.0f, featureCounts (subread 1.6.4).
3. DESeq2 1.22.1 on R 3.5.1, "a P value threshold of .05".
4. Results: the analysis is "only in paired comparisons to eliminate variability due to sample collections on different dates".

## Numbers to reproduce
| Quantity | Paper | check_deseq2.R (DESeq2 1.52.0) |
|---|---|---|
| Genes at padj < 0.05, ~ experiment + treatment | 173 | 173 |
| Up with DHT | 125 | 125 |
| Down with DHT | 48 | 48 |
| Genes at padj < 0.05, ~ treatment | 2 (Discussion) | 2 |
| Largest fold change, up genes | 1.37 | 1.64 (MLE fold change, not scored) |
| Largest fold change, down genes | 0.87 | 0.74 (MLE fold change, not scored) |

## Decisions the scientist owns
- Replication unit: the experiment date. Each date gives one DHT and one vehicle culture.
- Design: `~ experiment + treatment`. Without the experiment term only 2 genes pass.
- Reference level: vehicle (VEH).
- Low-count filter: none stated. DESeq2 independent filtering only.
- FDR cutoff: 0.05.
- Fold change cutoff: none.
