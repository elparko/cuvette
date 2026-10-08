#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/kanetis2022-iqtree-sporocadaceae"
mkdir -p "$D"
cd "$D"
# figshare item 10.6084/m9.figshare.20530188 (CC BY 4.0): the concatenated alignment and the four locus alignments.
# The figure files of the same item are not downloaded.
get() { curl -sSL -C - -o "$1" "https://ndownloader.figshare.com/files/$2"; }
get concat_dush_subalign.fas 36747390
get BT_algn_realigned2.fa 36747387
get ITS_algn_realigned.fa 36747393
get LSU_algn_clean_subalign.fa 36747396
get TEF_algn_realigned.fa 36747399
shasum -a 256 -c - <<'SUMS'
ec118848f675b03e6e81e711a65165d93cb1a624f7ee68ad944c87709972d37b  concat_dush_subalign.fas
a8033933017bfc4e536c4ffba3e33415aa8fc4b05edc94578ea688be88fd088e  BT_algn_realigned2.fa
90203c2118d2b17bfa91dc83b08f2619c2932df45832757faecefc3d2be1a795  ITS_algn_realigned.fa
4a96bd40be9d76aeff324a9cb8a1f25e1d153cabb27801c91f763dc58ad98db5  LSU_algn_clean_subalign.fa
2a575e94fe8721c208be6eee1a6fb02a8e483ce309c12fa5a2e9b657bdce352d  TEF_algn_realigned.fa
SUMS
