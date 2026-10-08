# Blocker: mzmine 4.10.90 batch mode needs a user login

Checked on macOS arm64, 2026-10-08, mzmine 4.10.90 (Temurin 26.0.1), no user file.

- Command: `mzmine -b batch.xml -i file.mzML`. It runs headless and needs no window. A run of three steps takes about 4 seconds.
- Steps that run: Import MS data (added by the `-i` option), Mass detection (Centroid), Chromatogram builder (ADAP).
- Each of these modules stops the batch with exit code 1 and this log text, after the parameter check passes:
  `Invalid user: You need to be logged in to continue. Please create an account or log in again.`
  `HeadLessDesktop displayMessage Requires user login. Open mzmine GUI and login to a user. Then provide the user file as command line argument -user path/user.mzuser`
  - Local minimum feature resolver (`MinimumSearchFeatureResolverModule`, parameter_version 2)
  - Noise amplitude resolver (`NoiseAmplitudeResolverModule`)
  - Savitzky golay feature resolver (`SavitzkyGolayResolverModule`)
  - 13C isotope filter (`IsotopeGrouperModule`, parameter_version 1)
  - Join aligner (`JoinAlignerModule`, parameter_version 1)
  - Export CSV (`CSVExportModularModule`), Export CSV legacy (`LegacyCSVExportModule`), mzTab-M export, featureML export, feature data XML export
- No user file exists in `~/.mzmine/users`. `mzmine --list-users` is the way to list them.
- The adapter reads `MZMINE_USER_FILE` and passes it as `-user`. This path is not tested.
- The batch XML for the steps after the chromatogram builder was checked only until the login message. The program loaded each step with no parameter warning. The exported CSV was not read from a real run. The `read_feature_table` test uses a hand-made file.

To remove the blocker: create a free mzmine user (mzmine window, Users tab, or `mzmine --login`), then set `MZMINE_USER_FILE` to the user file. Run `ga adapter check catalog/mzmine --run-tests` again. Then add a known-answer test with the full batch on the mzML files of rost2016-openms.

Data note: the cut mzML file in `data/` comes from the OpenMS tutorial data (2012_02_03_PStd_050_1.mzML). The archive states no license. Check before the harness redistributes the file.
