# Schindelin 2012: Fiji, with the ImageJ "Blobs" sample image

## Citation
Schindelin J, Arganda-Carreras I, Frise E, et al. Fiji: an open-source platform for biological-image analysis. Nature Methods 9:676-682, 2012. DOI: 10.1038/nmeth.2019.
The paper describes the platform. It reports no object counts for the sample image. The method here is the standard ImageJ threshold and Analyze Particles route that the platform provides.

## Data
- `blobs.gif`, 256 x 254 pixels, 8-bit, inverting LUT. Source: https://imagej.net/ij/images/blobs.gif (the ImageJ "Blobs (25K)" sample). sha256 is in fetch.sh.
- License: the file is an ImageJ sample from NIH. A license text for this file was not found. NIH ImageJ is public domain software. Treat the file as a test image only.
- Size: 26 KB.
- Local path: /Volumes/T7/guided-analysis/data/schindelin2012-fiji-blobs/blobs.gif

## Tool
ImageJ 1.53 (from /Applications/ImageJ.app/Contents/Java/ij.jar). Fiji uses the same macro language. Run: `java -jar ij.jar -batch macro.ijm`. Do not use `-Djava.awt.headless=true`: the macro `open` failed in headless mode on this machine.

## Method steps (run in this work)
1. open blobs.gif.
2. setAutoThreshold("Default"). The image has an inverting LUT. The result is range 126 to 255 (blobs are selected).
3. Analyze Particles with size 0-Infinity, circularity default (0.00-1.00).
4. Count results. Repeat with "exclude" (exclude objects on edges).

## Numbers to reproduce
Computed by running ImageJ 1.53 (this work, not from the paper):
- Threshold "Default" selects 126 to 255.
- Analyze Particles, no edge exclusion: 64 particles.
- Analyze Particles, exclude edge particles: 46 particles.
- Threshold "Default dark" (wrong polarity for this LUT) selects 0 to 125 and gives 1 particle with edges included, 0 with edges excluded.
No number from the Fiji paper applies.

## Decisions owned by the scientist
- Threshold method and polarity: Default (IsoData variant), with the inverting LUT taken into account.
- Particle size range: 0 to infinity.
- Edge particles: include (64) or exclude (46).
- Pre-filter or watershed: none used. Touching blobs may count as one.
- Scale: pixel size not set in the file (pixels).
- Replication unit: not applicable (one image).
