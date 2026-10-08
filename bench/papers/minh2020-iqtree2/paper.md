# Minh 2020: IQ-TREE 2, example.phy tutorial data

## Citation
- Minh BQ, Schmidt HA, Chernomor O, et al. IQ-TREE 2: new models and efficient methods for phylogenetic inference in the genomic era. Molecular Biology and Evolution 37(5):1530-1534 (2020). DOI: 10.1093/molbev/msaa015
- MAFFT: Katoh K, Standley DM. MAFFT multiple sequence alignment software version 7. Molecular Biology and Evolution 30(4):772-780 (2013). DOI: 10.1093/molbev/mst010
- The IQ-TREE 2 paper has no numbers for example.phy. The IQ-TREE beginner tutorial (http://www.iqtree.org/doc/Tutorial) uses the file. The tutorial output shows the model TIM2+F+I+G4 and a log-likelihood near -21152. All other numbers below come from a run on this machine.

## Data
- example.phy: 17 mitochondrial DNA sequences (lungfish, frog, turtle, bird, mammal and others), 1998 sites, PHYLIP format, 34 KB. From the iqtree2 repository `example/` folder (GPL-2.0 program, example data).
- unaligned.fasta: 6 sequences cut from example.phy (first 240 columns, gaps removed, a few bases deleted), made for the MAFFT check. A copy is in `catalog/phylo/data/`.
- Local path: /Volumes/T7/guided-analysis/data/minh2020-iqtree2/
- No patient data.

## Tools
- IQ-TREE 3.1.4 (binary `iqtree3`, Homebrew formula `iqtree3`; the formula `iqtree2` does not exist). It reads the same options as IQ-TREE 2.
- MAFFT 7.526.

## Method steps
1. Align: `mafft --auto unaligned.fasta > aligned.fasta`.
2. Choose a model: `iqtree3 -s example.phy -m MF -seed 1 -T 1`.
3. Build the tree: `iqtree3 -s example.phy -m MFP -B 1000 -seed 1 -T 1`.
4. Read the best model, the log-likelihood and the support values in `example.phy.iqtree` and the `.treefile`.

## Numbers to reproduce (IQ-TREE 3.1.4, seed 1)
| Quantity | Value |
|---|---|
| Sequences, sites | 17, 1998 |
| Constant sites | 686 |
| Distinct site patterns | 1152 |
| Best model by BIC | TIM2+F+I+G4 |
| Log-likelihood, MFP with 1000 ultrafast bootstrap | -21152.5377 |
| Log-likelihood, MFP, no bootstrap | -21152.5376 |
| Log-likelihood, seed 5 | -21152.5377 |
| Log-likelihood, fixed model HKY | -23117.03 |
| Tree length, TIM2+F+I+G4 | 4.2173 |
| MAFFT on unaligned.fasta | 6 sequences, 240 columns with --auto, at least 79 constant columns |

## Decisions the scientist owns
- Substitution model, or ModelFinder.
- Bootstrap type and number of replicates.
- Outgroup. The tutorial uses no outgroup; the tree is unrooted.
- MAFFT method.
- Whether to trim the alignment.
