# Lazear 2023: Sage, an open-source tool for fast proteomics searching and quantification at scale

## Citation
- Lazear MR. Sage: An Open-Source Tool for Fast Proteomics Searching and Quantification at Scale. J Proteome Res 22(11):3652-3659 (2023). DOI: 10.1021/acs.jproteome.3c00486
- I did not read the full text for this folder. The paper describes the engine. It reports benchmark runs on large public data sets. Those data sets are too large for this check.
- Every number in `expected.yaml` is computed here with Sage 0.14.6. None comes from the paper.

## Data
- Three ion trap MS2 runs of a standard protein mixture (OpenMS example data BSA1, BSA2, BSA3). Each has 564 MS1 and 1120 MS2 spectra.
- Source: https://github.com/OpenMS/OpenMS/tree/develop/share/OpenMS/examples/BSA
- Protein database: the 18 standard proteins and contaminants from `18Protein_SoCe_Tr_detergents_trace.fasta` (OpenMS TOPPAS example). The file also holds the proteome of the background organism, Sorangium cellulosum. The check uses the 119 proteins that are not from that organism (`standards.fasta`).
- License: OpenMS examples, BSD 3-clause for the software. The data licence is not stated. Check before redistributing.
- Local path: /Volumes/T7/guided-analysis/data/lazear2023-sage/ (about 35 MB). `fetch.sh` downloads it and checks the sums.
- Small copies for the adapter tests are in `catalog/sage/data/`: only the 283 spectra that gave a PSM with min_len 7, each file under 1 MB.
- A second test in `catalog/sage/data/` is the single-spectrum file from the Sage repository (peptide LQSRPAAPPAPGPGQLTLR, 12 KB).

## Tool
- Sage 0.14.7 release binary (aarch64-apple-darwin). It prints version 0.14.6 with `--version`.
- Path: /Volumes/T7/guided-analysis/tools/sage/sage-v0.14.7-aarch64-apple-darwin/sage

## Method steps
1. Write a configuration file with the database, the enzyme, the modifications and the tolerances.
2. Run `sage config.json` on the mzML files.
3. Read `results.sage.tsv`. Keep target rows (label 1) with `spectrum_q` at or under 0.01.
4. Count the rows (PSMs) and the distinct `peptide` values.

## Settings used for the known answers
Trypsin (no cut before P), 1 missed cleavage, peptide length 5 to 50 (Sage defaults), fixed C+57.0215, variable M+15.9949 (at most 2), reversed decoys made by Sage (tag rev_), precursor 10 ppm, fragment 0.5 Da, isotope error 0, fragment charge 1, at least 6 peaks per spectrum.

## Numbers to reproduce (computed, Sage 0.14.6)
| Quantity | Value |
|---|---|
| PSMs (rows) | 303 |
| Decoy PSMs | 43 |
| Target PSMs at 1% PSM FDR | 207 |
| Distinct peptides in those PSMs | 47 |
| Decoys among the 207 | 1 |
| Target PSMs at 5% PSM FDR | 242 |

A Python recount of the q-values from the decoy labels gives the same 207 and 242.
