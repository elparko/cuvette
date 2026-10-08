---
name: search-and-count
description: Steps to search mzML files with Sage and count PSMs and peptides at an FDR threshold. Use it when the scientist asks which peptides are in a bottom-up proteomics file.
---

# Search with Sage and count at an FDR

1. Ask the scientist for the FASTA file, the decoy strategy, the enzyme and the missed cleavages. Do not choose them.
2. Ask for the fixed and variable modifications, the precursor tolerance, and the fragment tolerance with its unit.
3. Ask for the FDR level and the threshold.
4. Run search_sage with the mzML files. Read n_psm and n_decoy_psm.
5. If n_decoy_psm is 0, stop. The FDR is not valid.
6. Run count_at_fdr with the results path. The harness shows other thresholds first.
7. Report n_psm_pass, n_peptides_pass and n_decoy_pass with the level and the threshold.
8. If recount_agrees is 0 at the PSM level, tell the scientist. Do not report the count as final.
9. Give the settings of step 1 and 2 in the report.
10. Give the manual route: the written config file and the command `sage config.json`.
