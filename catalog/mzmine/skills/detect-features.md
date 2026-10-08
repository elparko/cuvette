---
name: detect-features
description: Steps to find LC-MS features in mzML files with mzmine batch mode and to report them.
---

# Find features in mzML files

1. Ask for the mzML files, the polarity and the question. Ask which files are replicate injections of which group.
2. Ask the scientist for the noise level, the minimum feature height, the m/z tolerance in ppm and the retention time tolerance in minutes. The adapter has no default for them.
3. Run detect_features with stop_after chromatograms on one file. This step needs no user login and shows that the files load. Read n_scans.
4. Run detect_features with the default stop_after (exported) on all files. If the result says login_required, tell the scientist. mzmine 4.10.90 needs a user login for every step after the chromatogram builder. Do not invent a count.
5. If the export ran, read n_features, n_features_in_all_files and per_file.
6. Show the sensitivity table for the noise level and the minimum height. Say if the count changes by more than 20 percent.
7. The scientist can repeat the run: Batch mode dialog, load the .mzbatch file from write_batch, click OK. The command line is mzmine -b batch.mzbatch -i "files/*.mzML".
8. Report the settings, the steps that ran and the counts. Count per injection first.
