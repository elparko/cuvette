. "$(dirname "$0")/lib.sh"
bcf=$1; out=$2; in=$3; shift 3
qual=; depth=; types=; region=; status=; expr=
while [ $# -gt 0 ]; do
  case $1 in
    --qual) qual=$2;; --depth) depth=$2;; --types) types=$2;;
    --region) region=$2;; --status) status=$2;; --expression) expr=$2;;
  esac
  shift 2
done
case $qual in 0|0.0) qual=;; esac
case $depth in 0) depth=;; esac
[ "$types" = all ] && types=
[ "$status" = any ] && status=
[ "$status" = PASS ] && status="PASS,."
if [ -n "$region" ]; then
  prepare "$bcf" "$in" "$CUVETTE_CALL_DIR" || { echo "cannot index the input file" >&2; exit 1; }
  in=$prepared
fi
e=
add() { e=${e:+$e && }$1; }
[ -n "$qual" ] && add "QUAL>=$qual"
[ -n "$depth" ] && add "INFO/DP>=$depth"
[ -n "$expr" ] && add "($expr)"
n_before=$(count_records "$bcf" "$in" "$region")
set -- view -Oz -o "$out"
[ -n "$e" ] && set -- "$@" -i "$e"
[ -n "$types" ] && set -- "$@" -v "$types"
[ -n "$status" ] && set -- "$@" -f "$status"
[ -n "$region" ] && set -- "$@" -r "$region"
"$bcf" "$@" "$in" || exit 1
"$bcf" index -t -f "$out" || exit 1
echo "vcf=$out"
echo "expression=${e:-none}"
echo "n_before=$n_before"
echo "n_after=$(count_records "$bcf" "$out")"
stats_kv "$bcf" "$out"
