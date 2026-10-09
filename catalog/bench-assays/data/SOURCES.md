# Test data sources

All files are synthetic. The script data/make_fixtures.py writes them. No third-party data and no kit manual table is in this folder.

| File | Source | License |
| --- | --- | --- |
| protein_linear.csv | synthetic, made by data/make_fixtures.py. A line with a slope of 0.001 and duplicates of plus or minus 0.01. | synthetic, no third-party data |
| protein_quadratic.csv | synthetic, made by data/make_fixtures.py. A quadratic curve with duplicates of plus or minus 0.004. | synthetic, no third-party data |
| protein_4pl.csv | synthetic, made by data/make_fixtures.py. A 4PL curve with no noise. | synthetic, no third-party data |
| western_blots.csv | synthetic, made by data/make_fixtures.py. Three blots with a control lane and a treated lane. | synthetic, no third-party data |
| dual_luciferase.csv | synthetic, made by data/make_fixtures.py. Three biological replicates with two wells each. | synthetic, no third-party data |
| cell_counts.xlsx | synthetic, made by data/make_fixtures.py. Hemocytometer counts of three samples. | synthetic, no third-party data |
| counter_export.csv | synthetic, made by data/make_fixtures.py. Two rows in the style of an automated counter export. | synthetic, no third-party data |
| nanodrop.csv | synthetic, made by data/make_fixtures.py. Four samples with A260, A280, A230 and A320. | synthetic, no third-party data |

## How the expected values were made

- The script builds each fixture from known values, so the answer is known before the fit.
- Protein linear and quadratic: the duplicates are symmetric around the true line or curve. The least squares fit then returns the true values. The script checks this with numpy.polyfit (degree 1 and 2). The test descriptions give the hand formulas.
- Protein 4PL: the data have no noise, so the fit must return the four values that made the data. The test uses a tolerance for the iterative fit.
- Blot and luciferase ratios: the means and SDs are computed by hand in the test descriptions. The script prints the same values from numpy as an independent check.
- Cell counts: the hand formula cells/mL = live / squares x 10000 x dilution gives each number. The script prints the same values with numpy.
- Nucleic acid QC: the hand formula conc = A260 x factor x (10 / path length) x dilution gives each number.
- No public worked example was used. Kit manual example tables are not licensed for reuse. The tests do not copy them.
