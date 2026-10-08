#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/ljosa2012-bbbc005"
R="${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}/ljosa2012-bbbc005"
mkdir -p "$D" "$R"
cd "$D"
base=https://data.broadinstitute.org/bbbc/BBBC005
curl -L -C - -O "$base/BBBC005_v1_ground_truth.zip"
curl -L -C - -o "$R/BBBC005_results_bray.csv" "$base/BBBC005_results_bray.csv"
curl -L -C - -O "$base/BBBC005_v1_images.zip"
unzip -qo BBBC005_v1_ground_truth.zip -x '__MACOSX/*'
unzip -qo BBBC005_v1_images.zip 'BBBC005_v1_images/*_F1_*_w2.TIF' -d sub
unzip -qo BBBC005_v1_images.zip 'BBBC005_v1_images/*_F1_*_w1.TIF' -d sub_w1
