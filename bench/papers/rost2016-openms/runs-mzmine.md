# Runs with the mzmine adapter (rost2016-openms)

Date: 2026-10-08. Adapter: `catalog/mzmine` version 0.1.0 (draft). Program: mzmine 4.10.90, macOS arm64.

No prompt-only run was made with the model. A run cannot reach a feature table.

## Blocker

- `mzmine -b batch.xml -i file.mzML` runs headless. The steps Import MS data, Mass detection and Chromatogram builder finish in about 4 seconds.
- Every later module stops the batch with exit code 1 and the log text `Requires user login. Open mzmine GUI and login to a user. Then provide the user file as command line argument -user path/user.mzuser`.
- The stopped modules: Local minimum feature resolver, Noise amplitude resolver, Savitzky golay resolver, 13C isotope filter, Join aligner, Export CSV, Export CSV (legacy), mzTab-M export, featureML export, feature data XML export.
- No user file exists on this computer. The adapter passes `MZMINE_USER_FILE` as `-user`. This path is not tested.
- Details: `catalog/mzmine/evidence/blocker.md`.

## What the adapter tests show

- The cut file `catalog/mzmine/data/PStd_050_1_rt600-660_mz100-200.mzML` has 238 scans. mzmine reads 238 scans (pyOpenMS gives the same count).
- The first three steps finish (`steps_finished` is 3).
- The expected numbers of this paper (1887 features in `PStd_050_1`, 7 spike-in compounds) are not reproduced. The feature step needs the login.

## Next step

Create a free mzmine user. Set `MZMINE_USER_FILE`. Run the full batch on the six mzML files. Add a known-answer test with the result.
