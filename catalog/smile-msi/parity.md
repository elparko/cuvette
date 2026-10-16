# Parity check: stage 1 and the wrapper

Date: 2026-10-07. Program: SMILE MSI 2.0.0, Python 3.12, mcp 2.2.0.

## Method

`parity.py` runs one scripted session two ways and compares the results.

1. **Stage 1, in process.** The script calls the functions of `smile_msi.mcpserver` directly. It builds the
   arguments with `smile_msi.agent.setup` (`resolve`, `fill_defaults`, `apply_to_slide`), like the chat does.
2. **The wrapper, over MCP.** The script starts `wrapper.py` as a stdio MCP server and calls the same tools
   with the same arguments (the arguments after the fill).

Run it with: `<SMILE-MSI checkout>/.venv/bin/python catalog/smile-msi/parity.py`

The session uses the demo slide. A script adds two regions: `rim` (514 pixels) and `core` (417 pixels).
The setup is the built-in profile with no change.

## Arguments after the fill

| Step | Tool | Arguments |
| --- | --- | --- |
| 1 | open_slide | ref = demo |
| 2 | apply_settings | ppm 10, norm tic, reduce sum, tic_max_amp 3 |
| 3 | run_script | adds the regions rim and core |
| 4 | find_peaks | snr 3 |
| 5 | find_peaks | snr 3, max_peaks 40 |
| 6 | run_analysis | discriminating_features, groups rim and core, params tol_ppm 10, norm tic, max_q 0.05, min_auc 0.7 |
| 7 | run_analysis | roi_comparison, a rim, b core, params tol_ppm 10, norm tic, max_q 0.05 |
| 8 | annotate | the 9 planted m/z values, mode negative, match_ppm 5 |

## Numbers

| Step | Quantity | Stage 1 | Wrapper | Match |
| --- | --- | --- | --- | --- |
| 1 | n_pixels | 1584 | 1584 | yes |
| 1 | pixels in Group A and Group B | 792 and 792 | 792 and 792 | yes |
| 2 | settings that changed | ppm (20 to 10) | ppm (20 to 10) | yes |
| 3 | pixels in core and rim | 417 and 514 | 417 and 514 | yes |
| 4 | n_features | 11432 | 11432 | yes |
| 4 | n_detected | 11432 | 11432 | yes |
| 4 | first five m/z | 766.5388, 904.6187, 744.5577, 885.5488, 834.5287 | same | yes |
| 5 | n_features | 40 | 40 | yes |
| 5 | n_detected | 11432 | 11432 | yes |
| 6 | table rows (markers kept) | 29 | 29 | yes |
| 6 | first three m/z | 904.618659, 437.258524, 329.239401 | same | yes |
| 6 | first three AUC | 1.0, 1.0, 1.0 | same | yes |
| 6 | engine summary | "2 groups, kept 29 markers of 40 ions (AUC >= 0.70, q <= 0.05)" | same | yes |
| 6 | SHA-256 of the CSV file (first 12 characters) | c67a079e0ea9 | c67a079e0ea9 | yes |
| 7 | table rows | 40 | 40 | yes |
| 7 | ions with q < 0.05 | 31 | 31 | yes |
| 7 | first three m/z | 766.538751, 437.258524, 329.239401 | same | yes |
| 7 | SHA-256 of the CSV file (first 12 characters) | 3d731b6d7b82 | 3d731b6d7b82 | yes |
| 8 | table rows | 9 | 9 | yes |
| 8 | lipids | PE 38:4, Sulfatide 42:2;O3, PC 34:1, PI 38:4, PS 40:6, Sulfatide 42:1;O2, FA 18:1, HexCer 42:2;O3, FA 22:6 | same | yes |
| 8 | SHA-256 of the CSV file (first 12 characters) | 70e88c25eece | 70e88c25eece | yes |

Result: 24 of 24 compared fields match. The result files are byte-identical.

## What the wrapper adds

The wrapper adds `summary`, `manual_route`, `metrics`, `outputs` and a table in the harness shape. It keeps the
engine summary in `engine_summary`. The table preview rows and the CSV path hold the same values as stage 1.

## Limits

- The check compares the engine path. The wrapper does not change a number.
- The arguments come from `setup.fill_defaults` of stage 1. The TypeScript decision record has not filled them
  in this check. That check belongs to the harness tests.
- The check does not run the SMILE MSI program window. The manual routes in `adapter.yaml` are from the code of
  the program. A person has not repeated them yet.
- The demo slide has a fixed seed, so the numbers repeat. A run on a different machine can differ in the last digit.
  Compare by tolerance, as the tests in `adapter.yaml` do.
