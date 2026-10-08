#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/liao2025-scanpy-bone-marrow"
mkdir -p "$D"
cd "$D"
# GEO series GSE253262: Cell Ranger filtered matrices of the pulse (GSM8017442) and chase (GSM8017443) samples.
# Each sample goes to its own folder with the 10x file names, so that a 10x reader finds it.
get() {
  local gsm=$1 name=$2
  mkdir -p "$name"
  for f in barcodes features matrix; do
    local ext=tsv.gz
    [ "$f" = matrix ] && ext=mtx.gz
    curl -sSL -C - -o "$name/$f.$ext" "https://www.ncbi.nlm.nih.gov/geo/download/?acc=$gsm&format=file&file=${gsm}_${name}_$f.$ext"
  done
}
get GSM8017442 pulse
get GSM8017443 chase
shasum -a 256 -c - <<'SUMS'
3f7d35407f211a184c2955d9de7b3b1ec9838897481fa27eba6538b419522b5e  pulse/barcodes.tsv.gz
7ce64df7dcd6cc8b2a2a29dd3ebea9e571b9b65e82f277e863a2b1e692afe1a6  pulse/features.tsv.gz
9c8f21174ec2126fafbee19a0fc1616153063689823ef43efa86330ebd1d44fd  pulse/matrix.mtx.gz
761dc245d7fc059a5a645b09e3f4bdb873f38769779bea5c19af8c53065e14d3  chase/barcodes.tsv.gz
e4dac2ca3d169d02f2404db5e24bd796d6b02b11654e43968a77c50f2c034400  chase/features.tsv.gz
cd8987cefdd88182fc1f2ede250c1d67c7f2bbeb282cda9f4352dcca208e0751  chase/matrix.mtx.gz
SUMS
