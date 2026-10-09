#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/jahncke2025-dag1-mipsc"
mkdir -p "$D/cells"
cd "$D"
# Figshare record 10.6084/m9.figshare.29083331 (Jahncke, Schnell and Wright 2025), CC BY 4.0.
# The 32 Purkinje cell recordings of the experiment "P30 Calb1 DG": 16 Ctrl and 16 cKO cells, 12 mice. About 384 MB.
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d" " -f1; else shasum -a 256 "$1" | cut -d" " -f1; fi; }
get() {
  local target=$1 id=$2 sum=$3
  if [ -f "$target" ] && [ "$(sha "$target")" = "$sum" ]; then return; fi
  curl -fsL --retry 3 -o "$target.part" "https://ndownloader.figshare.com/files/$id"
  [ "$(sha "$target.part")" = "$sum" ] || { echo "checksum mismatch: $target" >&2; rm -f "$target.part"; exit 1; }
  mv "$target.part" "$target"
}
get phys_metadata.csv 54585770 c2ad5af94487e394e3231a33d8d5594116beb409c7f26d971a692e33c480e761
get "cells/P30_Calb1_DG_01_cell1.pxp" 54585350 5a056b9425c45d10de0e9fc0549cca53bae450c64488acd8eb0b78f3f7e6b5ad
get "cells/P30_Calb1_DG_01_cell2.pxp" 54585347 de58309cb6f90a23f1e49cc51322ed47bc1e4e2c2526bda1db3e66a6acc7ff02
get "cells/P30_Calb1_DG_01_cell3.pxp" 54585353 7ea7f4fc10ca7c5b5aa9a85e134335bd3d2debe0b0a6f0109f60844556ff4524
get "cells/P30_Calb1_DG_02_cell1.pxp" 54585359 fcf505ab4c0e1d5f1da31193beb2785206f617b3ca9247705e1bd1c528fb227d
get "cells/P30_Calb1_DG_02_cell2.pxp" 54585362 032af2e2f6024449ff1a7cea51124d127fc2ff9f85462b7d92b9491864e27742
get "cells/P30_Calb1_DG_03_cell1.pxp" 54585365 61443faf59aa281567e5d440fd0d83de5ce410884d7ef25d34df86a7034c7825
get "cells/P30_Calb1_DG_04_cell1.pxp" 54585368 60c0f75191f43c60dd60946b94bbc861d5fb055f970806660bf2d849e61606fa
get "cells/P30_Calb1_DG_04_cell2.pxp" 54585371 701f8f455a80a5b5673d5ac7a4ae4207c1306580a50a50fb552a705ed1847532
get "cells/P30_Calb1_DG_04_cell3.pxp" 54585374 6badbc61a69c94decbfa08fde8650ccc27deef582d84fe5281cf11752086c3a5
get "cells/P30_Calb1_DG_04_cell4.pxp" 54585383 4167926aa4a8eb72438a7df5d5bfbe45a551553f44665d8aab974add763cba5d
get "cells/P30_Calb1_DG_04_cell5.pxp" 54585404 5f19599a67077209d50d53c2ded1dbea54e3aab9976073ea7882e92c054ca3f8
get "cells/P30_Calb1_DG_05_cell1.pxp" 54585377 a7138e673d0cc27e5de14b9a3c83e95fbb84b3c0f0b0e8d6525acea59e58ca67
get "cells/P30_Calb1_DG_05_cell2.pxp" 54585386 1e358badc4c0c4925325d7150756582fde30c3a9d1200451e05e3f4621a47248
get "cells/P30_Calb1_DG_05_cell3.pxp" 54585389 4e16426debd1439208fcc57cbb7223a8d4ea979c1c1dba11ba4e8f01e6578dfc
get "cells/P30_Calb1_DG_05_cell4.pxp" 54585380 e2d5e4032a47dc7a203dcc8ebf2035ee5cf23d22df537c189ec1dba42ffdea1e
get "cells/P30_Calb1_DG_05_cell5.pxp" 54585407 f31faf3102ebeaa057c0d256d916f21eb2f1612ee3003622d3c0b9cc729bc5fe
get "cells/P30_Calb1_DG_06_cell1.pxp" 54585419 9f6d4e164a317fbe160c167fa66d67d7dc9fb256ca76961eb3e8396286616932
get "cells/P30_Calb1_DG_06_cell2.pxp" 54585395 57d923434dee365ec7cdae9000cb5cc8fa55d81739dc3b4e35a58b002ad8caca
get "cells/P30_Calb1_DG_07_cell1.pxp" 54585398 bca2785673d3eb0a27b941d5223f39c39d9b779846d8a3d92685cbc29f3ede2f
get "cells/P30_Calb1_DG_07_cell2.pxp" 54585392 32d7560ffe4651fde1deeb191a4935301005e8c6e9eff5ba2cd187c5ad574476
get "cells/P30_Calb1_DG_07_cell3.pxp" 54585410 664fbddf837c98268caf8b703f15e355d90ac2563f27d17833a4b92a75c53166
get "cells/P30_Calb1_DG_08_cell1.pxp" 54585401 d6c38513cb6844470083b6fcf3a075b2d340fe3f0eb0f8b0f2bfc4412906ada1
get "cells/P30_Calb1_DG_08_cell2.pxp" 54585416 44f4f6b6727d2379a41fcd49b71d8eef153d20bdff6fc18e9ce84cb154ebc015
get "cells/P30_Calb1_DG_09_cell1.pxp" 54585413 3c04809a04ac6426cef516efe054c89e36e6a0eec65bda071e3da2d267a91228
get "cells/P30_Calb1_DG_09_cell2.pxp" 54585425 5480000c232a86f19bff2a3e44e915e924304a69a72dbd0f1e968c1df3df96df
get "cells/P30_Calb1_DG_09_cell3.pxp" 54585431 ab2af2fce922863149afcf3317af40fcf4af579b5ff6257f489ea0eb80db3c87
get "cells/P30_Calb1_DG_10_cell1.pxp" 54585422 1eabbfa26961fd0de1f2463cd6df9efc6344276afbcec9d0f3b812c4239ebe9a
get "cells/P30_Calb1_DG_11_cell1.pxp" 54585428 9bfae641a899bf19fed39fae955c391afea2461e9a96247112bae7c7accbe55f
get "cells/P30_Calb1_DG_11_cell2.pxp" 54585434 e30d718faf728f59db637ba48a1af5943c63fe3ee151cd47a59b609a03960832
get "cells/P30_Calb1_DG_11_cell3.pxp" 54585437 921984fbdb9745c6bfbe639f07e7f6f2d7daebf48f74dea6fc7af51b9e416dd4
get "cells/P30_Calb1_DG_12_cell1.pxp" 54585440 2fc0f3229d9109b938d4db3be199bdae8e0f427fb6202d29205ba61f03ef5ae6
get "cells/P30_Calb1_DG_12_cell2.pxp" 54585443 a5590f852700fc5799fc1a42bef4a4df92dc463337fb84093c3b3ee07f1f89ab
awk -F, 'NR == 1 { print "cell,animal,group"; next } $1 == "P30 Calb1 DG" { a = $3; c = $4; gsub(/\r/, "", c); gsub(/ /, "_", a); print a "_" c "," a "," $2 }' phys_metadata.csv > cells_metadata.csv
[ "$(wc -l < cells_metadata.csv | tr -d " ")" = "33" ] || { echo "metadata must list 32 cells" >&2; exit 1; }
