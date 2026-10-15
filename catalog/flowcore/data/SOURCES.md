# Test data sources

| File | Source | License |
| --- | --- | --- |
| compdata_060909_001.fcs | R package flowCore 2.24.0, extdata/compdata/data/060909.001, the unstained control. Copied byte for byte. | Artistic-2.0, the license of flowCore |
| compdata_060909_002.fcs | R package flowCore 2.24.0, extdata/compdata/data/060909.002, the single-stain control of FL1-H. Copied byte for byte. | Artistic-2.0, the license of flowCore |
| compdata_060909_003.fcs | R package flowCore 2.24.0, extdata/compdata/data/060909.003, the single-stain control of FL2-H. Copied byte for byte. | Artistic-2.0, the license of flowCore |
| compdata_060909_004.fcs | R package flowCore 2.24.0, extdata/compdata/data/060909.004, the single-stain control of FL4-H. Copied byte for byte. | Artistic-2.0, the license of flowCore |
| compdata_060909_005.fcs | R package flowCore 2.24.0, extdata/compdata/data/060909.005, the single-stain control of FL3-H. Copied byte for byte. | Artistic-2.0, the license of flowCore |
| compdata_compref.txt | R package flowCore 2.24.0, extdata/compdata/compref, the reference spillover matrix of the flowCore tests. Copied byte for byte. | Artistic-2.0, the license of flowCore |
| synthetic_ctl1.fcs | synthetic, made by data/make_synthetic.py | synthetic, no third-party data |
| synthetic_ctl2.fcs | synthetic, made by data/make_synthetic.py | synthetic, no third-party data |
| synthetic_ctl3.fcs | synthetic, made by data/make_synthetic.py | synthetic, no third-party data |
| synthetic_trt1.fcs | synthetic, made by data/make_synthetic.py | synthetic, no third-party data |
| synthetic_trt2.fcs | synthetic, made by data/make_synthetic.py | synthetic, no third-party data |
| synthetic_trt3.fcs | synthetic, made by data/make_synthetic.py | synthetic, no third-party data |
| synthetic_design.csv | synthetic, made by data/make_synthetic.py | synthetic, no third-party data |
| synthetic_design_without_trt3.csv | synthetic_design.csv without the sample synthetic_trt3. It tests that compare_groups names a sample that is not in the design file. | synthetic, no third-party data |
| synthetic_truth.json | synthetic, made by data/make_synthetic.py. It holds the counts and the SciPy p values that the tests use. | synthetic, no third-party data |
| diva_unstained.fcs | Li J et al. (2024), Zenodo 10.5281/zenodo.13977209, "Raw flow cytometry data files (fcs files) part 5": the file Compensation Controls_Unstained Control_001. Copied byte for byte. | CC BY 4.0 |
| diva_fitc.fcs | Li J et al. (2024), Zenodo 10.5281/zenodo.13977209, "Raw flow cytometry data files (fcs files) part 5": the file Compensation Controls_FITC Stained Control_002. Copied byte for byte. | CC BY 4.0 |
| diva_pe.fcs | Li J et al. (2024), Zenodo 10.5281/zenodo.13977209, "Raw flow cytometry data files (fcs files) part 5": the file Compensation Controls_PE Stained Control_003. Copied byte for byte. | CC BY 4.0 |
| diva_pecy7.fcs | Li J et al. (2024), Zenodo 10.5281/zenodo.13977209, "Raw flow cytometry data files (fcs files) part 5": the file Compensation Controls_PE-Cy7 Stained Control_004. Copied byte for byte. | CC BY 4.0 |
| diva_apc.fcs | Li J et al. (2024), Zenodo 10.5281/zenodo.13977209, "Raw flow cytometry data files (fcs files) part 5": the file Compensation Controls_APC Stained Control_005. Copied byte for byte. | CC BY 4.0 |
| diva_apccy7.fcs | Li J et al. (2024), Zenodo 10.5281/zenodo.13977209, "Raw flow cytometry data files (fcs files) part 5": the file Compensation Controls_APC-Cy7 Stained Control_006. Copied byte for byte. | CC BY 4.0 |
| diva_bv421.fcs | Li J et al. (2024), Zenodo 10.5281/zenodo.13977209, "Raw flow cytometry data files (fcs files) part 5": the file Compensation Controls_BV421 Stained Control_007. Copied byte for byte. | CC BY 4.0 |
| diva_bv510.fcs | Li J et al. (2024), Zenodo 10.5281/zenodo.13977209, "Raw flow cytometry data files (fcs files) part 5": the file Compensation Controls_BV510 Stained Control_008. Copied byte for byte. | CC BY 4.0 |
| diva_spillover.csv | The SPILL keyword of the sample file B16 CD56bright_F_5_021.fcs of the same Zenodo record (the matrix of BD FACSDiva), written by data/make_diva_matrix.py. | CC BY 4.0 |
| make_diva_matrix.py | Written for this adapter. | synthetic, no third-party data |
