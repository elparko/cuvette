#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/bradley-photutils-100gaussians"
HERE="$(cd "$(dirname "$0")" && pwd)"
PY="${GA_ASTROPY_PYTHON:-$HOME/.guided-analysis/envs/astropy/bin/python}"
mkdir -p "$D"
"$PY" -I "$HERE/../../../catalog/astropy/data/make_data.py" "$D"
test -f "$D/gaussians_noisy.fits"
