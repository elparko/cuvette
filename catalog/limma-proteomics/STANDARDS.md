# limma protein table standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- prepare_protein_table filters, log2 transforms, normalizes and imputes a protein table. It writes the prepared table and a design file.
- test_differential_proteins runs the moderated t test of limma on two groups of the prepared table.
- The input must be a table of proteins, not of peptides or spectra. A peptide or spectrum table needs a roll-up to proteins first.

## What to report

- The number of rows read, the rows removed by the flag columns, and the proteins kept after the valid value filter.
- The valid value rule, the normalization and the imputation, with the settings of the imputation if you used it.
- The two groups, the number of samples in each group, and the sign of the log2 fold change.
- The variance model of limma and the false discovery rate (FDR) level. The p values are Benjamini-Hochberg adjusted.
- The number of significant proteins, up and down, and the top proteins with log2 fold change and adjusted p value.
- The limma version.

## How to read the result

- A log2 fold change of 1 is a twofold change.
- An imputed value is not a measurement. Say how many values the imputation filled.
- The moderated t test shares the variance information of all proteins. It gives more power than a classical t test with 3 samples in a group.
- Technical injections of one sample are not independent replicates.
- A table that the software normalized, such as MaxLFQ intensities, needs no second normalization unless a plot shows a shift.

## Do not claim

- Do not call a protein regulated if its adjusted p value is above the FDR level.
- Do not choose the FDR level or the fold change cutoff after you see the count of proteins.
- Do not compare log2 fold changes between tables that used different normalizations.
