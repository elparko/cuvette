---
name: name-a-mass
description: Calculate the monoisotopic mass, the adduct m/z and the isotope pattern of a formula, and compare them with a measured m/z. Use it when the scientist asks if a peak fits a lipid or a compound.
---

# Name a mass

1. Ask for the elemental formula. For a lipid name such as PC 34:1, ask for the formula (PC 34:1 is C42H82NO8P) or the m/z. Do not guess a formula.
2. Ask for the ion mode if the decision polarity is not set.
3. Call `monoisotopic_mass` with `measured_mz`. Read the `ppm_error` column for each adduct.
4. Keep only the adducts that fit the ion mode and the mass accuracy of the instrument. Write the match as putative: "putatively PC 34:1, [M+H]+, 1.7 ppm".
5. Call `isotope_pattern`. Compare M+1 and M+2 with the measured peaks. A measured M+1 far from the calculated value means another formula or an overlap.
6. Say that MS/MS is needed to confirm an identity. Isobars and adducts of other lipids share the mass.
7. Give the manual route: `EmpiricalFormula(formula).getMonoWeight()`, then add the adduct mass and subtract the electron mass.
