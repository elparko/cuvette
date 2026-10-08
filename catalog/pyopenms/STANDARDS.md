# pyOpenMS standards

pyOpenMS runs OpenMS algorithms on LC-MS (liquid chromatography mass spectrometry) files. Follow these rules in every answer.

## Report with each result

- Name the file, the tool and the pyOpenMS version.
- Give every setting of find_features: mass error (ppm), noise threshold (intensity), chromatographic FWHM (s), trace lengths (s), termination criterion and width filter.
- Give retention times in seconds. Give m/z tolerances with the unit, ppm or Da.
- Give the ion mode and say where it came from. An mzML file often does not state it.
- State the spectrum type of the input: centroid or profile.

## What a result does not show

- A feature is a signal group in m/z and retention time. It is not a compound. Isotopes, adducts and fragments of one compound can each make a feature.
- A feature count from one file is not a result about a sample. Compare levels only with replicate injections, and name the unit of replication.
- An m/z match to a formula or a database is putative. Give the adduct, the ion mode and the error in ppm. MS/MS (tandem mass spectrometry) is needed to confirm it.
- The feature finder reports intensities. It does not report concentrations.

## Traps

- The noise threshold depends on the intensity scale of the instrument. A value that suits one file can drop real signal in another.
- A wider chromatographic FWHM or a wider mass error window changes the feature count. Show the count with other values when it matters.
- A feature with intensity 0 has no quantified peak. Do not count it as detected.
- Profile data needs pick_peaks before find_features. The tool stops with an error on profile data.
- Alignment uses ppm for m/z distance in some tools and Da in others. Read the unit of each parameter.
- monoisotopic_mass uses element masses and subtracts the electron mass. A tool that uses the proton mass or the hydrogen atom mass in another way differs by 0.0005 Da.
