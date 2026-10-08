# OpenMS TOPP standards

These rules apply to every answer. Each tool runs one OpenMS TOPP command line tool.

## Report with each result

- Name the tool, the OpenMS version and the input file.
- For identifications, name the FASTA file, the decoy tag, the enzyme and the FDR (false discovery rate) level and threshold.
- Say how many PSMs (peptide-spectrum matches) there were before the FDR step, and how many decoy hits.
- Say how many distinct peptide sequences remain. A PSM count and a peptide count are different numbers.
- For features, give the m/z tolerance in Da, the charge range and the number of scans in a mass trace.

## What a result does not show

- An FDR from a file with no decoy hits is not valid. Do not report it.
- A q-value is an estimate from decoy counts. At 1% with fewer than 100 PSMs the estimate has a large random error.
- A feature is a signal group in m/z and retention time. It is not an identified peptide.
- This adapter works at the PSM level. Do not call a PSM count a protein count.

## Traps

- FalseDiscoveryRate here uses decoys / targets. Sage uses (decoys + 1) / targets. The same PSMs give different counts at 1%. Name the method with the number.
- The FASTA file must be the file of the search. Another file changes which hits are decoys.
- The enzyme of PeptideIndexer must match the search. A wrong enzyme leaves peptides without a protein.
- FeatureFinderCentroided needs centroided data. Profile data gives no useful features.
- A tolerance of 0.03 Da suits high-resolution MS1. A low-resolution scan needs a larger value.
