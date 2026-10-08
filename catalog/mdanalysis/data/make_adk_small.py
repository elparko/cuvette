import sys

import MDAnalysis as mda
from MDAnalysis.tests.datafiles import DCD, PSF

u = mda.Universe(PSF, DCD)
atoms = u.select_atoms("backbone or (protein and name HN)")
frames = list(range(0, 96, 5)) + [97]
atoms.write(sys.argv[1] + "/adk_backbone_h.pdb", frames=[0])
with mda.Writer(sys.argv[1] + "/adk_backbone_h.dcd", n_atoms=atoms.n_atoms) as w:
    for f in frames:
        u.trajectory[f]
        w.write(atoms)
print(atoms.n_atoms, len(frames))
