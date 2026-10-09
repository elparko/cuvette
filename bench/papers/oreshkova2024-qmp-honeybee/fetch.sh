#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/oreshkova2024-qmp-honeybee"
mkdir -p "$D"
cd "$D"
# figshare 10.6084/m9.figshare.24164316 (abdominal metrics) and 10.6084/m9.figshare.24164265 (acini area), both CC BY 4.0.
curl -fsSL -o qmp_pooled_data.csv "https://ndownloader.figshare.com/files/42399339"
curl -fsSL -o hpg_data.csv "https://ndownloader.figshare.com/files/42399183"
shasum -a 256 -c - <<EOF
87371dbbd5d7c19aafc6d21bf971be02ee185e8ad64e6ace41648f397f483c87  qmp_pooled_data.csv
1b770dd03ba2862cabd4c00ff19b572d7460ac735711bec701059d876379bf73  hpg_data.csv
EOF
# Both files start with a byte order mark. The biostats tools read it (encoding utf-8-sig).
