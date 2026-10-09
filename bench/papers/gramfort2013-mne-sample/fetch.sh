#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/gramfort2013-mne-sample"
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/gramfort2013-mne-sample"
mkdir -p "$D" "$R"
MNE_DATA="$D" "${CUVETTE_MNE_PYTHON:-${GA_MNE_PYTHON:-$HOME/.cuvette/envs/mne/bin/python}}" -c "
import mne
print(mne.datasets.sample.data_path(path='$D', download=True))
"
S="$D/MNE-sample-data/MEG/sample"
# The averages, event files, logs and source estimates are results. Keep only the raw recordings.
mkdir -p "$R/MNE-sample-data/MEG/sample"
find "$S" -mindepth 1 -maxdepth 1 ! -name sample_audvis_raw.fif ! -name sample_audvis_filt-0-40_raw.fif -exec mv -f {} "$R/MNE-sample-data/MEG/sample/" \;
test -f "$S/sample_audvis_filt-0-40_raw.fif"
