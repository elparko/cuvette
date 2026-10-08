# Runs: rost2016-openms

Model: ollama:qwen3:8b. Date: 2026-10-08. Adapter: `catalog/pyopenms`, versions 0.1.0 (run 1), 0.1.1 (run 2), 0.1.2 (run 3). Later fix: the sensitivity compare paths, version 0.1.3.
Data: `2012_02_03_PStd_050_1.mzML` on T7 (read only).

Command:

    GA_HOME=<temp> node bin/ga.js -p "<prompt>" --adapter catalog/pyopenms --model ollama:qwen3:8b --answers answers.json --output json

Prompt: plain question 2 with the file path: "I ran a blood sample spiked with a few standards at two concentrations, three injections each. The first low-concentration file is <path>. How many features do you see in this file? Use the OpenMS metabolite feature finder and tell me how many spectra the file has."
answers.json: mass_error_ppm 20, noise_threshold_int 10, chrom_fwhm 8, min_trace_length 3, max_trace_length 600, trace_termination sample_rate, width_filtering off, polarity positive.
The adapter has no linker, aligner or database search. The guided question (differential features, compound names) is out of scope for this adapter. Only per-file steps were tested.

## Run 1 (adapter 0.1.0)

Session: 20261008-005035-f754. The process was killed (exit 144) before the final answer. The log shows `find_features` with the answered settings: 1880 mass traces, 2255 elution peaks, 1887 features.
Problem found: the model sent placeholder values (for example mass_error_ppm 0). The sensitivity runs used these as base arguments and all failed with "mass_error_ppm must be at least 1". Fix: the argument descriptions now say "Leave it out. The harness sets it from the decision".

## Run 2 (adapter 0.1.1)

Session: 20261008-005315-45cc. The model called `load_mzml` and then asked the scientist for the polarity. It did not run `find_features`. The answer gave 7173 spectra (all MS1, centroid), RT 1.92 to 1800.09 s.
Cause: the warning in the `load_mzml` result told the model to ask for the ion mode. Feature finding does not need it. Fix: the warning text now says so.

## Run 3 (adapter 0.1.2)

Session: 20261008-005422-a6f4. Tools: `load_mzml`, then `find_features`. The harness asked 7 questions and the answers file answered them. The final tool result used the answered settings.
Final answer, short: 1887 features, with the settings listed. The model listed min trace length 5 and max trace length -1, and it wrote "120 [no source]". These two statements are wrong. The tool used 3 and 600. The rule check flagged the unsourced number 120. The answer did not repeat the spectrum count of 7173.

| Expected | Value (tolerance) | Result | Pass |
| --- | --- | --- | --- |
| spectra in PStd_050_1 | 7173 (0) | 7173 (tool result, run 2 and 3 logs) | yes in tool, not in the run 3 answer |
| MS1 spectra | 7173 (0) | 7173 | yes in tool |
| mass traces, paper parameters | 1880 (100) | 1880 | yes |
| elution peaks | 2255 (120) | 2255 | yes |
| features | 1887 (100) | 1887 | yes |
| 7 differential compounds, 2 levels | 7, 2 | not tested (needs linking) | not tested |

Result: partial pass. The tool numbers equal expected.yaml exactly. The final text misreports two settings and omits the spectrum count (small model errors).

## Notes

- The sensitivity check ran before the questions. With the base arguments of the model (noise 1000, FWHM 30, width filter auto), the features dropped from 1154 (noise 10) to 20 (noise 1000) to 2 (noise 10000). The noise threshold decides the result. The table in the log showed only "ok", because the `compare` names lacked the `metrics.` prefix. This is fixed in 0.1.3.
- Harness note: the sensitivity runs use the unchecked arguments of the model call as base. A model that guesses values for open decisions changes what the side-by-side table shows (for example chrom_fwhm 30 instead of the default).
- The polarity of these mzML files is not stored (POLNULL). The adapter warns. No adduct step ran.
