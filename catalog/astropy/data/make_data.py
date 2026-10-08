import os
import sys

import numpy as np
import pandas as pd
from astropy.io import fits
from astropy.table import Table
from photutils.datasets import make_100gaussians_image
import photutils.datasets as d

out = sys.argv[1]
truth = Table.read(os.path.join(os.path.dirname(d.__file__), "data", "100gaussians_params.ecsv")).to_pandas()
truth.insert(0, "id", np.arange(1, len(truth) + 1))
truth.to_csv(os.path.join(out, "truth_100gaussians.csv"), index=False)

xy = truth[["x_mean", "y_mean"]].values
near = np.array([np.sort(np.hypot(*(xy - p).T))[1] for p in xy])
edge = (truth.x_mean > 21) & (truth.x_mean < 479) & (truth.y_mean > 21) & (truth.y_mean < 279)
pick = truth[(truth.x_stddev < 2.6) & (truth.y_stddev < 2.6) & (near > 28) & edge].head(5)
pick.to_csv(os.path.join(out, "isolated_truth.csv"), index=False)

header = fits.Header()
header["BUNIT"] = "ct"
header["OBJECT"] = "photutils 100 gaussians"
header["CTYPE1"], header["CTYPE2"] = "RA---TAN", "DEC--TAN"
header["CRPIX1"], header["CRPIX2"] = 250.0, 150.0
header["CRVAL1"], header["CRVAL2"] = 150.0, 2.0
header["CDELT1"], header["CDELT2"] = -1.0 / 3600, 1.0 / 3600
header["CUNIT1"], header["CUNIT2"] = "deg", "deg"
for name, noise in (("noisy", True), ("noiseless", False)):
    img = make_100gaussians_image(noise=noise).astype(np.float32)
    fits.PrimaryHDU(img, header=header).writeto(os.path.join(out, "gaussians_%s.fits" % name), overwrite=True)
print(pick[["id", "x_mean", "y_mean", "x_stddev", "y_stddev", "flux"]])
