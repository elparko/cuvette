#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/weber2023-nnsvg-dlpfc/151673"
mkdir -p "$D"
cd "$D"
# Sample 151673 of the spatialLIBD human dorsolateral prefrontal cortex data (Maynard 2021).
# The counts come from the Lieber Institute S3 bucket and the spot positions from the HumanPilot repository.
curl -sSL -C - -o 151673_filtered_feature_bc_matrix.h5 "https://spatial-dlpfc.s3.us-east-2.amazonaws.com/h5/151673_filtered_feature_bc_matrix.h5"
curl -sSL -C - -o tissue_positions_list.txt "https://raw.githubusercontent.com/LieberInstitute/HumanPilot/master/10X/151673/tissue_positions_list.txt"
shasum -a 256 -c - <<'SUMS'
216e8010e1c313925afa0f174207da7c8947497c960e81b07edbd16176460413  151673_filtered_feature_bc_matrix.h5
c1ce0eafc855982bb2a9773f147ce6c5aef68dfd06600caa8a7e7a0e6f7cc5e8  tissue_positions_list.txt
SUMS
