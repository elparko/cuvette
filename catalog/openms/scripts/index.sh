. "$(dirname "$0")/lib.sh"
setup "$1"; in=$2; out=$3; fasta=$4; shift 4
[ -f "$in" ] || { echo "cannot read the input file" >&2; exit 1; }
[ -f "$fasta" ] || { echo "cannot read the FASTA file" >&2; exit 1; }
il=no
args=
while [ $# -gt 0 ]; do
  case $1 in
    --il) il=$2;;
    *) args="$args $1 $2";;
  esac
  shift 2
done
set -- -in "$in" -fasta "$fasta" -out "$out"
[ "$il" = yes ] && set -- "$@" -IL_equivalent
"$bin/PeptideIndexer" "$@" $args >"$GA_CALL_DIR/pi.log" 2>&1 || { grep -iE 'error|fatal|decoy|unmatched' "$GA_CALL_DIR/pi.log" | tail -5 >&2; exit 1; }
echo "idxml=$out"
file_kv "$out"
echo "n_decoy_psm=$(decoy_psm_count "$out")"
awk '/unmatched +:/ { print "n_unmatched=" $3 }' "$GA_CALL_DIR/pi.log"
