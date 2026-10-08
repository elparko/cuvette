# Runs with the OpenMS TOPP adapter (rost2016-openms)

Date: 2026-10-08. Model: ollama:qwen3:8b. Program: OpenMS TOPP tools 3.5.0 (conda-forge and bioconda build, `micromamba`). Adapter `catalog/openms` 0.1.0.
Data: `2012_02_03_PStd_050_1.mzML` on T7 (read only).

Command:

    GA_HOME=<temp dir> node bin/ga.js -p "<prompt>" --adapter catalog/openms --model ollama:qwen3:8b --setup setup.json --answers setup.json --output json

The metabolomics workflow of the paper needs FeatureFinderMetabo, MapAlignerPoseClustering, FeatureLinkerUnlabeledQT and AccurateMassSearch. `catalog/openms` has FileInfo, FeatureFinderCentroided (for peptide data), PeptideIndexer and FalseDiscoveryRate. Only FileInfo applies to these files. pyOpenMS (`catalog/pyopenms`) already covers FeatureFinderMetabo.

| Run | Prompt | Session | Result |
| --- | --- | --- | --- |
| 1 | spectra count of the first low-concentration file | 20261008-131112-a143 | pass |
| 2 | PSMs at 1% FDR for a Sage result file (not from this paper) | 20261008-131241-2a6c | pass |

## Numbers against expected.yaml

| Item | Expected | Run 1 | Result |
| --- | --- | --- | --- |
| spectra in PStd_050_1 | 7173 (0) | 7173 | pass |
| MS1 spectra in PStd_050_1 | 7173 (0) | 7173 | pass |
| retention time range | not in expected.yaml; pyOpenMS run gave 1.92 to 1800.09 s | 1.92 to 1800.09 s | agrees |

Run 1: one `file_info` call, 7173 spectra, 12,644,624 peaks. The answer says all spectra are MS1, which is right.

## Run 2 (peptide chain, outside the paper)

Prompt: the Sage result file `catalog/openms/data/sage_psms.idXML` and `standards_td.fasta`, 1% FDR. The model called `file_info`, `index_peptides` and `estimate_fdr` in order.

| Item | Expected | Run 2 | Result |
| --- | --- | --- | --- |
| PSMs before the FDR step | 225 | 225 | pass |
| decoy PSMs | 13 | 13 | pass |
| PSMs at 1% (decoys / targets) | 18 | 18 | pass |
| distinct peptides | 11 | 11 | pass |

The expected values come from the adapter test `fdr_standards` (a Python recount gives the same). The answer names the method as decoys divided by targets and warns that 225 PSMs give a large random error. Sage's own count on the full files is 207 PSMs at 1%. The two counts differ in the score (hyperscore alone against Sage rescoring) and in the q-value formula.

## Notes

- The OpenMS conda build reports version 3.5.0-pre-exported-20251212 in the program output.
- `SageAdapter` in OpenMS 3.5.0 runs Sage 0.14.6 without problems. It prints a warning for every spectrum when the mzML file has no native ID type.
- `FalseDiscoveryRate` with `-algorithm:conservative true` or `false` gives the same counts for PSM level here.
- Not tested: the protein level and peptide level FDR of FalseDiscoveryRate, and the TOPP tools of the metabolomics workflow.
