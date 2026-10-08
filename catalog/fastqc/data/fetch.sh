#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
U="${FASTQC_EXAMPLE_URL:-https://www.bioinformatics.babraham.ac.uk/projects/fastqc}"
sha() { if command -v sha256sum >/dev/null; then sha256sum | cut -d' ' -f1; else shasum -a 256 | cut -d' ' -f1; fi; }
get() {
  local name=$1 full=$2 subset=$3
  if [ -f "$name.fastq.gz" ] && [ "$(gzip -dc "$name.fastq.gz" | sha)" = "$subset" ]; then return; fi
  curl -fL --retry 3 -o "$name.txt.part" "$U/$name.txt"
  [ "$(sha < "$name.txt.part")" = "$full" ] || { echo "checksum mismatch: $name.txt" >&2; exit 1; }
  head -n 40000 "$name.txt.part" | gzip -n -9 > "$name.fastq.gz"
  rm -f "$name.txt.part"
  [ "$(gzip -dc "$name.fastq.gz" | sha)" = "$subset" ] || { echo "subset mismatch: $name" >&2; exit 1; }
}
get good_sequence_short 56d49e766f2fdb6f65563b5ae5584e678c5bec3cfadd58643132a6d5dc161810 8b3d35326f9ed6156ac10d599f541d1b7980c14ad066678961628c072aba2150
get bad_sequence 6a13706bf7bfa821498168bc29cf2388d9925c8d834cf0e9c920bfb570d86eb1 5d260cc9622011bc4951f60d1cc10bba57929070a41c3f700391787b023dac3d
