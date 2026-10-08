---
name: find-lcms-features
description: Find features in an LC-MS mzML file with the OpenMS metabolite feature finder and report them with every setting. Use it when the scientist asks what is in an LC-MS file or which features differ.
---

# Find LC-MS features

1. Call `load_mzml` with the absolute path. Read `spectrum_types`, `n_ms1` and the polarity warning.
2. If the spectra are profile, call `pick_peaks` first. Use the centroided file it writes.
3. Call `find_features`. The harness asks the scientist for the settings that it does not have yet: mass error, noise threshold, chromatographic FWHM, trace lengths, termination criterion and width filter.
4. Read `n_mass_traces`, `n_elution_peaks` and `n_features`. Read `n_features_charge_known`. A feature with intensity 0 has no quantified peak.
5. If the noise threshold or the FWHM can change the count, read the side-by-side table that the harness shows. Report which numbers hold.
6. Report the settings with the count. Say that a feature is not a compound.
7. For a comparison of two levels, run the same settings on every file. Name the unit of replication. This adapter does not link or align files.
8. Give the manual route: `MassTraceDetection`, `ElutionPeakDetection` and `FeatureFindingMetabo`, or FeatureFinderMetabo in TOPPView.
