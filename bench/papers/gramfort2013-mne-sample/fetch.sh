#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/gramfort2013-mne-sample"
mkdir -p "$D"
MNE_DATA="$D" "${GA_MNE_PYTHON:-$HOME/.guided-analysis/envs/mne/bin/python}" -c "
import mne
print(mne.datasets.sample.data_path(path='$D', download=True))
"
test -f "$D/MNE-sample-data/MEG/sample/sample_audvis_filt-0-40_raw.fif"
