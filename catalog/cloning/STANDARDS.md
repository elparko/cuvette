Report each sequence result so that another lab can repeat it.

- Name the template: the file, the accession with its version (such as NC_001416.1) and the length in bp.
- Say if the template is circular or linear.
- Give each primer 5' to 3'. Give the Tm with the method and the conditions: Na+ (mM), Mg2+ (mM), dNTP (mM) and primer concentration (nM).
- Tm values from different calculators differ by 1 to 5 C for the same primer. Compare primers only with one method and one set of conditions.
- The Tm is not the annealing temperature. The polymerase vendor gives the rule for the annealing temperature.
- Give positions as 1-based base numbers on the template, and say which strand.
- For a digest, give the enzymes, the fragment sizes in bp and the topology. A plasmid read as linear gives one fragment more.
- An in-silico PCR finds only binding sites with a 3' match of the set length. Report that length. A real PCR can give products that the simulation does not show.
- For a Sanger read, give the trimming rule, the aligned region, the identity and each difference with its Phred quality.
- Do not call a mismatch a mutation if its quality is below 20. Do the same near the ends of the read.
- For such a mismatch, ask for the reverse read.
- Do not claim that a clone is correct from a read that covers only part of the insert. Say which part the reads cover.
