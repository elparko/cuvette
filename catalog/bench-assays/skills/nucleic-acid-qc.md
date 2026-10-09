---
name: nucleic-acid-qc
description: Steps to get the concentration and purity ratios of DNA or RNA from NanoDrop or plate UV readings.
---

# Nucleic acid concentration and purity ratios

Nucleic acids absorb light at 260 nm. The concentration follows from A260 and a factor. The factor is 50 ng/uL for dsDNA, 40 for RNA and 33 for ssDNA, for an absorbance of 1 at 10 mm.
The ratios A260/A280 and A260/A230 show some contaminants.

1. Read the file. Find the columns for the sample, A260, A280, A230 and, if there is one, A320.
2. Ask the scientist for the type of nucleic acid and the path length. A NanoDrop gives 10 mm equivalent values.
3. Ask if the scientist corrects the baseline with A320.
4. Ask for the dilution factor of the samples.
5. Run nucleic_acid_qc. Read the concentration, the ratios and the flags.
6. Look at the ratio plot. Samples in the shaded box are inside the usual ranges.
7. Report the type, the factor, the path length, the baseline, the concentration and the two ratios. Say that the ranges are rules of thumb.

## Common mistakes

- Purity from A260/A280 alone. The ratio does not detect protein well. A small amount of protein changes the ratio little. A pure sample can also have a low ratio at a low concentration.
- The same ranges for DNA and RNA. A pure DNA has a ratio of about 1.8. A pure RNA has about 2.0. A260/A230 of 2.0 to 2.2 is the usual range.
- A low A260/A230. Salts, phenol, guanidine and carbohydrate absorb near 230 nm. The buffer of the blank must match the sample buffer.
- A low signal. An A260 below about 0.1 (10 mm equivalent) gives ratios with a large error. The tool flags it.
- Free nucleotides, dye and RNA in a DNA sample. They absorb at 260 nm and give a concentration that is too high. A fluorescence assay (Qubit or PicoGreen) is more specific.
- A wrong blank. The blank must be the buffer of the sample.
- A wrong path length. A plate reader path length depends on the volume.
- A pH effect. The A260/A280 ratio is lower in acid water and higher in basic buffer. Use the same buffer for the blank and the sample.

## Stop and ask

- The concentration from A260 and a fluorescence assay differ by more than a factor of 1.5.
- A260/A230 is below 1.5 for a sample that goes to a sensitive reaction.
- The tool flags a low signal. Ask if the scientist can measure a more concentrated sample.
- The type is not DNA or RNA. Ask for the factor.
