#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/zhu2020-deqms-spike-in"
mkdir -p "$D"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
curl -fsSL -o "$T/proteomebenchmark.zip" https://ftp.pride.ebi.ac.uk/pride/data/archive/2014/09/PXD000279/proteomebenchmark.zip
echo "557a66cc71a1be36b6666a602cfecb2b8868dcf23069816cb764b84af7d7133c  $T/proteomebenchmark.zip" | shasum -a 256 -c -
unzip -q -o "$T/proteomebenchmark.zip" proteinGroups.txt -d "$D"
