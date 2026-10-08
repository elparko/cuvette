# Runs with the mdanalysis adapter (gowers2016-mdanalysis)

Date: 2026-10-08. Adapter: `catalog/mdanalysis` version 0.1.0 (draft). Model: `ollama:qwen3:8b` (shared with other jobs, so each run waited in a queue). Program: MDAnalysis 2.10.0, Biopython 1.88, Python 3.12.

Command (`<scratch>` is `/Volumes/T7/guided-analysis/tools/mdanalysis/scratch`):

```
GA_HOME=<scratch>/home<n> node bin/ga.js -p "$(cat <scratch>/prompt<n>.txt)" \
  --adapter catalog/mdanalysis --model ollama:qwen3:8b --answers <scratch>/answers.json --allow all --output json
```

Answers file: replicate = frames of one trajectory (descriptive only), fit_select backbone, fit_before_rmsd true, reference_frame 0, rmsd_select backbone, frame_stride 1, rmsf_select "protein and name CA", rg_select protein, pdb_fit_atoms CA. These values are mine. The papers give no value for them. A person must confirm them.

Two runs. Run 1 asked for the trajectory numbers and the structure comparison in one request. Run 2 asked for the structure part only, because run 1 stopped before it.

## Result summary

| Quantity | Expected (`expected.yaml`) | Run | Pass |
| --- | --- | --- | --- |
| Atoms | 3341 | 3341 (run 1) | pass |
| Frames | 98 | 98 (run 1) | pass |
| Backbone RMSD, last frame, fit on backbone, reference frame 0 | 6.8203 (+/- 0.01) | 6.820 (run 1, 98 frames) | pass |
| Radius of gyration, last frame | 19.592 (+/- 0.02) | 19.592 (run 1; first frame 16.669) | pass |
| Residues in chain A of 4AKE | 214 | 214 (run 2) | pass |
| Residues in chain B of 4AKE | 214 | not in the answer (the tool result has 214) | fail in the answer |
| CA RMSD, 4AKE chain A on 1AKE chain A | 7.131 (+/- 0.02) | 7.131 (run 2) | pass |
| Distance CA(1) to CA(214), chain A of 4AKE | 10.101 (+/- 0.01) | 10.710 (N atoms, chosen by the model) | fail |

Verdict: PASS for the trajectory numbers and the superposition RMSD. FAIL for two items in the structure part: the answer leaves out chain B, and the model measured the distance between N atoms, not CA atoms. The question did not name an atom, so the 10.710 value is a correct distance between N atoms.

## Run 1

- Session: `20261008-120305-a1d3`. Home: `<scratch>/home1`.
- The model called inspect_trajectory, rmsd_trajectory and radius_of_gyration. All three calls returned ok. It chose the right topology and trajectory paths, and the harness filled the atom selections.
- The model asked for the radius of gyration of `backbone`. The harness asked the scientist for `rg_select`, got `protein` from the answers file, and replaced the model value. The result is 16.669 to 19.592 A, the expected value for the protein.
- The final answer holds the atom count, the frame count and the radius of gyration. The review found that the answer claimed a structure comparison that no tool call made. The model then wrote that it had not done the structure comparison, and stopped. It did not call inspect_structure or superpose_structures.
- The RMSD value (6.820 A) is in the tool result and in the intermediate text of the model. The revised final answer does not repeat it.
- Cause: model behavior. The tools did not fail.

## Run 2

- Session: `20261008-121641-d4b1`. Home: `<scratch>/home2`.
- The model called inspect_structure, measure_distance and superpose_structures. All three calls returned ok.
- Answer: chain A has 214 residues. The distance between the N atoms of residue 1 and residue 214 is 10.710 A. The RMSD before the fit is 75.047 A and after the fit is 7.131 A.
- What went wrong (model, not adapter):
  - The answer does not give the residues of chain B.
  - The model chose the N atoms for the distance. The expected value uses CA atoms.
  - The model asked for `fit_atoms` backbone. The harness replaced it with the decision value CA, and the tool summary says "214 CA atoms". The answer text says "backbone atoms" and then, in the settings line, "CA". The review flagged the conflict.
  - The review gave seven findings. Several are not correct: the log holds the residue count, and the answer is not a statistical claim.

## Limits

- The expected RMSD, radius of gyration and structure numbers are computed with explicit selections. The papers print no RMSD number. The atom and frame counts come from the MDAnalysis quickstart.
- The AdK frames are already aligned, so a fit does not change the RMSD (6.820 with and without a fit). The emulation does not show the effect of the fit.
- The model did not call rmsf_per_residue, count_contacts or find_hydrogen_bonds. The known-answer tests cover them.
- The stride trap (stride 10 stops at frame 90 and gives 6.854) was not tested in a run.
