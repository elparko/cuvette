# Kanetis 2022: Sporocadaceae from grapevine trunk diseases in Cyprus

## Citation
- Kanetis LI, Taliadoros D, Makris G, Christoforou M. A Novel Seimatosporium and Other Sporocadaceae Species Associated with Grapevine Trunk Diseases in Cyprus. Plants 11(20):2733 (2022). DOI: 10.3390/plants11202733. Paper license CC BY 4.0.
- Data: figshare, DOI 10.6084/m9.figshare.20530188 (version 3), CC BY 4.0.

## Data
- `concat_dush_subalign.fas` (134 kB): 55 sequences by 2375 sites. ITS, LSU, tub2 and tef1-a, concatenated.
- Four single-locus alignments, also fetched: `ITS_algn_realigned.fa` (55 x 498), `LSU_algn_clean_subalign.fa` (55 x 780), `BT_algn_realigned2.fa` (49 x 716), `TEF_algn_realigned.fa` (48 x 377).
- The figshare item also has Word files with the figures. fetch.sh does not download them.

## Method (paper, Materials and Methods, section 4.3)
1. MAFFT 7.490 with default parameters, edited by hand in UGENE, concatenated with SeqKit.
2. IQ-TREE 2.0.3, ModelFinder with the Bayesian information criterion (BIC), ultrafast bootstrap with 1000 replicates.
3. Outgroup: Beltrania rhombica CBS 123.58.
4. Parsimony with MPBoot, 1000 bootstrap replicates. Not part of the benchmark.

## Numbers to reproduce
| Quantity | Paper | IQ-TREE 2.0.8 ModelFinder | IQ-TREE 3.1.4, paper model |
|---|---|---|---|
| Best model, concatenated | TIM2e+I+G | TIM2e+I+G4 | fixed |
| Log-likelihood, concatenated | -15,895.468 | -15895.477 | -15895.485 (-15895.483 with bootstrap and outgroup) |
| Sites | 2375 | 2375 | 2375 |
| Constant sites | 1539 | 1546 | 1546 |
| Parsimony-informative sites | 616 | 611 | 611 |
| ITS log-likelihood (K2P+I+G) | -1,641.838 | - | -1641.889 |
| LSU log-likelihood (TNe+I+G) | -1,744.611 | - | -1744.624 |

IQ-TREE 3.1.4 ModelFinder picks TIM2+F+R3 for the concatenated alignment (-15891.367).

## Decisions the scientist owns
- Alignment: use the deposited alignment. Do not realign or trim.
- Model: TIM2e+I+G4, the model that the paper reports.
- Support: ultrafast bootstrap, 1000 replicates.
- Root: Beltrania rhombica CBS 123.58.
