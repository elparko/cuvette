---
name: make-ion-image
description: Make an ion image at an m/z with a ppm window and report it with the settings. Use it when the scientist names an m/z or a lipid and wants to see where it sits.
---

# Make an ion image

1. Ask for the m/z. For a lipid name, ask for the adduct and use the m/z the scientist gives.
2. Use the decision values for `ppm`, `normalization` and `reduce`. Do not set other values without a reason.
3. Call `get_ion_image`.
4. Read `max_intensity`, `peak_pixel_x`, `peak_pixel_y` and `mean_points_in_window`. If `mean_points_in_window` is 0, say that no point fell in the window. Check the polarity and the m/z.
5. Show the PNG. Say which normalization it used.
6. If the normalization could change the conclusion, the harness runs the options side by side. Read the table and report which values hold.
7. Give the manual route: `getionimage(p, mz, tol=mz * ppm * 1e-6)`.

An ion image does not identify a lipid. Write a name as putative.
