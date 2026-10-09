# Zhu 2020: DEqMS, label-free spike-in benchmark

## Citation
- Zhu Y, Orre LM, Zhou Tran Y, Mermelekas G, Johansson HJ, Malyutina A, Anders S, Lehtiö J. DEqMS: a method for accurate variance estimation in differential protein expression analysis. Molecular and Cellular Proteomics 19(6): 1047-1057 (2020). DOI: 10.1074/mcp.TIR119.001646. CC BY 4.0.
- Data: PRIDE PXD000279 (Cox et al. 2014, MaxLFQ benchmark). I read the full text on PubMed Central (PMC7261819).

## Data
- proteinGroups.txt has 6694 rows. Two conditions (H and L, with 30 and 10 micrograms of E. coli lysate in a human background), three replicates each, LFQ intensities.
- The column Fasta headers gives the species. 1902 protein groups are E. coli proteins after the removal of Reverse and Contaminant rows.

## Tool
- limma-proteomics adapter: prepare_protein_table and test_differential_proteins with the annotation pattern.
- Independent check: `check.R` uses limma only (`check.out`).

## Method steps
1. Remove Reverse and Contaminant rows.
2. Keep proteins with LFQ values in at least two samples in each condition. Take log2.
3. limma with eBayes(trend = TRUE). Benjamini-Hochberg adjusted p below 0.01.
4. Count the E. coli proteins (true positives) and the human proteins (false positives) among the proteins that are more abundant at the higher E. coli amount.

## Numbers to reproduce
| Quantity | Paper | Computed |
|---|---|---|
| Protein groups after the flags | 6566 | 6566 |
| E. coli proteins among them | 1902 | 1902 |
| Proteins with 2 or more values in each condition | 5022 | 5022 |
| True positives, limma trend | 1230 | 1235 |
| False positives, limma trend | 13 | 13 |

## Numbers that do not reproduce
- DEqMS: the paper prints 1237 true positives and 11 false positives. A run of DEqMS 1.30 with the minimum peptide count of each protein gives 1218 and 7. The items are reference items.
- The paper does not say that it counts only the proteins that are more abundant at the higher E. coli amount. Without this direction filter limma finds 2248 significant proteins, 1013 of them human. The prompt states the direction.
