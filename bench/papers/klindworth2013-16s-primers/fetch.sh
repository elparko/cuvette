#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/klindworth2013-16s-primers"
mkdir -p "$D"
cd "$D"
# GenBank J01695.2, the Escherichia coli rrnB operon. The 16S numbering of Brosius et al. 1978 counts from
# the first base of the 16S gene, which starts at position 1268 of this record.
curl -fsSL -o ecoli_rrnb.fasta "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=J01695.2&rettype=fasta&retmode=text"
shasum -a 256 -c - <<EOF
fcdc2fac8490ce60b15231ddf2f740982a123a42bcaf9c5e06fe7eafeffee345  ecoli_rrnb.fasta
EOF
