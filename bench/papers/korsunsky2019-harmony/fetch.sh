#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/korsunsky2019-harmony"
mkdir -p "$D"
cd "$D"
# 10x Genomics Cell Ranger 1.1.0 filtered matrices of the Jurkat, 293T and 50:50 mix cell lines (hg19).
# Each data set goes to its own folder: jurkat, t293 and mix.
get() {
  local url=$1 file=$2 folder=$3 sum=$4
  curl -sSL -C - -o "$file" "$url"
  echo "$sum  $file" | shasum -a 256 -c -
  mkdir -p "$folder"
  tar xzf "$file" -C "$folder"
  find "$folder" -name '._*' -delete
}
B=https://cf.10xgenomics.com/samples/cell-exp/1.1.0
get "$B/jurkat/jurkat_filtered_gene_bc_matrices.tar.gz" jurkat.tar.gz jurkat 2a72bfc734623792425728a2d1184649aa4e915cb6d1d31eb1d118cf429a926c
get "$B/293t/293t_filtered_gene_bc_matrices.tar.gz" 293t.tar.gz t293 3f44b3027c55d621be2d5344bd8e8f1de5f29097c624bd892c0a3c9049062715
get "$B/jurkat:293t_50:50/jurkat:293t_50:50_filtered_gene_bc_matrices.tar.gz" jurkat_293t_50_50.tar.gz mix ef158da9339df2f0a154d3bbe5cfc906c2d7eca80196603b98f7096f181eedff
