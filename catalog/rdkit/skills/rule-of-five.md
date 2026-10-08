---
name: rule-of-five
description: Procedure to count how many molecules follow Lipinski's rule of five from a CSV file of SMILES.
---

# Rule of five for a list of molecules

1. Run load_molecules with the CSV path and the SMILES column name. Give id_column if the file has names.
2. Read n_read, n_parsed, n_invalid and n_multi_fragment. Tell the scientist if any molecule is invalid or has more than one fragment.
3. Run compute_descriptors with the id from the molecules field.
4. Run rule_of_five with the id from the descriptors field.
5. Report the cutoffs, the donor and acceptor definition, the number of violations that you allowed, and the counts with zero, one and two or more violations.
6. Name the RDKit version and the logP method.
