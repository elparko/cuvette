#!/usr/bin/env bash
# Downloads two public files at fixed addresses, checks each SHA-256 sum, and writes the test inputs:
# 1. data/cascade/: the cell-attached ground truth recording of one Allen Institute neuron (Cascade database, GPL-3 repository),
#    as a dF/F trace CSV and a CSV of the electrophysiology spike times.
# 2. data/demo/demoMovie.tif: the CaImAn demo movie (GPL-2 repository), 2000 frames of 60 by 80 pixels.
set -euo pipefail
cd "$(dirname "$0")"
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
get() {
  local url=$1 dest=$2 sum=$3
  if [ -f "$dest" ] && [ "$(sha "$dest")" = "$sum" ]; then return; fi
  mkdir -p "$(dirname "$dest")"
  curl -fsL --retry 3 -o "$dest.part" "$url"
  [ "$(sha "$dest.part")" = "$sum" ] || { echo "checksum mismatch: $dest" >&2; rm -f "$dest.part"; exit 1; }
  mv "$dest.part" "$dest"
}
CASCADE="https://raw.githubusercontent.com/HelmchenLabSoftware/Cascade/69ecbf1bf8e2ded35b000e6ac4332f1ce09d0ed4/Ground_truth/DS12-GCaMP6s-m-V1-neuropil-corrected"
get "$CASCADE/CAttached_Allen_tetO_101084_neuropil_subtracted_mini.mat" cascade/allen_101084.mat d77f5aa00c892f5b40ec147e29ebd39379d952c9769ef7b06f64c3510bc8a036
get "https://raw.githubusercontent.com/flatironinstitute/CaImAn/main/example_movies/demoMovie.tif" demo/demoMovie.tif 6f1dca4ac3329cded72c6f3ac90a725be32265db16cc6f681b522a2dd825682b
if [ ! -f cascade/allen_101084_dff.csv ]; then
  uv run -q --no-project --with numpy==2.5.3 --with scipy==1.18.1 python -I - cascade <<'PY'
import sys
import numpy as np
import scipy.io as sio

d = sys.argv[1]
m = sio.loadmat(f"{d}/allen_101084.mat", squeeze_me=True, struct_as_record=False)["CAttached"]
with open(f"{d}/allen_101084_dff.csv", "w") as f:
    f.write("time_s,cell1\n")
    for t, v in zip(m.fluo_time, m.fluo_mean):
        f.write("%r,%r\n" % (float(t), float(v)))
with open(f"{d}/allen_101084_spikes.csv", "w") as f:
    f.write("spike_time_s\n")
    for s in m.events_AP:
        f.write("%r\n" % (float(s) / 1e4))
PY
fi
