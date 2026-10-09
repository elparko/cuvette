#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/aulicino2022-baculovirus-hdr"
mkdir -p "$D"
# figshare record 10.6084/m9.figshare.20110364 (CC BY 4.0), the files of Fig 2b for day 10.
# Local names: bv_hdr_rep1..3, bv_hiti2c_rep1..3 (cells treated with the baculovirus) and control_rep1..3 (untransfected HEK293T cells).
get() {
  curl -fsSL -o "$D/$2.fcs" "https://ndownloader.figshare.com/files/$1"
}
get 35976095 bv_hdr_rep1
get 35976098 bv_hdr_rep2
get 35976101 bv_hdr_rep3
get 35976113 bv_hiti2c_rep1
get 35976116 bv_hiti2c_rep2
get 35976119 bv_hiti2c_rep3
get 35976140 control_rep1
get 35976143 control_rep2
get 35976146 control_rep3
shasum -a 256 -c - <<S
05040e81bda97486897d461a72de7d2f401810d049d907dfcfedc820c03a7670  $D/bv_hdr_rep1.fcs
e1f7520ac50178d82f6b238448ef8a395ce17729362512ed90632ae4ee6e0cce  $D/bv_hdr_rep2.fcs
7720d79f1fbda0d1ec2e45972fa68466a754e1d3302b1c2fa13232c7dccae558  $D/bv_hdr_rep3.fcs
6b96c87348ca29818843db30f6df35878f8e31fde823cb9f2af50a3ebb6ce3a0  $D/bv_hiti2c_rep1.fcs
fa33fc0543303c957238362f30a207ad733c997eea54a8901a00fd370f02db9c  $D/bv_hiti2c_rep2.fcs
a9c072e80c7eece662bfdf8b9a567d5534b0f7ca6a3b6a7eae29ea59ef247ea2  $D/bv_hiti2c_rep3.fcs
87bf770dfec0fb0f70ae884ea712d16b960b0e012db1c47aa8e314462385006a  $D/control_rep1.fcs
3a8a71063bf5e3f8ab40e7a35c18a53975e1444317e592227d67033f9dfb8bf7  $D/control_rep2.fcs
a5b4a4026d2d3240e25daffa1870679d7539b3eee7b3e7a48c4e78b41644eaef  $D/control_rep3.fcs
S
