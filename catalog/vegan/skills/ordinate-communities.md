---
name: ordinate-communities
description: Steps to draw an NMDS or RDA ordination of sites and to read the result.
---

# Ordinate communities

1. Run inspect_community. Check for empty sites. NMDS cannot use them.
2. Ask the scientist for the distance and the transformation.
3. For NMDS, ask for the number of dimensions. Run run_nmds with color_by for a grouping column.
4. Read the stress. If it is above 0.2, tell the scientist that the plot is a poor picture. Offer more dimensions.
5. For RDA, ask for the explanatory variables and for scaling. Use the Hellinger transformation for abundance data unless the scientist chooses another. Run run_rda.
6. Report the settings, the stress or the adjusted R2, the global p and the p of each term.
7. Do not read the axes as gradients unless the scientist fits the variables to them.
