---
name: check-a-clone
description: How to check a plasmid clone with a diagnostic digest and Sanger reads, as in SnapGene or Geneious.
---

1. Read the plasmid map with `read_sequence`. Note the length and the topology. A SnapGene `.dna` file keeps the topology.
2. Ask the scientist which enzymes the lab has. Run `digest_sequence` with the expected plasmid. Pick a digest that gives bands of different sizes for the correct clone and for the empty vector. Run `digest_sequence` on both maps to show the difference.
3. Compare the predicted bands with the gel photo. The virtual gel is a drawing, not a migration model. Supercoiled uncut plasmid runs faster than its size.
4. For each Sanger read, run `align_sanger_read` with the expected plasmid as the reference. Keep `trim` true unless the scientist says otherwise.
5. Report the aligned region, the identity and each difference with its quality. A difference with quality below 20, or in the first or last 30 bases, is not a finding until a second read confirms it.
6. Say which part of the insert the reads cover. The reads do not check a region that no read covers.

The same steps in SnapGene:

- the map: File > Open.
- the digest: Tools > Simulate Agarose Gel.
- the reads: Tools > Align to Reference DNA Sequence.
