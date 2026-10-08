#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/wolf2018-scanpy"
mkdir -p "$D"
cd "$D"
curl -L -C - -o pbmc3k_filtered_gene_bc_matrices.tar.gz https://cf.10xgenomics.com/samples/cell/pbmc3k/pbmc3k_filtered_gene_bc_matrices.tar.gz
echo "847d6ebd9a1ec9a768f2be7e40ca42cbfe75ebeb6d76a4c24167041699dc28b5  pbmc3k_filtered_gene_bc_matrices.tar.gz" | shasum -a 256 -c -
tar xzf pbmc3k_filtered_gene_bc_matrices.tar.gz
