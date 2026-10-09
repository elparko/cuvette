bt=$1; out=$2; a=$3; b=$4; shift 4
[ -f "$a" ] || { echo "the BED file $a does not exist" >&2; exit 1; }
[ -f "$b" ] || { echo "the BED file $b does not exist" >&2; exit 1; }
strand=
while [ $# -gt 0 ]; do
  case $1 in --strand) strand=$2;; esac
  shift 2
done
set -- coverage -a "$a" -b "$b"
[ "$strand" = same ] && set -- "$@" -s
[ "$strand" = opposite ] && set -- "$@" -S
"$bt" "$@" > "$out" || exit 1
echo "bed=$out"
awk -F'\t' '{n++; if ($(NF-3)>0) c++; ov+=$(NF-3); cov+=$(NF-2); len+=$(NF-1)}
END{print "n_features=" n+0; print "n_covered=" c+0; print "total_overlaps=" ov+0; print "covered_bases=" cov+0; print "feature_bases=" len+0; if (len>0) printf "covered_fraction=%.6f\n", cov/len}' "$out"
