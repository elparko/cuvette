bt=$1; out=$2; in=$3; shift 3
dist=0; strand=
while [ $# -gt 0 ]; do
  case $1 in --distance) dist=$2;; --strand) strand=$2;; esac
  shift 2
done
set -- merge -i - -d "$dist"
[ "$strand" = same ] && set -- "$@" -s
sort -k1,1 -k2,2n "$in" | "$bt" "$@" > "$out" || exit 1
echo "bed=$out"
echo "n_input=$(wc -l < "$in" | tr -d ' ')"
echo "n_merged=$(wc -l < "$out" | tr -d ' ')"
awk -F'\t' '{s+=$3-$2}END{print "merged_bases=" s+0}' "$out"
