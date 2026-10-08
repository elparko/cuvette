# Open Babel reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Molecules

- Count the molecules in the input file. Count the output lines. Report both numbers.
- Open Babel exits with success when it drops an invalid molecule. The tools use -e. Without -e it also drops every later molecule.
- Say how salts were handled. The tool convert_molecules keeps all fragments. The tool convert_largest_fragment removes salt ions.

## Descriptors

- Name the descriptors that you appended, in order. Give the Open Babel version.
- Open Babel logP and molecular weight can differ from RDKit values in the last digits. Name the program for each value.
- Do not claim a descriptor is a measured value. It is calculated from structure.

## Formats

- Name the output format. A canonical SMILES from Open Babel can differ from a canonical SMILES from RDKit. Do not compare strings across programs.
- InChIKey is a hash. Use it to find the same molecule across files.
