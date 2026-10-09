bt=$1; out=$2; a=$3; b=$4; shift 4
[ -f "$a" ] || { echo "the BED file $a does not exist" >&2; exit 1; }
[ -f "$b" ] || { echo "the BED file $b does not exist" >&2; exit 1; }
fa=; fb=; rec=; strand=; report=pairs
while [ $# -gt 0 ]; do
  case $1 in
    --fa) fa=$2;; --fb) fb=$2;; --reciprocal) rec=$2;; --strand) strand=$2;; --report) report=$2;;
  esac
  shift 2
done
case $fa in 0|0.0) fa=;; esac
case $fb in 0|0.0) fb=;; esac
set -- intersect -a "$a" -b "$b"
[ -n "$fa" ] && set -- "$@" -f "$fa"
[ -n "$fb" ] && set -- "$@" -F "$fb"
[ "$rec" = true ] && set -- "$@" -r
[ "$strand" = same ] && set -- "$@" -s
[ "$strand" = opposite ] && set -- "$@" -S
case $report in
  pairs) set -- "$@" -wo;;
  count) set -- "$@" -c;;
  unique_a) set -- "$@" -u;;
  no_overlap) set -- "$@" -v;;
  *) echo "unknown report: $report" >&2; exit 1;;
esac
"$bt" "$@" > "$out" || exit 1
echo "bed=$out"
echo "report=$report"
echo "n_a=$(wc -l < "$a" | tr -d ' ')"
echo "n_b=$(wc -l < "$b" | tr -d ' ')"
echo "n_result=$(wc -l < "$out" | tr -d ' ')"
case $report in
  pairs) awk -F'\t' '{s+=$NF}END{print "overlap_bases=" s+0}' "$out"
         awk -F'\t' '{a[$1 FS $2 FS $3 FS $4]=1}END{n=0;for(k in a)n++;print "n_a_with_overlap=" n}' "$out";;
  count) awk -F'\t' '{s+=$NF; if ($NF>0) n++}END{print "total_overlaps=" s+0; print "n_a_with_overlap=" n+0}' "$out";;
  unique_a) echo "n_a_with_overlap=$(wc -l < "$out" | tr -d ' ')";;
  no_overlap) echo "n_a_without_overlap=$(wc -l < "$out" | tr -d ' ')";;
esac
