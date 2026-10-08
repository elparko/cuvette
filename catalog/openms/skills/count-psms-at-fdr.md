---
name: count-psms-at-fdr
description: Steps to match search results to a protein database and count PSMs and peptides at a chosen FDR with the OpenMS tools. Use it when the scientist has an idXML result with target and decoy hits.
---

# Count PSMs at an FDR threshold

1. Ask the scientist for the FASTA file, the decoy tag, the enzyme and the FDR threshold. Do not choose them.
2. Run file_info on the idXML file. Read n_psm.
3. Run index_peptides with the idXML file and the FASTA file. Read n_psm and n_decoy_psm.
4. If n_decoy_psm is 0, stop. Tell the scientist that the FDR is not valid. Check the decoy tag.
5. Run estimate_fdr with the file from step 3. The harness shows the counts at other thresholds first.
6. Report n_psm_in, n_decoy_in, n_psm_pass and n_peptides_pass with the threshold.
7. Say that the level is PSM and that the q-value is decoys divided by targets.
