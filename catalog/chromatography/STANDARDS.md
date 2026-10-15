Report each chromatography result so that another lab can repeat it.

- Name the file, the detector channel and the time unit of the trace.
- Give the baseline correction, the peak detection setting and the integration window with every area.
- Say what the area means. hplc-py adds the fitted signal over the window.
- The hplc-py area is in signal units, not in signal times time.
- A trapezoid area over time has a different number. A data system reports signal times time, like the trapezoid area and the column area_signal_time.
- Give the retention time of each peak with its area, and the area percent when you report a purity.
- Two baseline settings give two different areas for the same peak. Do not compare areas from different settings.
- For a calibration, give the number of standards, the range, the weighting, the slope, the intercept and R squared.
- Also give the residual of each standard. R squared is high even for a curve that bends.
- Do not report a concentration outside the range of the standards. Dilute the sample and measure again.
- The limits of detection and quantification from the calibration residuals are an estimate. A validated limit needs blank and low-level replicates.
- This adapter reads an exported trace. It does not read a vendor data file and it is not a 21 CFR Part 11 record.
