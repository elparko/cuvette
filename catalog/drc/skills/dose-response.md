---
name: dose-response
description: Steps to normalize a plate, fit dose-response curves and report IC50 or EC50 values.
---

# Dose-response curves

1. Read the file. Find the columns for the dose, the response, the compound and the plate.
2. If the response is a raw signal, ask the scientist which wells are the 100 percent and the 0 percent controls.
3. Run normalize_plate with these labels. Read Z' of each plate. Tell the scientist about each plate with Z' below 0.5.
4. Ask the scientist for the model: 4PL, 3PL with the bottom at 0, or 4PL-normalized.
5. Ask for a relative or an absolute IC50, and for the interval method.
6. Run fit_dose_response with group_col set to the compound column. Use the normalized file if you made one.
7. Read each IC50, its interval, the Hill slope, the top and the bottom. Read the warnings.
8. Look at the plot. Check that each curve has points on both sides of its IC50.
9. To compare compounds, run fit_dose_response with compare_ic50 true. Report F, the degrees of freedom and p.
10. To compare models, run compare_models with group and group_col for one compound.
11. Report the model, the response, each IC50 with its unit and interval, and each warning.
