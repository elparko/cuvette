---
name: rmsd-and-rmsf
description: How to measure RMSD, RMSF and radius of gyration of a trajectory, and what to report.
---

# Measure how much a trajectory moves

Ask the scientist for each decision that the setup lists. Do not choose a selection.

1. Run inspect_trajectory with the topology and the trajectory. Check that the atom count and the frame count match what the scientist expects.
2. Run rmsd_trajectory. The harness asks for the measured atoms, the fit atoms, whether to fit, the reference frame and the stride.
3. Read rmsd_last, rmsd_mean and rmsd_max. Look at the plot. A value that keeps rising shows that the structure has not settled.
4. Run the sensitivity table for the fit decision if the scientist wants to see the effect of the fit. Frames that are already aligned give the same values with and without a fit.
5. Run rmsf_per_residue for the fluctuation of each residue. Name the residue with the largest value.
6. Run radius_of_gyration to see if the molecule opens or closes.
7. Report the selections, the reference frame, the stride, the number of frames used, and the MDAnalysis version.

The last frame of a stride may not be the last frame of the trajectory. Check last_frame_index.
