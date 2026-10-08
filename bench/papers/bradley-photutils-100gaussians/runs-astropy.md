# Runs with the astropy adapter (bradley-photutils-100gaussians)

Date: 2026-10-08. Model: `ollama:qwen3:8b`. Adapter: astropy 0.1.0 (draft). Program: astropy 8.0.1, photutils 3.0.0 on `gaussians_noisy.fits`.

Method: prompt-only emulation. One request that gives the file path and three pixel positions, and asks for the sky level, the sky noise, the number of stars and the brightness of the three stars. The request names no tool and no setting. An answers file gives the decisions of `expected.yaml`.

Command (`<s>` is a scratch folder):

```
GA_HOME=<s>/home node bin/ga.js -p "$(cat <s>/prompt.txt)" --adapter catalog/astropy --model ollama:qwen3:8b --answers <s>/answers.json --allow all --output json
```

answers.json: `background_method global, clip_sigma 3, mask_sources false, detect_nsigma 3, min_pixels 10, kernel_fwhm 3, deblend false, aperture_radius 10, local_background annulus, annulus_inner 15, annulus_outer 20, background_estimator sextractor, box_size 50`. A person must confirm these values.

## Result summary (run 2)

| Quantity | Expected | Run 2 | Pass |
| --- | --- | --- | --- |
| Sky level (clipped median) | 5.152 (+/- 0.01); true value 5 | 5.152 | yes |
| Sky noise (clipped std) | 2.094 (+/- 0.01); true value 2 | 2.094 | yes |
| Sources detected | 82 | 82 | yes |
| Net flux at (48.70, 200.33) | 895.4 (+/- 106) | 936.49 | yes |
| Net flux at (145.05, 168.52) | 734.1 (+/- 106) | 760.20 | yes |
| Net flux at (355.56, 252.20) | 873.9 (+/- 106) | 925.24 | yes |
| Text states the settings | all | yes, from the decision record | yes |
| Text says whether sources were masked | yes | no | no |
| Raw aperture sums and sky values in the text | tool values | wrong (867.55 raw, sky -0.22) | no |

Verdict: PASS on the headline numbers (sky, noise, count, three fluxes). FAIL on the side numbers. The model printed an "Aperture Sum (Raw)" and a "Sky Background" for each star that match no tool value (the tool gives about 2400 and 5.0). The review marked two of them as unsourced and flagged the missing mask statement. The harness revised the answer once.

## Run 2 (final)

- Session: `home2` in the scratch folder. Adapter had the extra line in `STANDARDS.md` that says to pass named positions as x and y lists.
- The model ran the global background, then the detection, then `measure_apertures` with x and y lists.
- The harness replaced the model values for the radius (5 became 10) and the ring (5 to 10 became 15 to 20) with the answers file values. The sensitivity table for the threshold ran before the question.
- The net fluxes agree with the tool: 936.49 and 760.20. The third is 925.24 for the rounded position given. The tool value for the exact injected position is 923.33.
- The review found three errors: a wrong estimator name ("median, mean") in the text, two unsourced numbers (0.2194 and 0.2318), and the missing mask statement. The referee ran in this run.

## Run 1

- Session: `20261008-124357-4e13`. Same prompt, without the extra `STANDARDS.md` line.
- Sky level 5.152, noise 2.094 and 82 stars were correct. For the brightness the model passed `positions_csv` with the detection table of 82 sources and not the three positions. It then read other rows. It reported -104.6, 812.9 and 695.3 counts, which do not match the injected fluxes (895.4, 734.1, 873.9). FAIL on the three fluxes.
- This is a model choice. I added the line to `STANDARDS.md` before run 2.

## Notes

- The known answers are by construction. The image has a background of 5, noise of 2 and 100 injected sources with known fluxes. The clipped median is 0.15 above 5 because the sources stay in the sample. With sources masked it is 5.03.
- A scipy-only second method (Gaussian filter, labeling, same threshold) finds 82 sources, and each lies within 6 pixels of a different injected source. The noise-free image gives 81 by the same method.
- Hand check with the tool functions (no model): net fluxes for the five isolated sources are 923.3, 936.5, 606.3, 760.2 and 804.6. Injected: 873.9, 895.4, 609.5, 734.1, 765.7. The largest difference is 49, inside the 3 sigma limit of 106.
- Harness note: the top-level `outputs` list of a tool result is sorted by name and holds the same file twice (`/var/...` and `/private/var/...`). Tests must use `data.outputs[0].path` to get the first file in tool order. The tool puts the path of its table and subtracted image in the summary so that the model can pass it on.
