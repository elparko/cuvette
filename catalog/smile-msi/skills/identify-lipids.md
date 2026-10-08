---
name: identify-lipids
description: Name lipids for a set of m/z values with the in-silico database, and state each identity with the right level of certainty. Use it after a feature list exists or when the scientist gives m/z values.
---

# Identify lipids

1. Call `state`. Read the polarity (`mode`). The decision record owns the polarity and the identification tolerance.
2. Make sure that the working feature set exists, or pass `mz` to `annotate`.
3. Call `annotate` with `mode` and `match_ppm` from the decision record. The tool default for `match_ppm` is 5. The dialog default is 10. Use the value in the record.
4. Read these columns for each feature: `lipid`, `adduct`, `ppm`, `confidence`, `isotopologue`, `adducts_seen`, `msi_level`.
5. Remove the rows where `isotopologue` is true from the list of lipids. They are isotopes of another feature. Name the feature they belong to.
6. For a row with no match, write "no match within the tolerance". Do not guess.
7. Write each identity as putative and at the sum-composition level. Example: "putatively PE 38:4, [M-H]-, -0.6 ppm".
8. Say that MS/MS is needed to confirm an identity. Isobars and adducts of another lipid can have the same mass.
9. Show the manual route: Analyze > This slide > Annotation > Annotate lipids.

Never write "is" or "confirmed" for an identity from m/z alone.
