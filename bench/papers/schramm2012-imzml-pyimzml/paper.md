# Schramm 2012: imzML, a common data format for mass spectrometry imaging data

Citation: Schramm T, Hester A, Klinkert I, Both JP, Heeren RMA, Brunelle A, Laprevote O, Desbenoit N, Robbe MF, Stoeckli M, Spengler B, Rompp A. J Proteomics 75(16):5106-5110 (2012).
DOI: 10.1016/j.jprot.2012.07.026 (citation checked with Crossref).
Text not read. I did not fetch the paper. No number below comes from the paper.

## Data
- Source: the imzML example files that ship in the pyimzML repository (tests/data): Example_Continuous and Example_Processed (imzML plus ibd).
- URL: https://github.com/alexandrovteam/pyimzML/tree/master/tests/data
- License: Apache-2.0 (pyimzML repository).
- Size: 2.4 MB. Each pair holds 9 pixels. These are test files, not a lipid study.

## Tool
- pyimzML 1.5.5 (python, `pyimzml.ImzMLParser`). Checks used numpy.

## Method steps
1. Parse the imzML file with ImzMLParser.
2. Read coordinates and the polarity and mode fields.
3. Read spectra by index with `getspectrum`.
4. Build an ion image for a chosen m/z and tolerance with `getionimage`.
5. Compare the continuous and processed storage modes.

## Facts computed from the data
- Both files: 9 spectra, pixel grid 3 x 3, pixel size 100 um (x and y), negative polarity, profile spectra.
- Both files: 8399 points per spectrum, m/z 100.083336 to 799.9167.
- Both files give the same mean total ion current (sum of intensities): 161.14437866210938. The maximum per-pixel TIC is 243.5395.
- Continuous ibd: 335976 bytes. One shared m/z array plus nine intensity arrays, float32, plus 16 bytes of UUID.
- Processed ibd: 604744 bytes. Each spectrum stores its own m/z and intensity arrays.
- The repository test suite asserts: 9 coordinates, polarity negative, profile mode, 8399 points, m/z between 100 and 800, intensity below 3.0 per point.

## Decisions the scientist owns
- m/z tolerance for ion images.
- Whether pixel coordinates start at 1 (imzML does) or 0.
- Intensity summary used for a pixel (sum or maximum).
- Storage mode when writing (continuous or processed).
