# Michaud-Agrawal 2011 and Gowers 2016: MDAnalysis, adenylate kinase (AdK) trajectory

## Citation
- Michaud-Agrawal N, Denning EJ, Woolf TB, Beckstein O. MDAnalysis: a toolkit for the analysis of molecular dynamics simulations. J Comput Chem 32:2319-2327 (2011). DOI: 10.1002/jcc.21787
- Gowers RJ, Linke M, Barnoud J, Reddy TJE, Melo MN, Seyler SL, Domanski J, Dotson DL, Buchoux S, Kenney IM, Beckstein O. MDAnalysis: a Python package for the rapid analysis of molecular dynamics simulations. Proceedings of the 15th Python in Science Conference (2016). DOI: 10.25080/Majora-629e541a-00e
- Biopython: Cock PJA et al. Bioinformatics 25:1422-1423 (2009). DOI: 10.1093/bioinformatics/btp163 (Bio.PDB: Hamelryck T, Manderick B. Bioinformatics 19:2308-2310 (2003)).
- The papers use the AdK example. I did not extract a printed RMSD number from the paper text. The numbers below come from the MDAnalysis quickstart (atom and frame counts) and from my own run (RMSD, with explicit selections).

## Data
- Trajectory: `adk.psf` (931992 bytes) and `adk_dims.dcd` (3931724 bytes) from the pip package MDAnalysisTests 2.10.0 (the MDAnalysis test data, also `MDAnalysis.tests.datafiles.PSF` and `DCD`). The files are the AdK equilibrium run in explicit water that the MDAnalysis tutorials use. The files hold the protein only (no solvent).
- Structures: PDB entries 4AKE (open form) and 1AKE (closed form, with an inhibitor), downloaded from files.rcsb.org. Both have chains A and B with 214 residues each.
- License: MDAnalysisTests is GPL v2 or later. PDB entries are public domain (CC0).
- Local path: /Volumes/T7/guided-analysis/data/gowers2016-mdanalysis/ (made by `fetch.sh`, 5.5 MB).
- A small subset is in `catalog/mdanalysis/data/` (made by `make_adk_small.py`).

## Tool
- MDAnalysis 2.10.0, Biopython 1.88, Python 3.12, numpy 2.5.3. Environment: `~/.guided-analysis/envs/mdanalysis`.

## Method steps, in order
1. Load the PSF and the DCD: `u = mda.Universe(PSF, DCD)`. Result: 3341 atoms, 214 residues, 98 frames, time step 1 ps.
2. Select the backbone: `u.select_atoms("backbone")`. Result: 855 atoms (N, CA, C, O of the protein residues; one residue has no O).
3. RMSD of all frames against frame 0 after a fit on the backbone: `rms.RMSD(u, u, select="backbone", ref_frame=0).run()`. Result: 0 at frame 0 and 6.8203 angstrom at frame 97.
4. Radius of gyration of the protein: 16.669 angstrom at frame 0 and 19.592 angstrom at frame 97.
5. Bio.PDB: parse 4AKE. Chains A and B hold 214 standard residues each. The CA atom of residue 1 is 10.101 angstrom from the CA atom of residue 214 in chain A of 4AKE.
6. Bio.PDB: superpose chain A of 4AKE on chain A of 1AKE with the 214 alpha carbons. RMSD after the fit: 7.131 angstrom.

## Numbers to reproduce
| Quantity | Value | Source |
|---|---|---|
| Atoms | 3341 | MDAnalysis quickstart; counted |
| Frames | 98 | MDAnalysis quickstart; counted |
| Backbone atoms | 855 | counted |
| Backbone RMSD, last frame, fit on backbone, reference frame 0 | 6.820 angstrom | computed with MDAnalysis 2.10.0; a numpy Kabsch fit on the small subset gives the same value |
| Same RMSD with the whole protein selected | 6.929 angstrom | computed |
| Same RMSD with CA atoms selected | 6.814 angstrom | computed |
| Same RMSD, stride 10 (frames 0, 10 ... 90) | 6.854 angstrom at the last used frame 90 | computed |
| Radius of gyration of the protein, frame 0 and 97 | 16.669 and 19.592 angstrom | computed |
| 4AKE chain A and B residues | 214 and 214 | PDB header SEQRES; counted |
| 4AKE CA(1) to CA(214), chain A | 10.101 angstrom | computed; numpy gives the same |
| CA RMSD, 4AKE chain A fitted on 1AKE chain A | 7.131 angstrom | computed |

## Traps
- The AdK trajectory frames are already aligned. RMSD with and without a fit are the same (6.820). The trajectory is the equilibrium run, so the fit does not change the numbers.
- A stride that does not reach frame 97 gives a different "last" value (6.854 at stride 10).
- The reference frame matters. With frame 97 as reference, frame 0 gives 6.820 and the maximum is 6.820.
- The whole-protein RMSD (6.929) is larger than the backbone RMSD (6.820).
