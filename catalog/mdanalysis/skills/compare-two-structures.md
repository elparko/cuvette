---
name: compare-two-structures
description: How to read a PDB file, measure a distance and superpose two chains with Bio.PDB.
---

# Compare two structures

1. Run inspect_structure for each file. Read the chains, the residues of each chain and the number of models.
2. Check that the chains to compare have the same residue numbers and names. The superposition pairs residues by number.
3. Run superpose_structures. The harness asks for the fit atoms (CA or backbone). Read rmsd_before_fit and rmsd_after_fit. Read n_residues_skipped.
4. Run measure_distance for a distance between two atoms. Give chain, residue number and atom name.
5. Report the entry, the model, the chains, the fit atoms, the number of atoms fitted and the Biopython version.
6. Two chains of one crystal entry can differ because of crystal packing. Say so when you compare them.
