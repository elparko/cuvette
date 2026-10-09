#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/gowers2016-mdanalysis"
PY="${CUVETTE_MDANALYSIS_PYTHON:-${GA_MDANALYSIS_PYTHON:-$HOME/.cuvette/envs/mdanalysis/bin/python}}"
mkdir -p "$D"
cd "$D"
SRC=$("$PY" -I -c "import MDAnalysisTests, os; print(os.path.join(os.path.dirname(MDAnalysisTests.__file__), 'data'))")
cp "$SRC/adk.psf" "$SRC/adk_dims.dcd" .
curl -L -C - -o 4AKE.pdb https://files.rcsb.org/download/4AKE.pdb
curl -L -C - -o 1AKE.pdb https://files.rcsb.org/download/1AKE.pdb
