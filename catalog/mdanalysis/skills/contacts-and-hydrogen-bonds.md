---
name: contacts-and-hydrogen-bonds
description: How to count contacts between two groups and hydrogen bonds, with the cutoffs the scientist must choose.
---

# Count contacts and hydrogen bonds

1. Run inspect_trajectory. Read n_hydrogen. The hydrogen bond tool needs hydrogen atoms.
2. For contacts, run count_contacts. The harness asks for the two groups and the cutoff. The groups must have no common atoms.
3. Show the sensitivity table for the cutoff before you state a count. The count changes with the cutoff.
4. For hydrogen bonds, run find_hydrogen_bonds. The harness asks for the donor, hydrogen and acceptor selections and for the two cutoffs.
5. Read hbonds_mean and n_unique_donor_acceptor_pairs. The events table lists each bond with the residues, the distance and the angle.
6. Report the cutoffs, the selections, the stride and the number of frames.
7. Do not give a p-value from frames of one trajectory.
