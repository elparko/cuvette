---
name: differential-proteins
description: Steps to find differentially abundant proteins in a quantified protein table with limma.
---

# Differential proteins

1. Read the table header. Find the identifier column, the gene name column, the flag columns and the intensity columns.
2. Find which samples belong to which group. Ask the scientist if the file names do not show it.
3. Ask the scientist for the flag columns, the valid value rule, the normalization and the imputation.
4. Run prepare_protein_table. Read how many proteins stay and how many values are missing.
5. Ask the scientist for the two groups, the variance model and the FDR level.
6. Run test_differential_proteins with the prepared file and the design file from step 4.
7. Look at the volcano plot. A plot that is not symmetric around zero can show a loading shift.
8. Report the settings and the number of samples in each group. Report the counts of up and down proteins and the top proteins.
