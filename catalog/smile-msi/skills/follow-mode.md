---
name: follow-mode
description: Guide the scientist through a step in the SMILE MSI program by hand, then check that the program shows the same state as the decision record. Use it in follow mode or teach mode.
---

# Follow mode

In follow mode the scientist runs each step in the program. You give the step and check the state.

1. Name the next step with its manual route. Use the route from the map entry of the tool. Example: "Analyze > This slide > Statistics > Region comparison (A vs B)."
2. Give each field with its value from the decision record: Compare A, vs B, Extraction tol (ppm), Normalization, and the others in the map entry.
3. Warn about each field where the default of the dialog is different from the value in the record. The dialog tolerance default is 10 or 50 ppm. The record may say a different value.
4. Tell the scientist to press Run and to say when the result is ready.
5. Call `state`. Compare `settings` (ppm, norm, reduce, tic_max_amp), the regions, the groups and `n_features` with the decision record.
6. If a value is different, name the field and the value that it must have. Do not change the slide with `apply_settings` unless the scientist asks.
7. Ask the scientist for the number that the program shows, for example the count of features. Compare it with your own run of the same step. The numbers must match.
8. If the numbers do not match, check the inputs in this order: the working feature set, the groups, the normalization, the extraction tolerance.

In teach mode, do the same checks, but let the scientist choose the steps. Compare each step with the decision record. Name each difference. Do not correct it without being asked.
