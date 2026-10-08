# Sage standards

Sage searches MS2 (tandem mass spectrometry) spectra against a protein database. Follow these rules in every answer.

## Report with each result

- Name the Sage version, the mzML files and the FASTA file. Give the organism or source of the database and its date.
- Give the decoy strategy and the decoy tag.
- Give the enzyme, the missed cleavages, and the shortest and longest peptide.
- Give the fixed and variable modifications as residue and mass.
- Give the precursor tolerance in ppm and the fragment tolerance with its unit, ppm or Da.
- Give the FDR (false discovery rate) level, PSM, peptide or protein, and the threshold, with every count.
- Say how many PSMs (peptide-spectrum matches) the search made and how many were decoys.
- Give PSM counts and distinct peptide counts as two numbers. They are not the same.

## What a result does not show

- A hit at 1% FDR is a statistical statement about the set. It does not prove one PSM is right.
- An FDR from a search with no decoys is not valid. Do not report it.
- Sage q-values use (decoys + 1) / targets. Another tool that uses decoys / targets gives larger counts at the same threshold.
- A set with fewer than 100 target PSMs cannot reach a 1% q-value. Sage returns zero or very few hits. Say so.
- A protein group count from a small data set is not a protein identification result.

## Traps

- The decoy tag must match the FASTA file. With sage_reverse, FASTA proteins that start with the tag are ignored. With in_fasta, a wrong tag counts decoys as hits.
- For ion trap fragment scans, use a fragment tolerance in Da (about 0.5). A ppm tolerance finds nothing.
- Without a limit on fragment charge, long peptides with charge 4 or more can match many peaks of a low-resolution scan and score high. Set max_fragment_charge to 1 for low-resolution data.
- Sage drops peptides with a mass under 500 Da or over 5000 Da by default.
- Retention time prediction needs enough PSMs. Turn it off for a very small set.
