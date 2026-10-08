---
name: convert-and-describe
description: Procedure to convert a molecule file to another format and append descriptors with Open Babel.
---

# Convert molecules and write descriptors

1. Count the molecules in the input file.
2. Ask the scientist how to handle salts. Use convert_largest_fragment to remove salt ions. Use convert_molecules to keep them.
3. Run the conversion tool. Count the output lines. Report each molecule that is missing.
4. To get descriptor values, run append_descriptors with the names that the scientist chose.
5. Report the descriptor names in order, the Open Babel version and the counts.
