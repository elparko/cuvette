# MDAnalysis and Bio.PDB reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run inspect_trajectory first. Read the atom count, the frame count and the time step.
- Each measurement tool reads the topology and the trajectory by path. Each tool writes a table and a plot. It never changes the input files.
- Use inspect_structure, measure_distance and superpose_structures for single PDB or mmCIF files.

## Decisions

- The scientist chooses the fit atoms, the measured atoms, the reference frame, whether to fit, the frame stride and the cutoffs. Do not choose them. The harness asks for each value.
- Do not suggest values in a question.

## RMSD and RMSF

- Report the measured selection, the fit selection (or "no fit"), the reference frame and the stride with every RMSD value.
- RMSD is in angstrom. Say which frame is the reference. A different reference gives different values.
- RMSD with a fit measures change of shape. RMSD without a fit also counts rotation and translation.
- RMSD of all atoms is larger than RMSD of the backbone. Do not compare RMSD values that use different selections.
- RMSF is a fluctuation around the mean position, after a fit. Report the fit selection.

## Contacts and hydrogen bonds

- Report the distance cutoff and the two atom groups with every contact count.
- Report the donor, hydrogen and acceptor selections, the distance cutoff and the angle cutoff with every hydrogen bond count.
- The counts change with the cutoffs. Show the sensitivity table before you state one count.
- The hydrogen bond tool needs hydrogen atoms in the topology. Hydrogen names differ between force fields (HN in CHARMM, H in AMBER and GROMACS).

## Replication

- Frames of one trajectory are correlated. Do not compute a p-value or a confidence interval with frames as n.
- Count independent simulations as n. Say how many simulations the data hold.

## Structures

- Report the PDB entry, the model and the chain for every distance and every RMSD.
- Say how many residues the superposition used. Residues must have the same numbers and names in both chains.
- A PDB file can hold several models. The tools use model 0 unless you give another index.

## Report

- Give each number with the tool step that made it.
- Give the MDAnalysis version (and the Biopython version for structure tools).
