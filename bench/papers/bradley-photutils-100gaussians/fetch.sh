#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/bradley-photutils-100gaussians"
HERE="$(cd "$(dirname "$0")" && pwd)"
PY="${GA_ASTROPY_PYTHON:-$HOME/.guided-analysis/envs/astropy/bin/python}"
R="${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}/bradley-photutils-100gaussians"
mkdir -p "$D" "$R"
"$PY" -I "$HERE/../../../catalog/astropy/data/make_data.py" "$D"
# The truth tables and the noise-free image hold the answers. Keep them out of the data folder.
mv -f "$D/truth_100gaussians.csv" "$D/isolated_truth.csv" "$D/gaussians_noiseless.fits" "$R/"
test -f "$D/gaussians_noisy.fits"
