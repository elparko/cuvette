---
name: choose-the-design
description: How to write the design formula for a paired or blocked RNA-seq experiment.
---

# Choose the design

- Write the terms of the model in a formula. Put the variable of interest last.
- If each donor has a treated and an untreated sample, add the donor first: `~ donor + treatment`.
  The test then compares the two samples of each donor.
- A design without the donor term treats all samples as independent. The test then has less power.
  The airway data gives 4381 significant genes with `~ cell + dex` in the published workflow.
- The terms must be columns of the sample table.
- Set the reference level. R uses the first level in alphabetical order if you do not.
- Ask the scientist for the design. Do not choose it alone.
