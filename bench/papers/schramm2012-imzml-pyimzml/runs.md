# Runs: schramm2012-imzml-pyimzml

Model: ollama:qwen3:8b. Date: 2026-10-08. Adapter: `catalog/pyimzml`, version 0.1.0 (the compare paths in the sensitivity blocks were fixed later, version 0.1.1).
Data: pyimzML example files on T7 (read only).

Command (runs 1 and 2 used a longer prompt, run 3 used the guided prompt):

    GA_HOME=<temp> node bin/ga.js -p "<prompt>" --adapter catalog/pyimzml --model ollama:qwen3:8b --answers answers.json --output json

answers.json: `{"ion_ppm": 10, "polarity": "negative", "normalization": "none", "snr": 3}`.
The prompt names the two file paths. The prompt.md text has no path.

## Run 1 and run 2 (plain questions 1 to 3 plus the guided question)

Sessions: 20261008-003857-1b3f, 20261008-004425-68c3.
Final answer, short: both files have 9 pixels in a 3 x 3 grid and m/z 100.0833 to 799.9167. The strongest TIC is 243.54 at pixel (3, 3). The processed file is bigger because it stores one m/z array for each pixel. The model then wrote "I will use compare_files" and stopped. It never called the tool.

| Expected | Value | Run result | Pass |
| --- | --- | --- | --- |
| spectra per file | 9 | 9 pixels | yes |
| pixel grid | 3 x 3 | 3 x 3 | yes |
| m/z minimum / maximum | 100.083336 / 799.9167 | 100.0833 / 799.9167 | yes |
| max pixel TIC | 243.5395 | 243.54 at (3, 3) | yes |
| ibd bytes, polarity, mode, points | 335976 / 604744, negative, profile, 8399 | not in the answer (the tools returned them) | not asked |
| same spectra in both files | yes | no answer | no |

Result: fail on the guided question. Cause: model stopped after it announced a tool call (small model behavior). The adapter did not cause it.
The rule check `decision_misreported` flagged the answer because it wrote "total ion current (TIC)" next to "Normalization: none". See the harness note below.

## Run 3 (guided prompt)

Prompt: "The two imaging files are <paths>. Do the continuous and processed versions of this imaging file hold the same spectra?"
Session: 20261008-004937-dbf4. Tool called: `compare_files` once.
Final answer, short: the versions hold the same spectra. 9 pixels compared, 0 differ, maximum m/z difference 0, maximum intensity difference 0. Storage: continuous and processed.

| Expected | Value | Run result | Pass |
| --- | --- | --- | --- |
| same spectra | identical (expected.yaml notes) | identical, 0 of 9 differ | yes |
| storage modes | continuous / processed | continuous / processed | yes |

Result: pass. No findings.

## Notes

- Across the three runs every expected number that the model reported matches expected.yaml. The two-question prompt did not finish the guided question.
- The ion image tolerance question never came up, because the questions did not need an ion image. The decision `ion_ppm` is `when_needed` and has no value until the scientist answers.
- Smoke test of the tools on `/Volumes/T7/an unpublished lab file` (read only): 361271 pixels, 4952 x 771, 10 um, m/z 200.0040 to 2000.0, centroid, negative, processed, ibd 15953370940 bytes. Parse time 37 s. The mean spectrum of 100 pixels took 0.7 s. The strongest peak is m/z 381.178.
- Harness note: the `decision_misreported` rule treats the word TIC in "total ion current (TIC)" as a normalization claim. Reproduction: run `get_tic_image` on `catalog/pyimzml/data/Example_Continuous.imzML` with the normalization decision set to none, and let the answer say "total ion current (TIC)".
