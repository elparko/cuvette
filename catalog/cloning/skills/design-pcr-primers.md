---
name: design-pcr-primers
description: How to design and check PCR or qPCR primers with Primer3, and confirm them with an in-silico PCR.
---

1. Ask the scientist for the polymerase and its buffer. The buffer sets Na+, Mg2+ and dNTP. Ask for the primer concentration in the reaction.
2. Ask what the product is for. Cloning or Sanger sequencing needs a product that covers the region with a margin. qPCR needs a short product, usually 70 to 150 bp.
3. Run `design_primers` with the template and the product size range. Give `target_start` and `target_length` if the product must cover a region (for example a mutation site or an exon junction).
4. Run `primer_properties` on the chosen pair. Check that the two Tm values are within about 2 C. Check that the pair dimer is weak (dG above about -9 kcal/mol). These limits are rules of thumb, not fixed values. Say so.
5. Run `simulate_pcr` with the pair on the full template, or on the genome, to look for a second product.
6. Add the tails (restriction sites, adapters) only after the design. Calculate the Tm on the part that binds the template.

Primer3 does not check the whole genome. For a genome-wide specificity check, the scientist can use Primer-BLAST at NCBI.
