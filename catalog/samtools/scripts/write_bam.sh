sam=$1
out=$2
cmd=$3
shift 3
"$sam" "$cmd" -o "$out" "$@" || exit 1
echo "bam=$out"
echo "n_reads=$("$sam" view -c "$out")"
