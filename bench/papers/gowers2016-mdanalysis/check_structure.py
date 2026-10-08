# uv run --no-project --with mdtraj --with numpy python check_structure.py /Volumes/T7/guided-analysis/data/gowers2016-mdanalysis
import sys
from collections import Counter

import numpy as np
from mdtraj.formats import DCDTrajectoryFile

d = sys.argv[1]


def kabsch_rmsd(p, q, w=None):
    w = np.ones(len(p)) if w is None else w
    pc = p - np.average(p, axis=0, weights=w)
    qc = q - np.average(q, axis=0, weights=w)
    h = (pc * w[:, None]).T @ qc
    u, _, vt = np.linalg.svd(h)
    s = np.diag([1, 1, np.sign(np.linalg.det(vt.T @ u.T))])
    r = vt.T @ s @ u.T
    diff = pc @ r.T - qc
    return float(np.sqrt((w * (diff**2).sum(1)).sum() / w.sum()))


lines = open(f"{d}/adk.psf").read().splitlines()
start = next(i for i, l in enumerate(lines) if "!NATOM" in l)
natom = int(lines[start].split()[0])
atoms = [l.split() for l in lines[start + 1 : start + 1 + natom]]
names = np.array([a[4] for a in atoms])
masses = np.array([float(a[7]) for a in atoms])
print("atoms in PSF:", natom)

with DCDTrajectoryFile(f"{d}/adk_dims.dcd") as f:
    xyz, _, _ = f.read()
print("frames in DCD:", len(xyz))

bb = np.isin(names, ["N", "CA", "C", "O"])
print("backbone atoms:", int(bb.sum()))
print("backbone RMSD, last frame on frame 0, Kabsch fit:", round(kabsch_rmsd(xyz[-1][bb], xyz[0][bb]), 4))


def rg(x):
    c = np.average(x, axis=0, weights=masses)
    return float(np.sqrt((masses * ((x - c) ** 2).sum(1)).sum() / masses.sum()))


print("radius of gyration, mass weighted, frame 0:", round(rg(xyz[0]), 4))
print("radius of gyration, mass weighted, last frame:", round(rg(xyz[-1]), 4))


def pdb_atoms(path):
    out = []
    for l in open(path):
        if l.startswith("ATOM  "):
            out.append((l[21], int(l[22:26]), l[17:20].strip(), l[12:16].strip(), l[16], np.array([float(l[30:38]), float(l[38:46]), float(l[46:54])])))
    return out


def seqres(path):
    n = Counter()
    for l in open(path):
        if l.startswith("SEQRES"):
            n[l[11]] = int(l[13:17])
    return n


a4 = pdb_atoms(f"{d}/4AKE.pdb")
for ch in "AB":
    print(f"4AKE chain {ch}: residues in ATOM records:", len({(r[1]) for r in a4 if r[0] == ch}), "SEQRES length:", seqres(f"{d}/4AKE.pdb")[ch])

a1 = pdb_atoms(f"{d}/1AKE.pdb")
ca4 = {r[1]: (r[2], r[5]) for r in a4 if r[0] == "A" and r[3] == "CA" and r[4] in " A"}
ca1 = {r[1]: (r[2], r[5]) for r in a1 if r[0] == "A" and r[3] == "CA" and r[4] in " A"}
common = sorted(k for k in ca4 if k in ca1 and ca4[k][0] == ca1[k][0])
p = np.array([ca4[k][1] for k in common])
q = np.array([ca1[k][1] for k in common])
print("CA pairs, 4AKE A and 1AKE A:", len(common))
print("CA RMSD after Kabsch fit of 4AKE A on 1AKE A:", round(kabsch_rmsd(p, q), 4))
