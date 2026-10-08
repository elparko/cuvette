. "$(dirname "$0")/lib.sh"
bcf=$1; out=$2; in=$3; shift 3
ref=; split=
while [ $# -gt 0 ]; do
  case $1 in --reference) ref=$2;; --split) split=$2;; esac
  shift 2
done
[ -n "$ref" ] || { echo "a reference FASTA file is required" >&2; exit 1; }
n_before=$(count_records "$bcf" "$in")
set -- norm -f "$ref" -Oz -o "$out"
[ "$split" = any ] && set -- "$@" -m -any
[ "$split" = snps ] && set -- "$@" -m -snps
[ "$split" = indels ] && set -- "$@" -m -indels
log=$("$bcf" "$@" "$in" 2>&1) || { echo "$log" | tail -3 >&2; exit 1; }
"$bcf" index -t -f "$out" || exit 1
echo "vcf=$out"
echo "split_multiallelic=${split:-no}"
echo "n_before=$n_before"
echo "n_after=$(count_records "$bcf" "$out")"
echo "$log" | sed -n 's/^Lines.*:[[:space:]]*\([0-9]*\)\/\([0-9]*\)\/\([0-9]*\)\/\([0-9]*\)\/\([0-9]*\)\/\([0-9]*\)\/\([0-9]*\)$/n_split=\2\
n_realigned=\4/p'
stats_kv "$bcf" "$out"
