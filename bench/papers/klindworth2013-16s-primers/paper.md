# Klindworth 2013: general 16S rRNA gene primers on the E. coli rrnB operon

## Citation
- Klindworth A, Pruesse E, Schweer T, Peplies J, Quast C, Horn M, Glöckner FO. Evaluation of general 16S ribosomal RNA gene PCR primers for classical and next-generation sequencing-based diversity studies. Nucleic Acids Research 41(1):e1 (2013). DOI: 10.1093/nar/gks808. License CC BY-NC.
- Template: NCBI GenBank J01695.2, the E. coli rrnB operon. Brosius J et al., PNAS 75:4801-4805 (1978), DOI 10.1073/pnas.75.10.4801.
- The full text came from Europe PMC (PMC3592464).

## Data
- One FASTA file, 7258 bases. `fetch.sh` downloads it from NCBI and checks the SHA-256.
- The 16S gene starts at position 1268 of the record. The primer names count from that base.
- Local path: /Volumes/T7/guided-analysis/data/klindworth2013-16s-primers/

## Tool
- The `cloning` adapter: `simulate_pcr` (a regular expression over the 3' end of each primer, with IUPAC ambiguity codes) and `primer_properties`.
- Independent check: `catalog/cloning/checks/pcr_16s_string_search.py`, a plain regular expression search with no adapter code. Output in `pcr_16s_string_search.out`.

## Method steps
1. Read the template.
2. In-silico PCR with each primer pair. Both forward primers hold ambiguity codes (N, W, M), and both reverse primers hold H, V or M.
3. Convert the product start to the E. coli 16S numbering: position on the record minus 1267.
4. Melting temperature of one primer under the stated buffer conditions.

## Numbers to reproduce
| Quantity | Value | Source |
|---|---|---|
| Pair 1 product on J01695.2 | 1608 to 2072, 465 bases | computed, checked with a string search |
| Pair 1 forward start, E. coli numbering | 341 | the primer name S-D-Bact-0341-b-S-17 |
| Pair 1 amplicon size as the paper counts it | 464 bp | printed in the Results |
| Pair 2 product on J01695.2 | 1275 to 2193, 919 bases | computed |
| Pair 2 forward start, E. coli numbering | 8 | the primer name S-D-Bact-0008-a-S-16 |
| Tm of CCTACGGGAGGCAGCAG (50 mM Na, 1.5 mM Mg, 0.6 mM dNTP, 200 nM primer) | 61.39 C | computed with primer3-py |

## The off-by-one
The paper prints 464 bp. The tool prints 465. Both describe the same product. 464 is the difference of the two primer start positions in the E. coli numbering (785 minus 341). 465 is the count of bases from the first base of the forward primer to the last base of the reverse primer. A report must say which convention it uses.

## What this paper does not test
The restriction digest and the Sanger alignment tools are not exercised. The melting temperature item has no published value; the primer3 test suite pins the same function on 33 other oligonucleotides in the adapter tests.

## Decisions the scientist owns
- The shortest 3' match that counts as a binding site. The two sites here match over the full primer, so the value does not change this result.
- Linear or circular template.
- The melting temperature method and the buffer conditions.
